// Kotani Pay v3 API integration for on-ramp/off-ramp operations
// Documentation: https://developers.kotanipay.com/v3

export interface KotaniPayConfig {
  apiKey: string;
  // Kotani issues both an API key and a secret key in the dashboard.
  // v3 transactional endpoints use Bearer auth; we keep the secret for future use.
  secretKey?: string;
  // Optional shared secret for our own egress proxy (static IP).
  // Only sent when KOTANI_PAY_BASE_URL points to a non-kotanipay host.
  proxySecret?: string;
  jwtToken: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
}

// --- Customer Types ---

export interface CreateMobileMoneyCustomerRequest {
  phone_number: string;
  country_code: string;
  network?: string;
  account_name?: string;
}

export interface MobileMoneyCustomer {
  customer_key: string;
  phone_number: string;
  country_code: string;
  network?: string;
  account_name?: string;
}

// --- Request Types ---

export interface DepositMobileMoneyRequest {
  customer_key: string;
  amount: number;
  wallet_id: string;
  reference_id?: string;
  currency?: string;
  callback_url?: string;
}

export interface DepositCryptoBridgeRequest {
  fiat_amount: number;
  source_currency: string;
  destination_chain: string;
  destination_asset: string;
  rate_id: string;
  reference_id?: string;
}

export interface WithdrawMobileMoneyRequest {
  customer_key: string;
  amount: number;
  walletId: string;
  referenceId?: string;
  currency?: string;
  callbackUrl?: string;
}

// --- Response Types ---

export interface KotaniPayResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error_code?: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  value: string;
}

export interface CryptoBridgeRate {
  rate_id: string;
  rate: number;
  expires_at: string;
}

// --- v3 (OpenAPI-aligned) request/response types ---

export interface KotaniOnchainRateResponse {
  from: string;
  to: string;
  value: string;
  id: string; // rateId
  fiatAmount: number;
  cryptoAmount: number;
  transactionAmount: number;
  fee: number;
}

export interface KotaniOnrampRequestV3 {
  fiatAmount: number;
  currency: string;
  chain: string;
  token: string;
  receiverAddress: string;
  referenceId: string;
  callbackUrl: string;
  rateId?: string;
  fiatWalletId?: string;
  mobileMoney?: {
    phoneNumber: string;
    accountName: string;
    providerNetwork: string;
  };
  bankCheckout?: {
    fullName: string;
    phoneNumber: string;
    paymentMethod: 'CARD' | 'PAYBYBANK' | string;
  };
}

export interface KotaniOnrampCreateData {
  id: string;
  referenceId: string;
  referenceNumber: number;
  message: string;
  customerKey: string;
  redirectUrl?: string;
}

export interface KotaniOnrampStatusData {
  referenceId: string;
  depositStatus: string;
  onchainStatus: string;
  transactionHash?: string;
  rate: any;
  fiatAmount: number;
  cryptoAmount: number;
  error?: any;
}

export interface KotaniOfframpRequestV3 {
  cryptoAmount: number;
  currency: string;
  chain: string;
  token: string;
  referenceId: string;
  callbackUrl?: string;
  senderAddress?: string;
  rateId?: string;
  mobileMoneyReceiver?: {
    phoneNumber: string;
    accountName: string;
    networkProvider: string;
  };
  bankReceiver?: {
    name: string;
    address: string;
    phoneNumber: string;
    bankCode: number;
    accountNumber: string;
    country: string;
  };
}

export interface KotaniOfframpData {
  referenceId: string;
  fiatAmount: number;
  fiatTransactionAmount: number;
  cryptoAmount: number;
  fiatCurrency: string;
  customerKey: string;
  fiatWalletId: string;
  senderAddress: string;
  transactionHash: string;
  transactionHashAmount: number;
  status: string;
  onchainStatus: string;
  rate: any;
  escrowAddress: string;
  usingIntegratedWallet?: boolean;
  created_at?: string;
  updated_at?: string;
}


export class KotaniPayService {
  private config: KotaniPayConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    const env = (process.env.KOTANI_PAY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
    const proxyUrl = process.env.KOTANI_PAY_PROXY_URL || '';
    const baseUrlFromProxy = (() => {
      if (!proxyUrl) return '';
      const trimmed = proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
      // Allow user to set either "https://host" or "https://host/api/v3"
      return trimmed.includes('/api/v3') ? trimmed : `${trimmed}/api/v3`;
    })();

    this.config = {
      apiKey: process.env.KOTANI_PAY_API_KEY || '',
      secretKey: process.env.KOTANI_PAY_SECRET_KEY || '',
      proxySecret: process.env.KOTANI_PAY_PROXY_SECRET || process.env.KOTANI_PROXY_SHARED_SECRET || '',
      jwtToken: process.env.KOTANI_PAY_JWT_TOKEN || '',
      baseUrl: process.env.KOTANI_PAY_BASE_URL || baseUrlFromProxy || (
        env === 'production'
          ? 'https://api.kotanipay.com/api/v3'
          : 'https://sandbox-api.kotanipay.com/api/v3'
      ),
      environment: env,
    };
  }

  /**
   * Get authentication headers.
   * Priority: API key (for transactional endpoints) > JWT token (for admin endpoints)
   */
  private getAuthHeaders(): Record<string, string> {
    // Most endpoints accept the API key; some admin endpoints require a JWT.
    const token = this.config.apiKey || this.config.jwtToken || this.accessToken;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // If we're routing via our own proxy (non-kotanipay base URL), attach shared secret.
    try {
      const host = new URL(this.config.baseUrl).host;
      const isKotaniHost = host.endsWith('kotanipay.com');
      if (!isKotaniHost && this.config.proxySecret) {
        headers['X-Pesafi-Proxy-Secret'] = this.config.proxySecret;
        // Let the proxy route to sandbox/prod without changing the base URL.
        headers['X-Pesafi-Proxy-Target-Env'] = this.config.environment;
      }
    } catch {
      // Ignore URL parse errors; don't block requests.
    }

    return headers;
  }

  /**
   * Login via magic link (sends email, returns after user clicks)
   */
  async login(email: string): Promise<KotaniPayResponse> {
    return this.makeRequest('/auth/login', 'POST', { email });
  }

  /**
   * Set the access token (after magic link auth)
   */
  setAccessToken(token: string, expiresInMs: number = 3600000) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + expiresInMs;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<KotaniPayResponse> {
    const result = await this.makeRequest<KotaniPayResponse>('/auth/refresh-token', 'GET');
    if (result.success && result.data?.access_token) {
      this.setAccessToken(result.data.access_token);
    }
    return result;
  }

  /**
   * Generate API key for transaction authorization
   */
  async generateApiKey(): Promise<KotaniPayResponse> {
    return this.makeRequest('/auth/api-key/secure', 'GET');
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' = 'GET',
    body?: any
  ): Promise<T> {
    const headers = this.getAuthHeaders();
    const url = `${this.config.baseUrl}${endpoint}`;

    console.log(`[KOTANI PAY] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[KOTANI PAY] API Error:', {
        status: response.status,
        data,
      });
      throw new KotaniPayError(
        data.message || `API request failed: ${response.statusText}`,
        response.status,
        data.error_code,
        data.data?.errors,
      );
    }

    return data as T;
  }

  // --- Customer Management ---

  /**
   * Create a mobile money customer.
   * Required before deposit/withdraw — returns customer_key.
   */
  async createMobileMoneyCustomer(request: CreateMobileMoneyCustomerRequest): Promise<KotaniPayResponse<MobileMoneyCustomer>> {
    console.log('[KOTANI PAY] Creating mobile money customer:', {
      phone: request.phone_number,
      country: request.country_code,
    });
    return this.makeRequest('/customer/mobile-money', 'POST', request);
  }

  /**
   * Get a mobile money customer by phone number.
   */
  async getMobileMoneyCustomerByPhone(phone: string): Promise<KotaniPayResponse<MobileMoneyCustomer>> {
    return this.makeRequest(`/customer/mobile-money/phone/${encodeURIComponent(phone)}`, 'GET');
  }

  /**
   * Get or create a mobile money customer.
   * Tries to fetch existing customer first, creates if not found.
   */
  async getOrCreateCustomer(
    phone: string,
    countryCode: string,
    network?: string,
    accountName?: string,
  ): Promise<MobileMoneyCustomer> {
    try {
      const existing = await this.getMobileMoneyCustomerByPhone(phone);
      if (existing.success && existing.data?.customer_key) {
        return existing.data;
      }
    } catch (error: any) {
      if (error.statusCode !== 404) {
        console.warn('[KOTANI PAY] Customer lookup failed, will try to create:', error.message);
      }
    }

    const created = await this.createMobileMoneyCustomer({
      phone_number: phone,
      country_code: countryCode,
      network,
      account_name: accountName,
    });

    if (!created.success || !created.data?.customer_key) {
      throw new KotaniPayError(
        created.message || 'Failed to create customer',
        400,
      );
    }

    return created.data;
  }

  // --- Deposit Endpoints ---

  /**
   * Initiate mobile money deposit (STK push).
   * Requires customer_key (from getOrCreateCustomer).
   */
  async depositMobileMoney(request: DepositMobileMoneyRequest): Promise<KotaniPayResponse> {
    console.log('[KOTANI PAY] Initiating mobile money deposit:', {
      amount: request.amount,
      customer_key: request.customer_key,
    });

    return this.makeRequest('/deposit/mobile-money', 'POST', {
      customer_key: request.customer_key,
      amount: request.amount,
      wallet_id: request.wallet_id,
      reference_id: request.reference_id || `pesafi_dep_${Date.now()}`,
      ...(request.currency && { currency: request.currency }),
      ...(request.callback_url && { callback_url: request.callback_url }),
    });
  }

  /**
   * Get deposit status
   */
  async getDepositStatus(referenceId: string): Promise<KotaniPayResponse> {
    return this.makeRequest(`/deposit/mobile-money/status/${referenceId}`, 'GET');
  }

  /**
   * Get crypto bridge rate quote (valid 60 seconds, one-use)
   */
  async getCryptoBridgeRate(params: {
    // OpenAPI (v3): source_currency, source_amount, crypto_chain, crypto_token
    source_currency?: string;
    source_amount?: number;
    crypto_chain?: string;
    crypto_token?: string;
    // Legacy aliases used in earlier internal drafts
    fiat_amount?: number;
    fiat_currency?: string;
    destination_chain?: string;
    destination_asset?: string;
  }): Promise<KotaniPayResponse<any>> {
    return this.makeRequest('/rate/crypto-bridge', 'POST', {
      source_currency: params.source_currency || params.fiat_currency,
      source_amount: params.source_amount ?? params.fiat_amount,
      crypto_chain: params.crypto_chain || params.destination_chain,
      crypto_token: params.crypto_token || params.destination_asset,
    });
  }

  /**
   * Initiate crypto bridge deposit
   * Fiat collection → Crypto payment → Settlement on-chain
   */
  async depositCryptoBridge(request: DepositCryptoBridgeRequest): Promise<KotaniPayResponse> {
    console.log('[KOTANI PAY] Initiating crypto bridge deposit:', {
      amount: request.fiat_amount,
      currency: request.source_currency,
      chain: request.destination_chain,
      asset: request.destination_asset,
    });

    return this.makeRequest('/deposit/crypto-bridge', 'POST', {
      fiat_amount: request.fiat_amount,
      source_currency: request.source_currency,
      destination_chain: request.destination_chain,
      destination_asset: request.destination_asset,
      rate_id: request.rate_id,
      reference_id: request.reference_id || `pesafi_bridge_${Date.now()}`,
    });
  }

  /**
   * Get crypto bridge deposit status
   */
  async getCryptoBridgeStatus(kotaniReferenceId: string): Promise<KotaniPayResponse> {
    return this.makeRequest(`/deposit/crypto-bridge/status/${kotaniReferenceId}`, 'GET');
  }

  // --- Withdrawal Endpoints ---

  /**
   * Initiate mobile money withdrawal.
   * v3 path: POST /withdraw/mobile-money
   * Note: uses camelCase fields (walletId, referenceId, callbackUrl).
   */
  async withdrawMobileMoney(request: WithdrawMobileMoneyRequest): Promise<KotaniPayResponse> {
    console.log('[KOTANI PAY] Initiating mobile money withdrawal:', {
      amount: request.amount,
      customer_key: request.customer_key,
    });

    return this.makeRequest('/withdraw/mobile-money', 'POST', {
      customer_key: request.customer_key,
      amount: request.amount,
      walletId: request.walletId,
      ...(request.referenceId && { referenceId: request.referenceId }),
      ...(request.currency && { currency: request.currency }),
      ...(request.callbackUrl && { callbackUrl: request.callbackUrl }),
    });
  }

  /**
   * Get withdrawal/payout status
   */
  async getPayoutStatus(referenceId: string): Promise<KotaniPayResponse> {
    return this.makeRequest(`/withdraw/mobile-money/status/${referenceId}`, 'GET');
  }

  // --- Rate Endpoints ---

  /**
   * Get all exchange rates
   */
  async getExchangeRates(): Promise<KotaniPayResponse<ExchangeRate[]>> {
    return this.makeRequest('/rate', 'GET');
  }

  /**
   * Get specific exchange rate
   */
  async getExchangeRate(from: string, to: string): Promise<KotaniPayResponse<ExchangeRate>> {
    return this.makeRequest(`/rate/${from}/${to}`, 'GET');
  }

  /**
   * Get public exchange rates (no auth required)
   */
  async getPublicRates(): Promise<KotaniPayResponse<ExchangeRate[]>> {
    const baseWithoutV3 = this.config.baseUrl.replace('/api/v3', '');
    const url = `${baseWithoutV3}/api/v3/public/rate`;

    // If baseUrl points to our proxy, it still requires the proxy secret header.
    const response = await fetch(url, { headers: this.getAuthHeaders() });
    return response.json();
  }

  /**
   * Get public exchange rate for a specific pair (no auth required)
   */
  async getPublicRate(from: string, to: string): Promise<KotaniPayResponse<ExchangeRate>> {
    const baseWithoutV3 = this.config.baseUrl.replace('/api/v3', '');
    const url = `${baseWithoutV3}/api/v3/public/rate/${from}/${to}`;

    const response = await fetch(url, { headers: this.getAuthHeaders() });
    return response.json();
  }

  /**
   * Get onramp pricing (fiat to crypto)
   */
  async getOnrampPricing(params: {
    amount: number;
    token: string;
    currency: string;
    chain?: string;
  }): Promise<KotaniPayResponse<KotaniOnchainRateResponse>> {
    // OpenAPI: { from, to, fiatAmount }
    return this.makeRequest('/rate/onramp', 'POST', {
      from: params.currency,
      to: params.token,
      fiatAmount: params.amount,
    });
  }

  /**
   * Get offramp pricing (crypto to fiat)
   */
  async getOfframpPricing(params: {
    amount: number;
    currency: string;
    token: string;
    chain?: string;
  }): Promise<KotaniPayResponse<KotaniOnchainRateResponse>> {
    // OpenAPI: { from, to, cryptoAmount }
    return this.makeRequest('/rate/offramp', 'POST', {
      from: params.token,
      to: params.currency,
      cryptoAmount: params.amount,
    });
  }

  // --- Onramp / Offramp (v3) ---

  /**
   * Create an onramp request (fiat -> crypto) using mobile money or bank checkout.
   * OpenAPI: POST /api/v3/onramp
   */
  async createOnramp(request: KotaniOnrampRequestV3): Promise<KotaniPayResponse<KotaniOnrampCreateData>> {
    return this.makeRequest('/onramp', 'POST', request);
  }

  /**
   * Get onramp status by referenceId.
   * OpenAPI: GET /api/v3/onramp/{referenceId}
   */
  async getOnrampStatus(referenceId: string): Promise<KotaniPayResponse<KotaniOnrampStatusData>> {
    return this.makeRequest(`/onramp/${encodeURIComponent(referenceId)}`, 'GET');
  }

  /**
   * Create an offramp request (crypto -> fiat) to mobile money or bank.
   * OpenAPI: POST /api/v3/offramp
   */
  async createOfframp(request: KotaniOfframpRequestV3): Promise<KotaniPayResponse<KotaniOfframpData>> {
    return this.makeRequest('/offramp', 'POST', request);
  }

  /**
   * Get offramp status by referenceId.
   * OpenAPI: GET /api/v3/offramp/{referenceId}
   */
  async getOfframpStatus(referenceId: string): Promise<KotaniPayResponse<KotaniOfframpData>> {
    return this.makeRequest(`/offramp/${encodeURIComponent(referenceId)}`, 'GET');
  }

  // --- Wallet Endpoints ---

  /**
   * Create a fiat wallet
   */
  async createFiatWallet(params: {
    currency: string;
    country: string;
    // Kotani v3 uses `name`; keep `wallet_name` for backward compatibility.
    name?: string;
    wallet_name?: string;
  }): Promise<KotaniPayResponse> {
    const name = params.name || params.wallet_name || `${params.currency} Wallet`;
    return this.makeRequest('/wallet/fiat', 'POST', {
      name,
      currency: params.currency,
      country: params.country,
    });
  }

  /**
   * Get all fiat wallets
   */
  async getFiatWallets(): Promise<KotaniPayResponse> {
    return this.makeRequest('/wallet/fiat', 'GET');
  }

  /**
   * Get fiat wallet by currency and country
   */
  async getFiatWalletByCurrency(currency: string, country: string): Promise<KotaniPayResponse> {
    return this.makeRequest(`/wallet/fiat/currency/${currency}?country=${country}`, 'GET');
  }

  /**
   * Create a crypto wallet
   */
  async createCryptoWallet(params: {
    chain: string;
    // Kotani v3 requires `name` and `chain`. Keep legacy fields for compatibility.
    name?: string;
    wallet_name?: string;
    coin?: string;
    public_address?: string;
  }): Promise<KotaniPayResponse> {
    const name = params.name || params.wallet_name || `${params.chain} Wallet`;
    return this.makeRequest('/wallet/crypto', 'POST', {
      name,
      chain: params.chain,
    });
  }

  /**
   * Get all crypto wallets
   */
  async getCryptoWallets(): Promise<KotaniPayResponse> {
    return this.makeRequest('/wallet/crypto', 'GET');
  }

  // --- Integrator Endpoints ---

  /**
   * Get integrator account details
   */
  async getIntegratorDetails(): Promise<KotaniPayResponse> {
    return this.makeRequest('/integrator', 'GET');
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(params: {
    webhook_url: string;
    webhook_secret?: string;
    webhook_events?: string[];
  }): Promise<KotaniPayResponse> {
    return this.makeRequest('/integrator/webhook', 'PATCH', params);
  }

  // --- Country Support ---

  /**
   * Get supported countries
   */
  async getSupportedCountries(): Promise<KotaniPayResponse> {
    // v3 OpenAPI: GET /customer/support/countries
    return this.makeRequest('/customer/support/countries', 'GET');
  }

  /**
   * Get supported mobile money networks
   */
  async getSupportedNetworks(params?: { countryCode?: string }): Promise<KotaniPayResponse> {
    // v3 OpenAPI: GET /customer/support/networks/{countryCode}
    // We default to KE to keep older callers working.
    const countryCode = params?.countryCode || 'KE';
    return this.makeRequest(`/customer/support/networks/${encodeURIComponent(countryCode)}`, 'GET');
  }

  /**
   * Get supported banks
   */
  async getSupportedBanks(): Promise<KotaniPayResponse> {
    // v3 OpenAPI: GET /customer/support/banks
    return this.makeRequest('/customer/support/banks', 'GET');
  }

  // --- Fiat wallet lookup (for collection mode) ---

  private fiatWalletCache: { data: any[] | null; fetchedAt: number } = { data: null, fetchedAt: 0 };

  /**
   * Get the Kotani fiat wallet ID for a given currency.
   * Caches wallet list for 5 minutes.
   */
  async getFiatWalletForCurrency(currency: string): Promise<{ id: string; balance: number } | null> {
    const CACHE_TTL = 5 * 60 * 1000;
    if (!this.fiatWalletCache.data || Date.now() - this.fiatWalletCache.fetchedAt > CACHE_TTL) {
      const res = await this.getFiatWallets();
      this.fiatWalletCache = { data: res.data || [], fetchedAt: Date.now() };
    }

    const wallets = this.fiatWalletCache.data || [];
    const wallet = wallets.find((w: any) => w.currency === currency && w.status === 'active');
    if (!wallet) return null;
    return { id: wallet.id || wallet._id, balance: wallet.balance || 0 };
  }

  // --- Static helpers (kept for backward compatibility) ---

  getSupportedProviders(): Array<{
    name: string;
    code: string;
    country: string;
    currency: string;
  }> {
    return [
      { name: 'M-Pesa', code: 'MPESA', country: 'Kenya', currency: 'KES' },
      { name: 'MTN Mobile Money', code: 'MTN', country: 'Ghana/Uganda', currency: 'GHS/UGX' },
      { name: 'Airtel Money', code: 'AIRTEL', country: 'Uganda/Tanzania', currency: 'UGX/TZS' },
      { name: 'Vodafone Cash', code: 'VODAFONE', country: 'Ghana', currency: 'GHS' },
    ];
  }

  getSupportedCurrencies(): string[] {
    return ['KES', 'GHS', 'TZS', 'UGX', 'SSP', 'ZMW', 'XAF', 'CDF', 'RWF', 'ETB', 'ZAR', 'NGN', 'XOF', 'SLE', 'MWK', 'EGP', 'MZN'];
  }

  getSupportedChains(): string[] {
    return ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'CELO'];
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey || this.config.jwtToken);
  }

  getConfigStatus(): {
    configured: boolean;
    environment: string;
    hasApiKey: boolean;
    hasJwtToken: boolean;
    hasProxySecret: boolean;
    usingProxy: boolean;
    apiKeyLength: number;
    apiKeyHasQuotes: boolean;
    apiKeyHasWhitespace: boolean;
    baseUrl: string;
  } {
    const apiKeyRaw = this.config.apiKey || '';
    let usingProxy = false;
    try {
      usingProxy = !new URL(this.config.baseUrl).host.endsWith('kotanipay.com');
    } catch {
      usingProxy = false;
    }
    return {
      configured: this.isConfigured(),
      environment: this.config.environment,
      hasApiKey: !!this.config.apiKey,
      hasJwtToken: !!this.config.jwtToken,
      hasProxySecret: !!this.config.proxySecret,
      usingProxy,
      apiKeyLength: apiKeyRaw.length,
      apiKeyHasQuotes: apiKeyRaw.includes('"') || apiKeyRaw.includes("'"),
      apiKeyHasWhitespace: /\s/.test(apiKeyRaw),
      baseUrl: this.config.baseUrl,
    };
  }

  /**
   * Health check via public rates endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      const rates = await this.getPublicRates();
      return rates.success;
    } catch {
      return false;
    }
  }
}

/**
 * Custom error class for Kotani Pay API errors
 */
export class KotaniPayError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: number,
    public validationErrors?: string[],
  ) {
    super(message);
    this.name = 'KotaniPayError';
  }
}

// --- Phone / Country / Currency helpers (for collection flow) ---

const PHONE_PREFIX_TO_COUNTRY: Record<string, string> = {
  '+254': 'KE', '+256': 'UG', '+255': 'TZ', '+233': 'GH',
  '+234': 'NG', '+27': 'ZA', '+250': 'RW', '+243': 'CD',
  '+251': 'ET', '+260': 'ZM', '+237': 'CM', '+221': 'SN',
  '+225': 'CI', '+20': 'EG', '+258': 'MZ', '+265': 'MW',
  '+266': 'LS', '+224': 'GN', '+211': 'SS',
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  KE: 'KES', UG: 'UGX', TZ: 'TZS', GH: 'GHS', NG: 'NGN',
  ZA: 'ZAR', RW: 'RWF', CD: 'CDF', ET: 'ETB', ZM: 'ZMW',
  CM: 'XAF', SN: 'XOF', CI: 'XOF', EG: 'EGP', MZ: 'MZN',
  MW: 'MWK', LS: 'LSL', GN: 'GNF', SS: 'SSP',
};

/**
 * Derive country code from phone number prefix.
 * Returns 'KE' as default if prefix is unrecognized.
 */
export function phoneToCountryCode(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  // Try longest prefix first (+254 before +2)
  for (const prefix of Object.keys(PHONE_PREFIX_TO_COUNTRY).sort((a, b) => b.length - a.length)) {
    if (cleaned.startsWith(prefix)) return PHONE_PREFIX_TO_COUNTRY[prefix];
  }
  return 'KE';
}

/**
 * Get the default fiat currency for a country code.
 */
export function countryToCurrency(country: string): string {
  return COUNTRY_TO_CURRENCY[country] || 'KES';
}

/**
 * Infer the likely mobile money network from phone prefix.
 */
export function inferProviderNetwork(phone: string): string {
  const country = phoneToCountryCode(phone);
  switch (country) {
    case 'KE': return 'MPESA';
    case 'TZ': return 'MPESA';
    case 'UG': return 'MTN';
    case 'GH': return 'MTN';
    case 'SS': return 'MTN';
    default: return 'MPESA';
  }
}

// Export singleton instance
export const kotaniPayService = new KotaniPayService();
