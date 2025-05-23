const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

class AuthMiddleware {

  /**
   * Authenticate JWT token from request headers
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async authenticate(req, res, next) {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          error: 'Authorization header missing',
          message: 'Please provide a valid JWT token'
        });
      }

      // Extract token from "Bearer <token>" format
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({
          error: 'Token missing',
          message: 'Please provide a valid JWT token'
        });
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expired',
            message: 'Please refresh your token or login again'
          });
        }
        
        if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({
            error: 'Invalid token',
            message: 'Please provide a valid JWT token'
          });
        }

        throw jwtError;
      }

      // Check if user exists and is active
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'The user associated with this token no longer exists'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated'
        });
      }

      // Add user info to request object
      req.user = {
        userId: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        isActive: user.isActive
      };

      // Add token info
      req.token = {
        token: token,
        payload: decoded,
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000)
      };

      logger.debug(`User authenticated: ${user.walletAddress}`);
      
      next();

    } catch (error) {
      logger.error('Authentication middleware error:', error);
      
      return res.status(500).json({
        error: 'Authentication failed',
        message: 'Internal server error during authentication'
      });
    }
  }

  /**
   * Optional authentication - continues even if no token provided
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        // No token provided, continue without authentication
        req.user = null;
        req.token = null;
        return next();
      }

      // If token is provided, validate it
      await this.authenticate(req, res, next);

    } catch (error) {
      // On error, continue without authentication
      req.user = null;
      req.token = null;
      next();
    }
  }

  /**
   * Check if user has specific wallet address
   * @param {string} requiredAddress - Required wallet address
   */
  requireWalletAddress(requiredAddress) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      if (req.user.walletAddress.toLowerCase() !== requiredAddress.toLowerCase()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    };
  }

  /**
   * Rate limiting by user
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next(); // Skip rate limiting for unauthenticated requests
      }

      const userId = req.user.userId;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get user's request history
      let userRequests = requests.get(userId) || [];
      
      // Remove old requests outside the window
      userRequests = userRequests.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
          retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
        });
      }

      // Add current request
      userRequests.push(now);
      requests.set(userId, userRequests);

      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance
        this.cleanupRateLimitData(requests, windowStart);
      }

      next();
    };
  }

  /**
   * Clean up old rate limit data
   * @param {Map} requests - Requests map
   * @param {number} windowStart - Window start timestamp
   */
  cleanupRateLimitData(requests, windowStart) {
    for (const [userId, userRequests] of requests.entries()) {
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        requests.delete(userId);
      } else {
        requests.set(userId, validRequests);
      }
    }
  }

  /**
   * Require active user account
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  requireActiveUser(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account is currently inactive'
      });
    }

    next();
  }

  /**
   * Extract user ID from token without full authentication
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  extractUserId(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        req.userId = null;
        return next();
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        req.userId = null;
        return next();
      }

      // Decode without verification (for public endpoints that want to know user)
      const decoded = jwt.decode(token);
      req.userId = decoded?.userId || null;

      next();

    } catch (error) {
      req.userId = null;
      next();
    }
  }

  /**
   * Log authentication events
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  logAuth(req, res, next) {
    if (req.user) {
      logger.info(`Authenticated request: ${req.method} ${req.path} - User: ${req.user.walletAddress}`);
    }
    next();
  }
}

module.exports = new AuthMiddleware();