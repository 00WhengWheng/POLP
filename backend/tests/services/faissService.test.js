const { expect } = require('chai');
const faissService = require('../../services/faissService');
const fs = require('fs').promises;
const path = require('path');

const TEST_DIMENSION = 384;
const TEMP_INDEX_PATH = './tests/data/faiss/test_faiss_index.bin';

// Ensure test data directory exists
beforeAll(async () => {
  try {
    await fs.mkdir('./tests/data/faiss', { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
});

describe('FAISSService', () => {
  beforeEach(async () => {
    // Clear any existing test index
    try {
      await fs.unlink(TEMP_INDEX_PATH);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    faissService.indexPath = TEMP_INDEX_PATH;
  });

  describe('initialization', () => {
    it('should initialize with default dimension', async () => {
      const result = await faissService.initialize();      expect(result).to.equal(true);
      expect(faissService.isInitialized).to.equal(true);
      expect(faissService.dimension).to.equal(TEST_DIMENSION);
    });

    it('should initialize with custom dimension', async () => {      const customDim = 256;
      const result = await faissService.initialize(customDim);
      expect(result).to.equal(true);
      expect(faissService.dimension).to.equal(customDim);
    });
  });

  describe('vector operations', () => {
    beforeEach(async () => {
      await faissService.initialize(TEST_DIMENSION);
    });

    it('should create vector from visit data', async () => {
      const visitData = {
        locationName: 'Test Location',
        description: 'A test description',
        nfcTagId: 'TEST123',
        latitude: 45.4642,
        longitude: 9.19,
        timestamp: new Date().toISOString()
      };      const vector = await faissService.createVisitVector(visitData);
      expect(vector).to.be.an('array');
      expect(vector).to.have.lengthOf(TEST_DIMENSION);
      expect(vector.every(v => typeof v === 'number')).to.equal(true);
    });

    it('should add vector to index', async () => {      const testVector = new Array(TEST_DIMENSION).fill(0).map(() => Math.random());
      const result = await faissService.addVector(testVector, 1);
      expect(result).to.equal(true);
      expect(typeof faissService.index.ntotal === 'function' ? faissService.index.ntotal() : faissService.index.ntotal).to.equal(1);
    });

    it('should find similar vectors', async () => {
      // Add multiple test vectors
      const vectors = [
        new Array(TEST_DIMENSION).fill(0).map(() => Math.random()),
        new Array(TEST_DIMENSION).fill(0).map(() => Math.random()),
        new Array(TEST_DIMENSION).fill(0).map(() => Math.random())
      ];

      for (let i = 0; i < vectors.length; i++) {
        await faissService.addVector(vectors[i], i);
      }      const queryVector = vectors[0]; // Use first vector as query
      const results = await faissService.searchSimilarVectors(queryVector, 2);
      
      expect(results).to.be.an('array');
      expect(results).to.have.lengthOf(2);
      expect(results[0].score).to.be.greaterThan(results[1].score);
    });
  });

  describe('text to vector conversion', () => {
    beforeEach(async () => {
      await faissService.initialize(TEST_DIMENSION);
    });

    it('should convert visit data to text', () => {
      const visitData = {
        locationName: 'Test Location',
        description: 'A test description',
        nfcTagId: 'TEST123',
        latitude: 45.4642,
        longitude: 9.19,
        timestamp: '2023-01-01T12:00:00Z'
      };      const text = faissService.visitDataToText(visitData);
      expect(text).to.contain('Test Location');
      expect(text).to.contain('A test description');
      expect(text).to.contain('TEST123');
      expect(text).to.contain('45.4642');
      expect(text).to.contain('9.19');
    });

    it('should handle missing visit data fields', () => {
      const visitData = {
        locationName: 'Test Location',
        timestamp: '2023-01-01T12:00:00Z'
      };      const text = faissService.visitDataToText(visitData);
      expect(text).to.contain('Test Location');
      expect(text).to.not.contain('undefined');
    });

    it('should create consistent vectors for similar texts', async () => {
      const text1 = 'test location near milan';
      const text2 = 'test location near milano';
      
      const vector1 = faissService.generateSimpleEmbedding(text1);
      const vector2 = faissService.generateSimpleEmbedding(text2);
      
      // Calculate cosine similarity
      const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
      const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
      const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));
      const similarity = dotProduct / (magnitude1 * magnitude2);
      
      expect(similarity).to.be.greaterThan(0.8); // High similarity threshold
    });
  });

  describe('index persistence', () => {
    it('should save and load index', async () => {
      await faissService.initialize(TEST_DIMENSION);

      // Add some test vectors
      const testVector = new Array(TEST_DIMENSION).fill(0).map(() => Math.random());
      await faissService.addVector(testVector, 1);
        // Save index
      const saveResult = await faissService.saveIndex();
      expect(saveResult).to.equal(true);
      
      // Clear and reinitialize
      await faissService.clearIndex();
      expect(typeof faissService.index.ntotal === 'function' ? faissService.index.ntotal() : faissService.index.ntotal).to.equal(0);
      
      // Load saved index
      await faissService.initialize(TEST_DIMENSION);
      expect(typeof faissService.index.ntotal === 'function' ? faissService.index.ntotal() : faissService.index.ntotal).to.equal(1);
    });
  });

  describe('index management', () => {
    it('should clear index', async () => {
      await faissService.initialize(TEST_DIMENSION);
      
      // Add test vector
      const testVector = new Array(TEST_DIMENSION).fill(0).map(() => Math.random());
      await faissService.addVector(testVector, 1);      // Clear index
      const result = await faissService.clearIndex();
      expect(result).to.equal(true);
      expect(typeof faissService.index.ntotal === 'function' ? faissService.index.ntotal() : faissService.index.ntotal).to.equal(0);
    });

    it('should report correct index statistics', async () => {
      await faissService.initialize(TEST_DIMENSION);
        const stats = faissService.getIndexStats();
      expect(stats).to.deep.equal({
        initialized: true,
        dimension: TEST_DIMENSION,
        totalVectors: 0,
        indexType: 'IndexFlatIP'
      });
    });

    it('should pass health check when initialized', async () => {
      await faissService.initialize(TEST_DIMENSION);      const healthy = await faissService.healthCheck();
      expect(healthy).to.equal(true);
    });
  });
});

// Helper function for cosine similarity calculation
function cosineSimilarity(vector1, vector2) {
  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));
  return dotProduct / (magnitude1 * magnitude2);
}
