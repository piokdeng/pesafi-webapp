/**
 * Kotani Pay v3 API Setup Script
 * Run: node scripts/kotani-setup.mjs
 */

const SANDBOX_BASE = 'https://sandbox-api.kotanipay.com/api/v3';
const PROD_BASE = 'https://api.kotanipay.com/api/v3';

const ACCOUNTS = [
  {
    email: 'jaffar@pesafi.ai',
    first_name: 'Jaffar',
    last_name: 'Keikei',
    phone: '+254700000000',
    organization: 'PesaFi',
    product_name: 'PesaFi',
  },
  {
    email: 'jaffarkeikei@gmail.com',
    first_name: 'Jaffar',
    last_name: 'Keikei',
    phone: '+254700000001',
    organization: 'PesaFi',
    product_name: 'PesaFi',
  },
];

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

async function testEnv(base, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label} - ${base}`);
  console.log('='.repeat(60));

  for (const account of ACCOUNTS) {
    console.log(`\n--- Create Integrator: ${account.email} ---`);
    const createResult = await req(`${base}/integrator`, 'POST', {
      email: account.email,
      first_name: account.first_name,
      last_name: account.last_name,
      phone: account.phone,
      organization: account.organization,
      product_name: account.product_name,
    });

    console.log(`\n--- Login: ${account.email} ---`);
    const login = await req(`${base}/auth/login`, 'POST', { email: account.email });

    if (login.ok && login.data?.data?.access_token) {
      const token = login.data.data.access_token;
      console.log(`\n  ✓ Got token for ${account.email}!`);

      console.log('\n--- Generate API Key ---');
      await req(`${base}/auth/api-key/secure`, 'GET', undefined, token);

      console.log('\n--- Integrator Details ---');
      await req(`${base}/integrator`, 'GET', undefined, token);

      console.log('\n--- Exchange Rates ---');
      await req(`${base}/rate/USD/KES`, 'GET', undefined, token);

      console.log('\n--- Wallets ---');
      await req(`${base}/wallet/fiat`, 'GET', undefined, token);
      await req(`${base}/wallet/crypto`, 'GET', undefined, token);

      console.log('\n--- Country Support ---');
      await req(`${base}/country`, 'GET', undefined, token);
    } else {
      console.log(`\n  → Login returned ${login.status}. Check email for magic link.`);
    }
  }
}

console.log('╔════════════════════════════════════════════╗');
console.log('║   Kotani Pay v3 API Setup & Test Script    ║');
console.log('╚════════════════════════════════════════════╝');
console.log(`Time: ${new Date().toISOString()}\n`);

// Try sandbox first, then production
await testEnv(SANDBOX_BASE, 'SANDBOX');
await testEnv(PROD_BASE, 'PRODUCTION');

console.log('\n\n' + '='.repeat(60));
console.log('NEXT STEPS:');
console.log('1. If account was created: check email for magic link');
console.log('2. After clicking magic link, run:');
console.log('   node scripts/kotani-auth.mjs <jwt_token> [sandbox|production]');
console.log('='.repeat(60));
