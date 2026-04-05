import { ethers } from 'ethers';

// Use testnet for development
const isDevelopment = process.env.NODE_ENV === 'development';

// Contract addresses
export const CONTRACTS = {
  USDC: isDevelopment 
    ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia USDC
    : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet USDC
  FACTORY: process.env.NEXT_PUBLIC_WALLET_FACTORY_ADDRESS || process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '',
};

// Chain configuration
export const CHAIN_CONFIG = {
  id: isDevelopment ? 84532 : 8453, // Base Sepolia : Base Mainnet
  name: isDevelopment ? 'Base Sepolia' : 'Base',
  rpcUrl: isDevelopment 
    ? `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
    : `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
  blockExplorer: isDevelopment ? 'https://sepolia.basescan.org' : 'https://basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
};

// Get provider
export const getProvider = () => {
  return new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
};

// USDC configuration
export const USDC_CONFIG = {
  address: CONTRACTS.USDC,
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

// Supported local currencies
export const CURRENCIES = {
  KES: { symbol: 'KES', name: 'Kenyan Shilling', rate: 150 },
  TZS: { symbol: 'TZS', name: 'Tanzanian Shilling', rate: 2500 },
  UGX: { symbol: 'UGX', name: 'Ugandan Shilling', rate: 3700 },
  NGN: { symbol: 'NGN', name: 'Nigerian Naira', rate: 1500 },
  GHS: { symbol: 'GHS', name: 'Ghanaian Cedi', rate: 12 },
  ZAR: { symbol: 'ZAR', name: 'South African Rand', rate: 19 },
  SSP: { symbol: 'SSP', name: 'South Sudanese Pound', rate: 1300 },
  SOS: { symbol: 'SOS', name: 'Somali Shilling', rate: 570 },
  RWF: { symbol: 'RWF', name: 'Rwandan Franc', rate: 1300 },
  SDG: { symbol: 'SDG', name: 'Sudanese Pound', rate: 600 },
  ERN: { symbol: 'ERN', name: 'Eritrean Nakfa', rate: 15 },
  BIF: { symbol: 'BIF', name: 'Burundian Franc', rate: 2850 },
  ZWL: { symbol: 'ZWL', name: 'Zimbabwean Dollar', rate: 320 },
};

// Transaction categories
export const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: '🍔' },
  { id: 'transport', name: 'Transport', icon: '🚗' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'bills', name: 'Bills & Utilities', icon: '📱' },
  { id: 'health', name: 'Health', icon: '🏥' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
  { id: 'savings', name: 'Savings', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📌' },
];
