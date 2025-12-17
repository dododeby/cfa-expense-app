-- Add cnpj column to organizations table if it doesn't exist

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'cnpj') THEN
        ALTER TABLE organizations ADD COLUMN cnpj VARCHAR(20);
    END IF;
END $$;
