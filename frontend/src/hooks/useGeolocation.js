import { useState, useEffect, useCallback, useRef } from 'react';

const useGeolocation = () => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('prompt');
  const [isSupported, setIsSupported] = useState(false);
  const [watching, setWatching] = useState(false);
  
  const watchIdRef = useRef(null);
  const timeoutRef = useRef(null);

  // Check geolocation support
  useEffect(() => {
    const checkSupport = () => {
      if ('geolocation' in navigator) {
        setIsSupported(true);
        checkPermission();
      } else {
        setIsSupported(false);
        setError('Geolocation is not supported by this browser');
      }
    };

    checkSupport();
  }, []);

  // Check geolocation permission
  const checkPermission = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermission(result.state);
        
        result.addEventListener('change', () => {
          setPermission(result.state);
        });
      }
    } catch (error) {
      console.warn('Could not check geolocation permission:', error);
    }
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(async (options = {}) => {
    if (!isSupported) {
      throw new Error('Geolocation is not supported');
    }

    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
        ...options
      };

      // Set timeout for the request
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        const timeoutError = new Error('Geolocation request timeout');
        setError(timeoutError.message);
        reject(timeoutError);
      }, defaultOptions.timeout);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutRef.current);
          setLoading(false);
          
          const positionData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
            formattedTimestamp: new Date(pos.timestamp).toISOString()
          };

          setPosition(positionData);
          resolve(positionData);
        },
        (err) => {
          clearTimeout(timeoutRef.current);
          setLoading(false);
          
          let errorMessage;
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              setPermission('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timeout';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location';
              break;
          }
          
          setError(errorMessage);
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, [isSupported]);

  // Start watching position changes
  const startWatching = useCallback((options = {}) => {
    if (!isSupported) {
      throw new Error('Geolocation is not supported');
    }

    if (watching) {
      throw new Error('Already watching position');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000, // 30 seconds
      ...options
    };

    setWatching(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const positionData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          formattedTimestamp: new Date(pos.timestamp).toISOString()
        };

        setPosition(positionData);
        
        // Call callback if provided
        if (options.onPositionUpdate) {
          options.onPositionUpdate(positionData);
        }
      },
      (err) => {
        let errorMessage;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            setPermission('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timeout';
            break;
          default:
            errorMessage = 'An unknown error occurred while watching location';
            break;
        }
        
        setError(errorMessage);
        
        if (options.onError) {
          options.onError(new Error(errorMessage));
        }
      },
      defaultOptions
    );

    return watchIdRef.current;
  }, [isSupported, watching]);

  // Stop watching position changes
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return {
      kilometers: distance,
      meters: distance * 1000,
      miles: distance * 0.621371
    };
  }, []);

  // Check if position is within radius of target
  const isWithinRadius = useCallback((targetLat, targetLon, radiusMeters, currentPos = position) => {
    if (!currentPos) return false;
    
    const distance = calculateDistance(
      currentPos.latitude,
      currentPos.longitude,
      targetLat,
      targetLon
    );
    
    return distance.meters <= radiusMeters;
  }, [position, calculateDistance]);

  // Get formatted coordinates
  const getFormattedCoordinates = useCallback((pos = position) => {
    if (!pos) return null;
    
    return {
      decimal: {
        latitude: pos.latitude.toFixed(6),
        longitude: pos.longitude.toFixed(6)
      },
      dms: {
        latitude: decimalToDMS(pos.latitude, 'lat'),
        longitude: decimalToDMS(pos.longitude, 'lon')
      }
    };
  }, [position]);

  // Convert decimal degrees to DMS format
  const decimalToDMS = (decimal, type) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    
    const direction = type === 'lat' 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  // Request permission explicitly
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Geolocation is not supported');
    }

    try {
      // Try to get position to trigger permission request
      await getCurrentPosition({ timeout: 1000 });
      return true;
    } catch (error) {
      if (error.message.includes('denied')) {
        setPermission('denied');
        return false;
      }
      // Other errors might be timeout, which is fine for permission check
      return true;
    }
  }, [isSupported, getCurrentPosition]);

  // Validate coordinates
  const validateCoordinates = useCallback((lat, lon) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, error: 'Coordinates must be numbers' };
    }
    
    if (latitude < -90 || latitude > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90' };
    }
    
    if (longitude < -180 || longitude > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true, latitude, longitude };
  }, []);

  // Get location accuracy status
  const getAccuracyStatus = useCallback((pos = position) => {
    if (!pos || !pos.accuracy) return null;
    
    if (pos.accuracy <= 10) return 'excellent';
    if (pos.accuracy <= 50) return 'good';
    if (pos.accuracy <= 100) return 'moderate';
    return 'poor';
  }, [position]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopWatching();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [stopWatching]);

  // Get availability info
  const getAvailabilityInfo = useCallback(() => {
    return {
      isSupported,
      permission,
      isAvailable: isSupported && permission === 'granted',
      requiresPermission: permission === 'prompt',
      isBlocked: permission === 'denied'
    };
  }, [isSupported, permission]);

  return {
    // State
    position,
    error,
    loading,
    permission,
    isSupported,
    watching,

    // Actions
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission,

    // Utils
    calculateDistance,
    isWithinRadius,
    getFormattedCoordinates,
    validateCoordinates,
    getAccuracyStatus,
    getAvailabilityInfo
  };
};

export default useGeolocation;