-- Ensure status column exists in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Update any NULL status to 'active' to satisfy constraint
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Drop existing constraint if it matches the name (or just try to add and ignore failure if exists/duplicate)
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add the check constraint with correct values
ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));
