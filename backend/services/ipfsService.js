const { create } = require('ipfs-http-client');
const logger = require('../utils/logger');

class IPFSService {

  constructor() {
    // Initialize IPFS client
    this.ipfs = create({
      host: process.env.IPFS_HOST || 'localhost',
      port: process.env.IPFS_PORT || 5001,
      protocol: process.env.IPFS_PROTOCOL || 'http'
    });
    
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  }

  /**
   * Store visit data on IPFS
   * @param {object} visitData - Visit data to store
   * @returns {object} - IPFS storage result with CID and IPNS key
   */
  async storeVisitData(visitData) {
    try {
      logger.info(`Storing visit data on IPFS for location: ${visitData.locationName}`);

      // Prepare data for storage
      const dataToStore = {
        ...visitData,
        storedAt: new Date().toISOString(),
        version: '1.0'
      };

      // Convert to JSON and store on IPFS
      const dataBuffer = Buffer.from(JSON.stringify(dataToStore, null, 2));
      const result = await this.ipfs.add(dataBuffer, {
        pin: true, // Pin the content
        cidVersion: 1
      });

      const cid = result.cid.toString();
      logger.info(`Visit data stored on IPFS with CID: ${cid}`);

      // Create IPNS key for this visit (for future updates)
      const ipnsKey = await this.createIPNSKey(`visit-${visitData.userId}-${Date.now()}`);
      
      // Publish to IPNS
      await this.publishToIPNS(ipnsKey.id, cid);

      return {
        cid,
        ipfsUrl: `${this.ipfsGateway}${cid}`,
        ipnsKey: ipnsKey.id,
        ipnsUrl: `${this.ipfsGateway.replace('/ipfs/', '/ipns/')}${ipnsKey.id}`
      };

    } catch (error) {
      logger.error('Store visit data error:', error);
      throw new Error(`Failed to store visit data on IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve visit data from IPFS
   * @param {string} cid - Content identifier
   * @returns {object} - Retrieved visit data
   */
  async getVisitData(cid) {
    try {
      logger.info(`Retrieving visit data from IPFS: ${cid}`);

      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks).toString();
      const visitData = JSON.parse(data);

      logger.info(`Visit data retrieved successfully from IPFS`);

      return visitData;

    } catch (error) {
      logger.error('Get visit data error:', error);
      throw new Error(`Failed to retrieve visit data from IPFS: ${error.message}`);
    }
  }

  /**
   * Store NFT metadata on IPFS
   * @param {object} metadata - NFT metadata
   * @returns {object} - IPFS storage result
   */
  async storeMetadata(metadata) {
    try {
      logger.info(`Storing NFT metadata on IPFS for: ${metadata.name}`);

      // Add IPFS-specific metadata
      const enrichedMetadata = {
        ...metadata,
        external_url: process.env.FRONTEND_URL || 'https://pogpp.app',
        created_at: new Date().toISOString(),
        ipfs_version: '1.0'
      };

      const metadataBuffer = Buffer.from(JSON.stringify(enrichedMetadata, null, 2));
      const result = await this.ipfs.add(metadataBuffer, {
        pin: true,
        cidVersion: 1
      });

      const cid = result.cid.toString();
      const ipfsUrl = `${this.ipfsGateway}${cid}`;

      logger.info(`NFT metadata stored on IPFS with CID: ${cid}`);

      return {
        cid,
        ipfsUrl,
        metadata: enrichedMetadata
      };

    } catch (error) {
      logger.error('Store metadata error:', error);
      throw new Error(`Failed to store metadata on IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve metadata from IPFS
   * @param {string} cid - Content identifier
   * @returns {object} - Retrieved metadata
   */
  async getMetadata(cid) {
    try {
      logger.info(`Retrieving metadata from IPFS: ${cid}`);

      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      const data = Buffer.concat(chunks).toString();
      const metadata = JSON.parse(data);

      return metadata;

    } catch (error) {
      logger.error('Get metadata error:', error);
      throw new Error(`Failed to retrieve metadata from IPFS: ${error.message}`);
    }
  }

  /**
   * Create a new IPNS key
   * @param {string} keyName - Name for the IPNS key
   * @returns {object} - IPNS key information
   */
  async createIPNSKey(keyName) {
    try {
      logger.info(`Creating IPNS key: ${keyName}`);

      const key = await this.ipfs.key.gen(keyName, {
        type: 'rsa',
        size: 2048
      });

      logger.info(`IPNS key created: ${key.id}`);

      return {
        id: key.id,
        name: key.name
      };

    } catch (error) {
      logger.error('Create IPNS key error:', error);
      throw new Error(`Failed to create IPNS key: ${error.message}`);
    }
  }

  /**
   * Publish content to IPNS
   * @param {string} keyId - IPNS key ID
   * @param {string} cid - Content identifier to publish
   * @returns {object} - Publish result
   */
  async publishToIPNS(keyId, cid) {
    try {
      logger.info(`Publishing to IPNS: ${keyId} -> ${cid}`);

      const result = await this.ipfs.name.publish(cid, {
        key: keyId,
        lifetime: '24h',
        ttl: '10m'
      });

      logger.info(`Content published to IPNS: ${result.name}`);

      return {
        name: result.name,
        value: result.value
      };

    } catch (error) {
      logger.error('Publish to IPNS error:', error);
      throw new Error(`Failed to publish to IPNS: ${error.message}`);
    }
  }

  /**
   * Resolve IPNS name to CID
   * @param {string} ipnsName - IPNS name to resolve
   * @returns {string} - Resolved CID
   */
  async resolveIPNS(ipnsName) {
    try {
      logger.info(`Resolving IPNS name: ${ipnsName}`);

      const result = await this.ipfs.name.resolve(ipnsName);
      const cid = result.split('/').pop(); // Extract CID from /ipfs/CID

      logger.info(`IPNS resolved to CID: ${cid}`);

      return cid;

    } catch (error) {
      logger.error('Resolve IPNS error:', error);
      throw new Error(`Failed to resolve IPNS: ${error.message}`);
    }
  }

  /**
   * Pin content to ensure it stays available
   * @param {string} cid - Content identifier to pin
   * @returns {boolean} - True if pinned successfully
   */
  async pinContent(cid) {
    try {
      logger.info(`Pinning content: ${cid}`);

      await this.ipfs.pin.add(cid);

      logger.info(`Content pinned successfully: ${cid}`);

      return true;

    } catch (error) {
      logger.error('Pin content error:', error);
      return false;
    }
  }

  /**
   * Unpin content
   * @param {string} cid - Content identifier to unpin
   * @returns {boolean} - True if unpinned successfully
   */
  async unpinContent(cid) {
    try {
      logger.info(`Unpinning content: ${cid}`);

      await this.ipfs.pin.rm(cid);

      logger.info(`Content unpinned successfully: ${cid}`);

      return true;

    } catch (error) {
      logger.error('Unpin content error:', error);
      return false;
    }
  }

  /**
   * Get IPFS node status
   * @returns {object} - Node status information
   */
  async getNodeStatus() {
    try {
      const id = await this.ipfs.id();
      const version = await this.ipfs.version();

      return {
        nodeId: id.id,
        version: version.version,
        addresses: id.addresses,
        protocols: id.protocols
      };

    } catch (error) {
      logger.error('Get node status error:', error);
      throw new Error('Failed to get IPFS node status');
    }
  }

  /**
   * Check IPFS service health
   * @returns {boolean} - True if service is healthy
   */
  async healthCheck() {
    try {
      await this.ipfs.id();
      return true;
    } catch (error) {
      logger.error('IPFS health check failed:', error);
      return false;
    }
  }
}

module.exports = new IPFSService();