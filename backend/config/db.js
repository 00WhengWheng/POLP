const { Pool } = require('pg-pool');
const logger = require('../utils/logger');

// Configurazione coerente per ogni ambiente
const config = {
  development: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'polp_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    ssl: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    retry: { max: 3, interval: 1000 }
  },
  test: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'polp_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    ssl: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    retry: { max: 2, interval: 1000 }
  },
  production: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false, ca: process.env.DB_SSL_CA }
      : false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
    retry: { max: 5, interval: 2000 }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Crea il pool di connessione
const createPool = (cfg) =>
  new Pool({
    user: cfg.user,
    password: cfg.password,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    max: cfg.pool.max,
    idleTimeoutMillis: cfg.pool.idle,
    connectionTimeoutMillis: cfg.pool.acquire,
    maxUses: 7500,
    ssl: cfg.ssl,
    application_name: 'polp_backend'
  });

const pool = createPool(dbConfig);

// Test della connessione al database con retry
async function testConnection(retries = dbConfig.retry.max) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info(`Database connection established successfully (${env})`);
      return true;
    } catch (error) {
      logger.error(`Connection attempt ${attempt}/${retries} failed:`, error.stack || error.message);
      if (attempt === retries) {
        throw new Error('Failed to connect to database after multiple attempts');
      }
      await new Promise((resolve) => setTimeout(resolve, dbConfig.retry.interval));
    }
  }
  return false;
}

// Health check avanzato
async function healthCheck() {
  const client = await pool.connect();
  try {
    const [
      version,
      connections,
      activity,
      size
    ] = await Promise.all([
      client.query('SELECT version()'),
      client.query('SELECT count(*) FROM pg_stat_activity'),
      client.query(`
        SELECT datname, state, count(*)
        FROM pg_stat_activity 
        GROUP BY datname, state
      `),
      client.query(`
        SELECT pg_size_pretty(pg_database_size($1))
      `, [dbConfig.database])
    ]);

    return {
      status: 'healthy',
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
      version: version.rows[0].version,
      activeConnections: connections.rows[0].count,
      connectionStates: activity.rows,
      databaseSize: size.rows[0].pg_size_pretty,
      poolStatus: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.stack || error.message
    };
  } finally {
    client.release();
  }
}

// Helper per transazioni sicure
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Query helper con logging delle query lente
async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow query:', { text, duration, rows: result.rowCount });
    }
    return result;
  } finally {
    client.release();
  }
}

// Chiudi tutte le connessioni
async function closeConnection() {
  try {
    await pool.end();
    logger.info('All database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error.stack || error.message);
    throw error;
  }
}

module.exports = {
  pool,
  config,
  query,
  testConnection,
  closeConnection,
  healthCheck,
  withTransaction,
  getClient: () => pool.connect()
};