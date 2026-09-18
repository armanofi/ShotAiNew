const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks whether an error is retryable
 */
function isRetryableError(error) {
  if (!error) return false;

  // Network or socket errors
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND'];
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  // HTTP status codes: 500, 502, 503, 504
  if (error.response) {
    const status = error.response.status;
    if ([500, 502, 503, 504].includes(status)) {
      return true;
    }
    // Explicitly reject retry on 400, 401, 403, 404
    return false;
  }

  // Request timeouts
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Checks if asset with the given checksum exists on the server
 */
async function checkChecksumOnServer(serverUrl, apiKey, type, checksum) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/admin/check-checksum`;
  try {
    const res = await axios.get(url, {
      params: { type, checksum },
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      throw new Error('Authentication failed (HTTP 401). Please check apiKey in config.json.');
    }
    throw err;
  }
}

/**
 * Uploads an asset MP4 and thumbnail with automatic 3-stage retry
 */
async function uploadAssetWithRetry(serverUrl, apiKey, { type, filePath, thumbnailPath, name, category, checksum }) {
  const endpointType = type === 'transitions' ? 'transition' : 'effect';
  const url = `${serverUrl.replace(/\/+$/, '')}/api/admin/upload/${endpointType}`;

  const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
  let attempt = 0;

  while (true) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        form.append('thumbnail', fs.createReadStream(thumbnailPath));
      }

      form.append('name', name);
      form.append('category', category);
      form.append('checksum', checksum);

      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiKey}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000 // 5 minutes timeout for large MP4s
      });

      return response.data;
    } catch (err) {
      attempt++;

      // Check if 400 or 401
      if (err.response && (err.response.status === 400 || err.response.status === 401)) {
        const errorMsg = err.response.data?.error?.message || err.message;
        const errObj = new Error(errorMsg);
        errObj.status = err.response.status;
        throw errObj;
      }

      if (attempt <= retryDelays.length && isRetryableError(err)) {
        const delay = retryDelays[attempt - 1];
        // Wait before next retry
        await sleep(delay);
        continue;
      }

      // If non-retryable or max retries exceeded
      const finalMsg = err.response?.data?.error?.message || err.message;
      throw new Error(`Upload failed after ${attempt} attempts: ${finalMsg}`);
    }
  }
}

module.exports = {
  checkChecksumOnServer,
  uploadAssetWithRetry
};
