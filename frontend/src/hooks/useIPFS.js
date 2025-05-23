import { useState, useEffect, useCallback } from 'react';

const useIPFS = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nodeInfo, setNodeInfo] = useState(null);

  const apiUrl = process.env.REACT_APP_IPFS_API_URL || 'http://localhost:5001';
  const gatewayUrl = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

  // Check IPFS connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Check IPFS node connection
  const checkConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiUrl}/api/v0/id`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to IPFS node');
      }
      
      const data = await response.json();
      setNodeInfo(data);
      setIsConnected(true);
      
    } catch (err) {
      console.error('IPFS connection error:', err);
      setError(err.message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Upload data to IPFS
  const uploadData = useCallback(async (data, options = {}) => {
    if (!isConnected) {
      throw new Error('Not connected to IPFS node');
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      
      if (typeof data === 'string') {
        formData.append('file', new Blob([data], { type: 'text/plain' }), options.filename || 'data.txt');
      } else if (data instanceof File) {
        formData.append('file', data);
      } else if (typeof data === 'object') {
        const jsonString = JSON.stringify(data, null, 2);
        formData.append('file', new Blob([jsonString], { type: 'application/json' }), options.filename || 'data.json');
      } else {
        throw new Error('Unsupported data type');
      }

      // Add IPFS options
      const url = new URL(`${apiUrl}/api/v0/add`);
      if (options.pin !== false) url.searchParams.append('pin', 'true');
      if (options.cidVersion) url.searchParams.append('cid-version', options.cidVersion);

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload to IPFS');
      }

      const result = await response.json();
      
      return {
        cid: result.Hash,
        size: result.Size,
        name: result.Name,
        url: `${gatewayUrl}${result.Hash}`,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, apiUrl, gatewayUrl]);

  // Get data from IPFS
  const getData = useCallback(async (cid, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Try multiple gateways for reliability
      const gateways = [
        gatewayUrl,
        'https://gateway.pinata.cloud/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/'
      ];

      let lastError;
      
      for (const gateway of gateways) {
        try {
          const url = `${gateway}${cid}`;
          const response = await fetch(url, {
            timeout: options.timeout || 10000
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const contentType = response.headers.get('content-type');
          let data;
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else if (contentType && contentType.includes('text/')) {
            data = await response.text();
          } else {
            data = await response.blob();
          }
          
          return {
            data,
            cid,
            contentType,
            size: response.headers.get('content-length'),
            gateway: gateway,
            retrievedAt: new Date().toISOString()
          };
          
        } catch (err) {
          lastError = err;
          console.warn(`Failed to retrieve from ${gateway}:`, err.message);
          continue;
        }
      }
      
      throw lastError || new Error('Failed to retrieve data from all gateways');
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [gatewayUrl]);

  // Pin content to IPFS node
  const pinContent = useCallback(async (cid) => {
    if (!isConnected) {
      throw new Error('Not connected to IPFS node');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/v0/pin/add?arg=${cid}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to pin content');
      }

      const result = await response.json();
      
      return {
        cid: result.Pins[0],
        pinned: true,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, apiUrl]);

  // Unpin content from IPFS node
  const unpinContent = useCallback(async (cid) => {
    if (!isConnected) {
      throw new Error('Not connected to IPFS node');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/v0/pin/rm?arg=${cid}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to unpin content');
      }

      const result = await response.json();
      
      return {
        cid: result.Pins[0],
        pinned: false,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, apiUrl]);

  // List pinned content
  const listPinned = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to IPFS node');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/v0/pin/ls`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to list pinned content');
      }

      const result = await response.json();
      
      return Object.keys(result.Keys || {}).map(cid => ({
        cid,
        type: result.Keys[cid].Type,
        url: `${gatewayUrl}${cid}`
      }));

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, apiUrl, gatewayUrl]);

  // Get IPFS node stats
  const getNodeStats = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to IPFS node');
    }

    try {
      setLoading(true);
      setError(null);

      const [statsResponse, versionResponse] = await Promise.all([
        fetch(`${apiUrl}/api/v0/stats/repo`, { method: 'POST' }),
        fetch(`${apiUrl}/api/v0/version`, { method: 'POST' })
      ]);

      if (!statsResponse.ok || !versionResponse.ok) {
        throw new Error('Failed to get node stats');
      }

      const [stats, version] = await Promise.all([
        statsResponse.json(),
        versionResponse.json()
      ]);

      return {
        ...stats,
        version: version.Version,
        retrievedAt: new Date().toISOString()
      };

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, apiUrl]);

  // Validate CID format
  const validateCID = useCallback((cid) => {
    if (!cid || typeof cid !== 'string') {
      return { valid: false, error: 'CID must be a string' };
    }

    // Basic CID validation (simplified)
    const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{52,})$/;
    
    if (!cidRegex.test(cid)) {
      return { valid: false, error: 'Invalid CID format' };
    }

    return { valid: true };
  }, []);

  // Generate IPFS URL from CID
  const getIPFSUrl = useCallback((cid, gateway = gatewayUrl) => {
    const validation = validateCID(cid);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    return `${gateway}${cid}`;
  }, [gatewayUrl, validateCID]);

  // Upload visit metadata
  const uploadVisitMetadata = useCallback(async (visitData) => {
    const metadata = {
      type: 'visit',
      version: '1.0',
      data: visitData,
      timestamp: new Date().toISOString(),
      appName: 'POGPP'
    };

    return await uploadData(metadata, {
      filename: `visit-${visitData.nfcTagId}-${Date.now()}.json`,
      pin: true,
      cidVersion: 1
    });
  }, [uploadData]);

  // Upload badge metadata
  const uploadBadgeMetadata = useCallback(async (badgeData) => {
    const metadata = {
      name: badgeData.name || `POGPP Badge - ${badgeData.locationName}`,
      description: badgeData.description || `Proof of presence at ${badgeData.locationName}`,
      image: badgeData.imageUrl || '',
      external_url: process.env.REACT_APP_FRONTEND_URL || 'https://pogpp.app',
      attributes: badgeData.attributes || [],
      properties: {
        visitId: badgeData.visitId,
        nfcTagId: badgeData.nfcTagId,
        coordinates: `${badgeData.latitude}, ${badgeData.longitude}`,
        timestamp: badgeData.timestamp,
        type: 'POGPP_Badge'
      }
    };

    return await uploadData(metadata, {
      filename: `badge-metadata-${badgeData.visitId}.json`,
      pin: true,
      cidVersion: 1
    });
  }, [uploadData]);

  return {
    // State
    isConnected,
    loading,
    error,
    nodeInfo,

    // Actions
    checkConnection,
    uploadData,
    getData,
    pinContent,
    unpinContent,
    listPinned,
    getNodeStats,

    // Utils
    validateCID,
    getIPFSUrl,
    uploadVisitMetadata,
    uploadBadgeMetadata,

    // Config
    apiUrl,
    gatewayUrl
  };
};

export default useIPFS;