const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs/promises');
const assetService = require('../services/assetService');
const logger = require('../utils/logger');

function getBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host') || '127.0.0.1:3100';
  return `${proto}://${host}`;
}

/**
 * GET /api/transitions/manifest
 * Must come before /:id route
 */
router.get('/manifest', async (req, res, next) => {
  try {
    const baseUrl = getBaseUrl(req);
    const manifest = await assetService.getManifest('transitions', baseUrl);
    return res.status(200).json(manifest);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transitions
 * Paginated list of transitions
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, category, status } = req.query;
    const result = await assetService.listAssets('transitions', { page, limit, category, status });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transitions/:id/download
 * Streaming download with Range request support
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Asset ID must be a valid number' }
      });
    }

    const asset = await assetService.getAssetById('transitions', id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Transition with ID ${id} not found` }
      });
    }

    const filePath = asset.file_path;
    try {
      await fsPromises.access(filePath, fs.constants.R_OK);
    } catch (accessErr) {
      logger.error('Asset file missing on disk', { id, filePath });
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND_ON_DISK', message: 'The asset file is missing from storage.' }
      });
    }

    const stat = await fsPromises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': asset.mime_type || 'video/mp4'
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': asset.mime_type || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.filename)}"`
      });

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/transitions/:id
 * Single transition metadata
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Asset ID must be a valid number' }
      });
    }

    const asset = await assetService.getAssetById('transitions', id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Transition with ID ${id} not found` }
      });
    }

    return res.status(200).json({
      success: true,
      data: asset
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
