/**
 * Gas Treasury Service
 *
 * Automatically funds user wallets with ETH for gas fees, providing a gasless
 * experience until smart contract wallets with Paymaster are implemented.
 *
 * Treasury Address: 0x072c5f40cc75ee0eb0a8b2125dd2cc82bada5311
 */

import { ethers } from 'ethers';

// Configuration
const TREASURY_PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOYER || process.env.GAS_TREASURY_PRIVATE_KEY;
const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// Gas funding thresholds (Base L2 gas is extremely cheap — ~$0.001 per USDC transfer)
const MIN_GAS_BALANCE = ethers.parseEther('0.0001'); // 0.0001 ETH — refill when below this
const GAS_REFILL_AMOUNT = ethers.parseEther('0.0003'); // 0.0003 ETH — enough for ~10+ transfers on Base

// Safety limits
const MAX_REFILLS_PER_HOUR = 10; // Prevent abuse
const MAX_REFILLS_PER_DAY = 50; // Daily limit per wallet

// In-memory tracking (in production, use Redis or database)
const refillTracking = new Map<string, { count: number; lastRefill: number; hourlyCount: number; lastHourReset: number }>();

interface GasFundingResult {
  needed: boolean;
  funded: boolean;
  amount?: string;
  txHash?: string;
  balance: string;
  error?: string;
}

/**
 * Check if treasury is configured
 */
export function isTreasuryConfigured(): boolean {
  return !!TREASURY_PRIVATE_KEY && TREASURY_PRIVATE_KEY.length > 0;
}

/**
 * Get treasury wallet address
 */
export function getTreasuryAddress(): string | null {
  if (!isTreasuryConfigured()) return null;

  try {
    const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY!);
    return wallet.address;
  } catch (error) {
    console.error('[Gas Treasury] Error getting treasury address:', error);
    return null;
  }
}

/**
 * Check treasury balance
 */
export async function getTreasuryBalance(): Promise<string> {
  try {
    if (!isTreasuryConfigured()) {
      return '0';
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const treasuryAddress = getTreasuryAddress();

    if (!treasuryAddress) {
      return '0';
    }

    const balance = await provider.getBalance(treasuryAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('[Gas Treasury] Error checking treasury balance:', error);
    return '0';
  }
}

/**
 * Check if wallet needs gas refill
 */
async function needsGasRefill(walletAddress: string): Promise<{ needs: boolean; currentBalance: bigint }> {
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const balance = await provider.getBalance(walletAddress);

    const needs = balance < MIN_GAS_BALANCE;

    console.log('[Gas Treasury] Balance check:', {
      wallet: walletAddress,
      balance: ethers.formatEther(balance),
      threshold: ethers.formatEther(MIN_GAS_BALANCE),
      needsRefill: needs
    });

    return { needs, currentBalance: balance };
  } catch (error) {
    console.error('[Gas Treasury] Error checking wallet balance:', error);
    return { needs: false, currentBalance: BigInt(0) };
  }
}

/**
 * Check rate limits for wallet
 */
function checkRateLimits(walletAddress: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const tracking = refillTracking.get(walletAddress);

  if (!tracking) {
    // First refill for this wallet
    return { allowed: true };
  }

  // Reset hourly counter if an hour has passed
  if (now - tracking.lastHourReset > 3600000) {
    tracking.hourlyCount = 0;
    tracking.lastHourReset = now;
  }

  // Check hourly limit
  if (tracking.hourlyCount >= MAX_REFILLS_PER_HOUR) {
    return {
      allowed: false,
      reason: `Hourly refill limit reached (${MAX_REFILLS_PER_HOUR} refills/hour)`
    };
  }

  // Check daily limit (rolling 24 hours)
  const oneDayAgo = now - 86400000;
  if (tracking.lastRefill > oneDayAgo && tracking.count >= MAX_REFILLS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily refill limit reached (${MAX_REFILLS_PER_DAY} refills/day)`
    };
  }

  return { allowed: true };
}

/**
 * Update refill tracking
 */
function updateRefillTracking(walletAddress: string) {
  const now = Date.now();
  const tracking = refillTracking.get(walletAddress);

  if (!tracking) {
    refillTracking.set(walletAddress, {
      count: 1,
      lastRefill: now,
      hourlyCount: 1,
      lastHourReset: now
    });
  } else {
    tracking.count += 1;
    tracking.lastRefill = now;
    tracking.hourlyCount += 1;
  }
}

/**
 * Ensure wallet has sufficient gas balance
 * Automatically refills if balance is below threshold
 */
export async function ensureGasBalance(userWalletAddress: string): Promise<GasFundingResult> {
  try {
    console.log('[Gas Treasury] Checking gas balance for:', userWalletAddress);

    // Check if treasury is configured
    if (!isTreasuryConfigured()) {
      console.warn('[Gas Treasury] Treasury not configured - gas funding disabled');
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const balance = await provider.getBalance(userWalletAddress);

      return {
        needed: false,
        funded: false,
        balance: ethers.formatEther(balance),
        error: 'Treasury not configured'
      };
    }

    // Check if wallet needs refill
    const { needs, currentBalance } = await needsGasRefill(userWalletAddress);

    if (!needs) {
      console.log('[Gas Treasury] Wallet has sufficient gas, no refill needed');
      return {
        needed: false,
        funded: false,
        balance: ethers.formatEther(currentBalance)
      };
    }

    // Check rate limits
    const rateLimitCheck = checkRateLimits(userWalletAddress);
    if (!rateLimitCheck.allowed) {
      console.warn('[Gas Treasury] Rate limit exceeded:', rateLimitCheck.reason);
      return {
        needed: true,
        funded: false,
        balance: ethers.formatEther(currentBalance),
        error: rateLimitCheck.reason
      };
    }

    // Check treasury has sufficient balance
    const treasuryBalance = await getTreasuryBalance();
    const treasuryBalanceWei = ethers.parseEther(treasuryBalance);

    if (treasuryBalanceWei < GAS_REFILL_AMOUNT) {
      console.error('[Gas Treasury] Treasury balance too low:', treasuryBalance, 'ETH');
      return {
        needed: true,
        funded: false,
        balance: ethers.formatEther(currentBalance),
        error: `Treasury balance too low (${treasuryBalance} ETH)`
      };
    }

    // Perform refill
    console.log('[Gas Treasury] Refilling wallet with', ethers.formatEther(GAS_REFILL_AMOUNT), 'ETH');

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const treasury = new ethers.Wallet(TREASURY_PRIVATE_KEY!, provider);

    const tx = await treasury.sendTransaction({
      to: userWalletAddress,
      value: GAS_REFILL_AMOUNT,
    });

    console.log('[Gas Treasury] Refill transaction sent:', tx.hash);

    // Wait for confirmation (with timeout)
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction timeout')), 30000)
      )
    ]) as ethers.TransactionReceipt;

    console.log('[Gas Treasury] Refill confirmed in block:', receipt.blockNumber);

    // Update tracking
    updateRefillTracking(userWalletAddress);

    // Get new balance
    const newBalance = await provider.getBalance(userWalletAddress);

    return {
      needed: true,
      funded: true,
      amount: ethers.formatEther(GAS_REFILL_AMOUNT),
      txHash: tx.hash,
      balance: ethers.formatEther(newBalance)
    };

  } catch (error: any) {
    console.error('[Gas Treasury] Error ensuring gas balance:', error);

    // Try to get current balance for error response
    try {
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const balance = await provider.getBalance(userWalletAddress);

      return {
        needed: true,
        funded: false,
        balance: ethers.formatEther(balance),
        error: error.message || 'Unknown error'
      };
    } catch {
      return {
        needed: true,
        funded: false,
        balance: '0',
        error: error.message || 'Unknown error'
      };
    }
  }
}

/**
 * Get refill statistics for a wallet
 */
export function getRefillStats(walletAddress: string): {
  totalRefills: number;
  hourlyRefills: number;
  lastRefill: Date | null;
} {
  const tracking = refillTracking.get(walletAddress);

  if (!tracking) {
    return {
      totalRefills: 0,
      hourlyRefills: 0,
      lastRefill: null
    };
  }

  return {
    totalRefills: tracking.count,
    hourlyRefills: tracking.hourlyCount,
    lastRefill: new Date(tracking.lastRefill)
  };
}

/**
 * Get treasury service status
 */
export async function getTreasuryStatus() {
  const configured = isTreasuryConfigured();
  const address = getTreasuryAddress();
  const balance = configured ? await getTreasuryBalance() : '0';

  return {
    configured,
    address,
    balance,
    balanceUSD: (parseFloat(balance) * 2500).toFixed(2), // Rough ETH price
    refillAmount: ethers.formatEther(GAS_REFILL_AMOUNT),
    threshold: ethers.formatEther(MIN_GAS_BALANCE),
    estimatedTransactions: Math.floor(parseFloat(balance) / parseFloat(ethers.formatEther(GAS_REFILL_AMOUNT)))
  };
}
