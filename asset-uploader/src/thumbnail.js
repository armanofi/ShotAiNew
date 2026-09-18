const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

let resolvedFfmpegPath = null;
let ffmpegTested = false;
let ffmpegError = null;

/**
 * Resolves and validates the FFmpeg binary path.
 * Checks config path, then checks fallback project bundle.
 */
function resolveFfmpeg(configuredPath = 'ffmpeg') {
  if (ffmpegTested) {
    if (ffmpegError) throw ffmpegError;
    return resolvedFfmpegPath;
  }

  ffmpegTested = true;

  // 1. Try configured path (e.g. 'ffmpeg' from PATH or custom path)
  try {
    const testResult = spawnSync(configuredPath, ['-version'], { stdio: 'pipe' });
    if (testResult.status === 0) {
      resolvedFfmpegPath = configuredPath;
      return resolvedFfmpegPath;
    }
  } catch (err) {
    // Continue to fallback
  }

  // 2. Try common bundled static ffmpeg path in ShotAiNew
  const bundledStatic = 'D:\\apps\\ShotAiNew\\node_modules\\ffmpeg-static\\ffmpeg.exe';
  if (fs.existsSync(bundledStatic)) {
    try {
      const testResult = spawnSync(bundledStatic, ['-version'], { stdio: 'pipe' });
      if (testResult.status === 0) {
        resolvedFfmpegPath = bundledStatic;
        return resolvedFfmpegPath;
      }
    } catch (err) {
      // Continue
    }
  }

  // 3. Not found
  ffmpegError = new Error(
    `[FFmpeg Error] FFmpeg executable was not found at '${configuredPath}'.\n` +
    `Please install FFmpeg on Windows (e.g., via winget install Gyan.FFmpeg) or set the exact path in config.json.`
  );
  throw ffmpegError;
}

/**
 * Generates a 320x180 (16:9) JPG thumbnail at ~1s timestamp
 * @param {string} videoPath - Absolute path to MP4
 * @param {string} cacheDir - Directory to store thumbnail
 * @param {string} identifier - Unique ID or checksum for caching
 * @param {string} configuredFfmpegPath - From config.json
 * @returns {Promise<string|null>} - Absolute path to thumbnail or null if failed
 */
async function generateThumbnail(videoPath, cacheDir, identifier, configuredFfmpegPath = 'ffmpeg') {
  const ffmpeg = resolveFfmpeg(configuredFfmpegPath);

  await fsPromises.mkdir(cacheDir, { recursive: true });
  const outputPath = path.join(cacheDir, `${identifier}.jpg`);

  // Return cached thumbnail if already exists and non-empty
  if (fs.existsSync(outputPath)) {
    try {
      const stat = await fsPromises.stat(outputPath);
      if (stat.size > 100) {
        return outputPath;
      }
    } catch (e) {}
  }

  // Helper to execute ffmpeg frame extraction
  const extractFrame = (timestamp) => {
    return new Promise((resolve) => {
      const args = [
        '-y',
        '-ss', timestamp,
        '-i', videoPath,
        '-vframes', '1',
        '-s', '320x180',
        '-q:v', '2',
        outputPath
      ];

      const proc = spawn(ffmpeg, args, { stdio: 'pipe' });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      proc.on('error', () => {
        resolve(false);
      });
    });
  };

  try {
    // Try frame at 1.0 second first
    let success = await extractFrame('00:00:01.000');
    if (!success) {
      // Fallback to start of video (0.0s) in case video is very short
      success = await extractFrame('00:00:00.000');
    }

    return success ? outputPath : null;
  } catch (err) {
    // Single file failure does not crash whole uploader
    return null;
  }
}

module.exports = {
  resolveFfmpeg,
  generateThumbnail
};
