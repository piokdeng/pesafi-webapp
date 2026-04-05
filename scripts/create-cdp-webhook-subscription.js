#!/usr/bin/env node

/**
 * Create Coinbase CDP Webhook Subscription
 * Based on: https://docs.cdp.coinbase.com/platform/docs/webhooks
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const API_KEY_NAME = process.env.COINBASE_CDP_API_KEY_NAME;
const API_KEY_PRIVATE = process.env.COINBASE_CDP_API_KEY_PRIVATE;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/coinbase`
  : 'https://app.pesafi.ai/api/webhooks/coinbase';

/**
 * Generate CDP JWT token for authentication
 */
function generateCDPJWT() {
  const header = {
    alg: 'ES256',
    typ: 'JWT',
    kid: API_KEY_NAME,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: API_KEY_NAME,
    iss: 'coinbase-cloud',
    nbf: now,
    exp: now + 120, // 2 minutes
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const message = `${encodedHeader}.${encodedPayload}`;

  // Sign with ECDSA private key
  const signature = crypto
    .createSign('SHA256')
    .update(message)
    .sign(API_KEY_PRIVATE, 'base64');

  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function base64UrlEncode(input) {
  const str = typeof input === 'string' ? input : input.toString();
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create webhook subscription
 */
async function createWebhookSubscription() {
  console.log('🔔 Creating Coinbase CDP Webhook Subscription');
  console.log('============================================');
  console.log('');

  if (!API_KEY_NAME || !API_KEY_PRIVATE) {
    console.error('❌ Error: CDP API credentials not configured');
    console.log('   Set COINBASE_CDP_API_KEY_NAME and COINBASE_CDP_API_KEY_PRIVATE in .env.local');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Webhook URL: ${WEBHOOK_URL}`);
  console.log(`  API Key: ${API_KEY_NAME.substring(0, 50)}...`);
  console.log('');

  try {
    // Generate JWT for authentication
    console.log('📝 Generating CDP JWT token...');
    const jwt = generateCDPJWT();
    console.log('✅ JWT generated');
    console.log('');

    // Prepare subscription payload
    const subscriptionPayload = {
      description: 'Onramp transaction status webhook for Pesafi',
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
    console.log('Event types:', subscriptionPayload.eventTypes);
    console.log('');

    // Call CDP Platform API
    const response = await fetch(
      'https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionPayload),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Error creating webhook subscription');
      console.error('Response Status:', response.status, response.statusText);
      console.error('Response Body:', responseText);
      console.log('');

      if (response.status === 401) {
        console.log('💡 Troubleshooting 401 Unauthorized:');
        console.log('   1. Verify your API key has webhook permissions');
        console.log('   2. Check that the API key is in correct format:');
        console.log('      organizations/<org-id>/apiKeys/<key-id>');
        console.log('   3. Ensure private key is valid ECDSA PEM format');
        console.log('   4. Contact Coinbase support to enable webhook access');
      }

      process.exit(1);
    }

    const data = JSON.parse(responseText);

    console.log('✅ Webhook subscription created successfully!');
    console.log('');
    console.log('Subscription Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Subscription ID: ${data.subscriptionId}`);
    console.log(`Created At: ${data.createdAt}`);
    console.log(`Description: ${data.description}`);
    console.log(`Enabled: ${data.isEnabled}`);
    console.log(`Webhook URL: ${data.target.url}`);
    console.log('');
    console.log('Event Types:');
    data.eventTypes.forEach(type => console.log(`  ✓ ${type}`));
    console.log('');
    console.log('⚠️  IMPORTANT: Save this webhook secret!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Webhook Secret: ${data.metadata.secret}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Add this to your .env.local:');
    console.log(`   COINBASE_WEBHOOK_SECRET=${data.metadata.secret}`);
    console.log('');
    console.log('2. Replace the old Commerce webhook secret (9a2c453c-...) with this one');
    console.log('');
    console.log('3. Restart your dev server to apply the new secret');
    console.log('');
    console.log('4. Test the webhook endpoint with a real transaction');
    console.log('');
    console.log('Full Response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
createWebhookSubscription()
  .then(() => {
    console.log('');
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
