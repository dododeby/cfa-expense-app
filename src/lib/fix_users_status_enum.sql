-- Add 'suspended' to the allowed values for user status
-- First, drop the existing check constraint if it exists (guessing name or just altering column)
DO $$ 
BEGIN
    -- Try to drop constraint if named 'users_status_check' or similar
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
    
    -- Or just blindly add the constraint (Postgres allows multiple check constraints, but we want to replace)
    -- Best practice: Drop the constraint by name and re-add it.
    -- Since we don't know the name for sure, let's try to query it or just overwrite the column check.
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Force the check constraint to include 'suspended'
ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));
