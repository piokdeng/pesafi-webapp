-- =====================================================
-- Add Business Support to Wallet Table
-- =====================================================
-- Run this SQL in Supabase SQL Editor to add business columns to wallet table

-- Add business_id and wallet_type columns to existing wallet table
ALTER TABLE wallet
ADD COLUMN IF NOT EXISTS business_id TEXT,
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50) DEFAULT 'individual';

-- Add foreign key constraint (if business_profile table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_profile') THEN
    -- Drop constraint if it exists
    ALTER TABLE wallet DROP CONSTRAINT IF EXISTS wallet_business_id_fkey;

    -- Add constraint
    ALTER TABLE wallet
    ADD CONSTRAINT wallet_business_id_fkey
    FOREIGN KEY (business_id)
    REFERENCES business_profile(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for business wallets
CREATE INDEX IF NOT EXISTS idx_wallet_business_id ON wallet(business_id);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'wallet'
AND column_name IN ('business_id', 'wallet_type')
ORDER BY column_name;
