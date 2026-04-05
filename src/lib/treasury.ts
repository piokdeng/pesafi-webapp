/**
 * Treasury USDC Service
 *
 * Sends USDC from KermaPay's treasury wallet on behalf of users.
 * Used by the offramp flow so users don't need to manually send to escrow.
 *
 * Uses the same treasury wallet as gas-treasury (GAS_TREASURY_PRIVATE_KEY).
 * Falls back to PRIVATE_KEY_DEPLOYER for backwards compatibility.
 */

import { ethers } from 'ethers';
import { ensureGasBalance } from '@/lib/gas-treasury';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC

const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

/**
 * Send USDC from the treasury wallet to a target address.
 * Ensures gas balance before sending.
 */
export async function treasurySendUSDC(
  toAddress: string,
  amount: number
): Promise<{ txHash: string; blockNumber: number }> {
  const privateKey = process.env.PRIVATE_KEY_DEPLOYER || process.env.GAS_TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Treasury wallet not configured (PRIVATE_KEY_DEPLOYER missing)');
  }

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

  // Check treasury USDC balance
  const balance = await usdc.balanceOf(wallet.address);
  const amountInUnits = ethers.parseUnits(amount.toString(), 6);

  if (balance < amountInUnits) {
    const balanceUsdc = Number(balance) / 1e6;
    throw new Error(
      `Treasury USDC balance too low: ${balanceUsdc} USDC available, ${amount} USDC needed`
    );
  }

  // Ensure treasury wallet has ETH for gas
  await ensureGasBalance(wallet.address);

  // Execute transfer
  console.log(`[Treasury] Sending ${amount} USDC to ${toAddress}`);
  const tx = await usdc.transfer(toAddress, amountInUnits);
  console.log('[Treasury] Transaction sent:', tx.hash);

  const receipt = await tx.wait();
  console.log('[Treasury] Confirmed in block:', receipt.blockNumber);

  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}
