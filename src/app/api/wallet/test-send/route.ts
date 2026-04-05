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

    const { amount, recipientAddress, walletAddress, type } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!recipientAddress || !walletAddress) {
      return NextResponse.json({ error: 'Recipient and sender addresses required' }, { status: 400 });
    }

    // Only allow test sends in development or test mode
    const isTestMode = process.env.NODE_ENV === 'development' || 
                      process.env.NEXT_PUBLIC_MOONPAY_KEY?.includes('test') ||
                      !process.env.NEXT_PUBLIC_MOONPAY_LIVE_KEY;

    if (!isTestMode) {
      return NextResponse.json({ error: 'Test sends only allowed in test mode' }, { status: 403 });
    }

    // Get sender's wallet
    const { data: senderWallet, error: senderError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (senderError || !senderWallet) {
      return NextResponse.json({ error: 'Sender wallet not found' }, { status: 404 });
    }

    // Verify the sender wallet address matches (case-insensitive)
    if (senderWallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Sender wallet address mismatch' }, { status: 403 });
    }

    // Check if sender has sufficient balance
    const senderBalance = parseFloat(senderWallet.usdc_balance || '0');
    if (senderBalance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // For test mode, we'll just simulate the transaction without creating recipient wallets
    // In a real scenario, the recipient would have their own wallet

    // Update sender balance (subtract amount)
    const newSenderBalance = senderBalance - amount;
    const { error: senderUpdateError } = await supabase
      .from('wallet')
      .update({
        usdc_balance: newSenderBalance.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', senderWallet.id);

    if (senderUpdateError) {
      console.error('Error updating sender balance:', senderUpdateError);
      return NextResponse.json({ error: 'Failed to update sender balance' }, { status: 500 });
    }

    // Try to update recipient balance if they have a wallet
    const { data: recipientWallet } = await supabase
      .from('wallet')
      .select('*')
      .eq('address', recipientAddress.toLowerCase())
      .single();

    if (recipientWallet) {
      const recipientBalance = parseFloat(recipientWallet.usdc_balance || '0');
      const newRecipientBalance = recipientBalance + amount;

      const { error: recipientUpdateError } = await supabase
        .from('wallet')
        .update({
          usdc_balance: newRecipientBalance.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipientWallet.id);

      if (recipientUpdateError) {
        console.error('[TEST SEND] Error updating recipient balance:', recipientUpdateError);
        // Continue anyway - sender was already debited
      } else {
        console.log(`[TEST SEND] Recipient ${recipientAddress} credited ${amount} USDC (new balance: ${newRecipientBalance})`);

        // Record a "receive" transaction for the recipient
        const receiveTxId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await supabase
          .from('transaction')
          .insert({
            id: receiveTxId,
            wallet_id: recipientWallet.id,
            type: 'receive',
            amount: amount.toString(),
            usd_amount: amount.toString(),
            currency: 'USDC',
            status: 'completed',
            category: 'internal',
            metadata: {
              senderAddress: walletAddress,
              sendType: type,
            },
            created_at: new Date().toISOString(),
          });
      }
    } else {
      console.log(`[TEST SEND] Recipient ${recipientAddress} not found in database - skipping balance update`);
    }

    // Record the transaction in the database
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log('[TEST SEND] Recording transaction:', {
      txId,
      wallet_id: senderWallet.id,
      type: 'send',
      amount: amount.toString(),
      recipientAddress,
    });

    const { data: txData, error: txError } = await supabase
      .from('transaction')
      .insert({
        id: txId,
        wallet_id: senderWallet.id,
        type: 'send',
        amount: amount.toString(),
        usd_amount: amount.toString(),
        currency: 'USDC',
        status: 'completed',
        category: 'internal',
        metadata: {
          recipientAddress,
          sendType: type,
        },
        created_at: new Date().toISOString(),
      })
      .select();

    if (txError) {
      console.error('[TEST SEND] Error recording transaction:', txError);
      console.error('[TEST SEND] Transaction error details:', JSON.stringify(txError, null, 2));
      // Continue anyway - balance was already updated
    } else {
      console.log('[TEST SEND] Transaction recorded successfully:', txData);
    }

    // Log the test transaction
    console.log(`[TEST SEND] User ${user.id} sent ${amount} USDC to ${recipientAddress} via ${type}`);

    return NextResponse.json({
      success: true,
      amount,
      senderBalance: newSenderBalance,
      type: 'test_send',
      message: `Test send of $${amount} USDC completed`
    });

  } catch (error: any) {
    console.error('Error processing test send:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process test send' },
      { status: 500 }
    );
  }
}
