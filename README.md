<<<<<<< HEAD
# 🚀 PesaFi.ai - The Web3 Venmo for Africa

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black)](https://nextjs.org/)
[![Base L2](https://img.shields.io/badge/Base-L2-blue)](https://base.org/)
[![USDC](https://img.shields.io/badge/USDC-Stablecoin-green)](https://www.circle.com/usdc)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Building the financial infrastructure for Africa's digital economy.** Send money instantly, store value safely, and access AI-powered investing—all with the simplicity of Venmo and the power of Web3.

---

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [Smart Contracts](#-smart-contracts)
- [Database Optimizations](#-database-optimizations)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 The Problem

### Africa's Financial Crisis

- **350 million Africans** are unbanked
- **$100 billion** in annual remittances with 7-9% fees
- **10-20% annual inflation** destroys purchasing power
- **Limited investment options** for the average person
- **Fragmented payment systems** that don't work cross-border

### Real-World Impact

**Example:** Brenda in New York sends $200 to her brother Deng in Nairobi:
- **Traditional way:** $16 fees (8%), 2-3 days wait, inflation erodes 2% value
- **Deng's struggle:** Cash under mattress, 10% annual value loss, no investment options

---

## ✨ Our Solution

**PesaFi.ai** combines the best of Web3 and traditional finance:

1. **Stablecoin Storage (USDC)** - Money that doesn't lose value
2. **Instant Transfers** - 30-second cross-border payments with near-zero fees
3. **AI-Powered Investing** - Automatic passive income (8-25% APY)
4. **Mobile-First UX** - Simple as M-Pesa, smooth as Venmo
5. **Global Merchant Network** - Pay anywhere with QR codes

### The PesaFi Way

Brenda deposits $200 via Coinbase Onramp (**zero fees**) → Deng receives USDC in 30 seconds → PesaFi AI automatically:
- Invests $150 in 8% APY stablecoin yield
- Keeps $50 liquid for daily expenses
- Tracks spending and optimizes budget
- Grows wealth while he sleeps

---

## 🌟 Key Features

### Core Platform

- ✅ **Smart Wallet Creation** - Auto-generated on signup, no seed phrases
- ✅ **USDC Transfers** - Instant, near-zero fee payments on Base L2
- ✅ **Real-Time Balance** - Always synced with blockchain
- ✅ **Transaction History** - Complete record of all transfers
- ✅ **QR Code Payments** - Pay merchants with a scan
- ✅ **Phone Number Transfers** - Send to contacts without addresses
- ✅ **Gas Sponsorship** - Users never see gas fees (Coinbase Paymaster)

### Fiat On/Off Ramps

- 🔄 **Coinbase Onramp** - Buy USDC with credit/debit card
- 🔄 **Yellow Card** - USDC ↔ Mobile Money (M-Pesa, MTN, Airtel)
- 🔄 **Flutterwave** - Mobile money integration for East Africa

### AI Features (Coming Soon)

- 🤖 **Smart Budgeting** - Analyzes spending patterns
- 🤖 **Auto-Investing** - Passive yield generation (8-25% APY)
- 🤖 **Risk Management** - Diversifies across DeFi protocols
- 🤖 **Spending Insights** - Budget optimization suggestions

### Security & Privacy

- 🔒 **Encrypted Private Keys** - Database encryption with AES-256
- 🔒 **Input Validation** - SQL injection protection
- 🔒 **Rate Limiting** - DDoS protection
- 🔒 **Connection Pooling** - Optimized for 500+ concurrent users
- 🔒 **Privacy Settings** - Anonymize address and balance display

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15.4 (App Router)
- **React:** 19.1
- **Styling:** TailwindCSS 3.4
- **UI Components:** Radix UI, Shadcn/UI
- **Animations:** Framer Motion
- **State Management:** React Query (TanStack)

### Backend
- **Runtime:** Node.js 20+
- **Database:** Supabase (PostgreSQL)
- **ORM:** Supabase Client
- **Authentication:** Supabase Auth (Email/Password, OAuth)
- **Edge Functions:** Supabase Edge Functions

### Blockchain
- **Layer 2:** Base (Coinbase L2)
- **Smart Contracts:** Solidity 0.8.x
- **Contract Framework:** Hardhat
- **Libraries:** Ethers.js 6.15, Viem, Wagmi
- **Wallet SDK:** Coinbase Wallet SDK, RainbowKit
- **Token:** USDC (Circle)

### DevOps & Infrastructure
- **Hosting:** Vercel (Frontend + Serverless)
- **Database Hosting:** Supabase Cloud
- **RPC Provider:** Base Mainnet (https://mainnet.base.org)
- **Monitoring:** Vercel Analytics
- **Version Control:** Git + GitHub

### Testing & Quality
- **Smart Contracts:** Hardhat + Chai
- **Linting:** ESLint + Next.js Config
- **Type Safety:** TypeScript 5.9

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm/yarn
- Git
- Supabase account
- Base Mainnet RPC access
- Wallet with Base ETH for gas (if deploying contracts)

### Installation

```bash
# Clone the repository
git clone https://github.com/jaffarkeikei/pesafi-prod-site.git
cd pesafi-prod-site

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with the following:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Blockchain
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_CHAIN_ID=8453
PRIVATE_KEY_DEPLOYER=your_deployer_private_key
ENCRYPTION_KEY=your_32_character_encryption_key

# Smart Contracts
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_WALLET_FACTORY_ADDRESS=0x96B76604fDDcd0BF2DD67FDEfDdF8AFb8bF86C6b

# Coinbase Paymaster (Optional)
NEXT_PUBLIC_PAYMASTER_ADDRESS=your_paymaster_address
PAYMASTER_PRIVATE_KEY=your_paymaster_private_key

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### Database Setup

```bash
# Start Supabase locally (optional)
npm run supabase:start

# Or use Supabase Cloud (recommended)
# 1. Create project at https://supabase.com
# 2. Run migrations from supabase/migrations/ in SQL Editor
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     User Layer                          │
│  Mobile/Web App → Account Abstraction → Smart Wallet   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                      │
│   Next.js Frontend → API Routes → Supabase Database    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               Blockchain Layer (Base L2)                │
│    Smart Contracts → USDC → Payment Processor           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Services Layer                        │
│  Coinbase Onramp • Yellow Card • Flutterwave • Twilio  │
└─────────────────────────────────────────────────────────┘
```

### Key Components

1. **Smart Wallets** - EOA wallets with encrypted private keys
2. **USDC Integration** - Stablecoin transfers on Base L2
3. **Gas Sponsorship** - Coinbase Paymaster for zero-fee UX
4. **Fiat Ramps** - Coinbase, Yellow Card, Flutterwave integration
5. **Supabase Database** - User data, wallets, transactions

---

## 📜 Smart Contracts

### Deployed Contracts (Base Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **USDC Token** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Circle USDC on Base |
| **PesaFi Factory** | `0x96B76604fDDcd0BF2DD67FDEfDdF8AFb8bF86C6b` | Smart wallet deployment |

### Contract Features

- ✅ USDC transfer functionality
- ✅ Gas optimization
- ✅ Tested on Base Mainnet
- 🔄 Smart wallet deployment (in progress)
- 🔄 Social recovery (planned)
- 🔄 Daily limits (planned)

### Development

```bash
# Compile contracts
cd contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base
npx hardhat run scripts/deploy.js --network base
```

---

## ⚡ Database Optimizations

**Recent Performance Upgrades (Oct 2025):**

### What We Optimized

1. **Connection Pooling** (2-5x performance boost)
   - Pool size: 20 → 50 connections
   - Max clients: 100 → 500
   - Prevents connection exhaustion

2. **Database Indexes** (10-100x faster queries)
   - 17+ indexes on frequently queried columns
   - Composite indexes for common patterns
   - Optimizes wallet, transaction, notification lookups

3. **Input Validation** (Security hardening)
   - Zod schemas for all user inputs
   - Ethereum address validation
   - Phone number validation (E.164)
   - USDC amount validation (6 decimals)
   - Prevents SQL injection

4. **N+1 Query Fixes** (80% fewer queries)
   - Batch operations instead of loops
   - Reduced database round-trips

5. **Conditional Balance Syncing** (70% fewer writes)
   - Only updates if balance changed or stale (>5 min)
   - Reduces unnecessary database writes

### Performance Impact

| Metric | Improvement |
|--------|-------------|
| Concurrent requests | 2-5x increase |
| Query speed | 10-100x faster |
| Database queries | 80% reduction |
| Database writes | 70% reduction |

See [DATABASE_OPTIMIZATION_SUMMARY.md](DATABASE_OPTIMIZATION_SUMMARY.md) for details.

---

## 📡 API Documentation

### Wallet Endpoints

```
GET    /api/user/wallet              # Get user's wallet
POST   /api/wallet/create            # Create new wallet
POST   /api/wallet/send              # Send USDC transfer
GET    /api/wallet/phone/[phone]     # Lookup wallet by phone
```

### Transaction Endpoints

```
GET    /api/transactions/[userId]    # Get user transactions
```

### Authentication

```
POST   /api/auth/signup              # Register new user
POST   /api/auth/login               # Login existing user
POST   /api/auth/callback            # OAuth callback
```

### User Management

```
GET    /api/user/profile             # Get user profile
PUT    /api/user/profile             # Update profile
GET    /api/user/notifications       # Get notifications
```

See [docs/api-integration/](docs/api-integration/) for complete API documentation.

---

## 🚢 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   vercel login
   vercel link
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.local`
   - ⚠️ Use production keys, never reuse dev keys

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Post-Deployment Checklist**
   - ✅ Test user registration
   - ✅ Test USDC transfers
   - ✅ Verify HTTPS working
   - ✅ Check all pages load
   - ✅ Test on mobile

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations from `supabase/migrations/` in SQL Editor
3. Enable connection pooling in settings
4. Update `.env.local` with Supabase credentials

### Migration Guide

```bash
# Apply database migrations
psql $DATABASE_URL -f supabase/migrations/20251022_add_performance_indexes.sql

# Or use Supabase CLI
npx supabase db push
```

---

## 🔒 Security

### Current Security Measures

✅ **Implemented:**
- AES-256 encrypted private keys
- Input validation with Zod schemas
- SQL injection prevention
- Rate limiting (in-memory)
- HTTPS everywhere
- Secure session cookies
- .env.local in .gitignore

⚠️ **In Progress:**
- Smart contract audit
- Hardware security modules (HSM)
- Row-Level Security (RLS) policies
- Redis-based rate limiting
- Transaction monitoring
- Automated security scans

❌ **Not Yet Implemented:**
- Smart wallet deployment (using EOA)
- KYC/AML compliance
- Penetration testing
- Bug bounty program

### Security Recommendations

1. **Never commit `.env.local`** ✅
2. **Use different keys for prod/dev** ⚠️
3. **Enable 2FA on all accounts** ⚠️
4. **Regular security audits** ❌
5. **Smart contract audit before launch** ❌

**⚠️ Production Status:** App is ready for **testing/demo** but requires security hardening before public launch with real user funds.

See [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) for full security checklist.

---

## 🗺️ Roadmap

### Phase 1: Core Wallet ✅ (Completed)
- [x] User authentication (Supabase Auth)
- [x] Smart wallet creation (EOA)
- [x] USDC integration
- [x] Send/receive functionality
- [x] Transaction history
- [x] Balance display

### Phase 2: Payments 🔄 (In Progress)
- [x] QR code generation
- [x] Phone number lookup
- [x] Gas sponsorship (Coinbase Paymaster)
- [ ] Merchant dashboard
- [ ] NFC tap-to-pay
- [ ] Split bills feature

### Phase 3: Fiat Ramps 🔄 (In Progress)
- [x] Coinbase Onramp integration
- [ ] Yellow Card integration
- [ ] Flutterwave mobile money
- [ ] USDC → Mobile Money withdrawals

### Phase 4: AI Features 🔮 (Planned)
- [ ] Spending analysis
- [ ] Smart budgeting
- [ ] Auto-investing (8-25% APY)
- [ ] Risk management
- [ ] Portfolio optimization

### Phase 5: Scale 🚀 (Future)
- [ ] Mobile app (React Native)
- [ ] Advanced smart wallets
- [ ] Social recovery
- [ ] Multi-signature support
- [ ] Cross-chain support

---

## 🎯 Success Metrics

### User Adoption Goals
- **Month 1:** 100 users
- **Month 3:** 1,000 users
- **Month 6:** 10,000 users
- **Year 1:** 100,000 users

### Transaction Volume Goals
- **Month 1:** $10K
- **Month 3:** $100K
- **Month 6:** $1M
- **Year 1:** $10M

### Revenue Goals
- **Month 1:** $300
- **Month 3:** $3K
- **Month 6:** $90K
- **Year 1:** $900K

---

## 👥 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow Next.js best practices
- Use TypeScript for type safety
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **Website:** [pesafi.ai](https://pesafi.ai)
- **Email:** hello@pesafi.ai
- **Twitter:** [@PesaFi_ai](https://twitter.com/PesaFi_ai)
- **GitHub:** [jaffarkeikei/pesafi-prod-site](https://github.com/jaffarkeikei/pesafi-prod-site)

---

## 🙏 Acknowledgments

- **Coinbase** - Base L2 infrastructure
- **Circle** - USDC stablecoin
- **Supabase** - Backend infrastructure
- **Vercel** - Hosting platform
- **Next.js Team** - Amazing framework
- **The African Tech Community** - Inspiration and feedback

---

## 📚 Documentation

- [Pitch Deck](docs/PITCH.md) - Investor presentation
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Production Readiness](docs/PRODUCTION_READINESS.md) - Launch checklist
- [Database Optimizations](DATABASE_OPTIMIZATION_SUMMARY.md) - Performance guide
- [API Integration](docs/api-integration/README.md) - API documentation
- [Fiat Onramp Strategy](docs/FIAT_ONRAMP_STRATEGY.md) - Payment providers
- [User Journeys](docs/api-integration/USER_JOURNEYS.md) - User flows

---

## 🌍 Vision

**PesaFi.ai isn't just another fintech startup—we're building the financial infrastructure for Africa's digital economy.**

### The Impact We're Making

- **Users:** Save money, grow wealth, access global commerce
- **Merchants:** Accept global payments, reduce fees
- **Economies:** Increase financial inclusion, reduce poverty
- **World:** Connect Africa to the global financial system

### Why It Matters

- **Problem:** $100B remittance market with 7-9% fees
- **Opportunity:** 1.4B Africans + 50M diaspora
- **Solution:** Stablecoin-powered, AI-enhanced Web3 finance
- **Potential:** $1B+ valuation within 5 years

---

<div align="center">

**Ready to transform African finance? Let's build the future together.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jaffarkeikei/pesafi-prod-site)

</div>

---

*Last Updated: January 2025*
*Version: 1.0*
*Status: Production Beta*
=======
# KermaPay-PesaFi-Update-
Building the Venmo/Robinhood/Kalshi/FX of Africa
>>>>>>> 584b67e824db0f726025b7e39778687bd210a05d
