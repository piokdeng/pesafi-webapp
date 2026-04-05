/**
 * Coinbase Paymaster Service for Base Network
 * 
 * Sponsors gas fees for user transactions, providing a seamless Web2-like experience
 * where users never need to worry about ETH for gas.
 * 
 * Documentation: https://docs.base.org/cookbook/account-abstraction/gasless-transactions-with-paymaster
 */

import { ethers } from 'ethers';

interface PaymasterConfig {
  paymasterUrl: string;
  bundlerUrl: string;
  entryPoint: string;
}

interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export class PaymasterService {
  private config: PaymasterConfig;
  private apiKey: string;

  constructor() {
    // Coinbase Paymaster configuration for Base Mainnet
    // Note: Coinbase CDP API keys can be either:
    // 1. A full RPC URL with key embedded: https://api.developer.coinbase.com/rpc/v1/base/{API_KEY}
    // 2. Just the API key: {API_KEY}

    const apiKeyOrUrl = process.env.COINBASE_PAYMASTER_API_KEY || '';

    // Check if it's a full URL or just an API key
    if (apiKeyOrUrl.startsWith('http')) {
      // It's a full URL, extract the API key from the end
      const urlParts = apiKeyOrUrl.split('/');
      this.apiKey = urlParts[urlParts.length - 1];

      // Use the URL base for paymaster and bundler
      const baseUrl = apiKeyOrUrl.substring(0, apiKeyOrUrl.lastIndexOf('/'));
      this.config = {
        paymasterUrl: `${baseUrl}/${this.apiKey}`,
        bundlerUrl: `${baseUrl}/${this.apiKey}`,
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // ERC-4337 EntryPoint v0.6
      };
    } else {
      // It's just an API key
      this.apiKey = apiKeyOrUrl;
      this.config = {
        paymasterUrl: process.env.COINBASE_PAYMASTER_URL || `https://api.developer.coinbase.com/rpc/v1/base/${this.apiKey}`,
        bundlerUrl: process.env.COINBASE_BUNDLER_URL || `https://api.developer.coinbase.com/rpc/v1/base/${this.apiKey}`,
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // ERC-4337 EntryPoint v0.6
      };
    }
    // Avoid logging at module import time (this file can be imported during Next.js build).
    // We log only when an endpoint tries to use the paymaster and it is not configured.
  }

  /**
   * Check if paymaster is configured and ready
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get paymaster data for sponsoring a user operation
   */
  async getPaymasterData(userOp: Partial<UserOperation>): Promise<string> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Paymaster not configured. Please set COINBASE_PAYMASTER_API_KEY.');
      }

      // Try the dedicated paymaster endpoint first
      try {
        // Coinbase CDP API uses the API key in the URL, not in headers
        const response = await fetch(this.config.paymasterUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'pm_sponsorUserOperation',
            params: [
              userOp,
              this.config.entryPoint, // EntryPoint as string, not object
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (!data.error) {
            console.log('[Paymaster] Successfully got sponsorship data');
            return data.result.paymasterAndData;
          }
          
          // If error from paymaster, try bundler with empty paymasterAndData
          console.warn('[Paymaster] Paymaster endpoint error, will use bundler without sponsorship:', data.error.message);
        }
      } catch (paymasterError) {
        console.warn('[Paymaster] Paymaster endpoint unavailable, will use bundler without sponsorship');
      }

      // Fallback: Return empty paymasterAndData (no sponsorship, user pays gas)
      console.log('[Paymaster] No sponsorship available, user will pay gas');
      return '0x';
      
    } catch (error) {
      console.error('[Paymaster] Error getting paymaster data:', error);
      throw error;
    }
  }

  /**
   * Send a sponsored user operation through the bundler
   */
  async sendSponsoredUserOp(userOp: UserOperation): Promise<string> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Paymaster not configured');
      }

      // Coinbase CDP API uses the API key in the URL, not in headers
      const response = await fetch(this.config.bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, this.config.entryPoint],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bundler request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Bundler error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      console.log('[Paymaster] User operation sent:', data.result);
      return data.result; // Returns userOpHash
    } catch (error) {
      console.error('[Paymaster] Error sending user operation:', error);
      throw error;
    }
  }

  /**
   * Get user operation receipt
   */
  async getUserOpReceipt(userOpHash: string): Promise<any> {
    try {
      // Coinbase CDP API uses the API key in the URL, not in headers
      const response = await fetch(this.config.bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`Error getting receipt: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error('[Paymaster] Error getting receipt:', error);
      throw error;
    }
  }

  /**
   * Build a user operation for USDC transfer with sponsored gas
   */
  async buildSponsoredUSDCTransfer(
    wallet: ethers.Wallet,
    to: string,
    amount: string,
    usdcAddress: string
  ): Promise<UserOperation> {
    try {
      const provider = wallet.provider;
      if (!provider) {
        throw new Error('Wallet provider not set');
      }

      // Encode USDC transfer call
      const usdcInterface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ]);
      
      const callData = usdcInterface.encodeFunctionData('transfer', [
        to,
        ethers.parseUnits(amount, 6), // USDC has 6 decimals
      ]);

      // Get nonce for the sender
      const nonce = await provider.getTransactionCount(wallet.address);

      // Estimate gas
      const feeData = await provider.getFeeData();
      
      const userOp: Partial<UserOperation> = {
        sender: wallet.address,
        nonce: ethers.toBeHex(nonce),
        initCode: '0x', // Empty for existing wallets
        callData: callData,
        callGasLimit: ethers.toBeHex(100000),
        verificationGasLimit: ethers.toBeHex(100000),
        preVerificationGas: ethers.toBeHex(21000),
        maxFeePerGas: ethers.toBeHex(feeData.maxFeePerGas || 1000000000),
        maxPriorityFeePerGas: ethers.toBeHex(feeData.maxPriorityFeePerGas || 1000000000),
      };

      // Get paymaster sponsorship
      const paymasterAndData = await this.getPaymasterData(userOp);

      // Create full user operation
      const fullUserOp: UserOperation = {
        ...userOp as any,
        paymasterAndData,
        signature: '0x', // Will be signed later
      };

      return fullUserOp;
    } catch (error) {
      console.error('[Paymaster] Error building user operation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymasterService = new PaymasterService();

