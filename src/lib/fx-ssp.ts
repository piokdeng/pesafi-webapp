/**
 * South Sudan SSP → USD (USDC) FX helpers for KermaPay.
 * Rates are illustrative until wired to a live feed / treasury pricing.
 */

export const SSP_FX_CONFIG = {
  midMarketSspPerUsd: 6200,
  spreadOverMid: 0.175,
  market: 'South Sudan',
  quoteCcy: 'SSP',
  targetCcy: 'USD',
} as const;

export function kermapaySspPerUsd(): number {
  return SSP_FX_CONFIG.midMarketSspPerUsd * (1 + SSP_FX_CONFIG.spreadOverMid);
}

export function sspToUsd(ssp: number): number {
  if (!Number.isFinite(ssp) || ssp <= 0) return 0;
  return ssp / kermapaySspPerUsd();
}

export function usdToSsp(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return usd * kermapaySspPerUsd();
}

export function getPublicFxQuote() {
  const kp = kermapaySspPerUsd();
  const mid = SSP_FX_CONFIG.midMarketSspPerUsd;
  return {
    market: SSP_FX_CONFIG.market,
    midMarketSspPerUsd: mid,
    kermapaySspPerUsd: Math.round(kp),
    spreadOverMidPercent: Math.round(SSP_FX_CONFIG.spreadOverMid * 100),
    updatedAt: new Date().toISOString(),
    disclaimer:
      'Illustrative KermaPay rate for demonstration. The rate at settlement may differ based on liquidity and volatility.',
  };
}
