#!/usr/bin/env node

/**
 * Test Coinbase Session Token Generation
 */

require('dotenv').config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

async function testSessionToken() {
  console.log('🧪 Testing Session Token Generation');
  console.log('=====================================');
  console.log('');

  // First, we need a valid Supabase JWT token
  // For now, let's test without auth to see the error

  try {
    console.log('📡 Calling session token API...');
    console.log(`URL: ${API_BASE_URL}/api/coinbase/session-token`);
    console.log(`Wallet: ${TEST_WALLET_ADDRESS}`);
    console.log('');

    const response = await fetch(`${API_BASE_URL}/api/coinbase/session-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real use, you need a valid Supabase JWT here
        // 'Authorization': 'Bearer YOUR_SUPABASE_JWT',
      },
      body: JSON.stringify({
        walletAddress: TEST_WALLET_ADDRESS,
        amount: 50,
      }),
    });

    const data = await response.json();

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📥 Response Body:', JSON.stringify(data, null, 2));
    console.log('');

    if (response.status === 401) {
      console.log('✅ Good! API correctly requires authentication');
      console.log('   This is expected when no auth token is provided.');
      console.log('');
      console.log('💡 Next step: Test with a real user session token');
      console.log('   Log into your app and use the "Buy USDC" button to test.');
      return true;
    }

    if (response.ok && data.sessionToken) {
      console.log('✅ Session token generated successfully!');
      console.log('   Token:', data.sessionToken.substring(0, 20) + '...');
      return true;
    }

    console.log('⚠️  Unexpected response');
    return false;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run the test
testSessionToken()
  .then((success) => {
    console.log('');
    console.log(success ? '✅ Test completed' : '❌ Test failed');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
