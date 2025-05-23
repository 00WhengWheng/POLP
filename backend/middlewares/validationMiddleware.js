const { body, param, query, validationResult } = require('express-validator');
const { ethers } = require('ethers');
const logger = require('../utils/logger');

class ValidationMiddleware {

  /**
   * Handle validation errors
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      logger.warn('Validation errors:', errors.array());
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    next();
  }

  /**
   * Validation rules for user login
   */
  validateLogin = [
    body('walletAddress')
      .isString()
      .custom((value) => {
        if (!ethers.isAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
      .withMessage('Valid wallet address is required'),

    body('signature')
      .isString()
      .isLength({ min: 130, max: 132 })
      .withMessage('Valid signature is required'),

    body('message')
      .isString()
      .isLength({ min: 10, max: 500 })
      .withMessage('Valid message is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for user registration
   */
  validateRegistration = [
    body('walletAddress')
      .isString()
      .custom((value) => {
        if (!ethers.isAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
      .withMessage('Valid wallet address is required'),

    body('signature')
      .isString()
      .isLength({ min: 130, max: 132 })
      .withMessage('Valid signature is required'),

    body('message')
      .isString()
      .isLength({ min: 10, max: 500 })
      .withMessage('Valid message is required'),

    body('username')
      .optional()
      .isString()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-30 characters, alphanumeric with _ or -'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for profile update
   */
  validateProfileUpdate = [
    body('username')
      .optional()
      .isString()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-30 characters, alphanumeric with _ or -'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for wallet signature verification
   */
  validateWalletSignature = [
    body('walletAddress')
      .isString()
      .custom((value) => {
        if (!ethers.isAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
      .withMessage('Valid wallet address is required'),

    body('signature')
      .isString()
      .isLength({ min: 130, max: 132 })
      .withMessage('Valid signature is required'),

    body('message')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for visit data
   */
  validateVisitData = [
    body('nfcTagId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('NFC tag ID is required'),

    body('latitude')
      .isNumeric()
      .custom((value) => {
        const lat = parseFloat(value);
        if (lat < -90 || lat > 90) {
          throw new Error('Latitude must be between -90 and 90');
        }
        return true;
      })
      .withMessage('Valid latitude is required'),

    body('longitude')
      .isNumeric()
      .custom((value) => {
        const lng = parseFloat(value);
        if (lng < -180 || lng > 180) {
          throw new Error('Longitude must be between -180 and 180');
        }
        return true;
      })
      .withMessage('Valid longitude is required'),

    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Valid timestamp in ISO8601 format required'),

    body('locationName')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Location name must be between 1 and 200 characters'),

    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),

    body('expectedLocation')
      .optional()
      .isObject()
      .custom((value) => {
        if (value.latitude && (value.latitude < -90 || value.latitude > 90)) {
          throw new Error('Expected location latitude must be between -90 and 90');
        }
        if (value.longitude && (value.longitude < -180 || value.longitude > 180)) {
          throw new Error('Expected location longitude must be between -180 and 180');
        }
        if (value.radiusMeters && (value.radiusMeters < 1 || value.radiusMeters > 10000)) {
          throw new Error('Expected location radius must be between 1 and 10000 meters');
        }
        return true;
      })
      .withMessage('Valid expected location object required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for visit ID parameter
   */
  validateVisitId = [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid visit ID is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for location ID parameter
   */
  validateLocationId = [
    param('locationId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Valid location ID is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for semantic search
   */
  validateSemanticSearch = [
    body('query')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Search query is required and must be less than 500 characters'),

    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for badge minting
   */
  validateBadgeMint = [
    body('visitId')
      .isInt({ min: 1 })
      .withMessage('Valid visit ID is required'),

    body('badgeType')
      .optional()
      .isString()
      .isIn(['location', 'achievement', 'special', 'milestone'])
      .withMessage('Badge type must be: location, achievement, special, or milestone'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for token ID parameter
   */
  validateTokenId = [
    param('tokenId')
      .isInt({ min: 0 })
      .withMessage('Valid token ID is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for badge transfer
   */
  validateBadgeTransfer = [
    param('tokenId')
      .isInt({ min: 0 })
      .withMessage('Valid token ID is required'),

    body('toAddress')
      .isString()
      .custom((value) => {
        if (!ethers.isAddress(value)) {
          throw new Error('Invalid recipient wallet address format');
        }
        return true;
      })
      .withMessage('Valid recipient wallet address is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for badge verification
   */
  validateBadgeVerification = [
    body('tokenId')
      .isInt({ min: 0 })
      .withMessage('Valid token ID is required'),

    body('walletAddress')
      .isString()
      .custom((value) => {
        if (!ethers.isAddress(value)) {
          throw new Error('Invalid wallet address format');
        }
        return true;
      })
      .withMessage('Valid wallet address is required'),

    this.handleValidationErrors
  ];

  /**
   * Validation rules for pagination
   */
  validatePagination = [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be 0 or greater'),

    this.handleValidationErrors
  ];

  /**
   * Custom validation for coordinate precision
   */
  validateCoordinatePrecision = [
    body(['latitude', 'longitude'])
      .custom((value) => {
        const coord = parseFloat(value);
        const precision = value.toString().split('.')[1]?.length || 0;
        
        if (precision > 8) {
          throw new Error('Coordinate precision cannot exceed 8 decimal places');
        }
        
        return true;
      })
      .withMessage('Invalid coordinate precision'),

    this.handleValidationErrors
  ];

  /**
   * Validation for file uploads (if needed)
   */
  validateFileUpload = [
    body('fileType')
      .optional()
      .isIn(['image', 'metadata', 'data'])
      .withMessage('File type must be: image, metadata, or data'),

    body('fileSize')
      .optional()
      .isInt({ min: 1, max: 10 * 1024 * 1024 }) // 10MB max
      .withMessage('File size must be between 1 byte and 10MB'),

    this.handleValidationErrors
  ];

  /**
   * Sanitize input data
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  sanitizeInput(req, res, next) {
    // Trim string values in body
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          req.body[key] = value.trim();
        }
      }
    }

    // Normalize wallet addresses to lowercase
    if (req.body?.walletAddress) {
      req.body.walletAddress = req.body.walletAddress.toLowerCase();
    }

    if (req.body?.toAddress) {
      req.body.toAddress = req.body.toAddress.toLowerCase();
    }

    next();
  }
}

module.exports = new ValidationMiddleware();