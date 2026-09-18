const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { getFileChecksum } = require('./checksum');
const { generateThumbnail } = require('./thumbnail');
const { checkChecksumOnServer, uploadAssetWithRetry } = require('./api');

// Setup logs directory
const LOGS_DIR = path.resolve(__dirname, '../logs');
const CACHE_DIR = path.resolve(__dirname, '../cache/thumbnails');
const LOG_FILE = path.join(LOGS_DIR, 'uploader.log');

if (!fs.existsSync(LOGS_DIR)) {
  try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch (e) {}
}
if (!fs.existsSync(CACHE_DIR)) {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}
}

/**
 * Appends structured entry to logs/uploader.log without sensitive info
 */
function logEntry({ filename, action, status, version = null, checksum = null, error = null }) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    filename,
    action,
    status,
    ...(version !== null ? { version } : {}),
    ...(checksum ? { checksum } : {}),
    ...(error ? { error: String(error) } : {})
  };

  const line = `[${timestamp}] [${status}] file="${filename}" action="${action}"${
    version ? ` version="${version}"` : ''
  }${checksum ? ` checksum="${checksum}"` : ''}${error ? ` error="${error}"` : ''}\n`;

  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (err) {
    // Ignore logging errors
  }
}

/**
 * Formats bytes to MB string
 */
function formatSizeMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Executes async task worker with concurrency limit
 */
async function runWithConcurrency(items, concurrency, workerFn) {
  let index = 0;
  const executing = new Set();

  for (const item of items) {
    index++;
    const currentIdx = index;
    const promise = Promise.resolve().then(() => workerFn(item, currentIdx, items.length));
    executing.add(promise);

    const clean = () => executing.delete(promise);
    promise.then(clean, clean);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

/**
 * Processes a single asset item
 */
async function processItem(item, currentIndex, totalCount, config) {
  const { fullPath, type, category, filename, name, relativePath } = item;
  let fileSize = 0;

  try {
    const stat = await fsPromises.stat(fullPath);
    fileSize = stat.size;
  } catch (err) {
    console.error(`[ERROR] ${filename}\nReason: Cannot read file: ${err.message}`);
    logEntry({ filename, action: 'read', status: 'ERROR', error: err.message });
    return;
  }

  // 1. Calculate Streaming Checksum
  let checksum = null;
  try {
    checksum = await getFileChecksum(fullPath);
  } catch (err) {
    console.error(`[ERROR] ${filename}\nReason: Checksum calculation failed: ${err.message}`);
    logEntry({ filename, action: 'checksum', status: 'ERROR', error: err.message });
    return;
  }

  // 2. Check server if already exists with same checksum (Resume / Skip logic)
  try {
    const checkResult = await checkChecksumOnServer(config.serverUrl, config.apiKey, type, checksum);
    if (checkResult && checkResult.exists) {
      console.log(`[SKIP] ${filename}`);
      console.log(`Reason: checksum unchanged`);
      logEntry({
        filename,
        action: 'skip',
        status: 'SKIP',
        version: checkResult.data?.version || 1,
        checksum
      });
      return;
    }
  } catch (err) {
    // If check failed due to 401, bubble up to stop whole run
    if (err.message && err.message.includes('401')) {
      throw err;
    }
    // For transient check error, log warning and proceed to upload attempt
  }

  // 3. Print Uploading state
  console.log(`[${currentIndex}/${totalCount}] Uploading:\n${relativePath}`);

  // 4. Generate 320x180 Thumbnail using FFmpeg
  let thumbnailPath = null;
  try {
    thumbnailPath = await generateThumbnail(fullPath, CACHE_DIR, checksum, config.ffmpegPath);
  } catch (thumbErr) {
    console.warn(`[WARN] ${filename}: Thumbnail generation warning (${thumbErr.message})`);
  }

  // 5. Upload MP4 and Thumbnail to Server with retry
  try {
    const uploadRes = await uploadAssetWithRetry(config.serverUrl, config.apiKey, {
      type,
      filePath: fullPath,
      thumbnailPath,
      name,
      category,
      checksum
    });

    const version = uploadRes.version || uploadRes.data?.version || 1;
    const sizeStr = formatSizeMB(fileSize);

    if (uploadRes.action === 'updated') {
      console.log(`[UPDATE] ${filename}`);
      console.log(`Version: ${version}`);
      console.log(`Size: ${sizeStr}`);
      logEntry({ filename, action: 'update', status: 'UPDATE', version, checksum });
    } else {
      console.log(`[OK] Uploaded`);
      console.log(`Version: ${version}`);
      console.log(`Size: ${sizeStr}`);
      logEntry({ filename, action: 'upload', status: 'OK', version, checksum });
    }
  } catch (uploadErr) {
    console.error(`[ERROR] ${filename}\nReason: ${uploadErr.message}`);
    logEntry({ filename, action: 'upload', status: 'ERROR', error: uploadErr.message });
  }
}

/**
 * Runs the uploader for a list of scanned items
 */
async function runUploader(items, config) {
  const concurrency = Math.max(1, parseInt(config.concurrency || '2', 10));
  console.log(`Starting upload queue: ${items.length} items (Concurrency: ${concurrency})...\n`);

  await runWithConcurrency(items, concurrency, (item, idx, total) => {
    return processItem(item, idx, total, config);
  });

  console.log(`\n========================================`);
  console.log(`All items processed. Logs saved to: logs/uploader.log`);
  console.log(`========================================\n`);
}

module.exports = {
  runUploader,
  processItem
};
