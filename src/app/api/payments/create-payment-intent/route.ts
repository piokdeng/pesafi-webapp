import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';

/**
 * Create Payment Intent API
 * 
 * For future Stripe integration - creates payment intent for card payments
 * Currently returns a placeholder until Stripe keys are configured
 */

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, walletAddress } = await request.json();

    if (!amount || amount < 10) {
      return NextResponse.json({ error: 'Minimum amount is $10' }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    console.log('[Payment Intent] Creating for user:', user.id, 'amount:', amount);

    // TODO: Add Stripe integration here
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Convert to cents
    //   currency: 'usd',
    //   metadata: {
    //     userId: user.id,
    //     walletAddress: walletAddress,
    //   },
    // });

    // For now, return a message indicating Stripe setup needed
    return NextResponse.json({
      success: false,
      message: 'Stripe integration pending. Add STRIPE_SECRET_KEY to environment variables.',
      requiresSetup: true,
    });
  } catch (error) {
    console.error('[Payment Intent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

