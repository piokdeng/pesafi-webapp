import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import { CHAIN_CONFIG, USDC_CONFIG } from '@/lib/web3/config';

const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Get wallet from database
    const { data: userWallet, error } = await supabase
      .from('wallet')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (error) {
      console.error('Error getting wallet:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get wallet' },
        { status: 500 }
      );
    }

    // Get balance from blockchain
    const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
    const usdcContract = new ethers.Contract(USDC_CONFIG.address, USDC_ABI, provider);
    
    const usdcBalance = await usdcContract.balanceOf(userWallet.address);
    const usdcFormatted = Number(ethers.formatUnits(usdcBalance, USDC_CONFIG.decimals));

    const ethBalance = await provider.getBalance(userWallet.address);
    const ethFormatted = Number(ethers.formatEther(ethBalance));

    // Update database
    const { error: updateError } = await supabase
      .from('wallet')
      .update({
        usdc_balance: usdcFormatted.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
    }

    return NextResponse.json({
      usdc: usdcFormatted,
      eth: ethFormatted,
    });
  } catch (error: any) {
    console.error('Error updating balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update balance' },
      { status: 500 }
    );
  }
}
