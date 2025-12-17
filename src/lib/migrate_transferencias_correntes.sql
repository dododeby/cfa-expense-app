-- Migration: Move Transferências Correntes from 1.10.3.x to 1.11.1.x
-- This updates existing expense data in the database to reflect the new hierarchy

-- Update expenses table
UPDATE expenses
SET account_id = '1.11.1.1'
WHERE account_id = '1.10.3.1';

UPDATE expenses
SET account_id = '1.11.1.2'
WHERE account_id = '1.10.3.2';

UPDATE expenses
SET account_id = '1.11.1.3'
WHERE account_id = '1.10.3.3';

UPDATE expenses
SET account_id = '1.11.1.4'
WHERE account_id = '1.10.3.4';

UPDATE expenses
SET account_id = '1.11.1.5'
WHERE account_id = '1.10.3.5';

-- Verify the migration
SELECT 
    organization_id,
    account_id,
    account_name,
    total_amount,
    finalistica_amount
FROM expenses
WHERE account_id LIKE '1.11.1.%'
ORDER BY organization_id, account_id;
