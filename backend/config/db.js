const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration
const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'pogpp_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'pogpp_test',
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
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info(`Database connection established successfully (${env})`);
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Sync models (create tables if they don't exist)
    await sequelize.sync({ 
      force: process.env.DB_FORCE_SYNC === 'true',
      alter: process.env.DB_ALTER_SYNC === 'true'
    });

    logger.info('Database synchronized successfully');
    return true;

  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Close database connection
async function closeConnection() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Health check
async function healthCheck() {
  try {
    await sequelize.authenticate();
    return {
      status: 'healthy',
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// Transaction wrapper
async function withTransaction(callback) {
  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  sequelize,
  config,
  testConnection,
  initializeDatabase,
  closeConnection,
  healthCheck,
  withTransaction
};