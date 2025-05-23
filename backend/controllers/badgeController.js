const Badge = require('../models/Badge');
const Visit = require('../models/Visit');
const User = require('../models/User');
const nftService = require('../services/nftService');
const ipfsService = require('../services/ipfsService');
const logger = require('../utils/logger');

class BadgeController {

  async getUserBadges(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 50, offset = 0 } = req.query;

      const badges = await Badge.findAndCountAll({
        where: { userId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['mintedAt', 'DESC']],
        include: [{
          model: Visit,
          attributes: ['id', 'locationName', 'timestamp', 'latitude', 'longitude']
        }]
      });

      res.status(200).json({
        badges: badges.rows,
        totalCount: badges.count,
        hasMore: (parseInt(offset) + badges.rows.length) < badges.count
      });

    } catch (error) {
      logger.error('Get user badges error:', error);
      res.status(500).json({
        error: 'Failed to get user badges',
        message: error.message
      });
    }
  }

  async mintBadge(req, res) {
    try {
      const { visitId, badgeType = 'location' } = req.body;
      const userId = req.user.userId;

      // Get the visit
      const visit = await Visit.findOne({
        where: { id: visitId, userId }
      });

      if (!visit) {
        return res.status(404).json({
          error: 'Visit not found'
        });
      }

      if (!visit.isVerified) {
        return res.status(400).json({
          error: 'Visit must be verified before minting badge'
        });
      }

      // Check if badge already exists for this visit
      const existingBadge = await Badge.findOne({
        where: { visitId, userId }
      });

      if (existingBadge) {
        return res.status(409).json({
          error: 'Badge already minted for this visit'
        });
      }

      // Get user wallet address
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Generate badge metadata
      const metadata = {
        name: `POGPP Badge - ${visit.locationName}`,
        description: `Proof of presence at ${visit.locationName} on ${visit.timestamp.toISOString()}`,
        image: '', // Will be set after IPFS upload
        attributes: [
          {
            trait_type: 'Location',
            value: visit.locationName
          },
          {
            trait_type: 'Coordinates',
            value: `${visit.latitude}, ${visit.longitude}`
          },
          {
            trait_type: 'Visit Date',
            value: visit.timestamp.toISOString().split('T')[0]
          },
          {
            trait_type: 'Badge Type',
            value: badgeType
          },
          {
            trait_type: 'NFC Tag ID',
            value: visit.nfcTagId
          }
        ],
        properties: {
          visitId: visit.id,
          visitHash: visit.visitHash,
          ipfsCid: visit.ipfsCid,
          verifiedAt: visit.verifiedAt
        }
      };

      // Store metadata on IPFS
      const metadataResult = await ipfsService.storeMetadata(metadata);

      // Generate badge ID for the smart contract
      const badgeId = await nftService.generateBadgeId(visit);

      // Check if user already claimed this badge type
      const hasClaimedBadge = await nftService.hasClaimedBadge(
        user.walletAddress, 
        badgeId
      );

      if (hasClaimedBadge) {
        return res.status(409).json({
          error: 'Badge type already claimed by this user'
        });
      }

      // Mint NFT on blockchain
      const mintResult = await nftService.mintBadge(
        user.walletAddress,
        badgeId,
        metadataResult.ipfsUrl
      );

      // Save badge to database
      const badge = await Badge.create({
        userId,
        visitId,
        tokenId: mintResult.tokenId,
        badgeId,
        badgeType,
        contractAddress: mintResult.contractAddress,
        txHash: mintResult.txHash,
        metadataUri: metadataResult.ipfsUrl,
        ipfsCid: metadataResult.cid,
        mintedAt: new Date()
      });

      logger.info(`Badge minted for user ${userId}, tokenId: ${mintResult.tokenId}`);

      res.status(201).json({
        message: 'Badge minted successfully',
        badge: {
          id: badge.id,
          tokenId: badge.tokenId,
          badgeId: badge.badgeId,
          badgeType: badge.badgeType,
          contractAddress: badge.contractAddress,
          txHash: badge.txHash,
          metadataUri: badge.metadataUri,
          mintedAt: badge.mintedAt
        },
        visit: {
          id: visit.id,
          locationName: visit.locationName,
          timestamp: visit.timestamp
        }
      });

    } catch (error) {
      logger.error('Mint badge error:', error);
      res.status(500).json({
        error: 'Failed to mint badge',
        message: error.message
      });
    }
  }

  async getBadgeById(req, res) {
    try {
      const { tokenId } = req.params;
      const userId = req.user.userId;

      const badge = await Badge.findOne({
        where: { tokenId, userId },
        include: [{
          model: Visit,
          attributes: ['id', 'locationName', 'timestamp', 'latitude', 'longitude', 'description']
        }]
      });

      if (!badge) {
        return res.status(404).json({
          error: 'Badge not found'
        });
      }

      // Get metadata from IPFS
      const metadata = await ipfsService.getMetadata(badge.ipfsCid);

      res.status(200).json({
        badge: {
          ...badge.toJSON(),
          metadata
        }
      });

    } catch (error) {
      logger.error('Get badge by ID error:', error);
      res.status(500).json({
        error: 'Failed to get badge',
        message: error.message
      });
    }
  }

  async getBadgeByVisit(req, res) {
    try {
      const { visitId } = req.params;
      const userId = req.user.userId;

      const badge = await Badge.findOne({
        where: { visitId, userId },
        include: [{
          model: Visit,
          attributes: ['id', 'locationName', 'timestamp', 'latitude', 'longitude']
        }]
      });

      if (!badge) {
        return res.status(404).json({
          error: 'No badge found for this visit'
        });
      }

      res.status(200).json({ badge });

    } catch (error) {
      logger.error('Get badge by visit error:', error);
      res.status(500).json({
        error: 'Failed to get badge by visit',
        message: error.message
      });
    }
  }

  async transferBadge(req, res) {
    try {
      const { tokenId } = req.params;
      const { toAddress } = req.body;
      const userId = req.user.userId;

      const badge = await Badge.findOne({
        where: { tokenId, userId }
      });

      if (!badge) {
        return res.status(404).json({
          error: 'Badge not found'
        });
      }

      // Get user wallet address
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Transfer NFT on blockchain
      const transferResult = await nftService.transferBadge(
        user.walletAddress,
        toAddress,
        tokenId
      );

      // Update badge ownership in database
      const newOwner = await User.findOne({
        where: { walletAddress: toAddress.toLowerCase() }
      });

      if (newOwner) {
        await badge.update({ 
          userId: newOwner.id,
          transferredAt: new Date()
        });
      }

      logger.info(`Badge ${tokenId} transferred from ${user.walletAddress} to ${toAddress}`);

      res.status(200).json({
        message: 'Badge transferred successfully',
        txHash: transferResult.txHash,
        fromAddress: user.walletAddress,
        toAddress: toAddress
      });

    } catch (error) {
      logger.error('Transfer badge error:', error);
      res.status(500).json({
        error: 'Failed to transfer badge',
        message: error.message
      });
    }
  }

  async getBadgeMetadata(req, res) {
    try {
      const { tokenId } = req.params;

      // This is a public endpoint for NFT marketplaces
      const badge = await Badge.findOne({
        where: { tokenId },
        include: [{
          model: Visit,
          attributes: ['locationName', 'timestamp', 'latitude', 'longitude']
        }]
      });

      if (!badge) {
        return res.status(404).json({
          error: 'Badge not found'
        });
      }

      // Get metadata from IPFS
      const metadata = await ipfsService.getMetadata(badge.ipfsCid);

      res.status(200).json(metadata);

    } catch (error) {
      logger.error('Get badge metadata error:', error);
      res.status(500).json({
        error: 'Failed to get badge metadata',
        message: error.message
      });
    }
  }

  async getCollectionStats(req, res) {
    try {
      const stats = await Badge.findAll({
        attributes: [
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalBadges'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT "userId"')), 'uniqueHolders'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT "badgeType"')), 'badgeTypes']
        ],
        raw: true
      });

      const recentBadges = await Badge.count({
        where: {
          mintedAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      res.status(200).json({
        collection: {
          ...stats[0],
          recentBadges
        }
      });

    } catch (error) {
      logger.error('Get collection stats error:', error);
      res.status(500).json({
        error: 'Failed to get collection statistics',
        message: error.message
      });
    }
  }

  async verifyBadge(req, res) {
    try {
      const { tokenId, walletAddress } = req.body;

      // Verify on blockchain
      const isValid = await nftService.verifyBadgeOwnership(tokenId, walletAddress);

      // Verify in database
      const badge = await Badge.findOne({
        where: { tokenId },
        include: [{
          model: User,
          where: { walletAddress: walletAddress.toLowerCase() }
        }]
      });

      const isValidInDB = !!badge;

      res.status(200).json({
        isValid: isValid && isValidInDB,
        verification: {
          blockchain: isValid,
          database: isValidInDB
        },
        ...(badge && {
          badge: {
            tokenId: badge.tokenId,
            badgeType: badge.badgeType,
            mintedAt: badge.mintedAt
          }
        })
      });

    } catch (error) {
      logger.error('Verify badge error:', error);
      res.status(500).json({
        error: 'Failed to verify badge',
        message: error.message
      });
    }
  }

  async getLeaderboard(req, res) {
    try {
      const { limit = 10 } = req.query;

      const leaderboard = await Badge.findAll({
        attributes: [
          'userId',
          [require('sequelize').fn('COUNT', require('sequelize').col('Badge.id')), 'badgeCount']
        ],
        include: [{
          model: User,
          attributes: ['username', 'walletAddress']
        }],
        group: ['userId', 'User.id'],
        order: [[require('sequelize').literal('badgeCount'), 'DESC']],
        limit: parseInt(limit)
      });

      res.status(200).json({
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          user: {
            id: entry.userId,
            username: entry.User.username,
            walletAddress: entry.User.walletAddress
          },
          badgeCount: parseInt(entry.dataValues.badgeCount)
        }))
      });

    } catch (error) {
      logger.error('Get leaderboard error:', error);
      res.status(500).json({
        error: 'Failed to get leaderboard',
        message: error.message
      });
    }
  }
}

module.exports = new BadgeController();