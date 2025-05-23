const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

// POST /api/auth/login - Web3Auth wallet login
router.post('/login', 
  validationMiddleware.validateLogin,
  authController.login
);

// POST /api/auth/register - Register new user with wallet
router.post('/register',
  validationMiddleware.validateRegistration,
  authController.register
);

// GET /api/auth/profile - Get user profile (protected)
router.get('/profile',
  authMiddleware.authenticate,
  authController.getProfile
);

// PUT /api/auth/profile - Update user profile (protected)
router.put('/profile',
  authMiddleware.authenticate,
  validationMiddleware.validateProfileUpdate,
  authController.updateProfile
);

// POST /api/auth/verify-wallet - Verify wallet signature
router.post('/verify-wallet',
  validationMiddleware.validateWalletSignature,
  authController.verifyWallet
);

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh',
  authMiddleware.authenticate,
  authController.refreshToken
);

// POST /api/auth/logout - Logout user
router.post('/logout',
  authMiddleware.authenticate,
  authController.logout
);

module.exports = router;