import { useState, useEffect, useCallback, useRef } from 'react';

const useNFC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRead, setLastRead] = useState(null);
  const [permission, setPermission] = useState('prompt');
  
  const abortControllerRef = useRef(null);
  const readTimeoutRef = useRef(null);

  // Check NFC support
  useEffect(() => {
    const checkNFCSupport = () => {
      if ('NDEFReader' in window) {
        setIsSupported(true);
        checkPermission();
      } else {
        setIsSupported(false);
        setError('NFC is not supported on this device');
      }
    };

    checkNFCSupport();
  }, []);

  // Check NFC permission
  const checkPermission = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'nfc' });
        setPermission(result.state);
        
        result.addEventListener('change', () => {
          setPermission(result.state);
        });
      }
    } catch (error) {
      console.warn('Could not check NFC permission:', error);
    }
  }, []);

  // Start NFC reading
  const startReading = useCallback(async (options = {}) => {
    if (!isSupported) {
      throw new Error('NFC is not supported on this device');
    }

    if (isReading) {
      throw new Error('NFC reading is already in progress');
    }

    try {
      setError(null);
      setIsReading(true);

      // Create abort controller for this reading session
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Create NDEFReader instance
      const ndef = new NDEFReader();

      // Set up reading timeout
      const timeout = options.timeout || 30000; // 30 seconds default
      readTimeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setError('NFC reading timeout');
        }
      }, timeout);

      // Start scanning
      await ndef.scan({ signal });

      return new Promise((resolve, reject) => {
        // Handle reading event
        ndef.addEventListener('reading', ({ message, serialNumber }) => {
          try {
            clearTimeout(readTimeoutRef.current);
            
            // Parse NFC data
            const nfcData = parseNFCMessage(message);
            
            const readResult = {
              serialNumber,
              timestamp: new Date().toISOString(),
              rawMessage: message,
              parsedData: nfcData,
              tagId: serialNumber || generateTagId(message)
            };

            setLastRead(readResult);
            setIsReading(false);
            
            // Call success callback if provided
            if (options.onSuccess) {
              options.onSuccess(readResult);
            }
            
            resolve(readResult);
            
          } catch (parseError) {
            console.error('Error parsing NFC data:', parseError);
            setError('Failed to parse NFC data');
            reject(parseError);
          }
        });

        // Handle reading error
        ndef.addEventListener('readingerror', (event) => {
          console.error('NFC reading error:', event);
          setError('Failed to read NFC tag');
          setIsReading(false);
          clearTimeout(readTimeoutRef.current);
          
          if (options.onError) {
            options.onError(new Error('Failed to read NFC tag'));
          }
          
          reject(new Error('Failed to read NFC tag'));
        });

        // Handle abort
        signal.addEventListener('abort', () => {
          setIsReading(false);
          clearTimeout(readTimeoutRef.current);
          
          if (!error) { // Only reject if not already handled
            reject(new Error('NFC reading was cancelled'));
          }
        });
      });

    } catch (error) {
      setIsReading(false);
      clearTimeout(readTimeoutRef.current);
      
      if (error.name === 'NotAllowedError') {
        const permissionError = 'NFC permission denied. Please enable NFC access.';
        setError(permissionError);
        throw new Error(permissionError);
      } else if (error.name === 'NotSupportedError') {
        const supportError = 'NFC is not supported on this device';
        setError(supportError);
        throw new Error(supportError);
      } else {
        setError(error.message);
        throw error;
      }
    }
  }, [isSupported, isReading, error]);

  // Stop NFC reading
  const stopReading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (readTimeoutRef.current) {
      clearTimeout(readTimeoutRef.current);
      readTimeoutRef.current = null;
    }
    
    setIsReading(false);
  }, []);

  // Write to NFC tag (if supported)
  const writeTag = useCallback(async (data, options = {}) => {
    if (!isSupported) {
      throw new Error('NFC is not supported on this device');
    }

    try {
      setError(null);
      
      const ndef = new NDEFReader();
      
      // Prepare NDEF message
      const message = {
        records: [
          {
            recordType: "text",
            data: JSON.stringify(data)
          }
        ]
      };

      // Add URL record if provided
      if (options.url) {
        message.records.push({
          recordType: "url",
          data: options.url
        });
      }

      await ndef.write(message, options);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        data: data
      };

    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [isSupported]);

  // Parse NFC message
  const parseNFCMessage = (message) => {
    try {
      const records = [];
      
      for (const record of message.records) {
        const recordData = {
          recordType: record.recordType,
          mediaType: record.mediaType,
          id: record.id,
          data: null
        };

        // Decode record data based on type
        switch (record.recordType) {
          case 'text':
            recordData.data = new TextDecoder().decode(record.data);
            break;
          case 'url':
            recordData.data = new TextDecoder().decode(record.data);
            break;
          case 'mime':
            if (record.mediaType === 'application/json') {
              const jsonString = new TextDecoder().decode(record.data);
              recordData.data = JSON.parse(jsonString);
            } else {
              recordData.data = record.data;
            }
            break;
          default:
            recordData.data = record.data;
        }

        records.push(recordData);
      }

      return {
        records,
        totalRecords: records.length,
        parsedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing NFC message:', error);
      return {
        error: 'Failed to parse NFC message',
        rawMessage: message
      };
    }
  };

  // Generate tag ID from message if serial number not available
  const generateTagId = (message) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return `generated_${Math.abs(hash).toString(16)}`;
    } catch (error) {
      return `fallback_${Date.now()}`;
    }
  };

  // Request NFC permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('NFC is not supported on this device');
    }

    try {
      // Try to start a scan to trigger permission request
      const ndef = new NDEFReader();
      const abortController = new AbortController();
      
      // Abort immediately after starting to just trigger permission
      setTimeout(() => abortController.abort(), 100);
      
      await ndef.scan({ signal: abortController.signal });
      
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setPermission('denied');
        throw new Error('NFC permission denied');
      }
      // Other errors might be expected (like abort), so we don't throw them
    }
    
    // Check permission status after attempt
    await checkPermission();
  }, [isSupported, checkPermission]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopReading();
    };
  }, [stopReading]);

  // Get NFC availability info
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
    isSupported,
    isReading,
    error,
    lastRead,
    permission,

    // Actions
    startReading,
    stopReading,
    writeTag,
    requestPermission,

    // Utils
    getAvailabilityInfo,
    parseNFCMessage
  };
};

export default useNFC;