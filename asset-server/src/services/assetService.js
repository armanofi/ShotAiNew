const db = require('../db');
const logger = require('../utils/logger');

/**
 * Ensures tableName is strictly either 'effects' or 'transitions'
 */
function sanitizeTable(type) {
  if (type === 'transitions') return 'transitions';
  return 'effects';
}

/**
 * List assets with pagination, category filter, and status filter
 */
async function listAssets(type, { page = 1, limit = 50, category, status }) {
  const table = sanitizeTable(type);
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10)));

  const whereClauses = [];
  const params = [];

  if (category) {
    params.push(category);
    whereClauses.push(`category = $${params.length}`);
  }

  if (status) {
    params.push(status);
    whereClauses.push(`status = $${params.length}`);
  } else {
    // Default to active assets if status not explicitly requested
    params.push('active');
    whereClauses.push(`status = $${params.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count query
  const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM ${table} ${whereSql}`, params);
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / safeLimit);

  // Data query
  const dataParams = [...params, safeLimit, offset];
  const dataSql = `
    SELECT id, name, category, filename, version, file_size, status, created_at, updated_at, checksum, mime_type, storage_key, thumbnail_key
    FROM ${table}
    ${whereSql}
    ORDER BY id ASC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataRes = await db.query(dataSql, dataParams);

  return {
    data: dataRes.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: safeLimit,
      total,
      totalPages
    }
  };
}

/**
 * Get single asset by ID with full metadata
 */
async function getAssetById(type, id) {
  const table = sanitizeTable(type);
  const res = await db.query(
    `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`,
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Check if an asset with the given checksum exists
 */
async function findAssetByChecksum(type, checksum) {
  const table = sanitizeTable(type);
  const res = await db.query(
    `SELECT id, name, category, filename, version, checksum, file_size, status FROM ${table} WHERE checksum = $1 LIMIT 1`,
    [checksum]
  );
  return res.rows[0] || null;
}

/**
 * Lightweight manifest for desktop client
 */
async function getManifest(type, baseUrl) {
  const table = sanitizeTable(type);
  const res = await db.query(`
    SELECT id, name, category, filename, version, checksum, file_size, thumbnail_key, storage_key
    FROM ${table}
    WHERE status = 'active'
    ORDER BY category ASC, name ASC
  `);

  const manifestData = res.rows.map(row => {
    const downloadUrl = `${baseUrl}/api/${table}/${row.id}/download`;
    const thumbnailUrl = row.thumbnail_key ? `${baseUrl}/storage/${row.thumbnail_key}` : null;
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      filename: row.filename,
      version: row.version,
      checksum: row.checksum,
      file_size: parseInt(row.file_size, 10) || 0,
      thumbnail_url: thumbnailUrl,
      download_url: downloadUrl
    };
  });

  return {
    success: true,
    version: 1,
    data: manifestData
  };
}

/**
 * Upserts an asset with auto-versioning and PostgreSQL transaction
 */
async function upsertAsset(type, {
  name,
  category,
  filename,
  filePath,
  thumbnailPath,
  fileSize,
  checksum,
  mimeType = 'video/mp4',
  storageKey,
  thumbnailKey
}) {
  const table = sanitizeTable(type);
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Check if checksum already exists (identical file)
    const existingByChecksum = await client.query(
      `SELECT * FROM ${table} WHERE checksum = $1 LIMIT 1`,
      [checksum]
    );

    if (existingByChecksum.rows.length > 0) {
      await client.query('COMMIT');
      const asset = existingByChecksum.rows[0];
      logger.info(`Asset skipped: identical checksum exists (${asset.filename}, v${asset.version})`);
      return {
        action: 'skipped',
        reason: 'checksum unchanged',
        asset
      };
    }

    // 2. Check if asset with same category and filename exists (file updated)
    const existingByName = await client.query(
      `SELECT * FROM ${table} WHERE category = $1 AND filename = $2 LIMIT 1`,
      [category, filename]
    );

    if (existingByName.rows.length > 0) {
      const old = existingByName.rows[0];
      const newVersion = (old.version || 1) + 1;

      const updateRes = await client.query(`
        UPDATE ${table}
        SET
          name = $1,
          version = $2,
          checksum = $3,
          file_path = $4,
          thumbnail_path = COALESCE($5, thumbnail_path),
          file_size = $6,
          mime_type = $7,
          storage_key = $8,
          thumbnail_key = COALESCE($9, thumbnail_key),
          status = 'active',
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `, [
        name || old.name,
        newVersion,
        checksum,
        filePath,
        thumbnailPath,
        fileSize,
        mimeType,
        storageKey,
        thumbnailKey,
        old.id
      ]);

      await client.query('COMMIT');
      const updatedAsset = updateRes.rows[0];
      logger.info(`Asset updated: ${filename} version ${newVersion}`);
      return {
        action: 'updated',
        version: newVersion,
        asset: updatedAsset
      };
    }

    // 3. New asset insertion (version = 1)
    const insertRes = await client.query(`
      INSERT INTO ${table} (
        name,
        category,
        filename,
        file_path,
        thumbnail_path,
        version,
        file_size,
        status,
        checksum,
        mime_type,
        storage_key,
        thumbnail_key,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 1, $6, 'active', $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      name || filename.replace(/\.[^/.]+$/, ''),
      category,
      filename,
      filePath,
      thumbnailPath,
      fileSize,
      checksum,
      mimeType,
      storageKey,
      thumbnailKey
    ]);

    await client.query('COMMIT');
    const newAsset = insertRes.rows[0];
    logger.info(`Asset created: ${filename} (v1)`);
    return {
      action: 'created',
      version: 1,
      asset: newAsset
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Error in upsertAsset on table ${table}`, { error: err.message, filename, category });
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listAssets,
  getAssetById,
  findAssetByChecksum,
  getManifest,
  upsertAsset
};
