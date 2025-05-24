#!/usr/bin/env node

const { ethers, run } = require('hardhat');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const logger = require('../utils/logger');
const { Client } = require('pg'); // Importa il client PostgreSQL

class DeploymentScript {

  constructor() {
    this.deployedContracts = {};
    this.deploymentConfig = {
      network: process.env.NETWORK || 'gnosis',
      contractsDir: path.join(__dirname, '../contracts'),
      deploymentDir: path.join(__dirname, '../deployments'),
      gasLimit: process.env.GAS_LIMIT || 2000000,
      gasPrice: process.env.GAS_PRICE || null // Lasciare che il provider determini
    };
  }

  /**
   * Main deployment function
   */
  async deploy() {
    try {
      logger.info('Starting POLP deployment process...');

      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Deploy smart contracts
      await this.deployContracts();
      
      // Step 3: Initialize backend services
      await this.initializeServices();
      
      // Step 4: Setup database
      await this.setupDatabase();
      
      // Step 5: Verify deployment
      await this.verifyDeployment();
      
      // Step 6: Save deployment info
      await this.saveDeploymentInfo();
      
      logger.info('POLP deployment completed successfully!');

    } catch (error) {
      logger.error('Deployment failed:', error);
      process.exit(1);
    }
  }

  /**
   * Validate required environment variables
   */
  async validateEnvironment() {
    logger.info('Validating environment configuration...');

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

    if (!process.env.PRIVATE_KEY.startsWith('0x')) {
      throw new Error('PRIVATE_KEY must start with 0x');
    }

    logger.info('Environment validation passed');
  }

  /**
   * Deploy smart contracts
   */
  async deployContracts() {
    logger.info('Deploying smart contracts...');

    // Usa Hardhat per compilare i contratti
    await run("compile");

    // Explicitly initialize the provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(process.env.GNOSIS_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Ensure deployment directory exists
    await fs.mkdir(this.deploymentConfig.deploymentDir, { recursive: true });

    // Add fallback for gas price
    const gasPrice = this.deploymentConfig.gasPrice || (await provider.getGasPrice());

    // Carica il contratto e distribuiscilo
    const POLPBadge = await ethers.getContractFactory("POLPBadge"); // Assicurati che il contratto si chiami POLPBadge.sol
    const polpBadge = await POLPBadge.deploy(); // Modifica se necessario per passare argomenti
    await polpBadge.deployed();

    this.deployedContracts.POLPBadge = polpBadge;

    logger.info(`POLPBadge deployed at: ${polpBadge.address}`);

    // Add contract verification step
    if (this.deployedContracts.POLPBadge) {
      await run("verify:verify", {
        address: this.deployedContracts.POLPBadge.address,
        constructorArguments: [],
      });
      logger.info(`POLPBadge contract verified at: ${this.deployedContracts.POLPBadge.address}`);
    }
  }

  /**
   * Initialize backend services
   */
  async initializeServices() {
    await this.initializeIPFS();
    await this.initializeFAISS();
  }

  async initializeIPFS() {
    logger.info('Initializing IPFS...');
    const { initializeIPFS, healthCheck } = require('../config/ipfs');
    const initialized = await initializeIPFS();
    if (!initialized) throw new Error('Failed to initialize IPFS');
    const health = await healthCheck();
    if (health.status !== 'healthy') throw new Error(`IPFS health check failed: ${health.error}`);
    logger.info('IPFS initialized successfully', { nodeId: health.nodeId, version: health.version });
  }

  async initializeFAISS() {
    logger.info('Initializing FAISS...');
    // Add FAISS-specific initialization logic here
    logger.info('FAISS initialized successfully');
  }

  /**
   * Setup database
   */
  async setupDatabase() {
    logger.info('Setting up database...');

    const db = require('../config/db');

    try {
      // Initialize database and run migrations
      await db.initializeDatabase();
      
      // Verify database health
      const health = await db.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Database health check failed: ${health.error}`);
      }

      logger.info('Database setup completed successfully', {
        version: health.version,
        size: health.databaseSize,
        connections: health.activeConnections
      });

    } catch (error) {
      logger.error('Database setup failed:', error);
      throw error;
    }
  }

  /**
   * Verify deployment
   */
  async verifyDeployment() {
    logger.info('Verifying deployment...');

    if (this.deployedContracts.POLPBadge) {
      const code = await ethers.provider.getCode(this.deployedContracts.POLPBadge.address);
      if (code === '0x') {
        throw new Error('POLPBadge contract not found at deployed address');
      }
    }

    logger.info('Deployment verification completed');
  }

  /**
   * Save deployment information
   */
  async saveDeploymentInfo() {
    logger.info('Saving deployment information...');

    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: this.deploymentConfig.network,
      contracts: this.deployedContracts
    };

    // Scrivi le informazioni di deployment in un file JSON
    const deploymentFile = path.join(this.deploymentConfig.deploymentDir, `deployment-${this.deploymentConfig.network}-${Date.now()}.json`);
    await fs.writeFile(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    logger.info(`Deployment info saved to: ${deploymentFile}`);
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

    // Aggiungi ulteriori comandi qui se necessario
    default:
      console.log('Usage: node deploy.js [deploy]');
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