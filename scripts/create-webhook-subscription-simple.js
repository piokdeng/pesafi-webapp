#!/usr/bin/env node

/**
 * Create Coinbase CDP Webhook Subscription - Simple Version
 *
 * This uses basic authentication with API key name and secret
 */

require('dotenv').config({ path: '.env.local' });

const API_KEY_NAME = process.env.COINBASE_CDP_API_KEY_NAME;
const API_KEY_SECRET = process.env.COINBASE_CDP_API_KEY_PRIVATE;
const WEBHOOK_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/api/webhooks/coinbase';

if (!API_KEY_NAME || !API_KEY_SECRET) {
  console.error('❌ Error: Missing CDP API credentials');
  console.error('Please set COINBASE_CDP_API_KEY_NAME and COINBASE_CDP_API_KEY_PRIVATE in .env.local');
  process.exit(1);
}

console.log('🔑 CDP API Key Name:', API_KEY_NAME);
console.log('🔑 CDP API Secret:', API_KEY_SECRET.substring(0, 10) + '...');
console.log('🌐 Webhook URL:', WEBHOOK_URL);
console.log('');

async function createWebhookSubscription() {
  try {
    const subscriptionData = {
      description: 'Onramp transaction status webhook',
      eventTypes: [
        'onramp.transaction.created',
        'onramp.transaction.updated',
        'onramp.transaction.success',
        'onramp.transaction.failed',
      ],
      target: {
        url: WEBHOOK_URL,
        method: 'POST',
      },
      labels: {},
      isEnabled: true,
    };

    console.log('📡 Creating webhook subscription...');
    console.log('Request:', JSON.stringify(subscriptionData, null, 2));
    console.log('');

    // Try basic auth with API key:secret
    const authString = Buffer.from(`${API_KEY_NAME}:${API_KEY_SECRET}`).toString('base64');

    console.log('🔐 Using Basic Authentication');
    const response = await fetch('https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    const responseText = await response.text();
    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📥 Response Body:', responseText);
    console.log('');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('⚠️  Response is not JSON');
      if (response.ok) {
        console.log('✅ Request was successful (200 OK)');
        console.log('Response text:', responseText);
        return { success: true, message: responseText };
      }
      throw new Error(`Invalid response: ${responseText}`);
    }

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(data, null, 2));

      // Check if it's an authentication error
      if (response.status === 401 || response.status === 403) {
        console.log('');
        console.log('⚠️  Authentication failed. Your API credentials might be incorrect or may need different format.');
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('1. Verify your CDP API keys at: https://portal.cdp.coinbase.com/projects/api-keys');
        console.log('2. Make sure you created a "Secret API Key" (not just Client API Key)');
        console.log('3. The API key name should look like: organizations/xxx/apiKeys/yyy');
        console.log('4. The private key should be the secret value from the API key creation');
      }

      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Webhook subscription created successfully!');
    console.log('');
    console.log('📋 Subscription Details:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.metadata?.secret) {
      console.log('🔑 IMPORTANT: Webhook Secret');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`COINBASE_WEBHOOK_SECRET=${data.metadata.secret}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('⚠️  Add this to your .env.local file');
      console.log('   This secret is used to verify webhook signatures.');
    }

    if (data.subscriptionId) {
      console.log('📌 Subscription ID:', data.subscriptionId);
      console.log('   Use this ID to view, update, or delete the subscription.');
    }

    return data;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the script
createWebhookSubscription()
  .then(() => {
    console.log('');
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Failed to create webhook subscription');
    process.exit(1);
  });
