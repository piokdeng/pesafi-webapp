import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import {
  KotaniPayError,
  kotaniPayService,
  phoneToCountryCode,
  countryToCurrency,
} from '@/lib/kotani-pay';

/**
 * Kotani Pay Onramp (Deposit) API Route - v3
 *
 * Two modes:
 * 1) ONRAMP — Kotani collects fiat AND delivers crypto to receiverAddress.
 *    Used when onramp is enabled for the customer's country.
 *
 * 2) COLLECTION — Kotani only collects fiat (mobile money STK push) into
 *    KermaPay's Kotani fiat wallet. KermaPay then credits USDC internally
 *    from its own treasury. Used when onramp is NOT enabled for the country.
 *
 * The frontend doesn't need to know which mode — the backend auto-detects.
 * If createOnramp returns 403, we transparently fall back to collection.
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
      fiatAmount,
      amount, // legacy alias
      currency = 'KES',
      chain = 'BASE',
      token = 'USDC',
      phoneNumber,
      accountName,
      providerNetwork = 'MPESA',
      customerName,
      customerPhone,
    } = body;

    const resolvedFiatAmount = Number(fiatAmount ?? amount);
    const resolvedPhone = String(phoneNumber || customerPhone || '').trim();
    const resolvedAccountName = String(accountName || customerName || '').trim();

    if (!resolvedFiatAmount || resolvedFiatAmount <= 0) {
      return NextResponse.json({ error: 'Invalid fiatAmount' }, { status: 400 });
    }

    if (!resolvedPhone) {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });
    }

    if (!resolvedAccountName) {
      return NextResponse.json({ error: 'accountName is required' }, { status: 400 });
    }

    // Get user's wallet
    const { data: userWallet, error: walletError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !userWallet?.address) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const referenceId = `pesafi_onramp_${user.id}_${Date.now()}`;
    const callbackUrl = resolveKotaniWebhookUrl(request);

    // Quote rate (works for both onramp and collection modes)
    let rate: any = null;
    let rateId: string | undefined;
    let cryptoAmount: number | null = null;
    try {
      rate = await kotaniPayService.getOnrampPricing({
        amount: resolvedFiatAmount,
        currency,
        token,
        chain,
      });
      rateId = rate?.data?.id;
      const quoted = Number(rate?.data?.cryptoAmount);
      cryptoAmount = Number.isFinite(quoted) ? quoted : null;
    } catch {
      // Non-fatal; proceed without rate
    }

    // --- Try onramp first ---
    try {
      const response = await kotaniPayService.createOnramp({
        fiatAmount: resolvedFiatAmount,
        currency,
        chain,
        token,
        receiverAddress: userWallet.address,
        referenceId,
        callbackUrl,
        ...(rateId ? { rateId } : {}),
        mobileMoney: {
          phoneNumber: resolvedPhone,
          accountName: resolvedAccountName,
          providerNetwork,
        },
      });

      if (!response.success) {
        console.error('[KOTANI PAY ONRAMP] Request failed:', response.message);
        return NextResponse.json({ error: response.message || 'Onramp request failed' }, { status: 400 });
      }

      // Store onramp transaction
      const onrampTxId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { error: insertError } = await supabase
        .from('transaction')
        .insert({
          id: onrampTxId,
          wallet_id: userWallet.id,
          type: 'deposit',
          amount: (cryptoAmount ?? 0).toString(),
          usd_amount: (cryptoAmount ?? 0).toString(),
          currency: token,
          status: 'pending',
          category: 'kotani_pay',
          metadata: {
            mode: 'onramp',
            chain,
            token,
            fiat_currency: currency,
            fiatAmount: resolvedFiatAmount,
            phoneNumber: resolvedPhone,
            accountName: resolvedAccountName,
            providerNetwork,
            callbackUrl,
            rate: rate?.data,
            rateId,
            redirectUrl: response.data?.redirectUrl,
            kotaniReferenceId: response.data?.id,
            referenceId,
          },
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[KOTANI PAY ONRAMP] Failed to store transaction:', insertError);
      }

      return NextResponse.json({
        success: true,
        message: 'Onramp initiated successfully',
        data: {
          mode: 'onramp',
          kotaniId: response.data?.id,
          referenceId,
          fiatAmount: resolvedFiatAmount,
          fiatCurrency: currency,
          cryptoAmount,
          chain,
          token,
          rateId,
          redirectUrl: response.data?.redirectUrl,
          instructions: response.data?.redirectUrl
            ? 'Complete the payment using the redirectUrl (bank checkout)'
            : 'Check your phone for an STK push prompt and approve the payment',
        },
      });

    } catch (onrampError: any) {
      // If 403 "Service onramp is only available in: X", fall back to collection
      const isOnrampDisabled =
        onrampError instanceof KotaniPayError &&
        onrampError.statusCode === 403 &&
        onrampError.message?.includes('onramp');

      if (!isOnrampDisabled) throw onrampError;

      console.log('[KOTANI PAY] Onramp not available for this country, falling back to collection mode');
    }

    // --- Collection fallback ---
    return await handleCollection(supabase, user, userWallet, {
      fiatAmount: resolvedFiatAmount,
      currency,
      chain,
      token,
      phoneNumber: resolvedPhone,
      accountName: resolvedAccountName,
      providerNetwork,
      referenceId,
      callbackUrl,
      rate,
      rateId,
      cryptoAmount,
    });

  } catch (error: any) {
    console.error('[KOTANI PAY ONRAMP] Error:', error);

    if (error instanceof KotaniPayError) {
      let userMessage = 'Deposit failed. Please try again.';
      if (error.message?.toLowerCase().includes('transaction in progress')) {
        userMessage = 'You have a pending deposit. Please wait for it to complete before starting a new one.';
      }
      return NextResponse.json(
        { error: userMessage },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Deposit failed. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Collection mode: Collect fiat via mobile money, credit USDC internally.
 *
 * Flow:
 * 1. Get or create Kotani customer for this phone
 * 2. Find KermaPay's Kotani fiat wallet for the currency
 * 3. Call depositMobileMoney (triggers STK push)
 * 4. Webhook fires on completion → credits USDC to user's wallet
 */
async function handleCollection(
  supabase: any,
  user: any,
  userWallet: any,
  params: {
    fiatAmount: number;
    currency: string;
    chain: string;
    token: string;
    phoneNumber: string;
    accountName: string;
    providerNetwork: string;
    referenceId: string;
    callbackUrl: string;
    rate: any;
    rateId: string | undefined;
    cryptoAmount: number | null;
  }
) {
  const countryCode = phoneToCountryCode(params.phoneNumber);

  // The currency for collection should match what Kotani expects for this phone.
  // If user selected a currency that doesn't match their phone country, use phone's currency.
  const phoneCurrency = countryToCurrency(countryCode);
  const collectionCurrency = params.currency;

  // If the user's selected currency doesn't match phone country, re-quote
  let { cryptoAmount, rate, rateId } = params;
  if (collectionCurrency !== phoneCurrency) {
    try {
      rate = await kotaniPayService.getOnrampPricing({
        amount: params.fiatAmount,
        currency: collectionCurrency,
        token: params.token,
        chain: params.chain,
      });
      rateId = rate?.data?.id;
      const quoted = Number(rate?.data?.cryptoAmount);
      cryptoAmount = Number.isFinite(quoted) ? quoted : null;
    } catch {
      // Keep existing rate
    }
  }

  // 1. Get or create customer
  const customer = await kotaniPayService.getOrCreateCustomer(
    params.phoneNumber,
    countryCode,
    params.providerNetwork,
    params.accountName,
  );

  // 2. Find fiat wallet for this currency
  let fiatWallet = await kotaniPayService.getFiatWalletForCurrency(collectionCurrency);

  // Auto-create wallet if it doesn't exist
  if (!fiatWallet) {
    console.log(`[KOTANI PAY COLLECTION] No ${collectionCurrency} wallet found, creating one`);
    try {
      await kotaniPayService.createFiatWallet({
        currency: collectionCurrency,
        country: countryCode,
        name: `KermaPay ${collectionCurrency} Wallet`,
      });
      fiatWallet = await kotaniPayService.getFiatWalletForCurrency(collectionCurrency);
    } catch (e: any) {
      console.error('[KOTANI PAY COLLECTION] Failed to create fiat wallet:', e.message);
    }
  }

  if (!fiatWallet) {
    return NextResponse.json(
      { error: `No fiat wallet available for ${collectionCurrency}. Contact support.` },
      { status: 400 }
    );
  }

  // 3. Collect fiat via mobile money
  const collectionRef = params.referenceId.replace('_onramp_', '_collect_');
  const depositResponse = await kotaniPayService.depositMobileMoney({
    customer_key: customer.customer_key,
    amount: params.fiatAmount,
    wallet_id: fiatWallet.id,
    reference_id: collectionRef,
    currency: collectionCurrency,
    callback_url: params.callbackUrl,
  });

  if (!depositResponse.success) {
    console.error('[KOTANI PAY COLLECTION] Deposit failed:', depositResponse.message);
    return NextResponse.json(
      { error: depositResponse.message || 'Collection failed' },
      { status: 400 }
    );
  }

  // 4. Store collection transaction
  const collectTxId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const { error: insertError } = await supabase
    .from('transaction')
    .insert({
      id: collectTxId,
      wallet_id: userWallet.id,
      type: 'deposit',
      amount: (cryptoAmount ?? 0).toString(),
      usd_amount: (cryptoAmount ?? 0).toString(),
      currency: params.token,
      status: 'pending',
      category: 'kotani_pay',
      metadata: {
        mode: 'collection',
        chain: params.chain,
        token: params.token,
        fiat_currency: collectionCurrency,
        fiatAmount: params.fiatAmount,
        phoneNumber: params.phoneNumber,
        accountName: params.accountName,
        providerNetwork: params.providerNetwork,
        callbackUrl: params.callbackUrl,
        rate: rate?.data,
        rateId,
        customerKey: customer.customer_key,
        fiatWalletId: fiatWallet.id,
        countryCode,
        kotaniReferenceId: depositResponse.data?.id || depositResponse.data?.transaction_id,
        referenceId: collectionRef,
      },
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[KOTANI PAY COLLECTION] Failed to store transaction:', insertError);
  }

  return NextResponse.json({
    success: true,
    message: 'Payment collection initiated. Check your phone for the mobile money prompt.',
    data: {
      mode: 'collection',
      referenceId: collectionRef,
      fiatAmount: params.fiatAmount,
      fiatCurrency: collectionCurrency,
      cryptoAmount,
      chain: params.chain,
      token: params.token,
      rateId,
      instructions: 'Check your phone for an STK push / mobile money prompt and approve the payment',
    },
  });
}

/**
 * Get onramp deposit status
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
    const kotaniId = searchParams.get('kotaniId');

    if (!referenceId && !kotaniId) {
      return NextResponse.json({ error: 'referenceId or kotaniId is required' }, { status: 400 });
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

    let query = supabase
      .from('transaction')
      .select('*')
      .eq('wallet_id', userWallet.id)
      .limit(1);

    if (referenceId) query = query.like('metadata', `%"referenceId":"${referenceId}"%`);
    if (kotaniId) query = query.like('metadata', `%"kotaniReferenceId":"${kotaniId}"%`);

    const { data: transactions, error: txError } = await query;
    const transaction = Array.isArray(transactions) ? transactions[0] : transactions;

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Collection mode uses deposit status endpoint, onramp uses onramp status
    const isCollection = transaction.metadata?.mode === 'collection';
    const txRef = transaction.metadata?.referenceId;
    let status;
    try {
      status = isCollection
        ? await kotaniPayService.getDepositStatus(txRef)
        : await kotaniPayService.getOnrampStatus(txRef);
    } catch {
      status = { data: null };
    }

    return NextResponse.json({
      success: true,
      data: {
        referenceId: transaction.metadata?.referenceId,
        kotaniId: transaction.metadata?.kotaniReferenceId,
        mode: transaction.metadata?.mode || 'onramp',
        kotaniStatus: status.data,
        localTransaction: transaction,
      },
    });

  } catch (error: any) {
    console.error('[KOTANI PAY ONRAMP STATUS] Error:', error);

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
