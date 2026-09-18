require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./db');
const storageService = require('./services/storageService');
const logger = require('./utils/logger');

// Route modules
const healthRoutes = require('./routes/health');
const effectsRoutes = require('./routes/effects');
const transitionsRoutes = require('./routes/transitions');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = parseInt(process.env.PORT || '3100', 10);
const HOST = process.env.HOST || '127.0.0.1';

// 1. Security & Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. CORS configuration
const allowedOriginsStr = process.env.ALLOWED_ORIGINS || 'http://localhost,http://localhost:5173,http://localhost:3000';
const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like curl, desktop apps, uploader) with no origin
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*' || origin === allowed) return true;
      if (allowed.startsWith('http://localhost') && origin.startsWith('http://localhost')) return true;
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('Blocked by CORS policy', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range']
}));

// 3. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Serve storage files (e.g. thumbnails) with path validation
app.use('/storage', express.static(storageService.getStorageRoot(), {
  dotfiles: 'ignore',
  index: false,
  maxAge: '7d'
}));

// 5. Mount API routes
app.use('/api', healthRoutes);
app.use('/api/effects', effectsRoutes);
app.use('/api/transitions', transitionsRoutes);
app.use('/api/admin', adminRoutes);

// 6. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found.`
    }
  });
});

// 7. Global error handling middleware (consistent format without exposing stack traces)
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', {
    error: err.message,
    code: err.code,
    path: req.originalUrl,
    method: req.method
  });

  const statusCode = err.status || err.statusCode || (err.code === 'UNAUTHORIZED' ? 401 : 500);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred.'
    }
  });
});

// 8. Server startup and initialization
let server = null;

async function startServer() {
  try {
    // Attempt database initialization
    try {
      await db.initDatabase();
    } catch (dbErr) {
      logger.warn('Initial database connection failed. Server will start but /api/health will return 503 until PostgreSQL is available.', {
        error: dbErr.message
      });
    }

    server = app.listen(PORT, HOST, () => {
      logger.info(`ShotAi Asset Server running on http://${HOST}:${PORT} (Internal only)`);
      logger.info(`Storage directory: ${storageService.getStorageRoot()}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// 9. Graceful shutdown handler
async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Gracefully shutting down ShotAi Asset Server...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await db.closePool();
      } catch (err) {
        logger.error('Error closing database pool', { error: err.message });
      }
      process.exit(0);
    });

    // Force close after 10s timeout
    setTimeout(() => {
      logger.error('Forceful shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();

module.exports = app;
