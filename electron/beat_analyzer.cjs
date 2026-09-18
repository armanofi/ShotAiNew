const { spawn } = require('child_process');
const fs = require('fs');

/**
 * Resolves ffmpeg binary path safely
 */
function getFfmpegBinary() {
  try {
    const ffstatic = require('ffmpeg-static');
    if (ffstatic && fs.existsSync(ffstatic)) return ffstatic;
  } catch (e) {}
  return 'ffmpeg';
}

/**
 * Analyzes the audio beat, tempo (BPM), and beat interval of an audio file.
 * Reads the first 30-45 seconds of the audio stream at 11025Hz 16-bit mono PCM.
 * Uses energy envelope onset detection and autocorrelation across 70 - 180 BPM.
 * 
 * @param {string} audioPath - Path to the audio file (mp3, wav, flac, etc.)
 * @returns {Promise<{ bpm: number, interval: number, confidence: number, mode: string }>}
 */
function analyzeAudioBeat(audioPath) {
  return new Promise((resolve) => {
    if (!audioPath || !fs.existsSync(audioPath)) {
      return resolve({
        bpm: 125,
        interval: 0.48,
        confidence: 0,
        mode: 'fallback',
        error: 'File audio tidak ditemukan'
      });
    }

    try {
      const ffmpegBin = getFfmpegBinary();

      // Read 35 seconds of audio, downsampled to 11025Hz, 1 channel, 16-bit LE
      const proc = spawn(ffmpegBin, [
        '-i', audioPath,
        '-t', '35',
        '-ac', '1',
        '-ar', '11025',
        '-f', 's16le',
        'pipe:1'
      ], { stdio: ['ignore', 'pipe', 'ignore'] });

      const chunks = [];
      proc.stdout.on('data', (chunk) => chunks.push(chunk));

      proc.stdout.on('end', () => {
        try {
          const buf = Buffer.concat(chunks);
          if (buf.length < 22050) { // less than 1 second
            return resolve({ bpm: 125, interval: 0.48, confidence: 0.3, mode: 'default' });
          }

          const samples = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
          
          // Calculate RMS energy in 25ms windows (11025 * 0.025 = ~275 samples)
          const windowSize = 275;
          const energies = [];
          for (let i = 0; i < samples.length; i += windowSize) {
            let sum = 0;
            const end = Math.min(i + windowSize, samples.length);
            for (let j = i; j < end; j++) {
              const v = samples[j] / 32768;
              sum += v * v;
            }
            energies.push(Math.sqrt(sum / (end - i)));
          }

          if (energies.length < 40) {
            return resolve({ bpm: 125, interval: 0.48, confidence: 0.3, mode: 'default' });
          }

          // Compute onset envelope (positive difference of energy)
          const onsets = new Float32Array(energies.length);
          for (let i = 1; i < energies.length; i++) {
            const diff = energies[i] - energies[i - 1];
            onsets[i] = diff > 0 ? diff : 0;
          }

          // Autocorrelation for BPM range 70 to 180
          // Window rate is 40 windows per second (1 / 0.025s = 40 Hz)
          // lag = 40 * (60 / BPM) = 2400 / BPM
          let bestBpm = 125;
          let maxCorr = -1;
          let secondMaxCorr = -1;

          for (let bpm = 70; bpm <= 180; bpm++) {
            const lag = Math.round(2400 / bpm);
            if (lag >= onsets.length) continue;

            let corr = 0;
            const maxI = onsets.length - lag;
            for (let i = 0; i < maxI; i++) {
              corr += onsets[i] * onsets[i + lag];
            }

            if (corr > maxCorr) {
              secondMaxCorr = maxCorr;
              maxCorr = corr;
              bestBpm = bpm;
            } else if (corr > secondMaxCorr) {
              secondMaxCorr = corr;
            }
          }

          const confidence = maxCorr > 0 && secondMaxCorr > 0 
            ? Math.min(1, Math.max(0.3, (maxCorr - secondMaxCorr) / maxCorr * 3))
            : 0.5;

          const interval = Number((60 / bestBpm).toFixed(3));

          resolve({
            bpm: bestBpm,
            interval,
            confidence: Number(confidence.toFixed(2)),
            mode: 'analyzed'
          });
        } catch (err) {
          resolve({ bpm: 125, interval: 0.48, confidence: 0.2, mode: 'error', error: err.message });
        }
      });

      proc.on('error', (err) => {
        resolve({ bpm: 125, interval: 0.48, confidence: 0.2, mode: 'error', error: err.message });
      });

    } catch (e) {
      resolve({ bpm: 125, interval: 0.48, confidence: 0.2, mode: 'error', error: e.message });
    }
  });
}

module.exports = {
  analyzeAudioBeat
};
