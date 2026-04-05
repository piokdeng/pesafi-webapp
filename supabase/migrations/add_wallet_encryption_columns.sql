-- Add encrypted private key and mnemonic columns to wallet table
-- These columns store encrypted wallet credentials for backup/recovery

-- Add encrypted_private_key column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet' AND column_name = 'encrypted_private_key'
  ) THEN
    ALTER TABLE wallet ADD COLUMN encrypted_private_key TEXT;
    COMMENT ON COLUMN wallet.encrypted_private_key IS 'AES-256 encrypted private key for wallet backup';
  END IF;
END $$;

-- Add encrypted_mnemonic column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet' AND column_name = 'encrypted_mnemonic'
  ) THEN
    ALTER TABLE wallet ADD COLUMN encrypted_mnemonic TEXT;
    COMMENT ON COLUMN wallet.encrypted_mnemonic IS 'AES-256 encrypted mnemonic phrase (seed phrase) for wallet backup';
  END IF;
END $$;

-- Add index for faster lookups (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON wallet(user_id);

-- Important: These columns contain ENCRYPTED data
-- Decryption requires the WALLET_ENCRYPTION_KEY or BETTER_AUTH_SECRET
-- Never store private keys in plain text

