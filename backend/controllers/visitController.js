const Visit = require('../models/Visit');
const User = require('../models/User');
const gpsService = require('../services/gpsService');
const ipfsService = require('../services/ipfsService');
const faissService = require('../services/faissService');
const { hashUtils } = require('../utils/hashUtils');
const logger = require('../utils/logger');

class VisitController {

  async createVisit(req, res) {
    try {
      const { 
        nfcTagId, 
        latitude, 
        longitude, 
        timestamp, 
        locationName,
        description 
      } = req.body;
      
      const userId = req.user.userId;

      // Validate GPS coordinates
      const isValidLocation = await gpsService.validateCoordinates(
        latitude, 
        longitude
      );

      if (!isValidLocation) {
        return res.status(400).json({
          error: 'Invalid GPS coordinates'
        });
      }

      // Check for duplicate visits (same user, same NFC tag, within time window)
      const duplicateVisit = await Visit.findOne({
        where: {
          userId,
          nfcTagId,
          createdAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
          }
        }
      });

      if (duplicateVisit) {
        return res.status(409).json({
          error: 'Duplicate visit detected',
          message: 'You already visited this location recently'
        });
      }

      // Create visit data hash
      const visitData = {
        userId,
        nfcTagId,
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
        locationName,
        description
      };

      const visitHash = hashUtils.createVisitHash(visitData);

      // Store on IPFS
      const ipfsResult = await ipfsService.storeVisitData(visitData);
      
      // Create semantic vector for FAISS
      const semanticVector = await faissService.createVisitVector(visitData);

      // Save visit to database
      const visit = await Visit.create({
        userId,
        nfcTagId,
        latitude,
        longitude,
        locationName,
        description,
        visitHash,
        ipfsCid: ipfsResult.cid,
        ipnsKey: ipfsResult.ipnsKey,
        semanticVector,
        isVerified: false,
        timestamp: new Date(visitData.timestamp)
      });

      logger.info(`Visit created for user ${userId} at location ${locationName}`);

      res.status(201).json({
        message: 'Visit created successfully',
        visit: {
          id: visit.id,
          nfcTagId: visit.nfcTagId,
          latitude: visit.latitude,
          longitude: visit.longitude,
          locationName: visit.locationName,
          description: visit.description,
          visitHash: visit.visitHash,
          ipfsCid: visit.ipfsCid,
          timestamp: visit.timestamp,
          isVerified: visit.isVerified
        }
      });

    } catch (error) {
      logger.error('Create visit error:', error);
      res.status(500).json({
        error: 'Failed to create visit',
        message: error.message
      });
    }
  }

  async getUserVisits(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 50, offset = 0, locationName } = req.query;

      const whereClause = { userId };
      if (locationName) {
        whereClause.locationName = {
          [require('sequelize').Op.iLike]: `%${locationName}%`
        };
      }

      const visits = await Visit.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['timestamp', 'DESC']],
        attributes: { exclude: ['semanticVector'] }
      });

      res.status(200).json({
        visits: visits.rows,
        totalCount: visits.count,
        hasMore: (parseInt(offset) + visits.rows.length) < visits.count
      });

    } catch (error) {
      logger.error('Get user visits error:', error);
      res.status(500).json({
        error: 'Failed to get visits',
        message: error.message
      });
    }
  }

  async getVisitById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const visit = await Visit.findOne({
        where: { id, userId },
        attributes: { exclude: ['semanticVector'] }
      });

      if (!visit) {
        return res.status(404).json({
          error: 'Visit not found'
        });
      }

      // Get IPFS data
      const ipfsData = await ipfsService.getVisitData(visit.ipfsCid);

      res.status(200).json({
        visit: {
          ...visit.toJSON(),
          ipfsData
        }
      });

    } catch (error) {
      logger.error('Get visit by ID error:', error);
      res.status(500).json({
        error: 'Failed to get visit',
        message: error.message
      });
    }
  }

  async validateVisit(req, res) {
    try {
      const { 
        nfcTagId, 
        latitude, 
        longitude, 
        expectedLocation 
      } = req.body;

      // Validate coordinates
      const isValidGPS = await gpsService.validateCoordinates(latitude, longitude);
      
      // Validate proximity to expected location if provided
      let isValidProximity = true;
      if (expectedLocation) {
        const distance = gpsService.calculateDistance(
          latitude, 
          longitude,
          expectedLocation.latitude,
          expectedLocation.longitude
        );
        isValidProximity = distance <= (expectedLocation.radiusMeters || 100);
      }

      // Validate NFC tag format
      const isValidNFC = nfcTagId && nfcTagId.length > 0;

      res.status(200).json({
        isValid: isValidGPS && isValidProximity && isValidNFC,
        validation: {
          gps: isValidGPS,
          proximity: isValidProximity,
          nfc: isValidNFC,
          ...(expectedLocation && { 
            distance: gpsService.calculateDistance(
              latitude, 
              longitude,
              expectedLocation.latitude,
              expectedLocation.longitude
            )
          })
        }
      });

    } catch (error) {
      logger.error('Validate visit error:', error);
      res.status(500).json({
        error: 'Failed to validate visit',
        message: error.message
      });
    }
  }

  async getVisitsByLocation(req, res) {
    try {
      const { locationId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const visits = await Visit.findAndCountAll({
        where: { nfcTagId: locationId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['timestamp', 'DESC']],
        include: [{
          model: User,
          attributes: ['id', 'username', 'walletAddress']
        }],
        attributes: { exclude: ['semanticVector'] }
      });

      res.status(200).json({
        visits: visits.rows,
        totalCount: visits.count,
        locationId
      });

    } catch (error) {
      logger.error('Get visits by location error:', error);
      res.status(500).json({
        error: 'Failed to get visits by location',
        message: error.message
      });
    }
  }

  async verifyVisitForNFT(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const visit = await Visit.findOne({
        where: { id, userId }
      });

      if (!visit) {
        return res.status(404).json({
          error: 'Visit not found'
        });
      }

      if (visit.isVerified) {
        return res.status(409).json({
          error: 'Visit already verified'
        });
      }

      // Perform additional verification checks
      const ipfsData = await ipfsService.getVisitData(visit.ipfsCid);
      const isDataIntact = hashUtils.verifyVisitHash(ipfsData, visit.visitHash);

      if (!isDataIntact) {
        return res.status(400).json({
          error: 'Visit data integrity check failed'
        });
      }

      // Mark as verified
      await visit.update({ 
        isVerified: true,
        verifiedAt: new Date()
      });

      logger.info(`Visit ${id} verified for NFT minting`);

      res.status(200).json({
        message: 'Visit verified successfully',
        visit: {
          id: visit.id,
          isVerified: true,
          verifiedAt: visit.verifiedAt,
          eligibleForNFT: true
        }
      });

    } catch (error) {
      logger.error('Verify visit for NFT error:', error);
      res.status(500).json({
        error: 'Failed to verify visit',
        message: error.message
      });
    }
  }

  async getUserVisitStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await Visit.findAll({
        where: { userId },
        attributes: [
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalVisits'],
          [require('sequelize').fn('COUNT', require('sequelize').col('isVerified')), 'verifiedVisits'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT "nfcTagId"')), 'uniqueLocations']
        ],
        raw: true
      });

      const recentVisits = await Visit.count({
        where: {
          userId,
          timestamp: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      res.status(200).json({
        stats: {
          ...stats[0],
          recentVisits
        }
      });

    } catch (error) {
      logger.error('Get user visit stats error:', error);
      res.status(500).json({
        error: 'Failed to get visit statistics',
        message: error.message
      });
    }
  }

  async semanticSearchVisits(req, res) {
    try {
      const { query, limit = 10 } = req.body;
      const userId = req.user.userId;

      // Create query vector
      const queryVector = await faissService.createQueryVector(query);

      // Search similar visits
      const similarVisits = await faissService.searchSimilarVisits(
        queryVector, 
        limit,
        userId
      );

      res.status(200).json({
        query,
        results: similarVisits
      });

    } catch (error) {
      logger.error('Semantic search error:', error);
      res.status(500).json({
        error: 'Failed to perform semantic search',
        message: error.message
      });
    }
  }
}

module.exports = new VisitController();