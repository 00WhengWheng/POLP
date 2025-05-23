const { create } = require('ipfs-http-client');
const logger = require('../utils/logger');

// IPFS configuration options
const ipfsConfig = {
  development: {
    host: process.env.IPFS_HOST || 'localhost',
    port: process.env.IPFS_PORT || 5001,
    protocol: process.env.IPFS_PROTOCOL || 'http',
    timeout: 30000,
    apiPath: '/api/v0'
  },
  production: {
    host: process.env.IPFS_HOST,
    port: process.env.IPFS_PORT || 5001,
    protocol: process.env.IPFS_PROTOCOL || 'https',
    timeout: 60000,
    apiPath: '/api/v0',
    headers: {
      authorization: process.env.IPFS_AUTH_TOKEN ? `Bearer ${process.env.IPFS_AUTH_TOKEN}` : undefined
    }
  }
};

// Gateway configurations
const gateways = {
  primary: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  backup: [
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
  ],
  ipns: process.env.IPNS_GATEWAY || 'https://ipfs.io/ipns/'
};

// Pin services configuration
const pinServices = {
  pinata: {
    enabled: !!process.env.PINATA_API_KEY,
    apiKey: process.env.PINATA_API_KEY,
    secretKey: process.env.PINATA_SECRET_KEY,
    baseUrl: 'https://api.pinata.cloud'
  },
  web3storage: {
    enabled: !!process.env.WEB3_STORAGE_TOKEN,
    token: process.env.WEB3_STORAGE_TOKEN,
    baseUrl: 'https://api.web3.storage'
  }
};

// Get current environment config
const getCurrentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return ipfsConfig[env] || ipfsConfig.development;
};

// Create IPFS client instance
const createIPFSClient = (config = null) => {
  const clientConfig = config || getCurrentConfig();
  
  try {
    logger.info(`Creating IPFS client: ${clientConfig.protocol}://${clientConfig.host}:${clientConfig.port}`);
    
    const client = create({
      host: clientConfig.host,
      port: clientConfig.port,
      protocol: clientConfig.protocol,
      timeout: clientConfig.timeout,
      apiPath: clientConfig.apiPath,
      headers: clientConfig.headers || {}
    });

    return client;
  } catch (error) {
    logger.error('Failed to create IPFS client:', error);
    throw error;
  }
};

// IPFS utilities
const ipfsUtils = {
  // Generate IPFS URL from CID
  getIPFSUrl: (cid, gateway = gateways.primary) => {
    return `${gateway}${cid}`;
  },

  // Generate IPNS URL
  getIPNSUrl: (ipnsKey, gateway = gateways.ipns) => {
    return `${gateway}${ipnsKey}`;
  },

  // Try multiple gateways for retrieval
  tryGateways: async (cid) => {
    const allGateways = [gateways.primary, ...gateways.backup];
    
    for (const gateway of allGateways) {
      try {
        const url = ipfsUtils.getIPFSUrl(cid, gateway);
        const response = await fetch(url, { timeout: 10000 });
        
        if (response.ok) {
          logger.info(`Successfully retrieved ${cid} from ${gateway}`);
          return await response.json();
        }
      } catch (error) {
        logger.warn(`Failed to retrieve from ${gateway}:`, error.message);
        continue;
      }
    }
    
    throw new Error(`Failed to retrieve ${cid} from all gateways`);
  },

  // Validate CID format
  isValidCID: (cid) => {
    try {
      // Basic CID validation (simplified)
      return typeof cid === 'string' && 
             cid.length > 10 && 
             (cid.startsWith('Qm') || cid.startsWith('bafy'));
    } catch {
      return false;
    }
  },

  // Get file size from IPFS
  getFileSize: async (cid, client = null) => {
    try {
      const ipfs = client || createIPFSClient();
      const stats = await ipfs.files.stat(`/ipfs/${cid}`);
      return stats.size;
    } catch (error) {
      logger.error('Failed to get file size:', error);
      return null;
    }
  }
};

// Pin content to external services
const pinToServices = async (cid, metadata = {}) => {
  const results = {};

  // Pin to Pinata
  if (pinServices.pinata.enabled) {
    try {
      const response = await fetch(`${pinServices.pinata.baseUrl}/pinning/pinByHash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': pinServices.pinata.apiKey,
          'pinata_secret_api_key': pinServices.pinata.secretKey
        },
        body: JSON.stringify({
          hashToPin: cid,
          pinataMetadata: {
            name: metadata.name || `POGPP-${cid}`,
            keyvalues: metadata
          }
        })
      });

      if (response.ok) {
        results.pinata = { success: true, data: await response.json() };
        logger.info(`Successfully pinned ${cid} to Pinata`);
      } else {
        results.pinata = { success: false, error: await response.text() };
      }
    } catch (error) {
      results.pinata = { success: false, error: error.message };
      logger.error('Pinata pinning failed:', error);
    }
  }

  return results;
};

// Initialize IPFS configuration
const initializeIPFS = async () => {
  try {
    logger.info('Initializing IPFS configuration...');

    const client = createIPFSClient();
    
    // Test connection
    const nodeId = await client.id();
    logger.info(`Connected to IPFS node: ${nodeId.id}`);
    
    // Test basic functionality
    const testData = Buffer.from('POGPP IPFS test');
    const result = await client.add(testData);
    logger.info(`IPFS test upload successful: ${result.cid}`);
    
    // Clean up test data
    try {
      await client.pin.rm(result.cid);
    } catch {
      // Ignore cleanup errors
    }

    logger.info('IPFS configuration initialized successfully');
    return true;

  } catch (error) {
    logger.error('IPFS initialization failed:', error);
    return false;
  }
};

// Health check
const healthCheck = async () => {
  try {
    const client = createIPFSClient();
    const nodeInfo = await client.id();
    
    return {
      status: 'healthy',
      nodeId: nodeInfo.id,
      version: nodeInfo.agentVersion,
      addresses: nodeInfo.addresses?.slice(0, 3) || [] // Limit addresses for brevity
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Cleanup function
const cleanup = async () => {
  try {
    // Any cleanup operations if needed
    logger.info('IPFS cleanup completed');
  } catch (error) {
    logger.error('IPFS cleanup failed:', error);
  }
};

module.exports = {
  ipfsConfig,
  gateways,
  pinServices,
  getCurrentConfig,
  createIPFSClient,
  ipfsUtils,
  pinToServices,
  initializeIPFS,
  healthCheck,
  cleanup
};