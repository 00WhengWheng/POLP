const geolib = require('geolib');
const logger = require('../utils/logger');

class GPSService {

  /**
   * Validate GPS coordinates
   * @param {number} latitude - Latitude value
   * @param {number} longitude - Longitude value
   * @returns {boolean} - True if coordinates are valid
   */
  async validateCoordinates(latitude, longitude) {
    try {
      // Check if values are numbers
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        logger.warn(`Invalid coordinate format: lat=${latitude}, lng=${longitude}`);
        return false;
      }

      // Validate coordinate ranges
      const isValidLat = lat >= -90 && lat <= 90;
      const isValidLng = lng >= -180 && lng <= 180;

      // Check if coordinates are not null island (0,0)
      const isNotNullIsland = !(lat === 0 && lng === 0);

      const isValid = isValidLat && isValidLng && isNotNullIsland;

      if (!isValid) {
        logger.warn(`Invalid coordinates: lat=${lat}, lng=${lng}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Coordinate validation error:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two points in meters
   * @param {number} lat1 - First point latitude
   * @param {number} lng1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lng2 - Second point longitude
   * @returns {number} - Distance in meters
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    try {
      const point1 = { latitude: parseFloat(lat1), longitude: parseFloat(lng1) };
      const point2 = { latitude: parseFloat(lat2), longitude: parseFloat(lng2) };

      const distance = geolib.getDistance(point1, point2);
      
      logger.debug(`Distance calculated: ${distance}m between (${lat1},${lng1}) and (${lat2},${lng2})`);
      
      return distance;
    } catch (error) {
      logger.error('Distance calculation error:', error);
      throw new Error('Failed to calculate distance');
    }
  }

  /**
   * Check if a point is within a geofence
   * @param {number} latitude - Point latitude
   * @param {number} longitude - Point longitude
   * @param {object} geofence - Geofence definition
   * @returns {boolean} - True if point is within geofence
   */
  isWithinGeofence(latitude, longitude, geofence) {
    try {
      const point = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };

      if (geofence.type === 'circle') {
        const center = { 
          latitude: geofence.center.latitude, 
          longitude: geofence.center.longitude 
        };
        const distance = geolib.getDistance(point, center);
        const isWithin = distance <= geofence.radius;
        
        logger.debug(`Geofence check: ${isWithin}, distance: ${distance}m, radius: ${geofence.radius}m`);
        
        return isWithin;
      }

      if (geofence.type === 'polygon') {
        const isWithin = geolib.isPointInPolygon(point, geofence.polygon);
        
        logger.debug(`Polygon geofence check: ${isWithin}`);
        
        return isWithin;
      }

      throw new Error('Unsupported geofence type');
    } catch (error) {
      logger.error('Geofence check error:', error);
      return false;
    }
  }

  /**
   * Get the center point of multiple coordinates
   * @param {Array} coordinates - Array of {latitude, longitude} objects
   * @returns {object} - Center point coordinates
   */
  getCenterPoint(coordinates) {
    try {
      if (!coordinates || coordinates.length === 0) {
        throw new Error('No coordinates provided');
      }

      const center = geolib.getCenter(coordinates);
      
      logger.debug(`Center point calculated: ${center.latitude}, ${center.longitude}`);
      
      return {
        latitude: center.latitude,
        longitude: center.longitude
      };
    } catch (error) {
      logger.error('Center point calculation error:', error);
      throw new Error('Failed to calculate center point');
    }
  }

  /**
   * Find the nearest point to a given location
   * @param {object} targetPoint - Target point {latitude, longitude}
   * @param {Array} points - Array of points to search
   * @returns {object} - Nearest point with distance
   */
  findNearestPoint(targetPoint, points) {
    try {
      if (!points || points.length === 0) {
        throw new Error('No points provided');
      }

      let nearestPoint = null;
      let minDistance = Infinity;

      points.forEach((point, index) => {
        const distance = this.calculateDistance(
          targetPoint.latitude,
          targetPoint.longitude,
          point.latitude,
          point.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = { ...point, index, distance };
        }
      });

      logger.debug(`Nearest point found at distance: ${minDistance}m`);

      return nearestPoint;
    } catch (error) {
      logger.error('Find nearest point error:', error);
      throw new Error('Failed to find nearest point');
    }
  }

  /**
   * Convert coordinates to a different format
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} format - Output format ('dms', 'decimal', 'mgrs')
   * @returns {object} - Formatted coordinates
   */
  formatCoordinates(latitude, longitude, format = 'decimal') {
    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      switch (format) {
        case 'decimal':
          return {
            latitude: lat,
            longitude: lng,
            format: 'decimal'
          };

        case 'dms':
          return {
            latitude: geolib.toDegreesMinutesSeconds(lat),
            longitude: geolib.toDegreesMinutesSeconds(lng),
            format: 'dms'
          };

        case 'mgrs':
          // For MGRS, you'd need an additional library like mgrs
          // For now, return decimal as fallback
          return {
            latitude: lat,
            longitude: lng,
            format: 'decimal (MGRS not implemented)'
          };

        default:
          throw new Error('Unsupported coordinate format');
      }
    } catch (error) {
      logger.error('Coordinate formatting error:', error);
      throw new Error('Failed to format coordinates');
    }
  }

  /**
   * Calculate area of a polygon defined by coordinates
   * @param {Array} polygon - Array of {latitude, longitude} points
   * @returns {number} - Area in square meters
   */
  calculatePolygonArea(polygon) {
    try {
      if (!polygon || polygon.length < 3) {
        throw new Error('Polygon must have at least 3 points');
      }

      const area = geolib.getAreaOfPolygon(polygon);
      
      logger.debug(`Polygon area calculated: ${area} square meters`);
      
      return area;
    } catch (error) {
      logger.error('Polygon area calculation error:', error);
      throw new Error('Failed to calculate polygon area');
    }
  }

  /**
   * Get compass bearing between two points
   * @param {object} point1 - Start point {latitude, longitude}
   * @param {object} point2 - End point {latitude, longitude}
   * @returns {number} - Bearing in degrees (0-360)
   */
  getCompassBearing(point1, point2) {
    try {
      const bearing = geolib.getCompassDirection(point1, point2);
      
      logger.debug(`Compass bearing calculated: ${bearing}`);
      
      return bearing;
    } catch (error) {
      logger.error('Compass bearing calculation error:', error);
      throw new Error('Failed to calculate compass bearing');
    }
  }

  /**
   * Validate and sanitize GPS accuracy
   * @param {number} accuracy - GPS accuracy in meters
   * @param {number} maxAccuracy - Maximum acceptable accuracy
   * @returns {boolean} - True if accuracy is acceptable
   */
  validateGPSAccuracy(accuracy, maxAccuracy = 100) {
    try {
      const acc = parseFloat(accuracy);
      
      if (isNaN(acc) || acc < 0) {
        logger.warn(`Invalid GPS accuracy value: ${accuracy}`);
        return false;
      }

      const isAccurate = acc <= maxAccuracy;
      
      if (!isAccurate) {
        logger.warn(`GPS accuracy too low: ${acc}m (max: ${maxAccuracy}m)`);
      }

      return isAccurate;
    } catch (error) {
      logger.error('GPS accuracy validation error:', error);
      return false;
    }
  }
}

module.exports = new GPSService();