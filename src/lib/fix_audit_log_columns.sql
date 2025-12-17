-- Add missing columns to audit_log if they don't exist
DO $$
BEGIN
    -- action_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'action_type') THEN
        ALTER TABLE public.audit_log ADD COLUMN action_type TEXT;
    END IF;

    -- action_details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'action_details') THEN
        ALTER TABLE public.audit_log ADD COLUMN action_details JSONB;
    END IF;

    -- account_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'account_id') THEN
        ALTER TABLE public.audit_log ADD COLUMN account_id TEXT;
    END IF;

    -- account_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'account_name') THEN
        ALTER TABLE public.audit_log ADD COLUMN account_name TEXT;
    END IF;

    -- field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'field') THEN
        ALTER TABLE public.audit_log ADD COLUMN field TEXT;
    END IF;

    -- previous_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'previous_value') THEN
        ALTER TABLE public.audit_log ADD COLUMN previous_value NUMERIC;
    END IF;

    -- new_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'new_value') THEN
        ALTER TABLE public.audit_log ADD COLUMN new_value NUMERIC;
    END IF;

    -- Drop restrictive constraint if exists
    BEGIN
        ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_field_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
