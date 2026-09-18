const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (err) {
    // Ignore directory creation error if already exists
  }
}

const LOG_FILE = path.join(LOGS_DIR, 'server.log');

/**
 * Strips sensitive keys or headers from objects before logging
 */
function sanitize(data) {
  if (!data) return data;
  if (typeof data === 'string') {
    return data
      .replace(/(Bearer\s+)[A-Za-z0-9_\-\.]+/gi, '$1[REDACTED]')
      .replace(/(password=)[^&]+/gi, '$1[REDACTED]')
      .replace(/(ADMIN_API_KEY=)[^\n]+/gi, '$1[REDACTED]');
  }

  if (typeof data === 'object') {
    const clone = Array.isArray(data) ? [...data] : { ...data };
    for (const key of Object.keys(clone)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('apikey') ||
        lower.includes('api_key') ||
        lower === 'authorization' ||
        lower === 'cookie' ||
        lower === 'token'
      ) {
        clone[key] = '[REDACTED]';
      } else if (typeof clone[key] === 'object' && clone[key] !== null) {
        clone[key] = sanitize(clone[key]);
      }
    }
    return clone;
  }
  return data;
}

function writeLog(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const safeMeta = meta ? sanitize(meta) : null;
  const logEntry = {
    timestamp,
    level,
    message: sanitize(message),
    ...(safeMeta ? { meta: safeMeta } : {})
  };

  const formattedLine = `[${timestamp}] [${level.toUpperCase()}] ${logEntry.message}${
    safeMeta ? ' ' + JSON.stringify(safeMeta) : ''
  }\n`;

  // Output to stdout/stderr
  if (level === 'error') {
    process.stderr.write(formattedLine);
  } else {
    process.stdout.write(formattedLine);
  }

  // Append to log file
  try {
    fs.appendFileSync(LOG_FILE, formattedLine);
  } catch (err) {
    // Ignore logging write error
  }
}

module.exports = {
  info: (msg, meta) => writeLog('info', msg, meta),
  warn: (msg, meta) => writeLog('warn', msg, meta),
  error: (msg, meta) => writeLog('error', msg, meta),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      writeLog('debug', msg, meta);
    }
  }
};
