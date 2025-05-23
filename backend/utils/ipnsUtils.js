const { create } = require('ipfs-http-client');
const crypto = require('crypto');

class IPNSUtils {

  constructor() {
    this.ipfs = null;
    this.keyStore = new Map(); // In-memory key store (in production, use persistent storage)
  }

  /**
   * Initialize IPFS client
   * @returns {object} - IPFS client instance
   */
  getIPFSClient() {
    if (!this.ipfs) {
      this.ipfs = create({
        host: process.env.IPFS_HOST || 'localhost',
        port: process.env.IPFS_PORT || 5001,
        protocol: process.env.IPFS_PROTOCOL || 'http'
      });
    }
    return this.ipfs;
  }

  /**
   * Generate deterministic IPNS key name from user and content identifiers
   * @param {number} userId - User ID
   * @param {string} contentType - Type of content (e.g., 'visit', 'profile', 'badge')
   * @param {string} identifier - Additional identifier (optional)
   * @returns {string} - Deterministic key name
   */
  generateKeyName(userId, contentType, identifier = '') {
    try {
      const components = [userId.toString(), contentType, identifier].filter(Boolean);
      const combined = components.join('-');
      
      // Create a hash to ensure valid key name format
      const hash = crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
      return `pogpp-${contentType}-${hash.substring(0, 16)}`;
    } catch (error) {
      throw new Error(`Failed to generate key name: ${error.message}`);
    }
  }

  /**
   * Create or get existing IPNS key
   * @param {string} keyName - Name for the IPNS key
   * @param {object} options - Key generation options
   * @returns {object} - Key information
   */
  async createOrGetKey(keyName, options = {}) {
    try {
      const ipfs = this.getIPFSClient();
      
      // Check if key already exists
      try {
        const existingKeys = await ipfs.key.list();
        const existingKey = existingKeys.find(key => key.name === keyName);
        
        if (existingKey) {
          this.keyStore.set(keyName, existingKey);
          return existingKey;
        }
      } catch (error) {
        // Continue to create new key if list fails
      }

      // Create new key
      const keyOptions = {
        type: options.type || 'rsa',
        size: options.size || 2048,
        ...options
      };

      const newKey = await ipfs.key.gen(keyName, keyOptions);
      this.keyStore.set(keyName, newKey);
      
      return newKey;
    } catch (error) {
      throw new Error(`Failed to create or get IPNS key: ${error.message}`);
    }
  }

  /**
   * Publish content to IPNS
   * @param {string} keyName - IPNS key name
   * @param {string} cid - IPFS CID to publish
   * @param {object} options - Publishing options
   * @returns {object} - Publishing result
   */
  async publishToIPNS(keyName, cid, options = {}) {
    try {
      const ipfs = this.getIPFSClient();
      
      const publishOptions = {
        key: keyName,
        lifetime: options.lifetime || '24h',
        ttl: options.ttl || '10m',
        allowOffline: options.allowOffline || false,
        ...options
      };

      const result = await ipfs.name.publish(cid, publishOptions);
      
      return {
        name: result.name,
        value: result.value,
        keyName: keyName,
        cid: cid,
        publishedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to publish to IPNS: ${error.message}`);
    }
  }

  /**
   * Resolve IPNS name to current CID
   * @param {string} ipnsName - IPNS name to resolve
   * @param {object} options - Resolution options
   * @returns {string} - Resolved CID
   */
  async resolveIPNS(ipnsName, options = {}) {
    try {
      const ipfs = this.getIPFSClient();
      
      const resolveOptions = {
        recursive: options.recursive !== false,
        nocache: options.nocache || false,
        ...options
      };

      const result = await ipfs.name.resolve(ipnsName, resolveOptions);
      
      // Extract CID from /ipfs/CID format
      const cid = result.replace('/ipfs/', '');
      return cid;
    } catch (error) {
      throw new Error(`Failed to resolve IPNS: ${error.message}`);
    }
  }

  /**
   * Create IPNS record for user visit data
   * @param {number} userId - User ID
   * @param {string} visitCID - IPFS CID of visit data
   * @param {object} metadata - Additional metadata
   * @returns {object} - IPNS record information
   */
  async createVisitRecord(userId, visitCID, metadata = {}) {
    try {
      const keyName = this.generateKeyName(userId, 'visit', metadata.visitId);
      
      // Create or get key
      const key = await this.createOrGetKey(keyName);
      
      // Publish to IPNS
      const publishResult = await this.publishToIPNS(keyName, visitCID, {
        lifetime: '7d', // Visits are kept for a week
        ttl: '1h'
      });

      return {
        keyName: keyName,
        keyId: key.id,
        ipnsName: publishResult.name,
        cid: visitCID,
        metadata: {
          userId: userId,
          contentType: 'visit',
          ...metadata,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to create visit IPNS record: ${error.message}`);
    }
  }

  /**
   * Create IPNS record for user profile data
   * @param {number} userId - User ID
   * @param {string} profileCID - IPFS CID of profile data
   * @returns {object} - IPNS record information
   */
  async createProfileRecord(userId, profileCID) {
    try {
      const keyName = this.generateKeyName(userId, 'profile');
      
      // Create or get key
      const key = await this.createOrGetKey(keyName);
      
      // Publish to IPNS
      const publishResult = await this.publishToIPNS(keyName, profileCID, {
        lifetime: '30d', // Profiles are kept longer
        ttl: '6h'
      });

      return {
        keyName: keyName,
        keyId: key.id,
        ipnsName: publishResult.name,
        cid: profileCID,
        metadata: {
          userId: userId,
          contentType: 'profile',
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to create profile IPNS record: ${error.message}`);
    }
  }

  /**
   * Update existing IPNS record with new content
   * @param {string} keyName - IPNS key name
   * @param {string} newCID - New IPFS CID
   * @param {object} options - Update options
   * @returns {object} - Update result
   */
  async updateRecord(keyName, newCID, options = {}) {
    try {
      // Verify key exists
      const key = this.keyStore.get(keyName);
      if (!key) {
        throw new Error(`IPNS key '${keyName}' not found`);
      }

      // Publish new content
      const publishResult = await this.publishToIPNS(keyName, newCID, options);
      
      return {
        ...publishResult,
        updatedAt: new Date().toISOString(),
        previousCID: options.previousCID || null
      };
    } catch (error) {
      throw new Error(`Failed to update IPNS record: ${error.message}`);
    }
  }

  /**
   * Get IPNS record history (if available)
   * @param {string} ipnsName - IPNS name
   * @returns {Array} - History of IPNS records
   */
  async getRecordHistory(ipnsName) {
    try {
      // Note: IPNS doesn't natively support history, this would need to be
      // implemented using a separate tracking mechanism
      
      // For now, return current record
      const currentCID = await this.resolveIPNS(ipnsName);
      
      return [{
        cid: currentCID,
        resolvedAt: new Date().toISOString(),
        ipnsName: ipnsName
      }];
    } catch (error) {
      throw new Error(`Failed to get IPNS record history: ${error.message}`);
    }
  }

  /**
   * List all IPNS keys for a user
   * @param {number} userId - User ID
   * @returns {Array} - Array of user's IPNS keys
   */
  async getUserKeys(userId) {
    try {
      const ipfs = this.getIPFSClient();
      const allKeys = await ipfs.key.list();
      
      // Filter keys that belong to this user
      const userKeyPrefix = `pogpp-.*-.*${userId}.*`;
      const userKeys = allKeys.filter(key => 
        key.name.includes(`-${userId}-`) || key.name.includes(`${userId}`)
      );

      return userKeys.map(key => ({
        name: key.name,
        id: key.id,
        userId: userId
      }));
    } catch (error) {
      throw new Error(`Failed to get user IPNS keys: ${error.message}`);
    }
  }

  /**
   * Delete IPNS key
   * @param {string} keyName - Key name to delete
   * @returns {boolean} - True if deleted successfully
   */
  async deleteKey(keyName) {
    try {
      const ipfs = this.getIPFSClient();
      
      await ipfs.key.rm(keyName);
      this.keyStore.delete(keyName);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete IPNS key: ${error.message}`);
    }
  }

  /**
   * Validate IPNS name format
   * @param {string} ipnsName - IPNS name to validate
   * @returns {boolean} - True if valid
   */
  isValidIPNSName(ipnsName) {
    try {
      // Basic validation - IPNS names are typically base58 encoded public keys
      return typeof ipnsName === 'string' && 
             ipnsName.length > 20 && 
             /^[A-HJ-NP-Za-km-z1-9]+$/.test(ipnsName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IPNS URL for a name
   * @param {string} ipnsName - IPNS name
   * @param {string} gateway - IPFS gateway URL
   * @returns {string} - Full IPNS URL
   */
  getIPNSUrl(ipnsName, gateway = 'https://ipfs.io/ipns/') {
    return `${gateway}${ipnsName}`;
  }

  /**
   * Batch publish multiple records
   * @param {Array} records - Array of {keyName, cid, options} objects
   * @returns {Array} - Array of publish results
   */
  async batchPublish(records) {
    try {
      const results = [];
      
      for (const record of records) {
        try {
          const result = await this.publishToIPNS(
            record.keyName, 
            record.cid, 
            record.options || {}
          );
          results.push({ success: true, ...result });
        } catch (error) {
          results.push({ 
            success: false, 
            keyName: record.keyName, 
            error: error.message 
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to batch publish IPNS records: ${error.message}`);
    }
  }

  /**
   * Health check for IPNS functionality
   * @returns {object} - Health status
   */
  async healthCheck() {
    try {
      const ipfs = this.getIPFSClient();
      
      // Test basic IPFS connectivity
      await ipfs.id();
      
      // Test key operations
      const testKeyName = `test-${Date.now()}`;
      await ipfs.key.gen(testKeyName, { type: 'rsa', size: 2048 });
      await ipfs.key.rm(testKeyName);
      
      return {
        status: 'healthy',
        ipnsSupported: true,
        keyOperations: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new IPNSUtils();