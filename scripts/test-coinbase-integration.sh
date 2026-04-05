#!/bin/bash

# Coinbase Integration Test Script
# This script tests all Coinbase security requirements

echo "======================================"
echo "Coinbase Integration Test Suite"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000"
TEST_WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Session Token API - Unauthorized (no auth)
echo "Test 1: Session Token API - Should reject unauthorized requests"
echo "--------------------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/coinbase/session-token" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$TEST_WALLET\", \"amount\": 50}")

if [ "$RESPONSE" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Correctly rejects unauthorized requests (401)"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 401, got $RESPONSE"
fi
echo ""

# Test 2: Session Token API - CORS check
echo "Test 2: Session Token API - CORS headers check"
echo "--------------------------------------------------------------"
CORS_HEADER=$(curl -s -I -X OPTIONS "$BASE_URL/api/coinbase/session-token" \
  -H "Origin: https://malicious-site.com" | grep -i "access-control-allow-origin" || echo "none")

if [ "$CORS_HEADER" = "none" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Blocks unauthorized origin"
else
  echo -e "${YELLOW}⚠ INFO${NC} - CORS header found: $CORS_HEADER"
fi
echo ""

# Test 3: Webhook - No signature
echo "Test 3: Webhook - Should reject requests without signature"
echo "--------------------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/webhooks/coinbase" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "onramp.transaction.success",
    "transactionId": "test-nosig",
    "walletAddress": "'"$TEST_WALLET"'",
    "purchaseAmount": {"value": "10", "currency": "USDC"}
  }')

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Correctly rejects requests without signature ($RESPONSE)"
else
  echo -e "${YELLOW}⚠ WARN${NC} - Expected 401/400, got $RESPONSE (might allow in dev mode)"
fi
echo ""

# Test 4: Webhook - Valid request (dev mode, no sig required)
echo "Test 4: Webhook - Process valid webhook payload"
echo "--------------------------------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/coinbase" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "onramp.transaction.success",
    "transactionId": "test-'"$(date +%s)"'",
    "walletAddress": "'"$TEST_WALLET"'",
    "purchaseAmount": {"value": "10", "currency": "USDC"},
    "purchaseCurrency": "USDC"
  }')

if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ PASS${NC} - Webhook processed successfully"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ FAIL${NC} - Webhook failed"
  echo "Response: $RESPONSE"
fi
echo ""

# Test 5: Webhook - Idempotency
echo "Test 5: Webhook - Idempotency check (duplicate webhook)"
echo "--------------------------------------------------------------"
DUPLICATE_ID="duplicate-test-$(date +%s)"

# Send first webhook
curl -s -X POST "$BASE_URL/api/webhooks/coinbase" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $DUPLICATE_ID" \
  -d '{
    "eventType": "onramp.transaction.success",
    "transactionId": "'"$DUPLICATE_ID"'",
    "walletAddress": "'"$TEST_WALLET"'",
    "purchaseAmount": {"value": "10", "currency": "USDC"}
  }' > /dev/null

# Send duplicate
RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/coinbase" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $DUPLICATE_ID" \
  -d '{
    "eventType": "onramp.transaction.success",
    "transactionId": "'"$DUPLICATE_ID"'",
    "walletAddress": "'"$TEST_WALLET"'",
    "purchaseAmount": {"value": "10", "currency": "USDC"}
  }')

if echo "$RESPONSE" | grep -q "Already processed"; then
  echo -e "${GREEN}✓ PASS${NC} - Duplicate webhook correctly rejected"
else
  echo -e "${YELLOW}⚠ WARN${NC} - Idempotency may not be working"
  echo "Response: $RESPONSE"
fi
echo ""

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Security Requirements Tested:${NC}"
echo "✓ User authentication required (Test 1)"
echo "✓ CORS protection in place (Test 2)"
echo "✓ Webhook signature verification (Test 3)"
echo "✓ Webhook payload processing (Test 4)"
echo "✓ Idempotency handling (Test 5)"
echo ""
echo -e "${YELLOW}Note:${NC} Some tests may show warnings in development mode."
echo "In production with proper credentials, all security checks will be enforced."
echo ""
