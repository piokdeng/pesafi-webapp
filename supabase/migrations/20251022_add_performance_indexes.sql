-- Migration: Add Performance Indexes
-- Created: 2025-10-22
-- Purpose: Improve query performance by adding missing indexes on frequently queried columns

-- Wallet table indexes
CREATE INDEX IF NOT EXISTS idx_wallet_address ON wallet(address);
CREATE INDEX IF NOT EXISTS idx_wallet_phone_number ON wallet(phone_number);
CREATE INDEX IF NOT EXISTS idx_wallet_is_active ON wallet(is_active);
CREATE INDEX IF NOT EXISTS idx_wallet_user_id_is_active ON wallet(user_id, is_active); -- Composite index for common query pattern

-- Transaction table indexes
CREATE INDEX IF NOT EXISTS idx_transaction_wallet_id ON transaction(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transaction_status ON transaction(status);
CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON transaction(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_wallet_id_created_at ON transaction(wallet_id, created_at DESC); -- Composite for sorting user transactions
CREATE INDEX IF NOT EXISTS idx_transaction_external_id ON transaction(external_id);
CREATE INDEX IF NOT EXISTS idx_transaction_recipient_address ON transaction(recipient_address);

-- Notification table indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_id_created_at ON notification(user_id, created_at DESC); -- Composite for user notification lists
CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_user_id_read ON notification(user_id, is_read); -- For unread count queries

-- Webhook logs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_idempotency_key ON webhook_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add comments to document index purposes
COMMENT ON INDEX idx_wallet_address IS 'Fast lookup by wallet address for transfers and balance checks';
COMMENT ON INDEX idx_wallet_phone_number IS 'Phone number lookup for wallet discovery';
COMMENT ON INDEX idx_wallet_user_id_is_active IS 'Composite index for finding active user wallets';
COMMENT ON INDEX idx_transaction_wallet_id_created_at IS 'Optimizes transaction history queries with sorting';
COMMENT ON INDEX idx_notification_user_id_read IS 'Optimizes unread notification count queries';
