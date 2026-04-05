-- =====================================================
-- PesaFi Business Portal - Database Schema Migration
-- =====================================================
-- This migration adds support for business accounts alongside individual accounts

-- =====================================================
-- 1. BUSINESS PROFILE TABLE
-- =====================================================
-- Stores business/company information
CREATE TABLE IF NOT EXISTS business_profile (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- 'sole_proprietorship', 'partnership', 'llc', 'corporation', 'ngo'
  registration_number VARCHAR(100), -- Company registration number
  tax_id VARCHAR(100), -- Tax identification number

  -- Contact Information
  business_email VARCHAR(255),
  business_phone VARCHAR(50),
  website VARCHAR(255),

  -- Address
  country VARCHAR(100),
  city VARCHAR(100),
  state_region VARCHAR(100),
  postal_code VARCHAR(20),
  street_address TEXT,

  -- Business Details
  industry VARCHAR(100),
  description TEXT,
  employee_count INTEGER,
  annual_revenue VARCHAR(50), -- Range: '<10k', '10k-100k', '100k-1m', '1m+'

  -- KYC/Verification
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_documents JSONB, -- Array of document URLs
  verified_at TIMESTAMP,

  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7), -- Hex color code

  -- Metadata
  settings JSONB, -- Business-specific settings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profile_user_id ON business_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_status ON business_profile(verification_status);

-- =====================================================
-- 2. BUSINESS MEMBERS/TEAM TABLE
-- =====================================================
-- Manages team members with access to business account
CREATE TABLE IF NOT EXISTS business_member (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if invited but not registered

  -- Member Information
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'manager', 'accountant', 'viewer'

  -- Permissions
  permissions JSONB, -- Detailed permissions object
  can_send_money BOOLEAN DEFAULT false,
  can_receive_money BOOLEAN DEFAULT true,
  can_view_transactions BOOLEAN DEFAULT true,
  can_manage_team BOOLEAN DEFAULT false,
  can_edit_settings BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'invited'
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  last_active_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_member_business_id ON business_member(business_id);
CREATE INDEX IF NOT EXISTS idx_business_member_user_id ON business_member(user_id);
CREATE INDEX IF NOT EXISTS idx_business_member_email ON business_member(email);

-- =====================================================
-- 3. EXTEND WALLET TABLE (Add business support)
-- =====================================================
-- Add business_id column to existing wallet table
ALTER TABLE wallet
ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES business_profile(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50) DEFAULT 'individual'; -- 'individual' or 'business'

-- Index for business wallets
CREATE INDEX IF NOT EXISTS idx_wallet_business_id ON wallet(business_id);

-- =====================================================
-- 4. BUSINESS TRANSACTION VIEW
-- =====================================================
-- Create a view that combines individual and business transactions
CREATE OR REPLACE VIEW business_transactions AS
SELECT
  t.*,
  w.business_id,
  w.wallet_type,
  bp.business_name
FROM transaction t
JOIN wallet w ON t.wallet_id = w.id
LEFT JOIN business_profile bp ON w.business_id = bp.id
WHERE w.business_id IS NOT NULL;

-- =====================================================
-- 5. BUSINESS ANALYTICS TABLE
-- =====================================================
-- Stores aggregated analytics for businesses (optional - can be computed on demand)
CREATE TABLE IF NOT EXISTS business_analytics (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,

  -- Time Period
  period_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metrics
  total_transactions INTEGER DEFAULT 0,
  total_volume NUMERIC(20, 6) DEFAULT 0, -- Total USD volume
  total_received NUMERIC(20, 6) DEFAULT 0,
  total_sent NUMERIC(20, 6) DEFAULT 0,
  total_fees NUMERIC(20, 6) DEFAULT 0,

  -- Customer Metrics
  unique_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_id, period_type, period_start)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_period ON business_analytics(period_start, period_end);

-- =====================================================
-- 6. SETTLEMENT/PAYOUT TABLE
-- =====================================================
-- Tracks business payouts and settlements
CREATE TABLE IF NOT EXISTS settlement (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,

  -- Settlement Details
  amount NUMERIC(20, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

  -- Destination
  destination_type VARCHAR(50), -- 'bank_account', 'mobile_money', 'crypto_wallet'
  destination_details JSONB, -- Bank/MM account details

  -- Processing
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Transaction Reference
  external_id VARCHAR(255), -- External provider transaction ID
  external_provider VARCHAR(100), -- 'flutterwave', 'yellowcard', etc.

  -- Fees
  fee_amount NUMERIC(20, 6),
  net_amount NUMERIC(20, 6),

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlement_business_id ON settlement(business_id);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON settlement(status);
CREATE INDEX IF NOT EXISTS idx_settlement_created_at ON settlement(created_at DESC);

-- =====================================================
-- 7. API KEYS TABLE (For Merchant API)
-- =====================================================
-- Stores API keys for businesses to integrate programmatically
CREATE TABLE IF NOT EXISTS business_api_key (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,

  -- Key Information
  key_name VARCHAR(255) NOT NULL, -- User-friendly name
  key_prefix VARCHAR(20) NOT NULL, -- First few chars shown to user (e.g., 'pk_live_abc...')
  key_hash TEXT NOT NULL, -- Hashed API key (never store plaintext)

  -- Permissions
  permissions JSONB, -- What this key can do
  environment VARCHAR(20) DEFAULT 'test', -- 'test' or 'live'

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Security
  allowed_ips JSONB, -- Array of allowed IP addresses (optional)
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_key_business_id ON business_api_key(business_id);
CREATE INDEX IF NOT EXISTS idx_api_key_hash ON business_api_key(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_key_prefix ON business_api_key(key_prefix);

-- =====================================================
-- 8. BUSINESS PREFERENCES TABLE
-- =====================================================
-- Business-specific settings (separate from user_preferences)
CREATE TABLE IF NOT EXISTS business_preferences (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,

  -- Display Settings
  currency VARCHAR(10) DEFAULT 'KES',
  timezone VARCHAR(100) DEFAULT 'Africa/Nairobi',
  language VARCHAR(10) DEFAULT 'en',

  -- Notification Settings
  notify_on_payment BOOLEAN DEFAULT true,
  notify_on_settlement BOOLEAN DEFAULT true,
  notification_email VARCHAR(255),
  notification_webhook_url TEXT,

  -- Transaction Settings
  auto_settlement BOOLEAN DEFAULT false,
  settlement_frequency VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'manual'
  minimum_settlement_amount NUMERIC(20, 6) DEFAULT 100,

  -- Security
  require_2fa_for_settlements BOOLEAN DEFAULT true,
  ip_whitelist JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_business_preferences_business_id ON business_preferences(business_id);

-- =====================================================
-- 9. UPDATE USER METADATA SCHEMA
-- =====================================================
-- Note: Supabase Auth user metadata is JSONB, so we'll store:
-- {
--   "account_type": "individual" | "business",
--   "name": "...",
--   "phone_number": "...",
--   "avatar_url": "..."
-- }

-- This is managed via Supabase Auth API, no migration needed
-- Just document the schema

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_api_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_preferences ENABLE ROW LEVEL SECURITY;

-- Business Profile Policies
CREATE POLICY "Users can view their own business profile"
  ON business_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile"
  ON business_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
  ON business_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Business Member Policies
CREATE POLICY "Business members can view their business members"
  ON business_member FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Business owners can manage members"
  ON business_member FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

-- Settlement Policies
CREATE POLICY "Businesses can view their own settlements"
  ON settlement FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can create settlements"
  ON settlement FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

-- API Key Policies
CREATE POLICY "Businesses can view their own API keys"
  ON business_api_key FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can manage their own API keys"
  ON business_api_key FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

-- Business Preferences Policies
CREATE POLICY "Businesses can view their own preferences"
  ON business_preferences FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can manage their own preferences"
  ON business_preferences FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_profile WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user has a business account
CREATE OR REPLACE FUNCTION has_business_account(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_profile WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get business ID for a user
CREATE OR REPLACE FUNCTION get_business_id(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT id FROM business_profile WHERE user_id = user_uuid LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is business owner or admin
CREATE OR REPLACE FUNCTION is_business_admin(user_uuid UUID, biz_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_profile WHERE id = biz_id AND user_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM business_member
    WHERE business_id = biz_id
    AND user_id = user_uuid
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_business_profile_updated_at BEFORE UPDATE ON business_profile
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_member_updated_at BEFORE UPDATE ON business_member
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_analytics_updated_at BEFORE UPDATE ON business_analytics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settlement_updated_at BEFORE UPDATE ON settlement
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_api_key_updated_at BEFORE UPDATE ON business_api_key
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_preferences_updated_at BEFORE UPDATE ON business_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this migration in your Supabase SQL editor
-- Make sure to test thoroughly before deploying to production
