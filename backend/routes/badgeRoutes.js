const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

// GET /api/badges - Get user's NFT badges
router.get('/',
  authMiddleware.authenticate,
  badgeController.getUserBadges
);

// POST /api/badges/mint - Mint new NFT badge for verified visit
router.post('/mint',
  authMiddleware.authenticate,
  validationMiddleware.validateBadgeMint,
  badgeController.mintBadge
);

// GET /api/badges/:tokenId - Get specific badge details
router.get('/:tokenId',
  authMiddleware.authenticate,
  validationMiddleware.validateTokenId,
  badgeController.getBadgeById
);

// GET /api/badges/visit/:visitId - Get badge for specific visit
router.get('/visit/:visitId',
  authMiddleware.authenticate,
  validationMiddleware.validateVisitId,
  badgeController.getBadgeByVisit
);

// POST /api/badges/:tokenId/transfer - Transfer badge to another wallet
router.post('/:tokenId/transfer',
  authMiddleware.authenticate,
  validationMiddleware.validateBadgeTransfer,
  badgeController.transferBadge
);

// GET /api/badges/metadata/:tokenId - Get badge metadata (public)
router.get('/metadata/:tokenId',
  validationMiddleware.validateTokenId,
  badgeController.getBadgeMetadata
);

// GET /api/badges/collection/stats - Get collection statistics
router.get('/collection/stats',
  badgeController.getCollectionStats
);

// POST /api/badges/verify - Verify badge authenticity
router.post('/verify',
  validationMiddleware.validateBadgeVerification,
  badgeController.verifyBadge
);

// GET /api/badges/leaderboard - Get user leaderboard by badges
router.get('/leaderboard',
  badgeController.getLeaderboard
);

module.exports = router;