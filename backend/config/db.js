const { Pool } = require('pg-pool');
const { migrate } = require('node-pg-migrate');
const logger = require('../utils/logger');

// Configurazione del pool di connessioni
const createPool = (config) => {
  return new Pool({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: config.database,
    max: config.pool.max, // massimo numero di clients nel pool
    idleTimeoutMillis: config.pool.idle, // tempo massimo di inattività prima di chiudere una connessione
    connectionTimeoutMillis: config.pool.acquire, // tempo massimo di attesa per una nuova connessione
    maxUses: 7500, // numero massimo di query per connessione prima del riciclo
    ssl: config.ssl ? {
      rejectUnauthorized: false,
      ca: config.ssl.ca
    } : undefined,
    application_name: 'polp_backend'
  });
};

// Configurazione del database per diversi ambienti
const config = {
  development: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'polp_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 3,
      interval: 1000
    }
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'polp_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }  },
  test: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'polp_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 2,
      interval: 1000
    }
  },
  production: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: {
      rejectUnauthorized: false,
      ca: process.env.DB_SSL_CA
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 5,
      interval: 2000
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create connection pool
const pool = createPool(dbConfig);

// Test database connection with retry logic
async function testConnection(retries = dbConfig.retry.max) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info(`Database connection established successfully (${env})`);
      return true;
    } catch (error) {
      logger.error(`Connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) {
        throw new Error('Failed to connect to database after multiple attempts');
      }
      await new Promise(resolve => setTimeout(resolve, dbConfig.retry.interval));
    }
  }
  return false;
}

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    
    // Test connection
    await testConnection();

    // Run migrations
    await migrate({
      direction: 'up',
      migrationsTable: 'migrations',
      dir: 'migrations',
      databaseUrl: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl
      },
      log: msg => logger.info(msg),
      noLock: true
    });

    logger.info('Database initialized and migrations completed successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Close all database connections
async function closeConnection() {
  try {
    await pool.end();
    logger.info('All database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}

// Health check with detailed diagnostics
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
      error: error.message
    };
  } finally {
    client.release();
  }
}

// Transaction wrapper with automatic rollback
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

// Query helper with automatic connection management
async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) { // Log slow queries (over 1s)
      logger.warn('Slow query:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } finally {
    client.release();
  }
}

// Expose database interface
module.exports = {
  pool,
  config,
  query,
  testConnection,
  initializeDatabase,
  closeConnection,
  healthCheck,
  withTransaction,
  // Helper method to get a client from the pool
  getClient: () => pool.connect()
};