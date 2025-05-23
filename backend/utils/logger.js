const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Create logs directory path
const logsDir = process.env.LOGS_DIR || path.join(__dirname, '../logs');

// Custom format for detailed logging
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\nStack: ${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Simple format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'pogpp-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? detailedFormat : consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: detailedFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // Separate file for error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: detailedFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // HTTP access logs
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: detailedFormat
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: detailedFormat
    })
  ]
});

// Add production-specific transports
if (process.env.NODE_ENV === 'production') {
  // Add external logging service if configured
  if (process.env.LOG_SERVICE_URL) {
    logger.add(new winston.transports.Http({
      host: process.env.LOG_SERVICE_HOST,
      port: process.env.LOG_SERVICE_PORT,
      path: process.env.LOG_SERVICE_PATH,
      format: winston.format.json()
    }));
  }
}

// Helper functions for structured logging
const loggerHelpers = {
  
  /**
   * Log user authentication events
   * @param {string} walletAddress - User wallet address
   * @param {string} action - Authentication action
   * @param {object} metadata - Additional metadata
   */
  logAuth(walletAddress, action, metadata = {}) {
    logger.info('Authentication event', {
      type: 'auth',
      walletAddress: walletAddress.substring(0, 10) + '...', // Partial address for privacy
      action,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  },

  /**
   * Log visit-related events
   * @param {number} userId - User ID
   * @param {string} action - Visit action
   * @param {object} visitData - Visit data
   */
  logVisit(userId, action, visitData = {}) {
    logger.info('Visit event', {
      type: 'visit',
      userId,
      action,
      locationName: visitData.locationName,
      nfcTagId: visitData.nfcTagId,
      timestamp: new Date().toISOString(),
      coordinates: visitData.latitude && visitData.longitude ? 
        `${visitData.latitude},${visitData.longitude}` : null
    });
  },

  /**
   * Log NFT/badge events
   * @param {number} userId - User ID
   * @param {string} action - Badge action
   * @param {object} badgeData - Badge data
   */
  logBadge(userId, action, badgeData = {}) {
    logger.info('Badge event', {
      type: 'badge',
      userId,
      action,
      tokenId: badgeData.tokenId,
      badgeType: badgeData.badgeType,
      txHash: badgeData.txHash,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log blockchain interactions
   * @param {string} action - Blockchain action
   * @param {object} txData - Transaction data
   */
  logBlockchain(action, txData = {}) {
    logger.info('Blockchain event', {
      type: 'blockchain',
      action,
      txHash: txData.txHash,
      contractAddress: txData.contractAddress,
      gasUsed: txData.gasUsed,
      blockNumber: txData.blockNumber,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log IPFS operations
   * @param {string} action - IPFS action
   * @param {object} ipfsData - IPFS data
   */
  logIPFS(action, ipfsData = {}) {
    logger.info('IPFS event', {
      type: 'ipfs',
      action,
      cid: ipfsData.cid,
      ipnsKey: ipfsData.ipnsKey,
      size: ipfsData.size,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log API requests
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {number} responseTime - Response time in ms
   */
  logHTTP(req, res, responseTime) {
    logger.http('HTTP request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.userId || null,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log security events
   * @param {string} event - Security event type
   * @param {object} details - Event details
   */
  logSecurity(event, details = {}) {
    logger.warn('Security event', {
      type: 'security',
      event,
      ip: details.ip,
      userAgent: details.userAgent,
      userId: details.userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   * @param {object} metadata - Additional metadata
   */
  logPerformance(operation, duration, metadata = {}) {
    logger.debug('Performance metric', {
      type: 'performance',
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  },

  /**
   * Log system errors with context
   * @param {Error} error - Error object
   * @param {object} context - Error context
   */
  logError(error, context = {}) {
    logger.error('System error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
};

// Create a request ID for tracking
let requestIdCounter = 0;
const generateRequestId = () => {
  return `req_${Date.now()}_${++requestIdCounter}`;
};

// Middleware for request logging
const requestLogger = (req, res, next) => {
  req.requestId = generateRequestId();
  req.startTime = Date.now();

  // Add request ID to logger context
  req.logger = logger.child({ requestId: req.requestId });

  // Log request start
  req.logger.http('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    const responseTime = Date.now() - req.startTime;
    loggerHelpers.logHTTP(req, res, responseTime);
  };

  next();
};

// Export logger with helpers
module.exports = Object.assign(logger, loggerHelpers, {
  requestLogger,
  generateRequestId
});