const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');
const walletService = require('../services/walletService');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
  
  async login(req, res) {
    try {
      const { walletAddress, signature, message } = req.body;

      // Verify wallet signature
      const isValidSignature = await walletService.verifySignature(
        walletAddress, 
        signature, 
        message
      );

      if (!isValidSignature) {
        return res.status(401).json({
          error: 'Invalid wallet signature'
        });
      }

      // Find or create user
      let user = await User.findOne({ 
        where: { walletAddress: walletAddress.toLowerCase() }
      });

      if (!user) {
        // Auto-register new users
        user = await User.create({
          walletAddress: walletAddress.toLowerCase(),
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: new Date()
        });
        
        logger.info(`New user registered: ${walletAddress}`);
      } else {
        // Update last login
        await user.update({ lastLoginAt: new Date() });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          walletAddress: user.walletAddress 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          isActive: user.isActive
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message
      });
    }
  }

  async register(req, res) {
    try {
      const { walletAddress, signature, message, username } = req.body;

      // Verify wallet signature
      const isValidSignature = await walletService.verifySignature(
        walletAddress, 
        signature, 
        message
      );

      if (!isValidSignature) {
        return res.status(401).json({
          error: 'Invalid wallet signature'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ 
        where: { walletAddress: walletAddress.toLowerCase() }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already registered'
        });
      }

      // Create new user
      const user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        username: username || null,
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date()
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          walletAddress: user.walletAddress 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      logger.info(`User registered: ${walletAddress}`);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          isActive: user.isActive
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error.message
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.userId, {
        attributes: { exclude: ['createdAt', 'updatedAt'] }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.status(200).json({
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile',
        message: error.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username } = req.body;
      const userId = req.user.userId;

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      await user.update({ username });

      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          isActive: user.isActive
        }
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error.message
      });
    }
  }

  async verifyWallet(req, res) {
    try {
      const { walletAddress, signature, message } = req.body;

      const isValid = await walletService.verifySignature(
        walletAddress, 
        signature, 
        message
      );

      res.status(200).json({
        isValid,
        walletAddress: walletAddress.toLowerCase()
      });

    } catch (error) {
      logger.error('Wallet verification error:', error);
      res.status(500).json({
        error: 'Wallet verification failed',
        message: error.message
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const userId = req.user.userId;
      const walletAddress = req.user.walletAddress;

      // Generate new token
      const token = jwt.sign(
        { userId, walletAddress },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({
        message: 'Token refreshed successfully',
        token
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      // Update last login time
      await User.update(
        { lastLoginAt: new Date() },
        { where: { id: req.user.userId } }
      );

      res.status(200).json({
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();