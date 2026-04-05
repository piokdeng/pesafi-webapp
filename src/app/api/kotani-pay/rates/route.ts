import { NextRequest, NextResponse } from 'next/server';
import { KotaniPayError, kotaniPayService } from '@/lib/kotani-pay';

/**
 * Kotani Pay Exchange Rates API Route - v3
 * Get real-time exchange rates for crypto ↔ fiat conversions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'onramp', 'offramp', 'pair', or 'all'
    const amount = searchParams.get('amount');
    const chain = searchParams.get('chain') || 'BASE';
    const token = searchParams.get('token') || 'USDC';
    const currency = searchParams.get('currency') || 'KES';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Specific currency pair
    if (type === 'pair' && from && to) {
      const rate = await kotaniPayService.getPublicRate(from, to);
      return NextResponse.json({ success: true, data: rate.data });
    }

    // Onramp pricing
    if (type === 'onramp') {
      if (!amount) {
        return NextResponse.json({ error: 'Amount is required for onramp pricing' }, { status: 400 });
      }
      const pricing = await kotaniPayService.getOnrampPricing({
        amount: parseFloat(amount), chain, token, currency,
      });
      return NextResponse.json({ success: true, type: 'onramp', data: pricing.data });
    }

    // Offramp pricing
    if (type === 'offramp') {
      if (!amount) {
        return NextResponse.json({ error: 'Amount is required for offramp pricing' }, { status: 400 });
      }
      const pricing = await kotaniPayService.getOfframpPricing({
        amount: parseFloat(amount), currency, chain, token,
      });
      return NextResponse.json({ success: true, type: 'offramp', data: pricing.data });
    }

    // Default: return all public rates (no auth needed)
    const rates = await kotaniPayService.getPublicRates();
    return NextResponse.json({ success: true, data: rates.data });

  } catch (error: any) {
    console.error('[KOTANI PAY RATES] Error:', error);
    if (error instanceof KotaniPayError) {
      return NextResponse.json(
        { error: error.message || 'Failed to get exchange rates' },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to get exchange rates' },
      { status: 500 }
    );
  }
}

/**
 * Get supported providers, currencies, chains, config, or health status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'providers') {
      // Try to get from API first, fallback to static
      try {
        const networks = await kotaniPayService.getSupportedNetworks({ countryCode: 'KE' });
        return NextResponse.json({ success: true, data: networks.data });
      } catch {
        return NextResponse.json({ success: true, data: kotaniPayService.getSupportedProviders() });
      }
    }

    if (action === 'currencies') {
      return NextResponse.json({ success: true, data: kotaniPayService.getSupportedCurrencies() });
    }

    if (action === 'chains') {
      return NextResponse.json({ success: true, data: kotaniPayService.getSupportedChains() });
    }

    if (action === 'countries') {
      const countries = await kotaniPayService.getSupportedCountries();
      return NextResponse.json({ success: true, data: countries.data });
    }

    if (action === 'banks') {
      const banks = await kotaniPayService.getSupportedBanks();
      return NextResponse.json({ success: true, data: banks.data });
    }

    if (action === 'integrator') {
      const integrator = await kotaniPayService.getIntegratorDetails();
      return NextResponse.json({ success: true, data: integrator.data });
    }

    if (action === 'config') {
      const config = kotaniPayService.getConfigStatus();
      return NextResponse.json({ success: true, data: config });
    }

    if (action === 'health') {
      const isHealthy = await kotaniPayService.healthCheck();
      return NextResponse.json({
        success: isHealthy,
        data: {
          status: isHealthy ? 'operational' : 'down',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      error: 'Invalid action. Must be "providers", "currencies", "chains", "countries", "banks", "config", or "health"'
    }, { status: 400 });

  } catch (error: any) {
    console.error('[KOTANI PAY RATES POST] Error:', error);
    if (error instanceof KotaniPayError) {
      return NextResponse.json(
        { error: error.message || 'Request failed' },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Request failed' },
      { status: 500 }
    );
  }
}
