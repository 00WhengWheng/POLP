const { ethers } = require('ethers');
const logger = require('../utils/logger');

class WalletService {

  /**
   * Verify wallet signature for authentication
   * @param {string} walletAddress - The wallet address
   * @param {string} signature - The signature to verify
   * @param {string} message - The original message that was signed
   * @returns {boolean} - True if signature is valid
   */
  async verifySignature(walletAddress, signature, message) {
    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Compare with provided wallet address (case-insensitive)
      const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      
      logger.info(`Signature verification for ${walletAddress}: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
      return isValid;
    } catch (error) {
      logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate a challenge message for wallet authentication
   * @param {string} walletAddress - The wallet address
   * @param {number} timestamp - Current timestamp
   * @returns {string} - Challenge message to be signed
   */
  generateAuthChallenge(walletAddress, timestamp = Date.now()) {
    return `POGPP Authentication Challenge\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Validate wallet address format
   * @param {string} walletAddress - The wallet address to validate
   * @returns {boolean} - True if address is valid
   */
  isValidAddress(walletAddress) {
    try {
      return ethers.isAddress(walletAddress);
    } catch (error) {
      logger.error('Address validation error:', error);
      return false;
    }
  }

  /**
   * Get wallet balance on Gnosis Chain
   * @param {string} walletAddress - The wallet address
   * @returns {object} - Balance information
   */
  async getWalletBalance(walletAddress) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.GNOSIS_RPC_URL);
      const balance = await provider.getBalance(walletAddress);
      
      return {
        address: walletAddress,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString()
      };
    } catch (error) {
      logger.error('Get wallet balance error:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Estimate gas for a transaction
   * @param {object} txData - Transaction data
   * @returns {object} - Gas estimation
   */
  async estimateGas(txData) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.GNOSIS_RPC_URL);
      const gasEstimate = await provider.estimateGas(txData);
      
      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: await provider.getFeeData()
      };
    } catch (error) {
      logger.error('Gas estimation error:', error);
      throw new Error('Failed to estimate gas');
    }
  }

  /**
   * Create a typed data structure for EIP-712 signing
   * @param {object} data - Data to be signed
   * @param {string} domain - Domain information
   * @returns {object} - Typed data structure
   */
  createTypedData(data, domain = 'POGPP') {
    return {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' }
        ],
        Visit: [
          { name: 'nfcTagId', type: 'string' },
          { name: 'latitude', type: 'string' },
          { name: 'longitude', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'userAddress', type: 'address' }
        ]
      },
      primaryType: 'Visit',
      domain: {
        name: domain,
        version: '1',
        chainId: 100 // Gnosis Chain ID
      },
      message: data
    };
  }

  /**
   * Verify EIP-712 typed data signature
   * @param {object} typedData - The typed data structure
   * @param {string} signature - The signature to verify
   * @param {string} expectedAddress - Expected signer address
   * @returns {boolean} - True if signature is valid
   */
  async verifyTypedSignature(typedData, signature, expectedAddress) {
    try {
      const recoveredAddress = ethers.verifyTypedData(
        typedData.domain,
        typedData.types,
        typedData.message,
        signature
      );
      
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      logger.error('Typed signature verification error:', error);
      return false;
    }
  }
}

module.exports = new WalletService();