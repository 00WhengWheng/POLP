require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = { 
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    gnosis: {
      url: "https://rpc.gnosischain.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 100,
    },
    chiado: {
      url: "https://rpc.chiadochain.net",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 10200,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "EUR"
  },
  mocha: {
    timeout: 40000
  },
  paths: {
    sources: "./contracts",
    tests: "./tests/contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};
