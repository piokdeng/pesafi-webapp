import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { flutterwaveService } from '@/lib/flutterwave';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, phoneNumber, currency = 'KES' } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Check if Flutterwave is configured
    if (!flutterwaveService.isConfigured()) {
      return NextResponse.json({ 
        error: 'Flutterwave not configured. Please contact support.' 
      }, { status: 503 });
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

    // Check if user has sufficient balance
    const currentBalance = parseFloat(userWallet.usdc_balance || '0');
    if (currentBalance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient balance' 
      }, { status: 400 });
    }

    // Convert USDC to local currency (simplified - would need real exchange rate)
    const exchangeRate = 150; // KES per USD (example)
    const localAmount = amount * exchangeRate;

    // Initiate mobile money withdrawal
    const withdrawalResult = await flutterwaveService.initiateMobileMoneyWithdrawal(
      localAmount,
      phoneNumber,
      currency
    );

    if (withdrawalResult.status === 'error') {
      return NextResponse.json({ 
        error: withdrawalResult.message 
      }, { status: 400 });
    }

    // Update wallet balance (subtract USDC)
    const newBalance = currentBalance - amount;

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

    // Store transaction in database
    const { error: transactionError } = await supabase
      .from('transaction')
      .insert({
        wallet_id: userWallet.id,
        type: 'withdrawal',
        amount: amount.toString(),
        usd_amount: amount.toString(),
        currency: 'USDC',
        status: 'pending',
        category: 'flutterwave',
        metadata: {
          phoneNumber,
          localAmount,
          localCurrency: currency,
          paymentMethod: 'mobile_money',
          provider_transaction_id: withdrawalResult.transactionId,
        }
      });

    if (transactionError) {
      console.error('Error storing transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      transactionId: withdrawalResult.transactionId,
      status: 'pending',
      message: `Withdrawal of ${currency} ${localAmount} initiated. Money will arrive in 5-30 minutes.`,
      localAmount,
      localCurrency: currency
    });

  } catch (error: any) {
    console.error('Error processing mobile money withdrawal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process mobile money withdrawal' },
      { status: 500 }
    );
  }
}
