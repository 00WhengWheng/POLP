const faiss = require('faiss-node');
const logger = require('../utils/logger');

class FAISSService {

  constructor() {
    this.index = null;
    this.dimension = 384; // Typical dimension for sentence transformers
    this.indexPath = process.env.FAISS_INDEX_PATH || './data/faiss_index.bin';
    this.isInitialized = false;
  }

  /**
   * Initialize FAISS index
   * @param {number} dimension - Vector dimension
   * @returns {boolean} - True if initialized successfully
   */
  async initialize(dimension = this.dimension) {
    try {
      logger.info(`Initializing FAISS index with dimension: ${dimension}`);

      // Create or load FAISS index
      try {
        // Try to load existing index
        this.index = faiss.read_index(this.indexPath);
        logger.info('Loaded existing FAISS index');
      } catch (error) {
        // Create new index if file doesn't exist
        this.index = new faiss.IndexFlatIP(dimension); // Inner Product for cosine similarity
        logger.info('Created new FAISS index');
      }

      this.dimension = dimension;
      this.isInitialized = true;

      logger.info('FAISS service initialized successfully');
      return true;

    } catch (error) {
      logger.error('FAISS initialization error:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Create semantic vector for visit data
   * @param {object} visitData - Visit data to vectorize
   * @returns {Array} - Vector representation
   */
  async createVisitVector(visitData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Create text representation of visit data
      const textData = this.visitDataToText(visitData);
      
      // Generate vector (in a real implementation, you'd use a proper embedding model)
      const vector = this.generateSimpleEmbedding(textData);

      logger.debug(`Created vector for visit: ${visitData.locationName}`);

      return vector;

    } catch (error) {
      logger.error('Create visit vector error:', error);
      throw new Error('Failed to create visit vector');
    }
  }

  /**
   * Convert visit data to text for vectorization
   * @param {object} visitData - Visit data
   * @returns {string} - Text representation
   */
  visitDataToText(visitData) {
    const parts = [
      visitData.locationName || '',
      visitData.description || '',
      visitData.nfcTagId || '',
      `coordinates ${visitData.latitude} ${visitData.longitude}`,
      new Date(visitData.timestamp).toLocaleDateString()
    ];

    return parts.filter(part => part.length > 0).join(' ');
  }

  /**
   * Generate simple embedding (placeholder for real embedding model)
   * @param {string} text - Text to embed
   * @returns {Array} - Vector representation
   */
  generateSimpleEmbedding(text) {
    // This is a simplified embedding generation
    // In production, you'd use a proper model like sentence-transformers
    const vector = new Array(this.dimension).fill(0);
    
    // Simple hash-based embedding (for demonstration)
    const words = text.toLowerCase().split(/\s+/);
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = Math.abs(hash) % this.dimension;
      vector[position] += 1.0 / (index + 1); // Weight by position
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Simple hash function for text
   * @param {string} str - String to hash
   * @returns {number} - Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Add vector to index
   * @param {Array} vector - Vector to add
   * @param {number} id - ID for the vector
   * @returns {boolean} - True if added successfully
   */
  async addVector(vector, id) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Convert to Float32Array for FAISS
      const vectorArray = new Float32Array(vector);
      
      // Add to index
      this.index.add(vectorArray);

      logger.debug(`Added vector with ID: ${id}`);

      return true;

    } catch (error) {
      logger.error('Add vector error:', error);
      return false;
    }
  }

  /**
   * Search for similar vectors
   * @param {Array} queryVector - Query vector
   * @param {number} k - Number of results to return
   * @param {number} userId - Filter by user ID (optional)
   * @returns {Array} - Similar vectors with scores
   */
  async searchSimilarVectors(queryVector, k = 10, userId = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Convert to Float32Array
      const queryArray = new Float32Array(queryVector);

      // Search index
      const result = this.index.search(queryArray, k);

      logger.debug(`Found ${result.labels.length} similar vectors`);

      // Format results
      const similarities = [];
      for (let i = 0; i < result.labels.length; i++) {
        similarities.push({
          id: result.labels[i],
          score: result.distances[i],
          similarity: result.distances[i] // Inner product gives similarity
        });
      }

      return similarities;

    } catch (error) {
      logger.error('Search similar vectors error:', error);
      throw new Error('Failed to search similar vectors');
    }
  }

  /**
   * Create query vector from text
   * @param {string} queryText - Query text
   * @returns {Array} - Query vector
   */
  async createQueryVector(queryText) {
    try {
      const vector = this.generateSimpleEmbedding(queryText);
      
      logger.debug(`Created query vector for: "${queryText}"`);
      
      return vector;

    } catch (error) {
      logger.error('Create query vector error:', error);
      throw new Error('Failed to create query vector');
    }
  }

  /**
   * Search for similar visits using semantic similarity
   * @param {Array} queryVector - Query vector
   * @param {number} limit - Number of results
   * @param {number} userId - User ID filter
   * @returns {Array} - Similar visits
   */
  async searchSimilarVisits(queryVector, limit = 10, userId = null) {
    try {
      // Get similar vectors
      const similarVectors = await this.searchSimilarVectors(queryVector, limit * 2); // Get more to filter

      // In a real implementation, you'd map vector IDs back to visit records
      // For now, return mock results
      const results = similarVectors.slice(0, limit).map((vector, index) => ({
        visitId: vector.id,
        similarity: vector.similarity,
        score: vector.score,
        rank: index + 1
      }));

      logger.info(`Found ${results.length} similar visits for user ${userId}`);

      return results;

    } catch (error) {
      logger.error('Search similar visits error:', error);
      throw new Error('Failed to search similar visits');
    }
  }

  /**
   * Save index to disk
   * @returns {boolean} - True if saved successfully
   */
  async saveIndex() {
    try {
      if (!this.isInitialized || !this.index) {
        logger.warn('No index to save');
        return false;
      }

      faiss.write_index(this.index, this.indexPath);
      
      logger.info(`FAISS index saved to: ${this.indexPath}`);
      
      return true;

    } catch (error) {
      logger.error('Save index error:', error);
      return false;
    }
  }

  /**
   * Get index statistics
   * @returns {object} - Index statistics
   */
  getIndexStats() {
    try {
      if (!this.isInitialized || !this.index) {
        return {
          initialized: false,
          dimension: 0,
          totalVectors: 0
        };
      }

      return {
        initialized: this.isInitialized,
        dimension: this.dimension,
        totalVectors: this.index.ntotal,
        indexType: 'IndexFlatIP'
      };

    } catch (error) {
      logger.error('Get index stats error:', error);
      return {
        initialized: false,
        error: error.message
      };
    }
  }

  /**
   * Clear the index
   * @returns {boolean} - True if cleared successfully
   */
  async clearIndex() {
    try {
      if (!this.isInitialized) {
        return true;
      }

      // Create new empty index
      this.index = new faiss.IndexFlatIP(this.dimension);
      
      logger.info('FAISS index cleared');
      
      return true;

    } catch (error) {
      logger.error('Clear index error:', error);
      return false;
    }
  }

  /**
   * Health check for FAISS service
   * @returns {boolean} - True if service is healthy
   */
  async healthCheck() {
    try {
      const stats = this.getIndexStats();
      return stats.initialized;
    } catch (error) {
      logger.error('FAISS health check failed:', error);
      return false;
    }
  }
}

module.exports = new FAISSService();