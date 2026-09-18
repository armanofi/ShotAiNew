const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

/**
 * Recursively scans a directory for files
 */
async function scanDirectoryRecursive(dirPath) {
  let results = [];
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subResults = await scanDirectoryRecursive(fullPath);
        results = results.concat(subResults);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // Return whatever was found or empty if directory doesn't exist
  }
  return results;
}

/**
 * Scans assets root for Effects and Transitions
 * @param {string} assetRoot - Absolute root path (e.g. D:\apps\ShotAiNew\assets)
 * @returns {Promise<Array<{ fullPath: string, type: string, category: string, filename: string, name: string, relativePath: string }>>}
 */
async function scanAssets(assetRoot) {
  const items = [];

  const targets = [
    { dirName: 'Effects', type: 'effects' },
    { dirName: 'Transitions', type: 'transitions' }
  ];

  for (const target of targets) {
    const targetDir = path.join(assetRoot, target.dirName);
    if (!fs.existsSync(targetDir)) {
      continue;
    }

    const files = await scanDirectoryRecursive(targetDir);

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.mp4') {
        continue; // Only process MP4 files
      }

      // Relative path from targetDir (e.g., "Fire\fire01.mp4" or "Burn Away.mp4")
      const relFromTarget = path.relative(targetDir, filePath);
      const parts = relFromTarget.split(path.sep);

      let category = 'General';
      if (parts.length > 1) {
        // First folder under Effects/Transitions is category
        category = parts[0].trim();
      }

      const filename = path.basename(filePath);
      const name = path.basename(filePath, ext);
      const relativePath = `${target.dirName}/${category}/${filename}`;

      items.push({
        fullPath: filePath,
        type: target.type,
        category,
        filename,
        name,
        relativePath,
        dirName: target.dirName
      });
    }
  }

  return items;
}

module.exports = {
  scanAssets
};
