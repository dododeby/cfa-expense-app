-- Add updated_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responsible_persons' AND column_name = 'updated_by') THEN
        ALTER TABLE public.responsible_persons ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
