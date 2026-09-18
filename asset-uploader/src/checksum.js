const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculates SHA-256 checksum of an MP4 file using streaming.
 * Keeps memory footprint minimal even for large videos.
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<string>} - Hex lowercase SHA-256 string
 */
function getFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  getFileChecksum
};
