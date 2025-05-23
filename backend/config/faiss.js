const faiss = require('faiss-node');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// FAISS configuration
const faissConfig = {
  // Vector dimensions (typical for sentence transformers)
  dimension: parseInt(process.env.FAISS_DIMENSION) || 384,
  
  // Index types
  indexTypes: {
    flatIP: 'IndexFlatIP',     // Exact search with inner product
    flatL2: 'IndexFlatL2',     // Exact search with L2 distance
    ivfFlat: 'IndexIVFFlat',   // Inverted file with flat quantizer
    hnsw: 'IndexHNSWFlat'      // Hierarchical Navigable Small World
  },

  // Storage paths
  paths: {
    indexDir: process.env.FAISS_INDEX_DIR || path.join(__dirname, '../data/faiss'),
    visitIndex: process.env.FAISS_VISIT_INDEX || 'visit_index.bin',
    metadataIndex: process.env.FAISS_METADATA_INDEX || 'metadata_index.json',
    backupDir: process.env.FAISS_BACKUP_DIR || path.join(__dirname, '../data/faiss/backups')
  },

  // Performance settings
  performance: {
    nlist: parseInt(process.env.FAISS_NLIST) || 100,        // Number of clusters for IVF
    nprobe: parseInt(process.env.FAISS_NPROBE) || 10,       // Number of clusters to search
    maxTraining: parseInt(process.env.FAISS_MAX_TRAINING) || 10000, // Max vectors for training
    batchSize: parseInt(process.env.FAISS_BATCH_SIZE) || 1000       // Batch size for operations
  }
};

// Index metadata management
class IndexMetadata {
  constructor() {
    this.metadata = {
      totalVectors: 0,
      lastUpdated: null,
      vectorMappings: new Map(), // Maps vector index to visit ID
      visitMappings: new Map(),  // Maps visit ID to vector index
      version: '1.0'
    };
  }

  // Add vector mapping
  addMapping(vectorIndex, visitId) {
    this.metadata.vectorMappings.set(vectorIndex, visitId);
    this.metadata.visitMappings.set(visitId, vectorIndex);
    this.metadata.totalVectors++;
    this.metadata.lastUpdated = new Date().toISOString();
  }

  // Get visit ID from vector index
  getVisitId(vectorIndex) {
    return this.metadata.vectorMappings.get(vectorIndex);
  }

  // Get vector index from visit ID
  getVectorIndex(visitId) {
    return this.metadata.visitMappings.get(visitId);
  }

  // Save metadata to file
  async save() {
    try {
      const metadataPath = path.join(faissConfig.paths.indexDir, faissConfig.paths.metadataIndex);
      
      // Convert Maps to objects for JSON serialization
      const dataToSave = {
        ...this.metadata,
        vectorMappings: Object.fromEntries(this.metadata.vectorMappings),
        visitMappings: Object.fromEntries(this.metadata.visitMappings)
      };

      await fs.writeFile(metadataPath, JSON.stringify(dataToSave, null, 2));
      logger.info('FAISS metadata saved successfully');
    } catch (error) {
      logger.error('Failed to save FAISS metadata:', error);
      throw error;
    }
  }

  // Load metadata from file
  async load() {
    try {
      const metadataPath = path.join(faissConfig.paths.indexDir, faissConfig.paths.metadataIndex);
      
      const data = await fs.readFile(metadataPath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert objects back to Maps
      this.metadata = {
        ...parsed,
        vectorMappings: new Map(Object.entries(parsed.vectorMappings || {})),
        visitMappings: new Map(Object.entries(parsed.visitMappings || {}))
      };

      logger.info(`FAISS metadata loaded: ${this.metadata.totalVectors} vectors`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load FAISS metadata:', error);
      }
      // Initialize with empty metadata if file doesn't exist
    }
  }
}

// FAISS index manager
class FAISSIndexManager {
  constructor() {
    this.index = null;
    this.metadata = new IndexMetadata();
    this.isInitialized = false;
    this.indexType = faissConfig.indexTypes.flatIP;
  }

  // Initialize FAISS index
  async initialize() {
    try {
      logger.info('Initializing FAISS index manager...');

      // Ensure directories exist
      await this.ensureDirectories();

      // Load metadata
      await this.metadata.load();

      // Load or create index
      await this.loadOrCreateIndex();

      this.isInitialized = true;
      logger.info('FAISS index manager initialized successfully');

    } catch (error) {
      logger.error('FAISS initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  // Ensure required directories exist
  async ensureDirectories() {
    const dirs = [faissConfig.paths.indexDir, faissConfig.paths.backupDir];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  // Load existing index or create new one
  async loadOrCreateIndex() {
    const indexPath = path.join(faissConfig.paths.indexDir, faissConfig.paths.visitIndex);

    try {
      // Try to load existing index
      this.index = faiss.read_index(indexPath);
      logger.info(`Loaded existing FAISS index from ${indexPath}`);
    } catch (error) {
      // Create new index if file doesn't exist
      logger.info('Creating new FAISS index');
      this.index = new faiss.IndexFlatIP(faissConfig.dimension);
    }
  }

  // Save index to disk
  async saveIndex() {
    try {
      if (!this.index) {
        throw new Error('No index to save');
      }

      const indexPath = path.join(faissConfig.paths.indexDir, faissConfig.paths.visitIndex);
      
      // Create backup before saving
      await this.createBackup();

      // Save index
      faiss.write_index(this.index, indexPath);
      
      // Save metadata
      await this.metadata.save();

      logger.info(`FAISS index saved to ${indexPath}`);

    } catch (error) {
      logger.error('Failed to save FAISS index:', error);
      throw error;
    }
  }

  // Create backup of current index
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        faissConfig.paths.backupDir, 
        `visit_index_${timestamp}.bin`
      );

      const currentIndexPath = path.join(faissConfig.paths.indexDir, faissConfig.paths.visitIndex);
      
      try {
        await fs.copyFile(currentIndexPath, backupPath);
        logger.info(`Created FAISS index backup: ${backupPath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // Ignore if current index doesn't exist
      }

    } catch (error) {
      logger.warn('Failed to create FAISS backup:', error);
      // Don't throw - backup failure shouldn't stop the operation
    }
  }

  // Add vector to index
  async addVector(vector, visitId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Convert to Float32Array
      const vectorArray = new Float32Array(vector);
      
      // Add to index
      const vectorIndex = this.index.ntotal;
      this.index.add(vectorArray);
      
      // Update metadata
      this.metadata.addMapping(vectorIndex, visitId);

      logger.debug(`Added vector for visit ${visitId} at index ${vectorIndex}`);

      // Auto-save periodically
      if (this.metadata.metadata.totalVectors % 100 === 0) {
        await this.saveIndex();
      }

    } catch (error) {
      logger.error('Failed to add vector to FAISS index:', error);
      throw error;
    }
  }

  // Search similar vectors
  async searchSimilar(queryVector, k = 10) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Convert to Float32Array
      const queryArray = new Float32Array(queryVector);

      // Search
      const result = this.index.search(queryArray, Math.min(k, this.index.ntotal));

      // Map results to visit IDs
      const mappedResults = [];
      for (let i = 0; i < result.labels.length; i++) {
        const vectorIndex = result.labels[i];
        const visitId = this.metadata.getVisitId(vectorIndex);
        
        if (visitId) {
          mappedResults.push({
            visitId: visitId,
            vectorIndex: vectorIndex,
            score: result.distances[i],
            similarity: result.distances[i] // Inner product gives similarity score
          });
        }
      }

      logger.debug(`Found ${mappedResults.length} similar vectors`);
      return mappedResults;

    } catch (error) {
      logger.error('Failed to search FAISS index:', error);
      throw error;
    }
  }

  // Get index statistics
  getStats() {
    return {
      isInitialized: this.isInitialized,
      totalVectors: this.index ? this.index.ntotal : 0,
      dimension: faissConfig.dimension,
      indexType: this.indexType,
      metadata: {
        totalVectors: this.metadata.metadata.totalVectors,
        lastUpdated: this.metadata.metadata.lastUpdated
      }
    };
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', error: 'Not initialized' };
      }

      const stats = this.getStats();
      
      return {
        status: 'healthy',
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const indexManager = new FAISSIndexManager();

// Initialize FAISS configuration
const initializeFAISS = async () => {
  try {
    logger.info('Initializing FAISS configuration...');
    
    await indexManager.initialize();
    
    logger.info('FAISS configuration initialized successfully');
    return true;

  } catch (error) {
    logger.error('FAISS initialization failed:', error);
    return false;
  }
};

module.exports = {
  faissConfig,
  IndexMetadata,
  FAISSIndexManager,
  indexManager,
  initializeFAISS
};