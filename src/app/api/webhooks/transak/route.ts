import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import crypto from 'crypto';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = ['function balanceOf(address account) view returns (uint256)'];

/**
 * Transak Webhook Handler
 *
 * Receives order status updates from Transak.
 * Webhook events: https://docs.transak.com/docs/webhooks
 *
 * Key event statuses:
 * - ORDER_COMPLETED: User's crypto purchase was successful
 * - ORDER_FAILED: Order failed
 * - ORDER_PROCESSING: Payment received, crypto being sent
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature if secret is configured
    if (!verifyWebhookSignature(rawBody, request)) {
      console.error('[TRANSAK WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Transak sends { webhookData: { ... }, eventID, createdAt }
    const webhookData = payload.webhookData || payload;
    const {
      id: orderId,
      status,
      walletAddress,
      cryptoAmount,
      cryptoCurrency,
      fiatAmount,
      fiatCurrency,
      transactionHash,
      network,
    } = webhookData;

    console.log('[TRANSAK WEBHOOK] Received:', {
      orderId,
      status,
      walletAddress,
      cryptoAmount,
      cryptoCurrency,
      network,
    });

    const supabase = createAdminSupabaseClient();

    // Idempotency check
    const webhookId = orderId || payload.eventID || `transak_${Date.now()}`;
    const idempotencyKey = `${webhookId}_${status}`;

    const { data: existingLog } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingLog) {
      console.log('[TRANSAK WEBHOOK] Duplicate webhook, skipping:', idempotencyKey);
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Store webhook log
    await supabase.from('webhook_logs').insert({
      idempotency_key: idempotencyKey,
      provider: 'transak',
      event_type: status,
      payload,
      status: 'processing',
      created_at: new Date().toISOString(),
    });

    // Handle based on status
    switch (status) {
      case 'COMPLETED':
      case 'ORDER_COMPLETED':
        await handleOrderCompleted(supabase, webhookData);
        break;

      case 'FAILED':
      case 'ORDER_FAILED':
      case 'CANCELLED':
      case 'ORDER_CANCELLED':
      case 'EXPIRED':
        await handleOrderFailed(supabase, webhookData);
        break;

      case 'PROCESSING':
      case 'ORDER_PROCESSING':
      case 'PENDING_DELIVERY_FROM_TRANSAK':
        console.log('[TRANSAK WEBHOOK] Order processing:', orderId);
        break;

      default:
        console.warn('[TRANSAK WEBHOOK] Unknown status:', status);
    }

    // Update webhook log to completed
    await supabase
      .from('webhook_logs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('idempotency_key', idempotencyKey);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TRANSAK WEBHOOK] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal error',
      logged: true,
    }, { status: 200 });
  }
}

async function handleOrderCompleted(supabase: any, data: any) {
  const {
    id: orderId,
    walletAddress,
    cryptoAmount,
    cryptoCurrency,
    fiatAmount,
    fiatCurrency,
    transactionHash,
  } = data;

  if (!walletAddress) {
    console.error('[TRANSAK WEBHOOK] No wallet address in completed order');
    return;
  }

  const depositAmount = parseFloat(cryptoAmount || fiatAmount || '0');

  // Find wallet by address
  const { data: wallet, error: walletError } = await supabase
    .from('wallet')
    .select('*')
    .eq('address', walletAddress.toLowerCase())
    .single();

  if (!wallet || walletError) {
    console.error('[TRANSAK WEBHOOK] Wallet not found:', walletAddress, walletError);
    return;
  }

  // Sync balance from chain (Transak sends USDC directly to user's wallet)
  await syncWalletBalanceFromChain(supabase, wallet.id);

  // Insert transaction record
  const { error: txError } = await supabase
    .from('transaction')
    .insert({
      id: orderId,
      wallet_id: wallet.id,
      type: 'deposit',
      amount: depositAmount.toString(),
      usd_amount: (fiatCurrency === 'USD' ? fiatAmount : depositAmount).toString(),
      currency: cryptoCurrency || 'USDC',
      status: 'completed',
      category: 'transak',
      tx_hash: transactionHash,
      to_address: walletAddress.toLowerCase(),
      metadata: JSON.stringify({
        provider: 'transak',
        orderId,
        fiatAmount,
        fiatCurrency,
        cryptoAmount,
        cryptoCurrency,
        transactionHash,
        completedAt: new Date().toISOString(),
      }),
      created_at: new Date().toISOString(),
    });

  if (txError) {
    console.error('[TRANSAK WEBHOOK] Error inserting transaction:', txError);
  } else {
    console.log(`[TRANSAK WEBHOOK] Deposit recorded: ${depositAmount} ${cryptoCurrency} to ${walletAddress}`);
  }
}

async function handleOrderFailed(supabase: any, data: any) {
  const {
    id: orderId,
    walletAddress,
    cryptoAmount,
    fiatAmount,
    fiatCurrency,
    cryptoCurrency,
    statusReason,
    status,
  } = data;

  const amount = parseFloat(cryptoAmount || fiatAmount || '0');

  // Try to find wallet
  let walletId = null;
  if (walletAddress) {
    const { data: wallet } = await supabase
      .from('wallet')
      .select('id')
      .eq('address', walletAddress.toLowerCase())
      .single();
    walletId = wallet?.id;
  }

  await supabase
    .from('transaction')
    .insert({
      id: orderId,
      wallet_id: walletId,
      type: 'deposit',
      amount: amount.toString(),
      usd_amount: (fiatCurrency === 'USD' ? fiatAmount : amount).toString(),
      currency: cryptoCurrency || 'USDC',
      status: 'failed',
      category: 'transak',
      description: statusReason || `Order ${status?.toLowerCase() || 'failed'}`,
      metadata: JSON.stringify({
        provider: 'transak',
        orderId,
        error: statusReason,
        status,
        failedAt: new Date().toISOString(),
      }),
      created_at: new Date().toISOString(),
    });

  console.log(`[TRANSAK WEBHOOK] Order failed: ${orderId} - ${statusReason || status}`);
}

/**
 * Sync wallet DB balance from on-chain USDC balance.
 * Transak delivers USDC directly to the user's on-chain wallet.
 */
async function syncWalletBalanceFromChain(supabase: any, walletId: string) {
  try {
    const { data: wallet } = await supabase
      .from('wallet')
      .select('address, usdc_balance')
      .eq('id', walletId)
      .single();

    if (!wallet?.address) {
      console.error('[TRANSAK WEBHOOK] Wallet not found for balance sync:', walletId);
      return;
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const onChainBalance = await usdc.balanceOf(wallet.address);
    const balanceUsdc = (Number(onChainBalance) / 1e6).toFixed(6);

    await supabase
      .from('wallet')
      .update({ usdc_balance: balanceUsdc, updated_at: new Date().toISOString() })
      .eq('id', walletId);

    console.log(`[TRANSAK WEBHOOK] Wallet balance synced: ${wallet.usdc_balance} -> ${balanceUsdc}`);
  } catch (error: any) {
    console.error('[TRANSAK WEBHOOK] Failed to sync balance:', error.message);
  }
}

/**
 * Verify Transak webhook signature.
 * Transak uses a webhook secret to sign payloads.
 */
function verifyWebhookSignature(rawBody: string, request: NextRequest): boolean {
  const webhookSecret = process.env.TRANSAK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // Allow without signature in dev or when secret isn't configured yet
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TRANSAK WEBHOOK] No webhook secret configured; allowing in non-production');
      return true;
    }
    // In production without a secret, still allow (Transak webhook secret is optional)
    console.warn('[TRANSAK WEBHOOK] No TRANSAK_WEBHOOK_SECRET configured');
    return true;
  }

  const signature = request.headers.get('x-transak-signature');
  if (!signature) {
    console.error('[TRANSAK WEBHOOK] Missing signature header');
    return false;
  }

  try {
    const computed = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch (error) {
    console.error('[TRANSAK WEBHOOK] Signature verification error:', error);
    return false;
  }
}
