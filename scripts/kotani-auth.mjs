/**
 * Kotani Pay v3 - Post-Login Configuration
 * Run AFTER clicking the magic link from email.
 *
 * Usage: node scripts/kotani-auth.mjs <jwt_token> [sandbox|production]
 */

const SANDBOX_BASE = 'https://sandbox-api.kotanipay.com/api/v3';
const PROD_BASE = 'https://api.kotanipay.com/api/v3';
const WEBHOOK_URL = 'https://app.pesafi.ai/api/webhooks/kotani-pay';

async function req(url, method = 'GET', body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log(`\n→ ${method} ${url}`);
  if (body) console.log('  Body:', JSON.stringify(body));

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    console.log(`  Status: ${res.status}`);
    console.log('  Response:', JSON.stringify(data, null, 2));
    return { status: res.status, data, ok: res.ok };
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return { status: 0, data: null, ok: false };
  }
}

const token = process.argv[2];
const env = process.argv[3] || 'sandbox';
const BASE = env === 'production' ? PROD_BASE : SANDBOX_BASE;

if (!token) {
  console.log('Usage: node scripts/kotani-auth.mjs <jwt_token> [sandbox|production]');
  console.log('');
  console.log('Steps:');
  console.log('1. Run: node scripts/kotani-setup.mjs');
  console.log('2. Check email for magic link from Kotani Pay');
  console.log('3. Click the link → copy the token from the URL/page');
  console.log('4. Run this script with that token');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════╗');
console.log('║  Kotani Pay v3 - Auth & Configuration      ║');
console.log('╚════════════════════════════════════════════╝');
console.log(`Environment: ${env.toUpperCase()}`);
console.log(`Base URL: ${BASE}`);
console.log(`Token: ${token.substring(0, 30)}...`);

// 1. Integrator details
console.log('\n\n=== 1. Integrator Details ===');
const integrator = await req(`${BASE}/integrator`, 'GET', undefined, token);

// 2. Generate API key
console.log('\n\n=== 2. Generate API Key ===');
const apiKey = await req(`${BASE}/auth/api-key/secure`, 'GET', undefined, token);

if (apiKey.ok && apiKey.data?.data) {
  console.log('\n  ★★★ SAVE THIS API KEY ★★★');
  console.log('  Add to .env.local:');
  const key = apiKey.data.data.api_key || apiKey.data.data.apiKey || apiKey.data.data;
  console.log(`  KOTANI_PAY_API_KEY="${typeof key === 'string' ? key : JSON.stringify(key)}"`);
}

// 3. Configure webhook
console.log('\n\n=== 3. Configure Webhook ===');
await req(`${BASE}/integrator/webhook`, 'PATCH', {
  webhook_url: WEBHOOK_URL,
  // Optional: set webhook_secret too (recommended). Keep unset here so you can
  // manage it via .env.local / dashboard without printing it in logs.
  webhook_events: [
    'transaction.deposit.status.updated',
    'transaction.withdrawal.status.updated',
    'transaction.onramp.status.updated',
    'transaction.offramp.status.updated',
    'payment.confirmed',
    'kyc.status.changed',
  ],
}, token);

// 4. Create fiat wallets
console.log('\n\n=== 4. Create Fiat Wallets ===');
const fiatWallets = [
  { currency: 'KES', country: 'KE', wallet_name: 'PesaFi KES' },
  { currency: 'UGX', country: 'UG', wallet_name: 'PesaFi UGX' },
  { currency: 'TZS', country: 'TZ', wallet_name: 'PesaFi TZS' },
  { currency: 'GHS', country: 'GH', wallet_name: 'PesaFi GHS' },
  { currency: 'NGN', country: 'NG', wallet_name: 'PesaFi NGN' },
];

for (const w of fiatWallets) {
  await req(`${BASE}/wallet/fiat`, 'POST', w, token);
}

// 5. Create crypto wallet
console.log('\n\n=== 5. Create Crypto Wallet ===');
await req(`${BASE}/wallet/crypto`, 'POST', {
  chain: 'BASE',
  coin: 'USDC',
  wallet_name: 'PesaFi Base USDC',
}, token);

// 6. List all wallets
console.log('\n\n=== 6. All Wallets ===');
const fiatList = await req(`${BASE}/wallet/fiat`, 'GET', undefined, token);
const cryptoList = await req(`${BASE}/wallet/crypto`, 'GET', undefined, token);

// 7. Test exchange rates
console.log('\n\n=== 7. Exchange Rates ===');
await req(`${BASE}/rate/USD/KES`, 'GET', undefined, token);

// 8. Test onramp/offramp rates
console.log('\n\n=== 8. Onramp/Offramp Rates ===');
await req(`${BASE}/rate/onramp`, 'POST', {
  amount: 10, currency: 'KES', chain: 'BASE', token: 'USDC',
}, token);
await req(`${BASE}/rate/offramp`, 'POST', {
  amount: 10, currency: 'KES', chain: 'BASE', token: 'USDC',
}, token);

// 9. Country support
console.log('\n\n=== 9. Country Support ===');
await req(`${BASE}/country`, 'GET', undefined, token);
await req(`${BASE}/country/networks`, 'GET', undefined, token);

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('CONFIGURATION SUMMARY');
console.log('='.repeat(60));
console.log('\nAdd these to your .env.local:\n');
console.log(`KOTANI_PAY_BASE_URL=${BASE}`);
console.log(`KOTANI_PAY_ENVIRONMENT=${env}`);
if (apiKey.ok) {
  console.log(`KOTANI_PAY_API_KEY=<the api key printed above>`);
}
console.log(`KOTANI_PAY_JWT_TOKEN=${token}`);
console.log(`KOTANI_PAY_WEBHOOK_URL=${WEBHOOK_URL}`);
console.log(`KOTANI_PAY_WEBHOOK_SECRET=<generate a secret and set it>`);
console.log('\n' + '='.repeat(60));
