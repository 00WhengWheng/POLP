const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Network configurations
const networks = {
  gnosis: {
    name: 'Gnosis Chain',
    chainId: 100,
    rpcUrl: process.env.GNOSIS_RPC_URL || 'https://rpc.gnosischain.com',
    explorerUrl: 'https://gnosisscan.io',
    nativeCurrency: {
      name: 'xDAI',
      symbol: 'XDAI',
      decimals: 18
    }
  },
  gnosisTestnet: {
    name: 'Gnosis Chiado Testnet',
    chainId: 10200,
    rpcUrl: process.env.GNOSIS_TESTNET_RPC || 'https://rpc.chiadochain.net',
    explorerUrl: 'https://gnosis-chiado.blockscout.com',
    nativeCurrency: {
      name: 'Chiado xDAI',
      symbol: 'XDAI',
      decimals: 18
    }
  },
  localhost: {
    name: 'Localhost',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    explorerUrl: null,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Get current network configuration
const getCurrentNetwork = () => {
  const networkName = process.env.NETWORK || 'gnosis';
  return networks[networkName] || networks.gnosis;
};

// Create provider instance
const createProvider = (networkName = null) => {
  const network = networkName ? networks[networkName] : getCurrentNetwork();
  
  if (!network) {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  logger.info(`Creating provider for ${network.name} (Chain ID: ${network.chainId})`);
  
  return new ethers.JsonRpcProvider(network.rpcUrl, {
    chainId: network.chainId,
    name: network.name
  });
};

// Create signer instance
const createSigner = (privateKey = null, networkName = null) => {
  const key = privateKey || process.env.PRIVATE_KEY;
  
  if (!key) {
    throw new Error('Private key not provided');
  }

  const provider = createProvider(networkName);
  const signer = new ethers.Wallet(key, provider);
  
  logger.info(`Created signer for address: ${signer.address}`);
  
  return signer;
};

// Contract configuration
const contracts = {
  POGPPBadge: {
    address: process.env.POGPP_CONTRACT_ADDRESS,
    abi: [
      "function claimBadge(address to, uint256 badgeId, string memory tokenURI) external",
      "function claimed(address user, uint256 badgeId) external view returns (bool)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function transferFrom(address from, address to, uint256 tokenId) external",
      "function nextTokenId() external view returns (uint256)",
      "function tokenURI(uint256 tokenId) external view returns (string)",
      "function balanceOf(address owner) external view returns (uint256)",
      "function totalSupply() external view returns (uint256)",
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ]
  }
};

// Get contract instance
const getContract = (contractName, signerOrProvider = null) => {
  const contractConfig = contracts[contractName];
  
  if (!contractConfig) {
    throw new Error(`Contract ${contractName} not found`);
  }

  if (!contractConfig.address) {
    throw new Error(`Contract address for ${contractName} not configured`);
  }

  const providerOrSigner = signerOrProvider || createProvider();
  
  return new ethers.Contract(
    contractConfig.address,
    contractConfig.abi,
    providerOrSigner
  );
};

// Web3 utilities
const web3Utils = {
  // Format addresses
  formatAddress: (address) => {
    return ethers.getAddress(address);
  },

  // Check if address is valid
  isValidAddress: (address) => {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  },

  // Convert Wei to Ether
  fromWei: (wei) => {
    return ethers.formatEther(wei);
  },

  // Convert Ether to Wei
  toWei: (ether) => {
    return ethers.parseEther(ether.toString());
  },

  // Generate random wallet
  generateWallet: () => {
    return ethers.Wallet.createRandom();
  },

  // Get transaction receipt
  waitForTransaction: async (txHash, provider = null) => {
    const prov = provider || createProvider();
    return await prov.waitForTransaction(txHash);
  },

  // Estimate gas
  estimateGas: async (transaction, provider = null) => {
    const prov = provider || createProvider();
    return await prov.estimateGas(transaction);
  },

  // Get gas price
  getGasPrice: async (provider = null) => {
    const prov = provider || createProvider();
    const feeData = await prov.getFeeData();
    return feeData.gasPrice;
  }
};

// Initialize Web3 configuration
const initializeWeb3 = async () => {
  try {
    logger.info('Initializing Web3 configuration...');

    const network = getCurrentNetwork();
    const provider = createProvider();

    // Test provider connection
    const blockNumber = await provider.getBlockNumber();
    logger.info(`Connected to ${network.name}, latest block: ${blockNumber}`);

    // Test signer if private key is available
    if (process.env.PRIVATE_KEY) {
      const signer = createSigner();
      const balance = await provider.getBalance(signer.address);
      logger.info(`Signer balance: ${ethers.formatEther(balance)} ${network.nativeCurrency.symbol}`);
    }

    // Test contract connection if address is configured
    if (process.env.POGPP_CONTRACT_ADDRESS) {
      const contract = getContract('POGPPBadge', provider);
      const nextTokenId = await contract.nextTokenId();
      logger.info(`POGPPBadge contract connected, next token ID: ${nextTokenId}`);
    }

    logger.info('Web3 configuration initialized successfully');
    return true;

  } catch (error) {
    logger.error('Web3 initialization failed:', error);
    return false;
  }
};

// Health check
const healthCheck = async () => {
  try {
    const network = getCurrentNetwork();
    const provider = createProvider();
    
    await provider.getBlockNumber();
    
    return {
      status: 'healthy',
      network: network.name,
      chainId: network.chainId,
      rpcUrl: network.rpcUrl
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  networks,
  getCurrentNetwork,
  createProvider,
  createSigner,
  getContract,
  contracts,
  web3Utils,
  initializeWeb3,
  healthCheck
};