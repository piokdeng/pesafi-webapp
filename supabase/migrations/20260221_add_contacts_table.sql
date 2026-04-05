-- Migration: Add contacts table for saved recipients
-- Date: 2026-02-21

-- Create contact table
CREATE TABLE IF NOT EXISTS contact (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42),
  phone_number VARCHAR(20),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  last_used_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- At least one of wallet_address or phone_number must be provided
  CONSTRAINT contact_has_identifier CHECK (
    wallet_address IS NOT NULL OR phone_number IS NOT NULL
  ),
  -- Source must be 'manual' or 'transaction'
  CONSTRAINT contact_valid_source CHECK (
    source IN ('manual', 'transaction')
  )
);

-- Partial unique indexes: prevent duplicate contacts per user per identifier
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_user_wallet
  ON contact (user_id, wallet_address)
  WHERE wallet_address IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_user_phone
  ON contact (user_id, phone_number)
  WHERE phone_number IS NOT NULL;

-- Index for listing contacts by user
CREATE INDEX IF NOT EXISTS idx_contact_user_id ON contact (user_id);

-- Index for ordering by last_used_at
CREATE INDEX IF NOT EXISTS idx_contact_last_used ON contact (user_id, last_used_at DESC NULLS LAST);

-- Apply updated_at trigger (reuses existing function from database-migration-business.sql)
CREATE TRIGGER update_contact_updated_at
  BEFORE UPDATE ON contact
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;

-- Users can only see their own contacts
CREATE POLICY "Users can view own contacts"
  ON contact FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own contacts
CREATE POLICY "Users can create own contacts"
  ON contact FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts"
  ON contact FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts"
  ON contact FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role full access (for API routes using service role)
CREATE POLICY "Service role full access on contacts"
  ON contact FOR ALL
  USING (auth.role() = 'service_role');
