#!/bin/bash

# Script to get API key once you have the access token from email

echo "🔑 Kotani Pay API Key Generator"
echo "================================"
echo ""
read -p "Paste your access token from the email: " access_token

if [ -z "$access_token" ]; then
    echo "❌ No token provided"
    exit 1
fi

echo ""
echo "🔄 Generating API key..."
echo ""

response=$(curl -s -X GET "https://sandbox-api.kotanipay.io/api/v3/auth/api-key" \
  -H "Authorization: Bearer ${access_token}")

echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Try to extract API key
if command -v jq &> /dev/null; then
    api_key=$(echo "$response" | jq -r '.data.apiKey // .apiKey // empty')

    if [ -n "$api_key" ]; then
        echo ""
        echo "✅ Success! Your API key:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$api_key"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📋 Add to .env.local:"
        echo ""
        echo "KOTANI_PAY_API_KEY=$api_key"
        echo "KOTANI_PAY_BASE_URL=https://sandbox-api.kotanipay.io/api/v3"
        echo "KOTANI_PAY_WEBHOOK_SECRET=$(openssl rand -hex 32)"
        echo ""
        echo "🎉 You're ready to test!"
    fi
fi
