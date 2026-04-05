#!/usr/bin/env node

/**
 * Create Coinbase CDP Webhook Subscription
 *
 * This script creates a webhook subscription for Coinbase onramp events.
 * It uses the CDP API credentials to authenticate and create the subscription.
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// Get credentials from environment
const API_KEY_NAME = process.env.COINBASE_CDP_API_KEY_NAME;
const API_KEY_PRIVATE = process.env.COINBASE_CDP_API_KEY_PRIVATE;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/coinbase';

if (!API_KEY_NAME || !API_KEY_PRIVATE) {
  console.error('❌ Error: Missing CDP API credentials');
  console.error('Please set COINBASE_CDP_API_KEY_NAME and COINBASE_CDP_API_KEY_PRIVATE in .env.local');
  process.exit(1);
}

console.log('🔑 CDP API Key:', API_KEY_NAME);
console.log('🌐 Webhook URL:', WEBHOOK_URL);
console.log('');

/**
 * Generate JWT for CDP API authentication
 */
function generateJWT() {
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

  // Base64 URL encode
  const base64UrlEncode = (str) => {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature
  const message = `${encodedHeader}.${encodedPayload}`;

  // The private key should be in PEM format
  // If it's base64 encoded, we need to convert it
  let privateKey = API_KEY_PRIVATE;

  // Check if it's a raw base64 key (not PEM format)
  if (!privateKey.includes('BEGIN')) {
    console.log('⚠️  Converting base64 key to PEM format...');
    privateKey = `-----BEGIN EC PRIVATE KEY-----\n${privateKey}\n-----END EC PRIVATE KEY-----`;
  }

  const signature = crypto
    .createSign('SHA256')
    .update(message)
    .sign(privateKey, 'base64');

  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Create webhook subscription
 */
async function createWebhookSubscription() {
  try {
    console.log('🔐 Generating JWT token...');
    const jwt = generateJWT();
    console.log('✅ JWT generated successfully');
    console.log('');

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

    const response = await fetch('https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from API');
    }

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(data, null, 2));
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Webhook subscription created successfully!');
    console.log('');
    console.log('📋 Subscription Details:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.metadata?.secret) {
      console.log('🔑 IMPORTANT: Save this webhook secret to your .env.local:');
      console.log(`COINBASE_WEBHOOK_SECRET=${data.metadata.secret}`);
      console.log('');
      console.log('⚠️  This secret is used to verify webhook signatures.');
      console.log('   Make sure to update .env.local if it differs from the current value.');
    }

    if (data.subscriptionId) {
      console.log('📌 Subscription ID:', data.subscriptionId);
      console.log('   Use this ID to view, update, or delete the subscription.');
    }

    return data;

  } catch (error) {
    console.error('❌ Error creating webhook subscription:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
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
