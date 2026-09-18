const logger = require('../utils/logger');

/**
 * Authentication middleware for admin endpoints.
 * Requires: Authorization: Bearer <ADMIN_API_KEY>
 */
function requireAdminAuth(req, res, next) {
  const configuredApiKey = process.env.ADMIN_API_KEY;

  if (!configuredApiKey) {
    logger.error('ADMIN_API_KEY is not configured in server environment!');
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_MISCONFIGURED',
        message: 'Admin API Key is not set on the server.'
      }
    });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    logger.warn('Unauthorized access attempt: Missing Authorization header', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing Authorization header. Format: Bearer <API_KEY>'
      }
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('Unauthorized access attempt: Invalid Authorization format', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid Authorization header format. Expected Bearer <API_KEY>'
      }
    });
  }

  const token = parts[1].trim();
  if (token !== configuredApiKey) {
    logger.warn('Unauthorized access attempt: Invalid API Key provided', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API Key.'
      }
    });
  }

  // Authentication succeeded
  next();
}

module.exports = {
  requireAdminAuth
};
