# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PesaFi is a Web3 financial platform for Africa built on Base L2. It enables instant USDC transfers, mobile money on/off-ramps (M-Pesa, MTN, Airtel), and gas-sponsored transactions. Users get an auto-generated smart wallet on signup with no seed phrases.

**Live:** https://app.pesafi.ai/

## Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# Database (Drizzle ORM with Supabase)
npm run db:push          # Push schema changes
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations

# Supabase
npm run supabase:start   # Start local Supabase
npm run supabase:deploy  # Deploy edge functions
```

## Architecture

### Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + Auth)
- **Blockchain:** Base Mainnet, ethers.js 6, Wagmi 2, USDC on Base
- **On/Off-Ramps:** Coinbase Onramp, Kotani Pay (mobile money), Flutterwave

### Key Directories
```
src/app/api/           # API endpoints
  wallet/              # Create, send, balance operations
  auth/                # Supabase auth (signup, signin)
  kotani/              # Kotani Pay on-ramp/off-ramp
  webhooks/            # Payment provider callbacks
src/lib/
  web3/config.ts       # Blockchain config (Base Mainnet/Sepolia)
  web3/wallet-service.ts # Wallet operations (send USDC, get balance)
  kotani-pay.ts        # Kotani Pay SDK
  paymaster.ts         # Coinbase Paymaster (gas sponsorship)
  validation.ts        # Zod schemas for input validation
  supabase-auth.ts     # Server-side Supabase client
src/components/wallet/ # Deposit/Withdraw modals
```

### Database Tables
- `wallet` - User wallets with encrypted private keys, USDC balance
- `transaction` - Transaction history with status, hashes
- `webhook_logs` - Idempotent webhook processing

### Smart Contracts (Base Mainnet)
- **USDC:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Wallet Factory:** `0xA5a6708DCf4f9b47f10312cF075eEd834d53d80B`

## Key Patterns

### Wallet Creation
On signup, a wallet is auto-created: random EOA generated → private key encrypted with AES-256-GCM → stored in DB. Users never see seed phrases.

### USDC Transfers
1. Validate input with Zod schemas
2. Fetch encrypted private key from DB
3. Decrypt with `WALLET_ENCRYPTION_KEY`
4. Try Coinbase Paymaster (ERC-4337) for gas sponsorship
5. Fallback to direct transfer if paymaster unavailable
6. Record transaction in DB

### On/Off-Ramps
- **Coinbase Onramp:** Card → USDC (zero fees, US/EU)
- **Kotani Pay:** Mobile money ↔ USDC (Kenya, Ghana, Uganda, Tanzania)
- Webhooks at `/api/webhooks/coinbase` and `/api/webhooks/kotani`

## Environment Variables

Required in `.env.local`:
```bash
# Supabase
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Blockchain
NEXT_PUBLIC_CHAIN_ID=8453  # Base Mainnet
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WALLET_ENCRYPTION_KEY=     # 32-byte hex for AES-256

# Coinbase
COINBASE_CDP_API_KEY_NAME, COINBASE_CDP_API_KEY_PRIVATE

# Kotani Pay
KOTANI_PAY_API_KEY, KOTANI_PAY_SECRET_KEY
```

## Validation

All user input uses Zod schemas in `src/lib/validation.ts`:
- `ethereumAddressSchema` - 0x + 40 hex chars
- `usdcAmountSchema` - Positive number, max 6 decimals
- `phoneNumberSchema` - E.164 format

Always validate before DB operations or blockchain transactions.

## Testing Blockchain

For development, use Base Sepolia (chain ID 84532). The config auto-switches based on `NEXT_PUBLIC_CHAIN_ID`. Get testnet USDC from Coinbase faucets.
