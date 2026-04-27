import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { KotaniPayError, kotaniPayService } from '@/lib/kotani-pay';
import { ensureGasBalance } from '@/lib/gas-treasury';
import { validateMobileMoneyCombo, detectCurrencyFromPhone } from '@/lib/mobile-money-validation';
import { ethers } from 'ethers';
import crypto from 'crypto';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

/**
 * Kotani Pay Offramp (Withdraw) API Route - v3
 *
 * Sends USDC directly from the user's wallet to Kotani's escrow address.
 * No treasury USDC liquidity needed — only ETH for gas sponsorship.
 *
 * End-to-end:
 * 1) Quote rate: POST /rate/offramp (optional)
 * 2) Create offramp: POST /offramp (returns escrowAddress + status)
 * 3) Decrypt user's key, send USDC from their wallet to escrow
 * 4) Webhook updates status + payout completion/refund handling
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      currency,
      chain = 'BASE',
      token = 'USDC',
      withdrawalMethod, // 'mobile_money' or 'bank'
      mobileMoneyDetails,
      bankDetails,
      walletType,
    } = body;

    const cryptoAmount = Number(amount);
    if (!cryptoAmount || cryptoAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!currency) {
      return NextResponse.json({ error: 'currency is required (fiat currency, e.g. KES)' }, { status: 400 });
    }

    if (!withdrawalMethod || !['mobile_money', 'bank'].includes(withdrawalMethod)) {
      return NextResponse.json({ error: 'withdrawalMethod must be "mobile_money" or "bank"' }, { status: 400 });
    }

    // Get user's wallet
    let walletQuery = supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id);

    if (walletType) {
      walletQuery = walletQuery.eq('wallet_type', walletType);
    }

    const { data: userWallet, error: walletError } = await walletQuery.limit(1).single();

    if (walletError || !userWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (!userWallet.encrypted_private_key) {
      return NextResponse.json({ error: 'Wallet key not available' }, { status: 500 });
    }

    // Check on-chain USDC balance (source of truth)
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const usdcRead = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const onChainBalance = await usdcRead.balanceOf(userWallet.address);
    const onChainUsdc = Number(onChainBalance) / 1e6;

    if (onChainUsdc < cryptoAmount) {
      return NextResponse.json({
        error: 'Insufficient balance',
        details: { requested: cryptoAmount, available: onChainUsdc },
      }, { status: 400 });
    }

    const referenceId = `pesafi_offramp_${user.id}_${Date.now()}`;
    const callbackUrl = resolveKotaniWebhookUrl(request);

    const offrampRequest: any = {
      cryptoAmount,
      currency,
      chain,
      token,
      referenceId,
      callbackUrl,
      // Kotani allows senderAddress optional. If you pass it, Kotani can attribute the on-chain payment.
      senderAddress: userWallet.address,
    };

    if (withdrawalMethod === 'mobile_money') {
      if (!mobileMoneyDetails?.phoneNumber || !mobileMoneyDetails?.accountName || !mobileMoneyDetails?.networkProvider) {
        return NextResponse.json({
          error: 'mobileMoneyDetails.phoneNumber, accountName, networkProvider are required',
        }, { status: 400 });
      }

      // Validate phone/provider/currency combo
      const validation = validateMobileMoneyCombo(
        mobileMoneyDetails.phoneNumber,
        mobileMoneyDetails.networkProvider,
        currency
      );
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Auto-correct currency in the request if phone number suggests a different one
      const detectedCurrency = detectCurrencyFromPhone(mobileMoneyDetails.phoneNumber);
      if (detectedCurrency && detectedCurrency !== currency) {
        console.warn(`[KOTANI PAY OFFRAMP] Currency mismatch: requested ${currency}, phone suggests ${detectedCurrency}. Using detected.`);
        offrampRequest.currency = detectedCurrency;
      }

      offrampRequest.mobileMoneyReceiver = {
        phoneNumber: mobileMoneyDetails.phoneNumber,
        accountName: mobileMoneyDetails.accountName,
        networkProvider: mobileMoneyDetails.networkProvider,
      };
    } else {
      if (!bankDetails?.name || !bankDetails?.accountNumber || !bankDetails?.bankCode) {
        return NextResponse.json({
          error: 'bankDetails.name, accountNumber, bankCode are required',
        }, { status: 400 });
      }
      offrampRequest.bankReceiver = {
        name: bankDetails.name,
        address: bankDetails.address || 'N/A',
        phoneNumber: bankDetails.phoneNumber || mobileMoneyDetails?.phoneNumber || '',
        bankCode: bankDetails.bankCode,
        accountNumber: bankDetails.accountNumber,
        country: bankDetails.country || currency.substring(0, 2),
      };
    }

    // Optional: quote rate for visibility / rateId usage.
    let rate: any = null;
    try {
      rate = await kotaniPayService.getOfframpPricing({
        amount: cryptoAmount,
        currency,
        token,
        chain,
      });
      if (rate?.data?.id) {
        offrampRequest.rateId = rate.data.id;
      }
    } catch (e) {
      // Non-fatal; Kotani can still process without pre-quoted rateId.
    }

    const response = await kotaniPayService.createOfframp(offrampRequest);

    if (!response.success) {
      console.error('[KOTANI PAY OFFRAMP] Request failed:', response.message);
      const rawMsg = (response.message || '').toLowerCase();
      let friendlyError = 'Transfer failed. Please try again.';
      if (rawMsg.includes('phonenumber') || rawMsg.includes('phone number') || rawMsg.includes('phone_number')) {
        friendlyError = 'The phone number entered is invalid. Please check the number and include the country code (e.g., +254712345678).';
      } else if (rawMsg.includes('validation failed')) {
        const readable = (response.message || '').replace(/^Validation failed:\s*/i, '');
        friendlyError = readable
          ? `Please check your details: ${readable}`
          : 'Please check the details you entered and try again.';
      }
      return NextResponse.json({ error: friendlyError }, { status: 400 });
    }

    const escrowAddress = response.data?.escrowAddress;

    // Store transaction in database FIRST (before sending USDC)
    // so the webhook can find it if Kotani fires it immediately
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { error: insertError } = await supabase
      .from('transaction')
      .insert({
        id: txId,
        wallet_id: userWallet.id,
        type: 'withdrawal',
        amount: cryptoAmount.toString(),
        usd_amount: cryptoAmount.toString(),
        currency: token,
        status: 'pending',
        category: 'kotani_pay',
        from_address: userWallet.address?.toLowerCase(),
        to_address: escrowAddress?.toLowerCase(),
        metadata: {
          chain,
          token,
          fiat_currency: currency,
          withdrawal_method: withdrawalMethod,
          callbackUrl,
          destination: withdrawalMethod === 'mobile_money'
            ? mobileMoneyDetails.phoneNumber
            : bankDetails.accountNumber,
          accountName: withdrawalMethod === 'mobile_money'
            ? mobileMoneyDetails.accountName
            : bankDetails.name,
          escrowAddress,
          kotaniStatus: response.data?.status,
          kotaniOnchainStatus: response.data?.onchainStatus,
          rate: rate?.data,
          rateId: offrampRequest.rateId,
          kotaniReferenceId: response.data?.referenceId,
          referenceId,
        },
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[KOTANI PAY OFFRAMP] Failed to store transaction:', insertError);
    }

    // Send USDC directly from user's wallet to escrow
    let userTxHash: string | null = null;
    if (escrowAddress) {
      try {
        // Decrypt user's private key
        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
        if (!encryptionKey) {
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
        const [ivHex, authTagHex, encryptedHex] = userWallet.encrypted_private_key.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
        decipher.setAuthTag(authTag);
        let privateKey = decipher.update(encrypted, undefined, 'utf8');
        privateKey += decipher.final('utf8');

        // Ensure user wallet has gas for the transfer
        await ensureGasBalance(userWallet.address);

        // Send USDC from user's wallet to Kotani escrow
        const userSigner = new ethers.Wallet(privateKey, provider);
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, userSigner);
        const amountInUnits = ethers.parseUnits(cryptoAmount.toString(), 6);

        console.log(`[KOTANI PAY OFFRAMP] Sending ${cryptoAmount} USDC from ${userWallet.address} to escrow ${escrowAddress}`);
        const tx = await usdc.transfer(escrowAddress, amountInUnits);
        const receipt = await tx.wait();
        userTxHash = tx.hash;
        console.log('[KOTANI PAY OFFRAMP] User wallet sent to escrow:', userTxHash, 'block:', receipt.blockNumber);

        // Update transaction with tx_hash
        await supabase
          .from('transaction')
          .update({
            tx_hash: userTxHash,
            metadata: {
              chain, token, fiat_currency: currency, withdrawal_method: withdrawalMethod,
              callbackUrl, escrowAddress, kotaniReferenceId: response.data?.referenceId,
              referenceId, rate: rate?.data, rateId: offrampRequest.rateId,
              kotaniStatus: response.data?.status, kotaniOnchainStatus: response.data?.onchainStatus,
              destination: withdrawalMethod === 'mobile_money' ? mobileMoneyDetails.phoneNumber : bankDetails.accountNumber,
              accountName: withdrawalMethod === 'mobile_money' ? mobileMoneyDetails.accountName : bankDetails.name,
              userTxHash,
            },
          })
          .eq('id', txId);
      } catch (sendError: any) {
        console.error('[KOTANI PAY OFFRAMP] Failed to send from user wallet:', sendError);
        // Update transaction as failed
        await supabase
          .from('transaction')
          .update({ status: 'failed', description: 'Failed to send USDC to escrow' })
          .eq('id', txId);
        return NextResponse.json({
          error: 'Transfer temporarily unavailable. Please try again later.',
        }, { status: 503 });
      }
    }

    // Update DB balance to reflect the on-chain send
    const newOnChainBalance = await usdcRead.balanceOf(userWallet.address);
    const newBalanceUsdc = (Number(newOnChainBalance) / 1e6).toFixed(6);
    const { error: debitError } = await supabase
      .from('wallet')
      .update({ usdc_balance: newBalanceUsdc })
      .eq('id', userWallet.id);

    if (debitError) {
      console.error('[KOTANI PAY OFFRAMP] Failed to update balance:', debitError);
    }

    // Auto-save phone contact
    if (withdrawalMethod === 'mobile_money' && mobileMoneyDetails?.phoneNumber) {
      try {
        const { data: existingContact } = await supabase
          .from('contact')
          .select('id')
          .eq('user_id', user.id)
          .eq('phone_number', mobileMoneyDetails.phoneNumber)
          .maybeSingle();

        if (existingContact) {
          await supabase
            .from('contact')
            .update({
              last_used_at: new Date().toISOString(),
              name: mobileMoneyDetails.accountName || mobileMoneyDetails.phoneNumber,
            })
            .eq('id', existingContact.id);
        } else {
          const contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          await supabase
            .from('contact')
            .insert({
              id: contactId,
              user_id: user.id,
              name: mobileMoneyDetails.accountName || mobileMoneyDetails.phoneNumber,
              phone_number: mobileMoneyDetails.phoneNumber,
              source: 'transaction',
              last_used_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      } catch (contactError) {
        console.warn('[KOTANI PAY OFFRAMP] Contact auto-save failed:', contactError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal initiated — funds sent to escrow',
      data: {
        referenceId,
        kotaniReferenceId: response.data?.referenceId,
        cryptoAmount,
        token,
        fiatCurrency: currency,
        status: response.data?.status,
        onchainStatus: response.data?.onchainStatus,
        txHash: userTxHash,
      },
    });

  } catch (error: any) {
    console.error('[KOTANI PAY OFFRAMP] Error:', error);

    if (error instanceof KotaniPayError) {
      let userMessage = 'Transfer failed. Please try again.';
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('transaction in progress')) {
        userMessage = 'You have a pending transfer. Please wait for it to complete before starting a new one.';
      } else if (msg.includes('minimum limit')) {
        userMessage = error.message!; // Pass through the minimum amount message
      } else if (msg.includes('phonenumber') || msg.includes('phone number') || msg.includes('phone_number')) {
        userMessage = 'The phone number entered is invalid. Please check the number and include the country code (e.g., +254712345678).';
      } else if (msg.includes('validation failed')) {
        // Extract the human-readable part after "Validation failed:"
        const readable = error.message?.replace(/^Validation failed:\s*/i, '') || '';
        userMessage = readable
          ? `Please check your details: ${readable}`
          : 'Please check the details you entered and try again.';
      } else if (msg.includes('insufficient') || msg.includes('balance')) {
        userMessage = 'Insufficient balance for this transfer.';
      }
      return NextResponse.json(
        { error: userMessage },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Transfer failed. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Get offramp payout status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('referenceId');

    if (!referenceId) {
      return NextResponse.json({ error: 'referenceId is required' }, { status: 400 });
    }

    // Get user's wallet to find transactions
    const { data: userWallet } = await supabase
      .from('wallet')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { data: transaction, error: txError } = await supabase
      .from('transaction')
      .select('*')
      .eq('wallet_id', userWallet.id)
      .like('metadata', `%"referenceId":"${referenceId}"%`)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const kotaniRef = transaction.metadata?.kotaniReferenceId || referenceId;
    const status = await kotaniPayService.getOfframpStatus(kotaniRef);

    return NextResponse.json({
      success: true,
      data: {
        referenceId,
        kotaniStatus: status.data,
        localTransaction: transaction,
      },
    });

  } catch (error: any) {
    console.error('[KOTANI PAY OFFRAMP STATUS] Error:', error);

    if (error instanceof KotaniPayError) {
      return NextResponse.json(
        { error: error.message || 'Failed to get transaction status' },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to get transaction status' },
      { status: 500 }
    );
  }
}

function resolveKotaniWebhookUrl(request: NextRequest): string {
  const envUrl =
    process.env.KOTANI_PAY_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    new URL(request.url).origin;

  const base = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  if (base.includes('/api/webhooks/kotani-pay')) return base;
  return `${base}/api/webhooks/kotani-pay`;
}
