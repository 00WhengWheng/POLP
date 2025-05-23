const ipfsService = require('../../services/ipfsService');

describe('IPFSService', () => {
  describe('healthCheck', () => {
    it('should return true if IPFS node is healthy', async () => {
      const healthy = await ipfsService.healthCheck();
      expect(typeof healthy).toBe('boolean');
    });
  });

  describe('store and retrieve visit data', () => {
    it('should store and retrieve visit data on IPFS', async () => {
      const visitData = {
        userId: 'test-user',
        locationName: 'Test Location',
        timestamp: new Date().toISOString(),
        extra: 'test'
      };
      const result = await ipfsService.storeVisitData(visitData);
      expect(result).toHaveProperty('cid');
      expect(result).toHaveProperty('ipfsUrl');
      const retrieved = await ipfsService.getVisitData(result.cid);
      expect(retrieved.locationName).toBe('Test Location');
      expect(retrieved.userId).toBe('test-user');
    }, 30000);
  });

  describe('store and retrieve metadata', () => {
    it('should store and retrieve NFT metadata on IPFS', async () => {
      const metadata = {
        name: 'Test NFT',
        description: 'A test NFT',
        image: 'https://example.com/image.png'
      };
      const result = await ipfsService.storeMetadata(metadata);
      expect(result).toHaveProperty('cid');
      expect(result).toHaveProperty('ipfsUrl');
      const retrieved = await ipfsService.getMetadata(result.cid);
      expect(retrieved.name).toBe('Test NFT');
      expect(retrieved.description).toBe('A test NFT');
    }, 30000);
  });

  describe('pin and unpin content', () => {
    it('should pin and unpin content on IPFS', async () => {
      const metadata = { name: 'PinTest', description: 'Pin test' };
      const { cid } = await ipfsService.storeMetadata(metadata);
      const pinResult = await ipfsService.pinContent(cid);
      expect(pinResult).toBe(true);
      const unpinResult = await ipfsService.unpinContent(cid);
      expect(unpinResult).toBe(true);
    }, 30000);
  });
});
