#!/usr/bin/env node

/**
 * ShotAi Windows Asset Auto Uploader CLI
 * Entry point for `npm start` and `node uploader.js`
 */

const { main } = require('./src/index');

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err.message);
  process.exit(1);
});
