const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

// POST /api/visits - Create new visit (NFC + GPS validation)
router.post('/',
  authMiddleware.authenticate,
  validationMiddleware.validateVisitData,
  visitController.createVisit
);

// GET /api/visits - Get user's visit history
router.get('/',
  authMiddleware.authenticate,
  visitController.getUserVisits
);

// GET /api/visits/:id - Get specific visit details
router.get('/:id',
  authMiddleware.authenticate,
  validationMiddleware.validateVisitId,
  visitController.getVisitById
);

// POST /api/visits/validate - Validate visit coordinates and NFC data
router.post('/validate',
  authMiddleware.authenticate,
  validationMiddleware.validateVisitData,
  visitController.validateVisit
);

// GET /api/visits/location/:locationId - Get visits by location
router.get('/location/:locationId',
  authMiddleware.authenticate,
  validationMiddleware.validateLocationId,
  visitController.getVisitsByLocation
);

// POST /api/visits/:id/verify - Verify visit for NFT minting
router.post('/:id/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateVisitId,
  visitController.verifyVisitForNFT
);

// GET /api/visits/stats/user - Get user visit statistics
router.get('/stats/user',
  authMiddleware.authenticate,
  visitController.getUserVisitStats
);

// POST /api/visits/semantic-search - Search visits using vector similarity
router.post('/semantic-search',
  authMiddleware.authenticate,
  validationMiddleware.validateSemanticSearch,
  visitController.semanticSearchVisits
);

module.exports = router;