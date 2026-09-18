const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

router.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 AS alive');
    if (result && result.rows && result.rows[0]?.alive === 1) {
      return res.status(200).json({
        success: true,
        service: 'shotai-asset-server',
        database: true
      });
    }

    logger.warn('Health check returned unexpected database response', { result });
    return res.status(503).json({
      success: false,
      service: 'shotai-asset-server',
      database: false
    });
  } catch (err) {
    logger.error('Health check failed: Database connection error', { error: err.message });
    return res.status(503).json({
      success: false,
      service: 'shotai-asset-server',
      database: false
    });
  }
});

module.exports = router;
