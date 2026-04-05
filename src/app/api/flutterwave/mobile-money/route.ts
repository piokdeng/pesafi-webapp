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

    const { amount, phoneNumber, walletAddress, currency = 'KES' } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
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

    // Verify the wallet address matches
    if (userWallet.address !== walletAddress) {
      return NextResponse.json({ error: 'Wallet address mismatch' }, { status: 403 });
    }

    // Generate transaction reference
    const txRef = `PESAFI_${user.id}_${Date.now()}`;

    // Initiate mobile money payment
    const paymentResult = await flutterwaveService.initiateMobileMoneyPayment({
      amount,
      currency,
      phoneNumber,
      email: user.email || '',
      txRef,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/flutterwave/callback`
    });

    if (paymentResult.status === 'error') {
      return NextResponse.json({ 
        error: paymentResult.message 
      }, { status: 400 });
    }

    // Store transaction in database (optional - for tracking)
    const { error: transactionError } = await supabase
      .from('transaction')
      .insert({
        wallet_id: userWallet.id,
        type: 'deposit',
        amount: amount.toString(),
        usd_amount: amount.toString(),
        currency,
        status: 'pending',
        category: 'flutterwave',
        metadata: {
          phoneNumber,
          paymentMethod: 'mobile_money',
          provider_transaction_id: paymentResult.transactionId,
          referenceId: txRef,
        }
      });

    if (transactionError) {
      console.error('Error storing transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      transactionId: paymentResult.transactionId,
      paymentUrl: paymentResult.data?.paymentUrl,
      status: 'pending',
      message: 'Mobile money payment initiated. Please complete payment on your phone.',
      txRef
    });

  } catch (error: any) {
    console.error('Error processing mobile money payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process mobile money payment' },
      { status: 500 }
    );
  }
}
