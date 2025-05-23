// Formatting utilities for frontend

// Format wallet address for display
export const formatWalletAddress = (address, options = {}) => {
  if (!address) return '';
  
  const { 
    startChars = 6, 
    endChars = 4, 
    separator = '...' 
  } = options;
  
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}${separator}${address.slice(-endChars)}`;
};

// Format coordinates for display
export const formatCoordinates = (latitude, longitude, options = {}) => {
  if (latitude === null || latitude === undefined || 
      longitude === null || longitude === undefined) {
    return '';
  }
  
  const { 
    decimals = 6, 
    format = 'decimal', 
    includeSymbols = true 
  } = options;
  
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lon)) {
    return 'Invalid coordinates';
  }
  
  switch (format) {
    case 'dms':
      return formatCoordinatesDMS(lat, lon, includeSymbols);
    case 'decimal':
    default:
      const latStr = lat.toFixed(decimals);
      const lonStr = lon.toFixed(decimals);
      return includeSymbols ? `${latStr}°, ${lonStr}°` : `${latStr}, ${lonStr}`;
  }
};

// Format coordinates in DMS (Degrees, Minutes, Seconds)
export const formatCoordinatesDMS = (latitude, longitude, includeSymbols = true) => {
  const formatDMS = (decimal, type) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    
    const direction = type === 'lat' 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    
    if (includeSymbols) {
      return `${degrees}°${minutes}'${seconds}"${direction}`;
    } else {
      return `${degrees} ${minutes} ${seconds} ${direction}`;
    }
  };
  
  const latStr = formatDMS(latitude, 'lat');
  const lonStr = formatDMS(longitude, 'lon');
  
  return `${latStr}, ${lonStr}`;
};

// Format date/time
export const formatDateTime = (dateInput, options = {}) => {
  if (!dateInput) return '';
  
  const {
    format = 'datetime',
    locale = 'en-US',
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } = options;
  
  const date = new Date(dateInput);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString(locale, { timeZone });
    case 'time':
      return date.toLocaleTimeString(locale, { timeZone });
    case 'datetime':
      return date.toLocaleString(locale, { timeZone });
    case 'relative':
      return formatRelativeTime(date);
    case 'iso':
      return date.toISOString();
    default:
      return date.toLocaleString(locale, { timeZone });
  }
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

// Format distance
export const formatDistance = (meters, options = {}) => {
  if (meters === null || meters === undefined) return '';
  
  const { unit = 'metric', decimals = 1 } = options;
  const distance = parseFloat(meters);
  
  if (isNaN(distance)) return '';
  
  if (unit === 'imperial') {
    const feet = distance * 3.28084;
    const miles = feet / 5280;
    
    if (feet < 1000) {
      return `${Math.round(feet)} ft`;
    } else {
      return `${miles.toFixed(decimals)} mi`;
    }
  } else {
    // Metric
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    } else {
      const km = distance / 1000;
      return `${km.toFixed(decimals)} km`;
    }
  }
};

// Format file size
export const formatFileSize = (bytes, options = {}) => {
  if (bytes === null || bytes === undefined) return '';
  
  const { decimals = 1 } = options;
  const size = parseFloat(bytes);
  
  if (isNaN(size) || size === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(size) / Math.log(k));
  
  return `${parseFloat((size / Math.pow(k, i)).toFixed(decimals))} ${units[i]}`;
};

// Format currency (for gas fees, etc.)
export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined) return '';
  
  const {
    currency = 'ETH',
    decimals = 4,
    showSymbol = true
  } = options;
  
  const value = parseFloat(amount);
  
  if (isNaN(value)) return '';
  
  const formatted = value.toFixed(decimals);
  return showSymbol ? `${formatted} ${currency}` : formatted;
};

// Format percentage
export const formatPercentage = (value, options = {}) => {
  if (value === null || value === undefined) return '';
  
  const { decimals = 1, showSign = false } = options;
  const num = parseFloat(value);
  
  if (isNaN(num)) return '';
  
  const formatted = num.toFixed(decimals);
  const sign = showSign && num > 0 ? '+' : '';
  
  return `${sign}${formatted}%`;
};

// Format number with thousands separators
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined) return '';
  
  const {
    decimals = 0,
    locale = 'en-US'
  } = options;
  
  const num = parseFloat(number);
  
  if (isNaN(num)) return '';
  
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Format badge rarity
export const formatBadgeRarity = (rarity) => {
  if (!rarity) return '';
  
  const rarityColors = {
    common: '#9CA3AF',     // Gray
    uncommon: '#10B981',   // Green
    rare: '#3B82F6',       // Blue
    epic: '#8B5CF6',       // Purple
    legendary: '#F59E0B'   // Orange/Gold
  };
  
  return {
    name: rarity.charAt(0).toUpperCase() + rarity.slice(1),
    color: rarityColors[rarity] || '#9CA3AF',
    rarity
  };
};

// Format GPS accuracy status
export const formatAccuracyStatus = (accuracy) => {
  if (accuracy === null || accuracy === undefined) return '';
  
  const acc = parseFloat(accuracy);
  
  if (isNaN(acc)) return '';
  
  let status, color;
  
  if (acc <= 10) {
    status = 'Excellent';
    color = '#10B981'; // Green
  } else if (acc <= 50) {
    status = 'Good';
    color = '#3B82F6'; // Blue
  } else if (acc <= 100) {
    status = 'Moderate';
    color = '#F59E0B'; // Orange
  } else {
    status = 'Poor';
    color = '#EF4444'; // Red
  }
  
  return {
    status,
    color,
    accuracy: `±${Math.round(acc)}m`
  };
};

// Format NFC tag ID for display
export const formatNFCTagId = (tagId, options = {}) => {
  if (!tagId) return '';
  
  const { maxLength = 20, showPrefix = true } = options;
  
  let formatted = tagId;
  
  if (formatted.length > maxLength) {
    const half = Math.floor((maxLength - 3) / 2);
    formatted = `${formatted.slice(0, half)}...${formatted.slice(-half)}`;
  }
  
  return showPrefix ? `Tag: ${formatted}` : formatted;
};

// Format visit status
export const formatVisitStatus = (status) => {
  const statusConfig = {
    pending: { label: 'Pending', color: '#F59E0B' },
    verified: { label: 'Verified', color: '#10B981' },
    rejected: { label: 'Rejected', color: '#EF4444' },
    flagged: { label: 'Flagged', color: '#8B5CF6' }
  };
  
  return statusConfig[status] || { label: status, color: '#9CA3AF' };
};

// Format token ID
export const formatTokenId = (tokenId, options = {}) => {
  if (tokenId === null || tokenId === undefined) return '';
  
  const { prefix = '#' } = options;
  
  return `${prefix}${tokenId}`;
};

// Format URL for display
export const formatURL = (url, options = {}) => {
  if (!url) return '';
  
  const { maxLength = 50, showProtocol = false } = options;
  
  try {
    const urlObj = new URL(url);
    let formatted = showProtocol ? url : url.replace(urlObj.protocol + '//', '');
    
    if (formatted.length > maxLength) {
      formatted = formatted.slice(0, maxLength - 3) + '...';
    }
    
    return formatted;
  } catch {
    return url;
  }
};

// Format IPFS CID for display
export const formatIPFSCID = (cid, options = {}) => {
  if (!cid) return '';
  
  const { 
    startChars = 8, 
    endChars = 6, 
    separator = '...',
    showPrefix = false
  } = options;
  
  let formatted = cid;
  
  if (cid.length > startChars + endChars + separator.length) {
    formatted = `${cid.slice(0, startChars)}${separator}${cid.slice(-endChars)}`;
  }
  
  return showPrefix ? `IPFS: ${formatted}` : formatted;
};

// Pluralize words
export const pluralize = (count, singular, plural = null) => {
  if (count === 1) return singular;
  return plural || `${singular}s`;
};

// Format list with proper conjunction
export const formatList = (items, options = {}) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  
  const { conjunction = 'and', maxItems = null } = options;
  
  let displayItems = items;
  
  if (maxItems && items.length > maxItems) {
    displayItems = items.slice(0, maxItems);
  }
  
  if (displayItems.length === 1) {
    return displayItems[0];
  } else if (displayItems.length === 2) {
    return `${displayItems[0]} ${conjunction} ${displayItems[1]}`;
  } else {
    const lastItem = displayItems.pop();
    const remaining = items.length - displayItems.length - 1;
    
    let result = displayItems.join(', ') + `, ${conjunction} ${lastItem}`;
    
    if (remaining > 0) {
      result += ` ${conjunction} ${remaining} more`;
    }
    
    return result;
  }
};

export default {
  formatWalletAddress,
  formatCoordinates,
  formatCoordinatesDMS,
  formatDateTime,
  formatRelativeTime,
  formatDistance,
  formatFileSize,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatBadgeRarity,
  formatAccuracyStatus,
  formatNFCTagId,
  formatVisitStatus,
  formatTokenId,
  formatURL,
  formatIPFSCID,
  pluralize,
  formatList
};