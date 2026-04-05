import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, walletAddress, type } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Only allow test deposits in development or test mode
    const isTestMode = process.env.NODE_ENV === 'development' || 
                      process.env.NEXT_PUBLIC_MOONPAY_KEY?.includes('test') ||
                      !process.env.NEXT_PUBLIC_MOONPAY_LIVE_KEY;

    if (!isTestMode) {
      return NextResponse.json({ error: 'Test deposits only allowed in test mode' }, { status: 403 });
    }

    // Get user's wallet
    const { data: userWallet, error: walletError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !userWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Verify the wallet address matches
    if (userWallet.address !== walletAddress) {
      return NextResponse.json({ error: 'Wallet address mismatch' }, { status: 403 });
    }

    // Update wallet balance (add test USDC)
    const currentBalance = parseFloat(userWallet.usdc_balance || '0');
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabase
      .from('wallet')
      .update({
        usdc_balance: newBalance.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userWallet.id);

    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update balance' },
        { status: 500 }
      );
    }

    // Log the test transaction (optional - for tracking)
    console.log(`[TEST DEPOSIT] User ${user.id} received ${amount} USDC via ${type}`);

    return NextResponse.json({
      success: true,
      amount,
      newBalance,
      type: 'test_deposit',
      message: `Test deposit of $${amount} USDC completed`
    });

  } catch (error: any) {
    console.error('Error processing test deposit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process test deposit' },
      { status: 500 }
    );
  }
}
