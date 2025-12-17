-- Add updated_at column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have a value (optional, but good for consistency)
UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;
