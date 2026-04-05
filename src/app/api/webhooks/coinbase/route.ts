import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import { WEBHOOK_RATE_LIMIT } from '@/lib/rate-limiter';
import crypto from 'crypto';

/**
 * CORS Configuration for Coinbase Webhooks
 * Per Coinbase security requirements, we do NOT set Access-Control-Allow-Origin
 * for webhook endpoints as they should only be called by Coinbase servers,
 * not from browsers.
 */

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = WEBHOOK_RATE_LIMIT(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const { eventType, transactionId, orderId } = body;

    // Get webhook secret from environment
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[COINBASE WEBHOOK] COINBASE_WEBHOOK_SECRET not configured');
      // In production, this should return 500. For development, we'll allow it.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
      }
    }

    // Verify webhook signature using CDP method
    const signatureHeader = request.headers.get('x-hook0-signature');

    if (signatureHeader && webhookSecret) {
      // Convert headers to plain object for verification
      const headersObj: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      const isValid = verifySignature(rawBody, signatureHeader, webhookSecret, headersObj);

      if (!isValid) {
        console.error('[COINBASE WEBHOOK] Invalid signature - rejected');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, require signature verification
      console.error('[COINBASE WEBHOOK] No signature header found');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Check for idempotency key to prevent duplicate processing
    const idempotencyKey = request.headers.get('x-idempotency-key') ||
                          request.headers.get('x-hook0-id') ||
                          `${eventType}-${transactionId || orderId || Date.now()}`;

    console.log(`[COINBASE WEBHOOK] Event: ${eventType}, Idempotency Key: ${idempotencyKey}`, body);

    // Check if we've already processed this webhook
    const supabase = createAdminSupabaseClient();
    const { data: existingWebhook } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingWebhook) {
      console.log(`[COINBASE WEBHOOK] Duplicate webhook detected: ${idempotencyKey}`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Log the webhook for idempotency tracking
    console.log(`[COINBASE WEBHOOK] Inserting webhook log with key: ${idempotencyKey}`);
    const { error: insertError } = await supabase
      .from('webhook_logs')
      .insert({
        idempotency_key: idempotencyKey,
        provider: 'coinbase',
        event_type: eventType,
        payload: body,
        status: 'processing',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[COINBASE WEBHOOK] Error inserting webhook log:', insertError);
    } else {
      console.log('[COINBASE WEBHOOK] Webhook log inserted successfully');
    }

    // Handle onramp transaction success
    if (eventType === 'onramp.transaction.success' ||
        (eventType === 'onramp.transaction.updated' && body.status === 'ONRAMP_TRANSACTION_STATUS_SUCCESS')) {

      const walletAddress = body.walletAddress || body.destinationAddress;
      const purchaseAmount = body.purchaseAmount?.value || body.purchaseAmount;
      const purchaseCurrency = body.purchaseCurrency || body.purchaseAmount?.currency;
      const txId = transactionId || orderId;
      const depositAmount = parseFloat(purchaseAmount);

      // Log successful transaction
      console.log(`[COINBASE] Onramp transaction ${txId} completed: ${purchaseAmount} ${purchaseCurrency}`);

      const supabase = createAdminSupabaseClient();

      if (!walletAddress) {
        console.error('[COINBASE] No wallet address found in transaction data');
        return NextResponse.json({ error: 'No wallet address' }, { status: 400 });
      }

      // Find wallet by address
      const { data: wallet, error: walletError } = await supabase
        .from('wallet')
        .select('*')
        .eq('address', walletAddress.toLowerCase())
        .single();

      if (wallet && !walletError) {
        // Update USDC balance - Onramp is always a deposit
        const currentBalance = parseFloat(wallet.usdc_balance || '0');
        const newBalance = currentBalance + depositAmount;

        console.log(`[COINBASE] Onramp deposit: ${depositAmount} ${purchaseCurrency} added to ${walletAddress}`);
        
        const { error: updateError } = await supabase
          .from('wallet')
          .update({
            usdc_balance: newBalance.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        if (updateError) {
          console.error('Error updating wallet balance:', updateError);
        } else {
          console.log(`[COINBASE] Updated wallet ${walletAddress} balance: ${newBalance} USDC`);
        }
      }

      // Log transaction in database
      await supabase
        .from('transaction')
        .insert({
          id: txId,
          wallet_id: wallet?.id,
          type: 'deposit',
          amount: depositAmount.toString(),
          usd_amount: depositAmount.toString(),
          currency: purchaseCurrency,
          status: 'completed',
          category: 'coinbase',
          tx_hash: body.txHash,
          metadata: {
            txHash: body.txHash,
            paymentMethod: body.paymentMethod,
            networkFee: body.networkFee,
          },
          created_at: new Date().toISOString(),
        });
    }

    // Handle onramp transaction failure
    if (eventType === 'onramp.transaction.failed' ||
        (eventType === 'onramp.transaction.updated' && body.status === 'ONRAMP_TRANSACTION_STATUS_FAILED')) {

      const txId = transactionId || orderId;
      const errorMessage = body.error || body.failureReason || 'Unknown error';

      // Log failed transaction
      console.error(`[COINBASE] Onramp transaction ${txId} failed: ${errorMessage}`);

      // Log failed transaction in database
      const supabase = createAdminSupabaseClient();
      await supabase
        .from('transaction')
        .insert({
          id: txId,
          type: 'deposit',
          amount: body.purchaseAmount?.value || body.purchaseAmount || '0',
          usd_amount: body.purchaseAmount?.value || body.purchaseAmount || '0',
          currency: body.purchaseCurrency || 'USDC',
          status: 'failed',
          description: errorMessage,
          category: 'coinbase',
          metadata: { coinbaseError: errorMessage },
          created_at: new Date().toISOString(),
        });
    }

    // Update webhook log status to completed
    await supabase
      .from('webhook_logs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Coinbase webhook error:', error);
    
    // Update webhook log status to failed
    try {
      const supabase = createAdminSupabaseClient();

      // Try to get idempotency key from headers
      const idempotencyKey = request.headers.get('x-idempotency-key') ||
                            request.headers.get('x-hook0-id') ||
                            `error-${Date.now()}`;
      
      await supabase
        .from('webhook_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('idempotency_key', idempotencyKey);
    } catch (logError) {
      console.error('Failed to update webhook log:', logError);
    }

    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

/**
 * Verify CDP webhook signature
 * Per Coinbase CDP documentation: https://docs.cdp.coinbase.com/platform/docs/webhooks
 *
 * @param payload - Raw request body as string
 * @param signatureHeader - X-Hook0-Signature header value
 * @param secret - Secret from webhook subscription metadata
 * @param headers - HTTP headers from webhook request
 * @param maxAgeMinutes - Maximum age for webhook (default: 5 minutes)
 */
function verifySignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  headers: Record<string, string>,
  maxAgeMinutes: number = 5
): boolean {
  try {
    if (!signatureHeader) {
      console.error('[COINBASE WEBHOOK] No X-Hook0-Signature header found');
      return false;
    }

    // Parse signature header: t=timestamp,h=headers,v1=signature
    const elements = signatureHeader.split(',');
    const timestampElement = elements.find(e => e.startsWith('t='));
    const headerNamesElement = elements.find(e => e.startsWith('h='));
    const signatureElement = elements.find(e => e.startsWith('v1='));

    if (!timestampElement || !headerNamesElement || !signatureElement) {
      console.error('[COINBASE WEBHOOK] Invalid signature header format');
      return false;
    }

    const timestamp = timestampElement.split('=')[1];
    const headerNames = headerNamesElement.split('=')[1];
    const providedSignature = signatureElement.split('=')[1];

    // Build header values string
    const headerNameList = headerNames.split(' ');
    const headerValues = headerNameList.map(name => headers[name.toLowerCase()] || '').join('.');

    // Build signed payload
    const signedPayload = `${timestamp}.${headerNames}.${headerValues}.${payload}`;

    console.log('[COINBASE WEBHOOK] Verifying signature with timestamp:', timestamp);

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Compare signatures securely
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );

    if (!signaturesMatch) {
      console.error('[COINBASE WEBHOOK] Signature verification failed');
      return false;
    }

    // Verify timestamp to prevent replay attacks
    const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const ageMinutes = (currentTime - webhookTime) / (1000 * 60);

    if (ageMinutes > maxAgeMinutes) {
      console.error(`[COINBASE WEBHOOK] Webhook timestamp exceeds maximum age: ${ageMinutes.toFixed(1)} minutes > ${maxAgeMinutes} minutes`);
      return false;
    }

    console.log('[COINBASE WEBHOOK] Signature verified successfully');
    return true;

  } catch (error) {
    console.error('[COINBASE WEBHOOK] Signature verification error:', error);
    return false;
  }
}
