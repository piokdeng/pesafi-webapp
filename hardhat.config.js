require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
const dotenv = require("dotenv");

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Base Sepolia Testnet
    baseSepolia: {
      url: process.env.NEXT_PUBLIC_ALCHEMY_ID 
        ? `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
        : "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY_DEPLOYER ? [process.env.PRIVATE_KEY_DEPLOYER] : [],
      chainId: 84532,
      gasPrice: "auto",
    },
    // Base Mainnet (for production)
    base: {
      url: process.env.NEXT_PUBLIC_ALCHEMY_ID
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
        : "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY_DEPLOYER ? [process.env.PRIVATE_KEY_DEPLOYER] : [],
      chainId: 8453,
      gasPrice: "auto",
    },
    // Local Hardhat Network
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
