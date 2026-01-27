-- Add status column to track declaration state
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';

-- Update existing records to have 'submitted' status
UPDATE declarations SET status = 'submitted' WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN declarations.status IS 'Status: submitted (entregue) ou draft (em retificação/pendente)';
