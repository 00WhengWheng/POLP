const crypto = require('crypto');
const { ethers } = require('ethers');

class HashUtils {

  /**
   * Create SHA-256 hash of visit data for integrity verification
   * @param {object} visitData - Visit data to hash
   * @returns {string} - SHA-256 hash in hexadecimal format
   */
  createVisitHash(visitData) {
    try {
      // Normalize visit data for consistent hashing
      const normalizedData = {
        userId: visitData.userId,
        nfcTagId: visitData.nfcTagId,
        latitude: parseFloat(visitData.latitude).toFixed(8),
        longitude: parseFloat(visitData.longitude).toFixed(8),
        timestamp: new Date(visitData.timestamp).toISOString()
      };

      // Create deterministic string representation
      const dataString = JSON.stringify(normalizedData, Object.keys(normalizedData).sort());
      
      // Generate SHA-256 hash
      const hash = crypto.createHash('sha256').update(dataString, 'utf8').digest('hex');
      
      return hash;
    } catch (error) {
      throw new Error(`Failed to create visit hash: ${error.message}`);
    }
  }

  /**
   * Verify visit data integrity using stored hash
   * @param {object} visitData - Visit data to verify
   * @param {string} storedHash - Previously stored hash
   * @returns {boolean} - True if data integrity is verified
   */
  verifyVisitHash(visitData, storedHash) {
    try {
      const computedHash = this.createVisitHash(visitData);
      return computedHash === storedHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create content hash for IPFS data
   * @param {string|Buffer|object} content - Content to hash
   * @returns {string} - SHA-256 hash
   */
  createContentHash(content) {
    try {
      let dataToHash;
      
      if (Buffer.isBuffer(content)) {
        dataToHash = content;
      } else if (typeof content === 'object') {
        dataToHash = Buffer.from(JSON.stringify(content), 'utf8');
      } else {
        dataToHash = Buffer.from(content.toString(), 'utf8');
      }

      return crypto.createHash('sha256').update(dataToHash).digest('hex');
    } catch (error) {
      throw new Error(`Failed to create content hash: ${error.message}`);
    }
  }

  /**
   * Create deterministic ID from multiple components
   * @param {Array} components - Array of string components
   * @returns {string} - Deterministic ID
   */
  createDeterministicId(components) {
    try {
      const combined = components.map(c => c.toString()).join('|');
      return crypto.createHash('sha256').update(combined, 'utf8').digest('hex').substring(0, 16);
    } catch (error) {
      throw new Error(`Failed to create deterministic ID: ${error.message}`);
    }
  }

  /**
   * Create Ethereum-compatible message hash
   * @param {string} message - Message to hash
   * @returns {string} - Ethereum message hash
   */
  createEthereumMessageHash(message) {
    try {
      return ethers.hashMessage(message);
    } catch (error) {
      throw new Error(`Failed to create Ethereum message hash: ${error.message}`);
    }
  }

  /**
   * Create HMAC signature
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} - HMAC signature
   */
  createHMAC(data, secret, algorithm = 'sha256') {
    try {
      return crypto.createHmac(algorithm, secret).update(data, 'utf8').digest('hex');
    } catch (error) {
      throw new Error(`Failed to create HMAC: ${error.message}`);
    }
  }

  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - HMAC signature to verify
   * @param {string} secret - Secret key
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {boolean} - True if signature is valid
   */
  verifyHMAC(data, signature, secret, algorithm = 'sha256') {
    try {
      const computedSignature = this.createHMAC(data, secret, algorithm);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Create random hash for nonces, challenges, etc.
   * @param {number} length - Length of random hash (default: 32 bytes)
   * @returns {string} - Random hash in hexadecimal
   */
  createRandomHash(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      throw new Error(`Failed to create random hash: ${error.message}`);
    }
  }

  /**
   * Create UUID v4
   * @returns {string} - UUID v4 string
   */
  createUUID() {
    try {
      return crypto.randomUUID();
    } catch (error) {
      throw new Error(`Failed to create UUID: ${error.message}`);
    }
  }

  /**
   * Hash password using PBKDF2
   * @param {string} password - Password to hash
   * @param {string} salt - Salt (optional, will generate if not provided)
   * @param {number} iterations - Number of iterations (default: 100000)
   * @returns {object} - Object with hash and salt
   */
  hashPassword(password, salt = null, iterations = 100000) {
    try {
      const actualSalt = salt || crypto.randomBytes(32).toString('hex');
      const hash = crypto.pbkdf2Sync(password, actualSalt, iterations, 64, 'sha512').toString('hex');
      
      return {
        hash: hash,
        salt: actualSalt,
        iterations: iterations
      };
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  /**
   * Verify password against stored hash
   * @param {string} password - Password to verify
   * @param {string} storedHash - Stored password hash
   * @param {string} salt - Salt used for hashing
   * @param {number} iterations - Number of iterations used
   * @returns {boolean} - True if password is correct
   */
  verifyPassword(password, storedHash, salt, iterations = 100000) {
    try {
      const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Create merkle tree root from array of hashes
   * @param {Array} hashes - Array of hash strings
   * @returns {string} - Merkle root hash
   */
  createMerkleRoot(hashes) {
    try {
      if (!hashes || hashes.length === 0) {
        throw new Error('No hashes provided');
      }

      if (hashes.length === 1) {
        return hashes[0];
      }

      let currentLevel = [...hashes];

      while (currentLevel.length > 1) {
        const nextLevel = [];
        
        for (let i = 0; i < currentLevel.length; i += 2) {
          const left = currentLevel[i];
          const right = currentLevel[i + 1] || left; // Duplicate last element if odd number
          
          const combined = left + right;
          const hash = crypto.createHash('sha256').update(combined, 'hex').digest('hex');
          nextLevel.push(hash);
        }
        
        currentLevel = nextLevel;
      }

      return currentLevel[0];
    } catch (error) {
      throw new Error(`Failed to create merkle root: ${error.message}`);
    }
  }

  /**
   * Create checksum for data validation
   * @param {string|Buffer} data - Data to checksum
   * @param {string} algorithm - Hash algorithm (default: md5)
   * @returns {string} - Checksum
   */
  createChecksum(data, algorithm = 'md5') {
    try {
      return crypto.createHash(algorithm).update(data).digest('hex');
    } catch (error) {
      throw new Error(`Failed to create checksum: ${error.message}`);
    }
  }

  /**
   * Verify checksum
   * @param {string|Buffer} data - Original data
   * @param {string} expectedChecksum - Expected checksum
   * @param {string} algorithm - Hash algorithm (default: md5)
   * @returns {boolean} - True if checksum matches
   */
  verifyChecksum(data, expectedChecksum, algorithm = 'md5') {
    try {
      const computedChecksum = this.createChecksum(data, algorithm);
      return computedChecksum === expectedChecksum;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create hash chain for tamper detection
   * @param {Array} data - Array of data items
   * @returns {Array} - Array of hashes forming a chain
   */
  createHashChain(data) {
    try {
      const chain = [];
      let previousHash = '';

      for (const item of data) {
        const itemString = typeof item === 'object' ? JSON.stringify(item) : item.toString();
        const combined = previousHash + itemString;
        const hash = crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
        
        chain.push(hash);
        previousHash = hash;
      }

      return chain;
    } catch (error) {
      throw new Error(`Failed to create hash chain: ${error.message}`);
    }
  }

  /**
   * Verify hash chain integrity
   * @param {Array} data - Original data
   * @param {Array} hashChain - Hash chain to verify
   * @returns {boolean} - True if chain is valid
   */
  verifyHashChain(data, hashChain) {
    try {
      if (data.length !== hashChain.length) {
        return false;
      }

      const computedChain = this.createHashChain(data);
      
      for (let i = 0; i < hashChain.length; i++) {
        if (hashChain[i] !== computedChain[i]) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = {
  hashUtils: new HashUtils()
};