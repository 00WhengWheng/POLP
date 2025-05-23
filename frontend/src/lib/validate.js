// Validation utilities for frontend

// Wallet address validation
export const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Wallet address is required' };
  }

  // Basic Ethereum address validation
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!ethAddressRegex.test(address)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }

  return { valid: true };
};

// Coordinates validation
export const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Coordinates must be valid numbers' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }

  // Check for null island (0,0) which is suspicious
  if (lat === 0 && lon === 0) {
    return { valid: false, error: 'Invalid coordinates (null island)' };
  }

  return { valid: true, latitude: lat, longitude: lon };
};

// NFC tag ID validation
export const validateNFCTagId = (tagId) => {
  if (!tagId || typeof tagId !== 'string') {
    return { valid: false, error: 'NFC tag ID is required' };
  }

  if (tagId.length < 4 || tagId.length > 100) {
    return { valid: false, error: 'NFC tag ID must be between 4 and 100 characters' };
  }

  // Allow alphanumeric characters and some special characters
  const validCharsRegex = /^[a-zA-Z0-9\-_:]+$/;
  if (!validCharsRegex.test(tagId)) {
    return { valid: false, error: 'NFC tag ID contains invalid characters' };
  }

  return { valid: true };
};

// Username validation
export const validateUsername = (username) => {
  if (!username) {
    return { valid: true }; // Username is optional
  }

  if (typeof username !== 'string') {
    return { valid: false, error: 'Username must be a string' };
  }

  if (username.length < 3 || username.length > 30) {
    return { valid: false, error: 'Username must be between 3 and 30 characters' };
  }

  // Allow alphanumeric characters, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  // Check for reserved usernames
  const reservedUsernames = ['admin', 'root', 'user', 'pogpp', 'api', 'system'];
  if (reservedUsernames.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
};

// Location name validation
export const validateLocationName = (locationName) => {
  if (!locationName) {
    return { valid: true }; // Location name is optional
  }

  if (typeof locationName !== 'string') {
    return { valid: false, error: 'Location name must be a string' };
  }

  if (locationName.length > 200) {
    return { valid: false, error: 'Location name must be less than 200 characters' };
  }

  // Basic sanity check - no only whitespace
  if (locationName.trim().length === 0) {
    return { valid: false, error: 'Location name cannot be only whitespace' };
  }

  return { valid: true };
};

// Visit description validation
export const validateVisitDescription = (description) => {
  if (!description) {
    return { valid: true }; // Description is optional
  }

  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }

  if (description.length > 1000) {
    return { valid: false, error: 'Description must be less than 1000 characters' };
  }

  return { valid: true };
};

// Email validation
export const validateEmail = (email) => {
  if (!email) {
    return { valid: true }; // Email is optional
  }

  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
};

// URL validation
export const validateURL = (url) => {
  if (!url) {
    return { valid: true }; // URL is optional
  }

  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

// IPFS CID validation
export const validateIPFSCID = (cid) => {
  if (!cid || typeof cid !== 'string') {
    return { valid: false, error: 'IPFS CID is required' };
  }

  // Basic CID validation (v0 and v1)
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidV1Regex = /^bafy[a-z0-9]{52,}$/;

  if (!cidV0Regex.test(cid) && !cidV1Regex.test(cid)) {
    return { valid: false, error: 'Invalid IPFS CID format' };
  }

  return { valid: true };
};

// Token ID validation
export const validateTokenId = (tokenId) => {
  if (tokenId === null || tokenId === undefined) {
    return { valid: false, error: 'Token ID is required' };
  }

  const id = parseInt(tokenId);
  
  if (isNaN(id) || id < 0) {
    return { valid: false, error: 'Token ID must be a non-negative integer' };
  }

  return { valid: true, tokenId: id };
};

// Badge type validation
export const validateBadgeType = (badgeType) => {
  const validTypes = ['location', 'achievement', 'special', 'milestone'];
  
  if (!badgeType || !validTypes.includes(badgeType)) {
    return { 
      valid: false, 
      error: `Badge type must be one of: ${validTypes.join(', ')}` 
    };
  }

  return { valid: true };
};

// Form validation helper
export const validateForm = (data, rules) => {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = data[field];

    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${field} is required`;
      isValid = false;
      return;
    }

    if (value && rule.validator) {
      const result = rule.validator(value);
      if (!result.valid) {
        errors[field] = result.error;
        isValid = false;
      }
    }
  });

  return { isValid, errors };
};

// Visit data validation
export const validateVisitData = (visitData) => {
  const rules = {
    nfcTagId: { required: true, validator: validateNFCTagId },
    latitude: { required: true, validator: (lat) => validateCoordinates(lat, visitData.longitude) },
    longitude: { required: true, validator: (lon) => validateCoordinates(visitData.latitude, lon) },
    locationName: { required: false, validator: validateLocationName },
    description: { required: false, validator: validateVisitDescription }
  };

  return validateForm(visitData, rules);
};

// Registration data validation
export const validateRegistrationData = (regData) => {
  const rules = {
    walletAddress: { required: true, validator: validateWalletAddress },
    username: { required: false, validator: validateUsername },
    signature: { required: true, validator: (sig) => sig ? { valid: true } : { valid: false, error: 'Signature is required' } },
    message: { required: true, validator: (msg) => msg ? { valid: true } : { valid: false, error: 'Message is required' } }
  };

  return validateForm(regData, rules);
};

// GPS accuracy validation
export const validateGPSAccuracy = (accuracy, maxAccuracy = 100) => {
  if (accuracy === null || accuracy === undefined) {
    return { valid: false, error: 'GPS accuracy is required' };
  }

  const acc = parseFloat(accuracy);
  
  if (isNaN(acc) || acc < 0) {
    return { valid: false, error: 'GPS accuracy must be a positive number' };
  }

  if (acc > maxAccuracy) {
    return { 
      valid: false, 
      error: `GPS accuracy too low: ${acc}m (maximum allowed: ${maxAccuracy}m)` 
    };
  }

  return { valid: true, accuracy: acc };
};

// Distance validation for proximity checks
export const validateProximity = (userLat, userLon, targetLat, targetLon, maxDistance = 100) => {
  const coordValidation = validateCoordinates(userLat, userLon);
  if (!coordValidation.valid) {
    return coordValidation;
  }

  const targetValidation = validateCoordinates(targetLat, targetLon);
  if (!targetValidation.valid) {
    return { valid: false, error: 'Invalid target coordinates' };
  }

  // Calculate distance using Haversine formula
  const R = 6371000; // Earth's radius in meters
  const dLat = (targetLat - userLat) * Math.PI / 180;
  const dLon = (targetLon - userLon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  if (distance > maxDistance) {
    return { 
      valid: false, 
      error: `Too far from target location: ${Math.round(distance)}m (maximum: ${maxDistance}m)`,
      distance: Math.round(distance)
    };
  }

  return { valid: true, distance: Math.round(distance) };
};

// Sanitize input data
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// Clean and validate object
export const cleanAndValidate = (data, cleaners = {}) => {
  const cleaned = {};
  
  Object.keys(data).forEach(key => {
    let value = data[key];
    
    // Apply custom cleaner if provided
    if (cleaners[key]) {
      value = cleaners[key](value);
    } else if (typeof value === 'string') {
      value = sanitizeInput(value);
    }
    
    cleaned[key] = value;
  });
  
  return cleaned;
};

export default {
  validateWalletAddress,
  validateCoordinates,
  validateNFCTagId,
  validateUsername,
  validateLocationName,
  validateVisitDescription,
  validateEmail,
  validateURL,
  validateIPFSCID,
  validateTokenId,
  validateBadgeType,
  validateForm,
  validateVisitData,
  validateRegistrationData,
  validateGPSAccuracy,
  validateProximity,
  sanitizeInput,
  cleanAndValidate
};