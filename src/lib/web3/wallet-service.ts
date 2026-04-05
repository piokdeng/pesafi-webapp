import { ethers } from 'ethers';
import { CONTRACTS, CHAIN_CONFIG, USDC_CONFIG } from './config';
import { supabaseAuthClient } from '@/lib/supabase-auth-client';

// ABI for essential functions
const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const WALLET_ABI = [
  'function sendToken(address token, address to, uint256 amount)',
  'function payMerchant(address token, address merchant, uint256 amount, string reference)',
  'function getBalance(address token) view returns (uint256)',
  'function addGuardian(address guardian)',
  'function updateDailyLimit(uint256 newLimit)',
];

const FACTORY_ABI = [
  'function deployWallet(address owner, uint256 salt) returns (address)',
  'function getWalletAddress(address owner, uint256 salt) view returns (address)',
  'function hasWallet(address owner) view returns (bool)',
  'function getWallet(address owner) view returns (address)',
];

export class WalletService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer?: ethers.Wallet;

  constructor() {
    // Only initialize provider if we have a valid RPC URL
    if (CHAIN_CONFIG.rpcUrl && CHAIN_CONFIG.rpcUrl.includes('alchemy.com')) {
      try {
        this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
        // Initialize with deployer key if available
        if (process.env.PRIVATE_KEY_DEPLOYER) {
          this.signer = new ethers.Wallet(process.env.PRIVATE_KEY_DEPLOYER, this.provider);
        }
      } catch (error) {
        console.warn('Failed to initialize provider:', error);
      }
    }
  }

  /**
   * Get auth headers for API calls
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session }, error } = await supabaseAuthClient.auth.getSession();

    console.log('[WalletService] Auth session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      error: error?.message,
      user: session?.user?.id
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      // Validate token size (JWT should be < 10KB, typically 500-2000 bytes)
      if (session.access_token.length > 10000) {
        console.error('[WalletService] Token too large (' + session.access_token.length + ' bytes), session corrupted. Clearing...');

        // Force clear all auth data
        await supabaseAuthClient.auth.signOut();

        // Clear localStorage and sessionStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });

        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
            sessionStorage.removeItem(key);
          }
        });

        // Force redirect to login
        window.location.href = '/login?error=session-corrupted';
        return headers;
      }

      headers['Authorization'] = `Bearer ${session.access_token}`;
      console.log('[WalletService] Authorization header set:', {
        tokenLength: session.access_token.length,
        tokenStart: session.access_token.substring(0, 20) + '...',
        headerValue: `Bearer ${session.access_token.substring(0, 20)}...`
      });
    } else {
      console.log('[WalletService] No access token available - redirecting to login');
      // Force redirect to login if no token
      window.location.href = '/login?error=no-session';
      return headers;
    }
    return headers;
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      throw new Error('Provider not initialized. Please check your Alchemy API key.');
    }
    return this.provider;
  }

  /**
   * Create a new wallet for a user (call API endpoint instead)
   */
  async createWallet(userId: string, phoneNumber?: string) {
    try {
      const headers = await this.getAuthHeaders();
      const hasAuth = (headers as any)['Authorization'] ? 'yes' : 'no';
      console.log('[WalletService] Creating wallet with headers:', { 
        hasAuth,
        userId 
      });
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, phoneNumber }),
      });
      
      console.log('[WalletService] Create wallet response:', { 
        status: response.status, 
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[WalletService] Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[WalletService] Create wallet data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create wallet');
      }
      
      return data;
    } catch (error) {
      console.error('[WalletService] Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletAddress: string): Promise<{ usdc: number; eth: number }> {
    try {
      if (!this.provider) {
        console.warn('Provider not available, returning zero balance');
        return { usdc: 0, eth: 0 };
      }

      const provider = this.getProvider();
      
      // Get USDC balance
      const usdcContract = new ethers.Contract(USDC_CONFIG.address, USDC_ABI, provider);
      const usdcBalance = await usdcContract.balanceOf(walletAddress);
      const usdcFormatted = Number(ethers.formatUnits(usdcBalance, USDC_CONFIG.decimals));

      // Get ETH balance
      const ethBalance = await provider.getBalance(walletAddress);
      const ethFormatted = Number(ethers.formatEther(ethBalance));

      return {
        usdc: usdcFormatted,
        eth: ethFormatted,
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      return { usdc: 0, eth: 0 };
    }
  }

  /**
   * Send USDC to another wallet
   */
  async sendUSDC(
    fromWalletAddress: string,
    toAddress: string,
    amount: number,
    privateKey?: string
  ): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      if (!privateKey && !this.signer) {
        throw new Error('No signer available');
      }

      const provider = this.getProvider();
      const signer = privateKey 
        ? new ethers.Wallet(privateKey, provider)
        : this.signer!;

      // Convert amount to USDC units (6 decimals)
      const amountInUnits = ethers.parseUnits(amount.toString(), USDC_CONFIG.decimals);

      // If using smart wallet
      if (CONTRACTS.FACTORY) {
        const walletContract = new ethers.Contract(fromWalletAddress, WALLET_ABI, signer);
        const tx = await walletContract.sendToken(USDC_CONFIG.address, toAddress, amountInUnits);
        const receipt = await tx.wait();
        return receipt.hash;
      }

      // Direct transfer from EOA
      const usdcContract = new ethers.Contract(USDC_CONFIG.address, USDC_ABI, signer);
      const tx = await usdcContract.transfer(toAddress, amountInUnits);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error sending USDC:', error);
      throw error;
    }
  }

  /**
   * Get wallet by user ID (call API endpoint)
   */
  async getWalletByUserId(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/${userId}`, { headers });
      
      console.log('[WalletService] Get wallet response:', { 
        status: response.status, 
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });
      
      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('[WalletService] Wallet fetch error:', errorData);
        } else {
          const text = await response.text();
          console.error('[WalletService] Non-JSON error response:', text);
        }
        return null;
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[WalletService] Non-JSON wallet response:', text);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting wallet:', error);
      return null;
    }
  }

  /**
   * Get wallet by phone number (call API endpoint)
   */
  async getWalletByPhone(phoneNumber: string) {
    try {
      const headers = await this.getAuthHeaders();
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/phone/${phoneNumber}`, { headers });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error getting wallet by phone:', error);
      return null;
    }
  }

  /**
   * Update wallet balance in database (call API endpoint)
   */
  async updateWalletBalance(walletId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/${walletId}/balance`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      return null;
    }
  }

  /**
   * Generate QR code data for receiving payments
   */
  generatePaymentQR(walletAddress: string, amount?: number): string {
    const data = {
      address: walletAddress,
      amount: amount,
      currency: 'USDC',
      network: 'base',
    };
    return JSON.stringify(data);
  }

  /**
   * Parse QR code data
   */
  parsePaymentQR(qrData: string): { address: string; amount?: number } {
    try {
      const data = JSON.parse(qrData);
      return {
        address: data.address,
        amount: data.amount,
      };
    } catch {
      // Assume it's just an address
      return { address: qrData };
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(from: string, to: string, amount: number): Promise<number> {
    try {
      if (!this.provider) {
        return 0.0001; // Default fee estimate
      }

      const provider = this.getProvider();
      
      // Estimate gas for USDC transfer
      const usdcContract = new ethers.Contract(USDC_CONFIG.address, USDC_ABI, provider);
      const amountInUnits = ethers.parseUnits(amount.toString(), USDC_CONFIG.decimals);
      
      const gasEstimate = await usdcContract.transfer.estimateGas(to, amountInUnits, { from });
      const gasPrice = await provider.getFeeData();

      const fee = Number(gasEstimate) * Number(gasPrice.gasPrice || BigInt(0));
      return Number(ethers.formatEther(fee));
    } catch (error) {
      console.error('Error estimating fee:', error);
      return 0.0001; // Default fee estimate
    }
  }
}
