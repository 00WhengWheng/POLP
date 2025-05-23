const { ethers } = require('ethers');
const logger = require('../utils/logger');

// POGPPBadge contract ABI (minimal interface)
const BADGE_CONTRACT_ABI = [
  "function claimBadge(address to, uint256 badgeId, string memory tokenURI) external",
  "function claimed(address user, uint256 badgeId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function nextTokenId() external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)"
];

class NFTService {

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.GNOSIS_RPC_URL);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contractAddress = process.env.POGPP_CONTRACT_ADDRESS;
    this.contract = new ethers.Contract(this.contractAddress, BADGE_CONTRACT_ABI, this.signer);
  }

  /**
   * Generate badge ID based on visit data
   * @param {object} visit - Visit data
   * @returns {number} - Badge ID for the smart contract
   */
  async generateBadgeId(visit) {
    try {
      // Create deterministic badge ID based on location
      const locationHash = ethers.keccak256(
        ethers.toUtf8Bytes(visit.nfcTagId + visit.locationName)
      );
      
      // Convert to number and ensure it's within reasonable range
      const badgeId = parseInt(locationHash.slice(0, 10), 16) % 10000;
      
      logger.info(`Generated badge ID ${badgeId} for location ${visit.locationName}`);
      
      return badgeId;
    } catch (error) {
      logger.error('Badge ID generation error:', error);
      throw new Error('Failed to generate badge ID');
    }
  }

  /**
   * Check if a user has already claimed a specific badge
   * @param {string} userAddress - User's wallet address
   * @param {number} badgeId - Badge ID to check
   * @returns {boolean} - True if already claimed
   */
  async hasClaimedBadge(userAddress, badgeId) {
    try {
      const hasClaimed = await this.contract.claimed(userAddress, badgeId);
      
      logger.info(`Badge ${badgeId} claimed status for ${userAddress}: ${hasClaimed}`);
      
      return hasClaimed;
    } catch (error) {
      logger.error('Check claimed badge error:', error);
      throw new Error('Failed to check badge claim status');
    }
  }

  /**
   * Mint a new NFT badge
   * @param {string} userAddress - User's wallet address
   * @param {number} badgeId - Badge ID
   * @param {string} metadataUri - IPFS URI for metadata
   * @returns {object} - Mint transaction result
   */
  async mintBadge(userAddress, badgeId, metadataUri) {
    try {
      logger.info(`Minting badge ${badgeId} for ${userAddress} with metadata ${metadataUri}`);

      // Check if already claimed
      const alreadyClaimed = await this.hasClaimedBadge(userAddress, badgeId);
      if (alreadyClaimed) {
        throw new Error('Badge already claimed by this user');
      }

      // Get next token ID
      const nextTokenId = await this.contract.nextTokenId();

      // Estimate gas
      const gasEstimate = await this.contract.claimBadge.estimateGas(
        userAddress, 
        badgeId, 
        metadataUri
      );

      // Mint the badge
      const tx = await this.contract.claimBadge(
        userAddress,
        badgeId,
        metadataUri,
        {
          gasLimit: Math.floor(gasEstimate * 1.2), // Add 20% buffer
        }
      );

      logger.info(`Badge mint transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info(`Badge minted successfully. Token ID: ${nextTokenId}, TX: ${tx.hash}`);

      return {
        tokenId: nextTokenId.toString(),
        badgeId,
        contractAddress: this.contractAddress,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Mint badge error:', error);
      throw new Error(`Failed to mint badge: ${error.message}`);
    }
  }

  /**
   * Transfer a badge to another address
   * @param {string} fromAddress - Current owner address
   * @param {string} toAddress - New owner address
   * @param {string} tokenId - Token ID to transfer
   * @returns {object} - Transfer transaction result
   */
  async transferBadge(fromAddress, toAddress, tokenId) {
    try {
      logger.info(`Transferring badge ${tokenId} from ${fromAddress} to ${toAddress}`);

      // Verify ownership
      const currentOwner = await this.contract.ownerOf(tokenId);
      if (currentOwner.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Transfer failed: sender is not the owner');
      }

      // Estimate gas
      const gasEstimate = await this.contract.transferFrom.estimateGas(
        fromAddress,
        toAddress,
        tokenId
      );

      // Execute transfer
      const tx = await this.contract.transferFrom(
        fromAddress,
        toAddress,
        tokenId,
        {
          gasLimit: Math.floor(gasEstimate * 1.2)
        }
      );

      const receipt = await tx.wait();

      logger.info(`Badge transferred successfully. TX: ${tx.hash}`);

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        fromAddress,
        toAddress,
        tokenId
      };

    } catch (error) {
      logger.error('Transfer badge error:', error);
      throw new Error(`Failed to transfer badge: ${error.message}`);
    }
  }

  /**
   * Verify badge ownership
   * @param {string} tokenId - Token ID to verify
   * @param {string} expectedOwner - Expected owner address
   * @returns {boolean} - True if ownership is verified
   */
  async verifyBadgeOwnership(tokenId, expectedOwner) {
    try {
      const currentOwner = await this.contract.ownerOf(tokenId);
      const isOwner = currentOwner.toLowerCase() === expectedOwner.toLowerCase();
      
      logger.info(`Badge ${tokenId} ownership verification: ${isOwner}`);
      
      return isOwner;
    } catch (error) {
      logger.error('Verify badge ownership error:', error);
      return false;
    }
  }

  /**
   * Get badge metadata URI
   * @param {string} tokenId - Token ID
   * @returns {string} - Metadata URI
   */
  async getBadgeMetadataUri(tokenId) {
    try {
      const metadataUri = await this.contract.tokenURI(tokenId);
      
      logger.info(`Retrieved metadata URI for token ${tokenId}: ${metadataUri}`);
      
      return metadataUri;
    } catch (error) {
      logger.error('Get badge metadata URI error:', error);
      throw new Error('Failed to get badge metadata URI');
    }
  }

  /**
   * Get contract statistics
   * @returns {object} - Contract statistics
   */
  async getContractStats() {
    try {
      const nextTokenId = await this.contract.nextTokenId();
      const totalSupply = parseInt(nextTokenId.toString());

      return {
        totalSupply,
        contractAddress: this.contractAddress,
        chainId: (await this.provider.getNetwork()).chainId
      };
    } catch (error) {
      logger.error('Get contract stats error:', error);
      throw new Error('Failed to get contract statistics');
    }
  }

  /**
   * Check contract health and connectivity
   * @returns {boolean} - True if contract is accessible
   */
  async healthCheck() {
    try {
      await this.contract.nextTokenId();
      return true;
    } catch (error) {
      logger.error('NFT service health check failed:', error);
      return false;
    }
  }
}

module.exports = new NFTService();