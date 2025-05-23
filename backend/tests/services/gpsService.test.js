const gpsService = require('../../services/gpsService');

describe('GPSService', () => {
  describe('validateCoordinates', () => {
    it('should return true for valid coordinates', async () => {
      expect(await gpsService.validateCoordinates(45.4642, 9.19)).toBe(true);
      expect(await gpsService.validateCoordinates(-45.0, 100.0)).toBe(true);
    });
    it('should return false for invalid coordinates', async () => {
      expect(await gpsService.validateCoordinates(100, 200)).toBe(false);
      expect(await gpsService.validateCoordinates('abc', 10)).toBe(false);
      expect(await gpsService.validateCoordinates(0, 0)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate correct distance between two points', () => {
      const dist = gpsService.calculateDistance(45.4642, 9.19, 45.4654, 9.1866);
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('isWithinGeofence', () => {
    it('should return true if point is within circle geofence', () => {
      const geofence = {
        type: 'circle',
        center: { latitude: 45.4642, longitude: 9.19 },
        radius: 500 // meters
      };
      expect(gpsService.isWithinGeofence(45.4643, 9.19, geofence)).toBe(true);
    });
    it('should return false if point is outside circle geofence', () => {
      const geofence = {
        type: 'circle',
        center: { latitude: 45.4642, longitude: 9.19 },
        radius: 10 // meters
      };
      expect(gpsService.isWithinGeofence(45.4654, 9.1866, geofence)).toBe(false);
    });
    it('should return true if point is within polygon geofence', () => {
      const geofence = {
        type: 'polygon',
        polygon: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 0 }
        ]
      };
      expect(gpsService.isWithinGeofence(0.5, 0.5, geofence)).toBe(true);
    });
    it('should return false if point is outside polygon geofence', () => {
      const geofence = {
        type: 'polygon',
        polygon: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 0 }
        ]
      };
      expect(gpsService.isWithinGeofence(2, 2, geofence)).toBe(false);
    });
  });

  describe('validateGPSAccuracy', () => {
    it('should return true for acceptable accuracy', () => {
      expect(gpsService.validateGPSAccuracy(50)).toBe(true);
    });
    it('should return false for poor accuracy', () => {
      expect(gpsService.validateGPSAccuracy(200)).toBe(false);
    });
    it('should return false for invalid accuracy', () => {
      expect(gpsService.validateGPSAccuracy(-1)).toBe(false);
      expect(gpsService.validateGPSAccuracy('abc')).toBe(false);
    });
  });
});
