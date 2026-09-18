const path = require('path');
const fs = require('fs');
const { scanAssets } = require('./scanner');
const { runUploader } = require('./uploader');
const { resolveFfmpeg } = require('./thumbnail');

async function main() {
  console.log(`========================================`);
  console.log(`ShotAi Asset Uploader (Windows Client)`);
  console.log(`========================================\n`);

  // 1. Load config.json
  const configPath = path.resolve(__dirname, '../config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`[ERROR] Configuration file not found at: ${configPath}`);
    console.error(`Please copy config.example.json to config.json and configure your serverUrl and apiKey.`);
    process.exit(1);
  }

  let config;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`[ERROR] Failed to parse config.json: ${err.message}`);
    process.exit(1);
  }

  // 2. Validate configuration
  if (!config.serverUrl || config.serverUrl.includes('DOMAIN-API-SHOTAI')) {
    console.error(`[ERROR] Invalid serverUrl in config.json. Please provide your actual API server URL.`);
    process.exit(1);
  }

  if (!config.apiKey || config.apiKey === 'YOUR_API_KEY') {
    console.error(`[ERROR] Invalid apiKey in config.json. Please set your actual ADMIN_API_KEY.`);
    process.exit(1);
  }

  const assetRoot = path.resolve(config.assetRoot || 'D:\\apps\\ShotAiNew\\assets');
  if (!fs.existsSync(assetRoot)) {
    console.error(`[ERROR] Asset root directory does not exist: ${assetRoot}`);
    process.exit(1);
  }

  // 3. Test FFmpeg availability
  try {
    const ffmpegBin = resolveFfmpeg(config.ffmpegPath || 'ffmpeg');
    console.log(`[OK] FFmpeg found: ${ffmpegBin}`);
  } catch (ffmpegErr) {
    console.error(`[WARN] ${ffmpegErr.message}`);
    console.error(`Thumbnails will be skipped if FFmpeg is unavailable.\n`);
  }

  // 4. Scan assets
  console.log(`Scanning assets in: ${assetRoot}...`);
  const items = await scanAssets(assetRoot);

  if (items.length === 0) {
    console.log(`No .mp4 files found in ${path.join(assetRoot, 'Effects')} or ${path.join(assetRoot, 'Transitions')}.`);
    process.exit(0);
  }

  console.log(`Found ${items.length} MP4 assets across Effects & Transitions.\n`);

  // 5. Run uploader
  try {
    await runUploader(items, config);
  } catch (err) {
    console.error(`\n[FATAL ERROR] ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
