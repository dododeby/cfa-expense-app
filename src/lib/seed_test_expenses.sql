-- Script to populate "Salários" (1.1.1.1) with 1000 Total / 100 Finalística for ALL CRAs

DO $$
DECLARE
    org_record RECORD;
BEGIN
    -- Iterate through all organizations where type is 'CRA' or 'CFA'
    FOR org_record IN SELECT id FROM organizations WHERE type IN ('CRA', 'CFA') LOOP
        
        -- Upsert the expense data
        INSERT INTO expenses (organization_id, account_id, account_name, total, finalistica, updated_at)
        VALUES (org_record.id, '1.1.1.1', 'Salários', 1000, 100, NOW())
        ON CONFLICT (organization_id, account_id) 
        DO UPDATE SET 
            total = EXCLUDED.total,
            finalistica = EXCLUDED.finalistica,
            account_name = EXCLUDED.account_name,
            updated_at = NOW();
            
    END LOOP;
END $$;
