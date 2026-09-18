const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculates SHA-256 checksum of a file using streaming (constant memory footprint)
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<string>} - Hex lowercase SHA-256 checksum
 */
function calculateFileChecksum(filePath) {
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

/**
 * Calculates SHA-256 of a memory buffer
 * @param {Buffer} buffer
 * @returns {string}
 */
function calculateBufferChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  calculateFileChecksum,
  calculateBufferChecksum
};
