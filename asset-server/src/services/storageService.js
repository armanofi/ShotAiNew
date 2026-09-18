const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const logger = require('../utils/logger');

/**
 * Returns the absolute base storage root directory
 */
function getStorageRoot() {
  const root = process.env.STORAGE_ROOT || '/www/wwwroot/shotai-assets';
  return path.resolve(root);
}

/**
 * Sanitizes category or file name to prevent directory traversal
 */
function sanitizePathComponent(name) {
  if (!name || typeof name !== 'string') {
    return 'default';
  }
  // Strip null bytes, path separators, and dot-dot
  const sanitized = name
    .replace(/\0/g, '')
    .replace(/[/\\]/g, '')
    .replace(/\.\.+/g, '')
    .trim();

  return sanitized.length > 0 ? sanitized : 'default';
}

/**
 * Validates that an absolute target path is strictly within the allowed storage root
 * @param {string} targetPath
 * @returns {string} - Absolute validated path
 */
function validateWithinStorageRoot(targetPath) {
  const root = getStorageRoot();
  const resolved = path.resolve(targetPath);

  // Must start with storage root + separator
  if (!resolved.startsWith(root)) {
    logger.error('Path traversal attempt blocked!', { targetPath, resolved, root });
    const err = new Error('Access denied: Path traversal detected.');
    err.code = 'PATH_TRAVERSAL_DENIED';
    throw err;
  }

  return resolved;
}

/**
 * Generates absolute target paths for asset and thumbnail
 */
function getAssetStoragePaths(type, category, filename, thumbFilename = null) {
  const safeType = type === 'transitions' ? 'transitions' : 'effects';
  const safeCategory = sanitizePathComponent(category);
  const safeFilename = sanitizePathComponent(filename);

  const root = getStorageRoot();
  const categoryDir = path.join(root, safeType, safeCategory);
  const filePath = path.join(categoryDir, safeFilename);

  // Storage key relative to root
  const storageKey = `${safeType}/${safeCategory}/${safeFilename}`;

  let thumbnailPath = null;
  let thumbnailKey = null;

  if (thumbFilename) {
    const safeThumbFilename = sanitizePathComponent(thumbFilename);
    const thumbDir = path.join(categoryDir, 'thumbnails');
    thumbnailPath = path.join(thumbDir, safeThumbFilename);
    thumbnailKey = `${safeType}/${safeCategory}/thumbnails/${safeThumbFilename}`;
  }

  // Validate security
  validateWithinStorageRoot(filePath);
  if (thumbnailPath) {
    validateWithinStorageRoot(thumbnailPath);
  }

  return {
    categoryDir,
    filePath,
    thumbnailPath,
    storageKey,
    thumbnailKey
  };
}

/**
 * Ensures parent directory exists before writing
 */
async function ensureDir(dirPath) {
  await fsPromises.mkdir(dirPath, { recursive: true });
}

/**
 * Atomic move / save of uploaded temp file to final storage location
 */
async function saveFileToStorage(tempPath, destinationPath) {
  validateWithinStorageRoot(destinationPath);
  await ensureDir(path.dirname(destinationPath));

  try {
    // Attempt fast rename
    await fsPromises.rename(tempPath, destinationPath);
  } catch (err) {
    // If cross-device link error (EXDEV), copy and delete
    if (err.code === 'EXDEV') {
      await fsPromises.copyFile(tempPath, destinationPath);
      await fsPromises.unlink(tempPath);
    } else {
      throw err;
    }
  }
}

module.exports = {
  getStorageRoot,
  sanitizePathComponent,
  validateWithinStorageRoot,
  getAssetStoragePaths,
  ensureDir,
  saveFileToStorage
};
