import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// USDC ABI for balanceOf function
const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
];

const RPC_BALANCE_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

/**
 * Get User Wallet API
 *
 * Returns the wallet address and REAL on-chain balance for the authenticated user
 * Balance is fetched directly from blockchain - NOT from database
 * Database balance is READ-ONLY and should always match blockchain
 */

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[User Wallet API] Fetching wallet for user:', user.id);

    // Get wallet from database
    const { searchParams } = new URL(request.url);
    const walletType = searchParams.get('walletType');

    let walletQuery = supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (walletType) {
      walletQuery = walletQuery.eq('wallet_type', walletType);
    }

    const { data: wallet, error: walletError } = await walletQuery.limit(1).single();

    if (walletError || !wallet) {
      console.log('[User Wallet API] No wallet found for user');
      return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
    }

    // Fetch REAL balance from blockchain (bounded — RPC can hang without a timeout)
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

    let balanceUsdc: number;
    try {
      const balanceWei = await withTimeout(
        usdcContract.balanceOf(wallet.address),
        RPC_BALANCE_TIMEOUT_MS,
        'USDC balanceOf'
      );
      balanceUsdc = Number(balanceWei) / 1e6;
    } catch (rpcErr) {
      console.warn('[User Wallet API] On-chain balance failed, using DB value:', rpcErr);
      balanceUsdc = parseFloat(String(wallet.usdc_balance ?? '0')) || 0;
    }

    console.log('[User Wallet API] Wallet found:', {
      address: wallet.address,
      balanceUsdc,
      dbBalance: wallet.usdc_balance,
    });

    // Conditional database update: only update if balance changed or stale (>5 minutes)
    const lastUpdate = new Date(wallet.updated_at).getTime();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const balanceChanged = Math.abs(parseFloat(wallet.usdc_balance) - balanceUsdc) > 0.000001;

    if (balanceChanged || lastUpdate < fiveMinutesAgo) {
      await supabase
        .from('wallet')
        .update({
          usdc_balance: balanceUsdc.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      console.log('[User Wallet API] Balance updated:', balanceUsdc);
    } else {
      console.log('[User Wallet API] Balance unchanged, skipping database update');
    }

    // Return wallet data with REAL on-chain balance
    return NextResponse.json({
      address: wallet.address,
      usdc_balance: balanceUsdc.toString(),
      local_currency: wallet.local_currency,
      is_active: wallet.is_active,
      created_at: wallet.created_at,
    });
  } catch (error) {
    console.error('[User Wallet API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
