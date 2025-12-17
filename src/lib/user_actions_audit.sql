-- Create user_actions_log table for audit trail
CREATE TABLE IF NOT EXISTS user_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL, -- 'approve', 'suspend', 'reactivate', 'delete'
    target_user_id UUID,
    target_user_email TEXT NOT NULL,
    target_user_name TEXT NOT NULL,
    performed_by_id UUID REFERENCES users(id),
    performed_by_email TEXT NOT NULL,
    details JSONB, -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_actions_log_created_at ON user_actions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_actions_log_target_user ON user_actions_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_log_performed_by ON user_actions_log(performed_by_id);

-- Enable RLS
ALTER TABLE user_actions_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins (CFA) can view audit logs
CREATE POLICY "Admins can view audit logs" ON user_actions_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.organization_id = 'cfa'
        )
    );
