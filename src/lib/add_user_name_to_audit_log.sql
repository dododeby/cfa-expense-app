-- Add user_name column to audit_log table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'user_name'
    ) THEN
        ALTER TABLE public.audit_log ADD COLUMN user_name TEXT;
        RAISE NOTICE 'Added user_name column to audit_log';
    ELSE
        RAISE NOTICE 'user_name column already exists in audit_log';
    END IF;
END $$;
