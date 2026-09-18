const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const fsPromises = require('fs/promises');
const { requireAdminAuth } = require('../middleware/auth');
const assetService = require('../services/assetService');
const storageService = require('../services/storageService');
const checksumService = require('../services/checksumService');
const logger = require('../utils/logger');

// Enforce admin authentication across all admin endpoints
router.use(requireAdminAuth);

// Configure secure Multer upload to temporary directory
const upload = multer({
  dest: path.join(os.tmpdir(), 'shotai-asset-uploads'),
  limits: {
    fileSize: 1024 * 1024 * 500, // 500 MB max per file
    files: 2 // 'file' (video) and 'thumbnail' (image)
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Disallowed dangerous extensions
    const dangerousExts = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.js', '.mjs', '.cjs', '.vbs', '.py', '.php', '.bin'];
    if (dangerousExts.includes(ext)) {
      const err = new Error(`Dangerous file extension ${ext} is strictly prohibited.`);
      err.code = 'DISALLOWED_FILE_TYPE';
      return cb(err, false);
    }

    if (file.fieldname === 'file') {
      if (ext !== '.mp4') {
        const err = new Error(`Invalid video file extension ${ext}. Only .mp4 is supported.`);
        err.code = 'INVALID_VIDEO_EXTENSION';
        return cb(err, false);
      }
      return cb(null, true);
    }

    if (file.fieldname === 'thumbnail') {
      const allowedImgExts = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!allowedImgExts.includes(ext)) {
        const err = new Error(`Invalid thumbnail extension ${ext}. Supported: .jpg, .jpeg, .png, .webp`);
        err.code = 'INVALID_THUMBNAIL_EXTENSION';
        return cb(err, false);
      }
      return cb(null, true);
    }

    // Reject unknown fields
    return cb(new Error(`Unexpected field: ${file.fieldname}`), false);
  }
});

const cpUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

/**
 * GET /api/admin/check-checksum
 * Pre-upload verification: checks if a file with matching checksum already exists on server
 */
router.get('/check-checksum', async (req, res, next) => {
  try {
    const { type, checksum } = req.query;
    if (!checksum) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CHECKSUM', message: 'checksum query parameter is required' }
      });
    }

    const safeType = type === 'transitions' ? 'transitions' : 'effects';
    const existing = await assetService.findAssetByChecksum(safeType, checksum.trim().toLowerCase());

    return res.status(200).json({
      success: true,
      exists: Boolean(existing),
      data: existing
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Shared handler for effect and transition upload
 */
async function handleUpload(req, res, next, assetType) {
  const files = req.files || {};
  const videoFile = files['file'] ? files['file'][0] : null;
  const thumbFile = files['thumbnail'] ? files['thumbnail'][0] : null;

  if (!videoFile) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FILE', message: "Field 'file' containing .mp4 is required" }
    });
  }

  const { name, category, checksum: clientChecksum } = req.body;

  if (!category) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_CATEGORY', message: "Field 'category' is required" }
    });
  }

  try {
    // 1. Calculate actual server-side checksum of the uploaded video
    const serverChecksum = await checksumService.calculateFileChecksum(videoFile.path);

    // If client supplied checksum, verify integrity
    if (clientChecksum && clientChecksum.trim().toLowerCase() !== serverChecksum) {
      logger.warn('Checksum mismatch during upload', { clientChecksum, serverChecksum, filename: videoFile.originalname });
      return res.status(400).json({
        success: false,
        error: {
          code: 'CHECKSUM_MISMATCH',
          message: `Uploaded file checksum (${serverChecksum}) does not match expected (${clientChecksum}).`
        }
      });
    }

    // 2. Sanitize filenames
    const originalBasename = path.basename(videoFile.originalname, path.extname(videoFile.originalname));
    const safeBase = originalBasename.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim() || 'asset';
    const safeVideoFilename = `${safeBase}.mp4`;
    const safeThumbFilename = `${safeBase}.jpg`;

    // 3. Resolve destination storage paths
    const storagePaths = storageService.getAssetStoragePaths(
      assetType,
      category,
      safeVideoFilename,
      thumbFile ? safeThumbFilename : null
    );

    // 4. Save video to destination storage
    await storageService.saveFileToStorage(videoFile.path, storagePaths.filePath);

    // 5. Save thumbnail if provided
    let finalThumbPath = null;
    let finalThumbKey = null;
    if (thumbFile && storagePaths.thumbnailPath) {
      await storageService.saveFileToStorage(thumbFile.path, storagePaths.thumbnailPath);
      finalThumbPath = storagePaths.thumbnailPath;
      finalThumbKey = storagePaths.thumbnailKey;
    }

    // 6. Upsert asset in database with auto-versioning
    const upsertResult = await assetService.upsertAsset(assetType, {
      name: name || originalBasename,
      category,
      filename: safeVideoFilename,
      filePath: storagePaths.filePath,
      thumbnailPath: finalThumbPath,
      fileSize: videoFile.size,
      checksum: serverChecksum,
      mimeType: 'video/mp4',
      storageKey: storagePaths.storageKey,
      thumbnailKey: finalThumbKey
    });

    logger.info(`Upload processed for ${assetType}/${category}/${safeVideoFilename}`, {
      action: upsertResult.action,
      version: upsertResult.version,
      checksum: serverChecksum
    });

    return res.status(200).json({
      success: true,
      action: upsertResult.action,
      version: upsertResult.version || upsertResult.asset?.version,
      data: upsertResult.asset
    });
  } catch (err) {
    // Clean up temporary files on error
    if (videoFile && videoFile.path) {
      await fsPromises.unlink(videoFile.path).catch(() => {});
    }
    if (thumbFile && thumbFile.path) {
      await fsPromises.unlink(thumbFile.path).catch(() => {});
    }
    next(err);
  }
}

/**
 * POST /api/admin/upload/effect
 */
router.post('/upload/effect', cpUpload, (req, res, next) => {
  handleUpload(req, res, next, 'effects');
});

/**
 * POST /api/admin/upload/transition
 */
router.post('/upload/transition', cpUpload, (req, res, next) => {
  handleUpload(req, res, next, 'transitions');
});

module.exports = router;
