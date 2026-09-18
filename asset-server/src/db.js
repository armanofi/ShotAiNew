const { Pool } = require('pg');
const logger = require('./utils/logger');

const connectionString = process.env.DATABASE_URL || 'postgresql://shotaistudio:password@127.0.0.1:5432/shotaistudio';

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

/**
 * Initializes tables and indexes if they do not already exist.
 * Preserves all existing data.
 */
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Effects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS effects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        thumbnail_path VARCHAR(500),
        version INTEGER NOT NULL DEFAULT 1,
        file_size BIGINT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        mime_type VARCHAR(100) DEFAULT 'video/mp4',
        storage_key VARCHAR(500),
        thumbnail_key VARCHAR(500)
      );
    `);

    // 2. Transitions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transitions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        thumbnail_path VARCHAR(500),
        version INTEGER NOT NULL DEFAULT 1,
        file_size BIGINT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        mime_type VARCHAR(100) DEFAULT 'video/mp4',
        storage_key VARCHAR(500),
        thumbnail_key VARCHAR(500)
      );
    `);

    // 3. Database Indexes (effects)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_effects_category ON effects(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_effects_status ON effects(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_effects_checksum ON effects(checksum);`);

    // 4. Database Indexes (transitions)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transitions_category ON transitions(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transitions_status ON transitions(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transitions_checksum ON transitions(checksum);`);

    await client.query('COMMIT');
    logger.info('Database schema and indexes initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database tables or indexes', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute parameterized query
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

/**
 * Acquire client for transaction
 */
async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  client.query = (...args) => {
    return query(...args);
  };
  client.release = () => {
    return release();
  };
  return client;
}

/**
 * Gracefully close pool
 */
async function closePool() {
  logger.info('Closing PostgreSQL connection pool...');
  await pool.end();
  logger.info('PostgreSQL connection pool closed');
}

module.exports = {
  pool,
  query,
  getClient,
  initDatabase,
  closePool
};
