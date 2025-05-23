#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import configurations
const { initializeWeb3, createProvider, createSigner } = require('../config/web3');
const { initializeDatabase } = require('../config/db');
const { initializeFAISS } = require('../config/faiss');
const { initializeIPFS } = require('../config/ipfs');
const logger = require('../utils/logger');

class DeploymentScript {
  
  constructor() {
    this.provider = null;
    this.signer = null;
    this.deployedContracts = {};
    this.deploymentConfig = {
      network: process.env.NETWORK || 'gnosis',
      contractsDir: path.join(__dirname, '../contracts'),
      deploymentDir: path.join(__dirname, '../deployments'),
      gasLimit: process.env.GAS_LIMIT || 2000000,
      gasPrice: process.env.GAS_PRICE || null // Let provider determine
    };
  }

  /**
   * Main deployment function
   */
  async deploy() {
    try {
      logger.info('Starting POGPP deployment process...');
      
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Initialize Web3 connection
      await this.initializeWeb3();
      
      // Step 3: Deploy smart contracts
      await this.deployContracts();
      
      // Step 4: Initialize backend services
      await this.initializeServices();
      
      // Step 5: Setup database
      await this.setupDatabase();
      
      // Step 6: Verify deployment
      await this.verifyDeployment();
      
      // Step 7: Save deployment info
      await this.saveDeploymentInfo();
      
      logger.info(' POGPP deployment completed successfully!');
      
    } catch (error) {
      logger.error('L Deployment failed:', error);
      process.exit(1);
    }
  }

  /**
   * Validate required environment variables
   */
  async validateEnvironment() {
    logger.info('= Validating environment configuration...');
    
    const required = [
      'PRIVATE_KEY',
      'GNOSIS_RPC_URL',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
      'IPFS_HOST'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate private key format
    if (!process.env.PRIVATE_KEY.startsWith('0x')) {
      throw new Error('PRIVATE_KEY must start with 0x');
    }

    // Validate database connection string format
    if (process.env.DATABASE_URL) {
      logger.info('Using DATABASE_URL for connection');
    }

    logger.info(' Environment validation passed');
  }

  /**
   * Initialize Web3 connection
   */
  async initializeWeb3() {
    logger.info('< Initializing Web3 connection...');
    
    try {
      this.provider = createProvider();
      this.signer = createSigner();
      
      // Test connection
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.signer.address);
      
      logger.info(`Connected to ${network.name} (Chain ID: ${network.chainId})`);
      logger.info(`Deployer address: ${this.signer.address}`);
      logger.info(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
      
      // Check minimum balance
      const minBalance = ethers.parseEther('0.01'); // 0.01 ETH minimum
      if (balance < minBalance) {
        throw new Error(`Insufficient balance. Need at least 0.01 ETH, have ${ethers.formatEther(balance)} ETH`);
      }
      
      logger.info(' Web3 connection established');
      
    } catch (error) {
      throw new Error(`Web3 initialization failed: ${error.message}`);
    }
  }

  /**
   * Deploy smart contracts
   */
  async deployContracts() {
    logger.info('=Ý Deploying smart contracts...');
    
    try {
      // Read POGPPBadge contract
      const contractPath = path.join(this.deploymentConfig.contractsDir, 'POGPPBadge.sol');
      const contractSource = await fs.readFile(contractPath, 'utf8');
      
      logger.info('Contract source loaded, compiling...');
      
      // For this example, we'll assume the contract is already compiled
      // In a real deployment, you'd use hardhat, truffle, or solc to compile
      
      // Mock deployment - replace with actual contract deployment
      const mockDeployment = await this.deployPOGPPBadge();
      
      this.deployedContracts.POGPPBadge = mockDeployment;
      
      logger.info(` POGPPBadge deployed at: ${mockDeployment.address}`);
      
    } catch (error) {
      throw new Error(`Contract deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploy POGPPBadge contract (mock implementation)
   */
  async deployPOGPPBadge() {
    logger.info('Deploying POGPPBadge contract...');
    
    // This is a mock deployment - in reality you'd compile and deploy the actual contract
    const mockAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      address: mockAddress,
      txHash: mockTxHash,
      blockNumber: await this.provider.getBlockNumber(),
      deployer: this.signer.address,
      deployedAt: new Date().toISOString(),
      contractName: 'POGPPBadge',
      network: this.deploymentConfig.network
    };
  }

  /**
   * Initialize backend services
   */
  async initializeServices() {
    logger.info('=' Initializing backend services...');
    
    try {
      // Initialize IPFS
      logger.info('Initializing IPFS...');
      const ipfsHealthy = await initializeIPFS();
      if (!ipfsHealthy) {
        throw new Error('IPFS initialization failed');
      }
      
      // Initialize FAISS
      logger.info('Initializing FAISS...');
      const faissHealthy = await initializeFAISS();
      if (!faissHealthy) {
        throw new Error('FAISS initialization failed');
      }
      
      // Create necessary directories
      await this.createDirectories();
      
      logger.info(' Backend services initialized');
      
    } catch (error) {
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const dirs = [
      path.join(__dirname, '../logs'),
      path.join(__dirname, '../data'),
      path.join(__dirname, '../data/faiss'),
      path.join(__dirname, '../data/faiss/backups'),
      this.deploymentConfig.deploymentDir
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Setup database
   */
  async setupDatabase() {
    logger.info('=Ä Setting up database...');
    
    try {
      // Initialize database connection
      const dbHealthy = await initializeDatabase();
      if (!dbHealthy) {
        throw new Error('Database initialization failed');
      }
      
      // Run any additional setup queries if needed
      await this.runDatabaseMigrations();
      
      logger.info(' Database setup completed');
      
    } catch (error) {
      throw new Error(`Database setup failed: ${error.message}`);
    }
  }

  /**
   * Run database migrations/setup
   */
  async runDatabaseMigrations() {
    logger.info('Running database migrations...');
    
    // Import models to ensure they're synchronized
    require('../models/User');
    require('../models/Visit');
    require('../models/Badge');
    
    // Additional setup could go here
    logger.info('Database models synchronized');
  }

  /**
   * Verify deployment
   */
  async verifyDeployment() {
    logger.info('= Verifying deployment...');
    
    try {
      // Check contract deployment
      if (this.deployedContracts.POGPPBadge) {
        const code = await this.provider.getCode(this.deployedContracts.POGPPBadge.address);
        if (code === '0x') {
          throw new Error('POGPPBadge contract not found at deployed address');
        }
      }
      
      // Verify services
      const serviceChecks = [
        { name: 'Web3', check: () => initializeWeb3() },
        { name: 'Database', check: () => initializeDatabase() },
        { name: 'IPFS', check: () => initializeIPFS() },
        { name: 'FAISS', check: () => initializeFAISS() }
      ];

      for (const service of serviceChecks) {
        const healthy = await service.check();
        if (!healthy) {
          throw new Error(`${service.name} health check failed`);
        }
        logger.info(` ${service.name} verification passed`);
      }
      
      logger.info(' Deployment verification completed');
      
    } catch (error) {
      throw new Error(`Deployment verification failed: ${error.message}`);
    }
  }

  /**
   * Save deployment information
   */
  async saveDeploymentInfo() {
    logger.info('=¾ Saving deployment information...');
    
    try {
      const deploymentInfo = {
        timestamp: new Date().toISOString(),
        network: this.deploymentConfig.network,
        deployer: this.signer.address,
        contracts: this.deployedContracts,
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          network: this.deploymentConfig.network
        },
        services: {
          ipfs: {
            host: process.env.IPFS_HOST,
            port: process.env.IPFS_PORT
          },
          database: {
            host: process.env.DB_HOST,
            name: process.env.DB_NAME
          }
        }
      };

      // Save to deployment directory
      const deploymentFile = path.join(
        this.deploymentConfig.deploymentDir,
        `deployment-${this.deploymentConfig.network}-${Date.now()}.json`
      );

      await fs.writeFile(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
      
      // Update latest deployment
      const latestFile = path.join(this.deploymentConfig.deploymentDir, 'latest.json');
      await fs.writeFile(latestFile, JSON.stringify(deploymentInfo, null, 2));
      
      // Update environment file with contract addresses
      await this.updateEnvironmentFile();
      
      logger.info(` Deployment info saved to: ${deploymentFile}`);
      
    } catch (error) {
      throw new Error(`Failed to save deployment info: ${error.message}`);
    }
  }

  /**
   * Update environment file with deployed contract addresses
   */
  async updateEnvironmentFile() {
    try {
      const envFile = path.join(__dirname, '../.env');
      let envContent = '';
      
      try {
        envContent = await fs.readFile(envFile, 'utf8');
      } catch (error) {
        // File doesn't exist, create new content
      }

      // Update contract address
      if (this.deployedContracts.POGPPBadge) {
        const contractAddress = `POGPP_CONTRACT_ADDRESS=${this.deployedContracts.POGPPBadge.address}`;
        
        if (envContent.includes('POGPP_CONTRACT_ADDRESS=')) {
          envContent = envContent.replace(/POGPP_CONTRACT_ADDRESS=.*/, contractAddress);
        } else {
          envContent += `\n${contractAddress}\n`;
        }
      }

      await fs.writeFile(envFile, envContent);
      logger.info('Environment file updated with contract addresses');
      
    } catch (error) {
      logger.warn('Failed to update environment file:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'deploy';

  const deployment = new DeploymentScript();

  switch (command) {
    case 'deploy':
      await deployment.deploy();
      break;
      
    case 'verify':
      await deployment.verifyDeployment();
      break;
      
    case 'validate':
      await deployment.validateEnvironment();
      logger.info(' Environment validation passed');
      break;
      
    default:
      console.log('Usage: node deploy.js [deploy|verify|validate]');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Deployment script failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentScript;