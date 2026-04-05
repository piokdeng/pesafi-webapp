const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

console.log('Testing Coinbase CDP JWT Generation\n');

const apiKeyName = process.env.COINBASE_CDP_API_KEY_NAME;
let apiKeyPrivate = process.env.COINBASE_CDP_API_KEY_PRIVATE;

if (!apiKeyName || !apiKeyPrivate) {
  console.error('❌ Missing credentials in .env.local');
  console.error('COINBASE_CDP_API_KEY_NAME:', apiKeyName ? 'present' : 'MISSING');
  console.error('COINBASE_CDP_API_KEY_PRIVATE:', apiKeyPrivate ? 'present' : 'MISSING');
  process.exit(1);
}

console.log('✅ Credentials found');
console.log('API Key Name:', apiKeyName);
console.log('Private Key (first 50 chars):', apiKeyPrivate.substring(0, 50) + '...');

// Convert \n in the environment variable to actual newlines
apiKeyPrivate = apiKeyPrivate.replace(/\\n/g, '\n');
console.log('\n✅ Converted literal \\n to actual newlines');
console.log('Private Key (after conversion, first 50 chars):', apiKeyPrivate.substring(0, 50) + '...');

// Build URI for the API request (required in JWT payload for Coinbase CDP)
const requestMethod = 'POST';
const hostname = 'api.developer.coinbase.com';
const requestPath = '/onramp/v1/token';
const uri = `${requestMethod} ${hostname}${requestPath}`;

// JWT Payload - Following Coinbase CDP format
const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: 'cdp',  // MUST be "cdp" for Coinbase Developer Platform
  nbf: now,
  exp: now + 120,
  sub: apiKeyName,
  uri: uri,  // REQUIRED: includes request method, hostname, and path
};

console.log('\nJWT Payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\nURI:', uri);

try {
  // Generate random nonce for header
  const crypto = require('crypto');
  const nonce = crypto.randomBytes(16).toString('hex');

  // Sign JWT using jsonwebtoken library with ES256 algorithm
  const token = jwt.sign(payload, apiKeyPrivate, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      typ: 'JWT',
      kid: apiKeyName,
      nonce: nonce,  // REQUIRED: random hex string for security
    },
  });

  console.log('\n✅ JWT Generated Successfully!');
  console.log('JWT (first 100 chars):', token.substring(0, 100) + '...');
  console.log('Full JWT:', token);

  // Decode to verify
  const decoded = jwt.decode(token, { complete: true });
  console.log('\nDecoded JWT Header:');
  console.log(JSON.stringify(decoded.header, null, 2));
  console.log('\nDecoded JWT Payload:');
  console.log(JSON.stringify(decoded.payload, null, 2));

  // Now test with Coinbase API
  console.log('\n\n🔄 Testing with Coinbase CDP API...');
  testCoinbaseAPI(token);
} catch (error) {
  console.error('\n❌ JWT Generation Failed!');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

async function testCoinbaseAPI(jwtToken) {
  try {
    // Use a properly checksummed Ethereum address (valid for Base)
    const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3';
    const testClientIp = '192.0.2.1';

    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [
          {
            address: testWalletAddress,
            blockchains: ['base'],
          },
        ],
        assets: ['USDC', 'ETH'],
        clientIp: testClientIp,
      }),
    });

    console.log('Response Status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ SUCCESS! Session token created');
      const data = JSON.parse(responseText);
      console.log('Session Token:', data.token);
    } else {
      console.log('\n❌ FAILED! Coinbase API returned error');
      console.log('This suggests the JWT is not being accepted by Coinbase');
    }
  } catch (error) {
    console.error('\n❌ Network error:', error.message);
  }
}
