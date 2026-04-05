#!/bin/bash

# Kotani Pay API Setup Script
# This script helps you create an integrator account and get API credentials

echo "🟣 Kotani Pay API Setup"
echo "======================="
echo ""

# Check if required tools are installed
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq is not installed. Responses will not be formatted."
    echo "   Install jq for better output: brew install jq"
    echo ""
fi

# Set API base URL
API_BASE_URL="https://sandbox-api.kotanipay.com/api/v3"

echo "📝 Step 1: Create Integrator Account"
echo "====================================="
echo ""

# Collect user information
read -p "Organization Name: " org_name
read -p "Product Name: " product_name
read -p "First Name: " first_name
read -p "Last Name: " last_name
read -p "Email: " email
read -p "Phone (with country code, e.g., +254712345678): " phone
read -p "Country Code (e.g., KE, GH, UG, TZ): " country_code

echo ""
echo "Creating integrator account..."
echo ""

# Create integrator account
response=$(curl -s -X POST "${API_BASE_URL}/integrator" \
  -H "Content-Type: application/json" \
  -d "{
    \"organisation\": \"${org_name}\",
    \"productName\": \"${product_name}\",
    \"firstName\": \"${first_name}\",
    \"lastName\": \"${last_name}\",
    \"email\": \"${email}\",
    \"phone\": \"${phone}\",
    \"countryCode\": \"${country_code}\"
  }")

# Display response
if command -v jq &> /dev/null; then
    echo "$response" | jq '.'
else
    echo "$response"
fi

# Check if successful
if echo "$response" | grep -q "success"; then
    echo ""
    echo "✅ Account created successfully!"
    echo ""
    echo "📧 Step 2: Login to Get Access Token"
    echo "====================================="
    echo ""
    echo "Sending login request..."

    # Login to get access token
    login_response=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"${email}\"}")

    if command -v jq &> /dev/null; then
        echo "$login_response" | jq '.'
    else
        echo "$login_response"
    fi

    echo ""
    echo "✅ Login request sent!"
    echo ""
    echo "📬 Check your email (${email}) for login instructions."
    echo "   You will receive an access token in the email."
    echo ""
    echo "🔑 Step 3: Generate API Key"
    echo "====================================="
    echo ""
    read -p "Enter the access token from your email: " access_token

    if [ -n "$access_token" ]; then
        echo ""
        echo "Generating API key..."

        # Generate API key
        api_key_response=$(curl -s -X GET "${API_BASE_URL}/auth/api-key" \
          -H "Authorization: Bearer ${access_token}")

        if command -v jq &> /dev/null; then
            echo "$api_key_response" | jq '.'
        else
            echo "$api_key_response"
        fi

        # Extract API key if possible
        if command -v jq &> /dev/null; then
            api_key=$(echo "$api_key_response" | jq -r '.data.apiKey // .apiKey // empty')

            if [ -n "$api_key" ]; then
                echo ""
                echo "✅ API Key generated successfully!"
                echo ""
                echo "📋 Add this to your .env.local file:"
                echo "====================================="
                echo ""
                echo "KOTANI_PAY_API_KEY=${api_key}"
                echo "KOTANI_PAY_BASE_URL=${API_BASE_URL}"
                echo "KOTANI_PAY_WEBHOOK_SECRET=generate_random_secret_here"
                echo ""
                echo "💡 Generate webhook secret with: openssl rand -hex 32"
                echo ""
            fi
        fi

        echo ""
        echo "🎉 Setup Complete!"
        echo ""
        echo "Next Steps:"
        echo "1. Add the credentials to your .env.local file"
        echo "2. Generate a webhook secret: openssl rand -hex 32"
        echo "3. Test the integration with: npm run dev"
        echo "4. Visit: http://localhost:3000/api/kotani-pay/rates?type=all"
        echo ""
        echo "📚 Documentation: docs/api-integration/KOTANI_PAY_SETUP.md"
        echo ""
    else
        echo "⚠️  No access token provided. Please:"
        echo "1. Check your email for the access token"
        echo "2. Run this command to generate API key:"
        echo ""
        echo "   curl -X GET ${API_BASE_URL}/auth/api-key \\"
        echo "     -H \"Authorization: Bearer YOUR_ACCESS_TOKEN\""
        echo ""
    fi
else
    echo ""
    echo "❌ Failed to create account. Please check the error above."
    echo ""
    echo "💡 Alternative: Contact Kotani Pay directly"
    echo "   Email: [email protected]"
    echo "   Website: https://kotanipay.com"
    echo ""
fi
