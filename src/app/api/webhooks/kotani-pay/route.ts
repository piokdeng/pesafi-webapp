import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-auth';
import { treasurySendUSDC } from '@/lib/treasury';
import { ethers } from 'ethers';
import crypto from 'crypto';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = ['function balanceOf(address account) view returns (uint256)'];

/**
 * Kotani Pay v3 Webhook Handler
 * Receives transaction status updates from Kotani Pay
 *
 * v3 Event types:
 * - transaction.deposit.status.updated
 * - transaction.withdrawal.status.updated
 * - transaction.onramp.status.updated
 * - transaction.offramp.status.updated
 * - payment.confirmed
 * - kyc.status.changed
 * - refund.lightning.invoice_needed
 *
 * Also handles legacy event names for backward compatibility:
 * - transaction.completed / onramp.completed / offramp.completed
 * - transaction.failed / onramp.failed / offramp.failed
 * - transaction.pending / transaction.refunded
 */
export async function POST(request: NextRequest) {
  try {
    // Per Kotani v3 docs: signature is in `X-Kotani-Signature` header.
    // Keep legacy header name too.
    const signature =
      request.headers.get('x-kotani-signature') ||
      request.headers.get('x-kotanipay-signature');
    const rawBody = await request.text();

    const payload = JSON.parse(rawBody);

    if (!verifyWebhookSignature(payload, signature)) {
      console.error('[KOTANI PAY WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { event, data, timestamp } = payload;

    console.log('[KOTANI PAY WEBHOOK] Received event:', {
      event,
      transactionId: data?.id || data?.referenceId || data?.reference_id,
      status: data?.status,
      timestamp,
    });

    const supabase = createAdminSupabaseClient();

    // Log webhook for idempotency
    const webhookId = data?.id || data?.referenceId || data?.reference_id || `${event}_${timestamp}`;
    const { data: existingLog } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('external_id', webhookId)
      .eq('provider', 'kotani_pay')
      .single();

    if (existingLog) {
      console.log('[KOTANI PAY WEBHOOK] Duplicate webhook, skipping:', webhookId);
      return NextResponse.json({ success: true, received: true, duplicate: true });
    }

    // Store webhook log
    await supabase.from('webhook_logs').insert({
      provider: 'kotani_pay',
      external_id: webhookId,
      event_type: event,
      payload,
      created_at: new Date().toISOString(),
    });

    // Route to handler based on event type
    switch (event) {
      // v3 status update events
      case 'transaction.status.updated':
      case 'transaction.deposit.status.updated':
        await handleDepositStatusUpdate(supabase, data);
        break;

      case 'transaction.withdrawal.status.updated':
      case 'transaction.offramp.status.updated':
        await handleWithdrawalStatusUpdate(supabase, data);
        break;

      case 'transaction.onramp.status.updated':
        await handleDepositStatusUpdate(supabase, data);
        break;

      case 'payment.confirmed':
        await handlePaymentConfirmed(supabase, data);
        break;

      // Legacy event names (backward compatibility)
      case 'transaction.completed':
      case 'onramp.completed':
      case 'offramp.completed':
        await handleLegacyCompleted(supabase, data);
        break;

      case 'transaction.failed':
      case 'onramp.failed':
      case 'offramp.failed':
        await handleLegacyFailed(supabase, data);
        break;

      case 'transaction.pending':
      case 'onramp.pending':
      case 'offramp.pending':
        await handleLegacyPending(supabase, data);
        break;

      case 'transaction.refunded':
      case 'offramp.refunded':
        await handleLegacyRefunded(supabase, data);
        break;

      default:
        console.warn('[KOTANI PAY WEBHOOK] Unknown event type:', event);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error: any) {
    console.error('[KOTANI PAY WEBHOOK] Error:', error);
    // Return 200 to prevent retries, log for investigation
    return NextResponse.json({
      success: false,
      error: 'Internal error',
      logged: true,
    }, { status: 200 });
  }
}

// --- v3 Handlers ---

async function handleDepositStatusUpdate(supabase: any, data: any) {
  const { id, reference_id, referenceId, status } = data;
  const resolvedReferenceId = referenceId || reference_id;
  console.log('[KOTANI PAY WEBHOOK] Deposit status update:', { id, referenceId: resolvedReferenceId, status });

  const transaction = await findTransaction(supabase, id, resolvedReferenceId);
  if (!transaction) return;

  const mappedStatus = mapKotaniStatus(status);

  await supabase
    .from('transaction')
    .update({
      status: mappedStatus,
      ...(mappedStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      metadata: {
        ...transaction.metadata,
        webhook_event: 'deposit.status.updated',
        kotani_status: status,
        webhook_received_at: new Date().toISOString(),
        ...(mappedStatus === 'failed' ? { failed_at: new Date().toISOString() } : {}),
      },
    })
    .eq('id', transaction.id);

  // Credit wallet on successful deposit
  if (mappedStatus === 'completed' && transaction.type === 'deposit') {
    await creditWallet(supabase, transaction.wallet_id, parseFloat(transaction.amount));

    // Collection mode: treasury sends USDC to user's on-chain wallet
    if (transaction.metadata?.mode === 'collection') {
      await sendTreasuryUSDCToUser(supabase, transaction);
    }
  }
}

async function handleWithdrawalStatusUpdate(supabase: any, data: any) {
  const { id, reference_id, referenceId, status } = data;
  const resolvedReferenceId = referenceId || reference_id;
  console.log('[KOTANI PAY WEBHOOK] Withdrawal status update:', { id, referenceId: resolvedReferenceId, status });

  const transaction = await findTransaction(supabase, id, resolvedReferenceId);
  if (!transaction) return;

  const mappedStatus = mapKotaniStatus(status);

  await supabase
    .from('transaction')
    .update({
      status: mappedStatus,
      ...(mappedStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      metadata: {
        ...transaction.metadata,
        webhook_event: 'withdrawal.status.updated',
        kotani_status: status,
        webhook_received_at: new Date().toISOString(),
        ...(mappedStatus === 'failed' ? { failed_at: new Date().toISOString() } : {}),
        ...(mappedStatus === 'refunded' ? { refunded_at: new Date().toISOString() } : {}),
      },
    })
    .eq('id', transaction.id);

  // On failed/refunded/reversed withdrawal, sync DB balance from on-chain
  // (Kotani returns USDC to user's wallet on reversal)
  if (['failed', 'refunded'].includes(mappedStatus) && transaction.type === 'withdrawal') {
    await syncWalletBalanceFromChain(supabase, transaction.wallet_id);
  }
}

async function handlePaymentConfirmed(supabase: any, data: any) {
  const { id, reference_id, referenceId } = data;
  const resolvedReferenceId = referenceId || reference_id;
  console.log('[KOTANI PAY WEBHOOK] Payment confirmed:', { id, referenceId: resolvedReferenceId });

  const transaction = await findTransaction(supabase, id, resolvedReferenceId);
  if (!transaction) return;

  await supabase
    .from('transaction')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        ...transaction.metadata,
        webhook_event: 'payment.confirmed',
        webhook_received_at: new Date().toISOString(),
      },
    })
    .eq('id', transaction.id);

  if (transaction.type === 'deposit') {
    await creditWallet(supabase, transaction.wallet_id, parseFloat(transaction.amount));

    if (transaction.metadata?.mode === 'collection') {
      await sendTreasuryUSDCToUser(supabase, transaction);
    }
  }
}

// --- Legacy Handlers (backward compatibility) ---

async function handleLegacyCompleted(supabase: any, data: any) {
  const { id: transactionId, referenceId, completedAt } = data;
  const transaction = await findTransaction(supabase, transactionId, referenceId);
  if (!transaction) return;

  await supabase
    .from('transaction')
    .update({
      status: 'completed',
      completed_at: completedAt || new Date().toISOString(),
      metadata: { ...transaction.metadata, webhook_received_at: new Date().toISOString() },
    })
    .eq('id', transaction.id);

  if (transaction.type === 'deposit') {
    await creditWallet(supabase, transaction.wallet_id, parseFloat(transaction.amount));

    if (transaction.metadata?.mode === 'collection') {
      await sendTreasuryUSDCToUser(supabase, transaction);
    }
  }
}

async function handleLegacyFailed(supabase: any, data: any) {
  const { id: transactionId, referenceId, error: errorMessage, failedAt } = data;
  const transaction = await findTransaction(supabase, transactionId, referenceId);
  if (!transaction) return;

  await supabase
    .from('transaction')
    .update({
      status: 'failed',
      description: errorMessage,
      metadata: {
        ...transaction.metadata,
        error_message: errorMessage,
        failed_at: failedAt || new Date().toISOString(),
      },
    })
    .eq('id', transaction.id);

  if (transaction.type === 'withdrawal') {
    await syncWalletBalanceFromChain(supabase, transaction.wallet_id);
  }
}

async function handleLegacyPending(supabase: any, data: any) {
  const { id: transactionId, referenceId } = data;
  const transaction = await findTransaction(supabase, transactionId, referenceId);
  if (!transaction) return;

  await supabase
    .from('transaction')
    .update({
      status: 'pending',
    })
    .eq('id', transaction.id);
}

async function handleLegacyRefunded(supabase: any, data: any) {
  const { id: transactionId, referenceId, refundAmount, refundedAt } = data;
  const transaction = await findTransaction(supabase, transactionId, referenceId);
  if (!transaction) return;

  await supabase
    .from('transaction')
    .update({
      status: 'refunded',
      metadata: {
        ...transaction.metadata,
        refund_amount: refundAmount,
        refunded_at: refundedAt || new Date().toISOString(),
      },
    })
    .eq('id', transaction.id);

  await syncWalletBalanceFromChain(supabase, transaction.wallet_id);
}

// --- Helpers ---

/**
 * Send USDC from treasury to user's on-chain wallet (collection mode only).
 * Called when Kotani confirms fiat was collected but can't deliver crypto directly.
 */
async function sendTreasuryUSDCToUser(supabase: any, transaction: any) {
  const amount = parseFloat(transaction.amount);
  if (!amount || amount <= 0) {
    console.error('[KOTANI PAY WEBHOOK] Invalid amount for treasury send:', transaction.amount);
    return;
  }

  // Get user's wallet address
  const { data: wallet } = await supabase
    .from('wallet')
    .select('address')
    .eq('id', transaction.wallet_id)
    .single();

  if (!wallet?.address) {
    console.error('[KOTANI PAY WEBHOOK] Wallet address not found for treasury send:', transaction.wallet_id);
    return;
  }

  try {
    console.log(`[KOTANI PAY WEBHOOK] Collection complete — sending ${amount} USDC from treasury to ${wallet.address}`);
    const { txHash } = await treasurySendUSDC(wallet.address, amount);
    console.log('[KOTANI PAY WEBHOOK] Treasury USDC sent:', txHash);

    // Record the treasury tx hash in metadata
    await supabase
      .from('transaction')
      .update({
        metadata: {
          ...transaction.metadata,
          treasuryTxHash: txHash,
          treasurySentAt: new Date().toISOString(),
        },
      })
      .eq('id', transaction.id);
  } catch (error: any) {
    console.error('[KOTANI PAY WEBHOOK] Treasury USDC send failed:', error.message);
    // Mark transaction so it can be retried manually
    await supabase
      .from('transaction')
      .update({
        metadata: {
          ...transaction.metadata,
          treasurySendFailed: true,
          treasurySendError: error.message,
          treasuryFailedAt: new Date().toISOString(),
        },
      })
      .eq('id', transaction.id);
  }
}

/**
 * Sync wallet DB balance from on-chain USDC balance.
 * Used after reversals/refunds where Kotani returns USDC to user's wallet.
 */
async function syncWalletBalanceFromChain(supabase: any, walletId: string) {
  try {
    const { data: wallet } = await supabase
      .from('wallet')
      .select('address, usdc_balance')
      .eq('id', walletId)
      .single();

    if (!wallet?.address) {
      console.error('[KOTANI PAY WEBHOOK] Wallet not found for balance sync:', walletId);
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

    console.log(`[KOTANI PAY WEBHOOK] Wallet balance synced from chain: ${wallet.usdc_balance} -> ${balanceUsdc}`);
  } catch (error: any) {
    console.error('[KOTANI PAY WEBHOOK] Failed to sync balance from chain:', error.message);
  }
}

async function findTransaction(supabase: any, id?: string, referenceId?: string) {
  if (!id && !referenceId) {
    console.error('[KOTANI PAY WEBHOOK] No transaction identifier provided');
    return null;
  }

  // NOTE: metadata column is TEXT (not JSONB), so we use LIKE for lookups
  let error = null;

  if (referenceId) {
    // Search metadata text for "referenceId":"<value>"
    const result = await supabase
      .from('transaction')
      .select('*')
      .like('metadata', `%"referenceId":"${referenceId}"%`)
      .limit(1)
      .single();

    if (result.data) return result.data;

    // Search metadata text for "kotaniReferenceId":"<value>"
    const result2 = await supabase
      .from('transaction')
      .select('*')
      .like('metadata', `%"kotaniReferenceId":"${referenceId}"%`)
      .limit(1)
      .single();

    if (result2.data) return result2.data;
    error = result.error;
  }

  if (id) {
    const result = await supabase
      .from('transaction')
      .select('*')
      .like('metadata', `%"kotaniReferenceId":"${id}"%`)
      .limit(1)
      .single();

    if (result.data) return result.data;
    error = result.error;
  }

  console.error('[KOTANI PAY WEBHOOK] Transaction not found:', { id, referenceId, error });
  return null;
}

async function creditWallet(supabase: any, walletId: string, amount: number) {
  const { data: wallet } = await supabase
    .from('wallet')
    .select('usdc_balance')
    .eq('id', walletId)
    .single();

  if (!wallet) {
    console.error('[KOTANI PAY WEBHOOK] Wallet not found for credit:', walletId);
    return;
  }

  const currentBalance = parseFloat(wallet.usdc_balance || '0');
  const newBalance = currentBalance + amount;

  await supabase
    .from('wallet')
    .update({
      usdc_balance: newBalance.toString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId);

  console.log('[KOTANI PAY WEBHOOK] Wallet credited:', { walletId, amount, newBalance });
}

/**
 * Map Kotani Pay status to our internal status
 */
function mapKotaniStatus(kotaniStatus: string): string {
  const statusMap: Record<string, string> = {
    'COMPLETED': 'completed',
    'SUCCESSFUL': 'completed',
    'SUCCESS': 'completed',
    'FAILED': 'failed',
    'FAILURE': 'failed',
    'REVERSED': 'refunded',
    'REFUNDED': 'refunded',
    'PENDING': 'pending',
    'PROCESSING': 'pending',
    'INITIATED': 'pending',
  };

  return statusMap[kotaniStatus?.toUpperCase()] || kotaniStatus?.toLowerCase() || 'pending';
}

/**
 * Verify webhook signature (HMAC-SHA256)
 */
function verifyWebhookSignature(payload: any, headerSignature: string | null): boolean {
  // Kotani v3 docs:
  // - signature header: X-Kotani-Signature
  // - compute: "sha256=" + HMAC(secret, JSON.stringify({ event, data }))
  // - do NOT include the `signature` field itself in the signed payload

  const isDevOrSandbox = process.env.NODE_ENV === 'development' || process.env.KOTANI_PAY_ENVIRONMENT === 'sandbox';

  if (!headerSignature) {
    if (isDevOrSandbox) {
      console.warn('[KOTANI PAY WEBHOOK] Missing signature header; allowing in sandbox/dev');
      return true;
    }
    return false;
  }

  const webhookSecret = process.env.KOTANI_PAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    if (isDevOrSandbox) {
      console.warn('[KOTANI PAY WEBHOOK] Missing KOTANI_PAY_WEBHOOK_SECRET; allowing in sandbox/dev');
      return true;
    }
    console.error('[KOTANI PAY WEBHOOK] Webhook secret not configured');
    return false;
  }

  try {
    const signedPayload = JSON.stringify({ event: payload?.event, data: payload?.data });
    const computed = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

    const normalizedHeader = headerSignature.trim();
    const headerComparable = normalizedHeader.startsWith('sha256=') ? normalizedHeader : `sha256=${normalizedHeader}`;

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(headerComparable));
  } catch (error) {
    console.error('[KOTANI PAY WEBHOOK] Signature verification error:', error);
    return false;
  }
}
