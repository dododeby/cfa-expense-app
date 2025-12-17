-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID,
    user_id UUID,
    action_type TEXT,
    action_details JSONB,
    account_id TEXT,
    account_name TEXT,
    field TEXT,
    previous_value NUMERIC,
    new_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT logs
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view logs for their own organization
DROP POLICY IF EXISTS "Users can view audit logs of their organization" ON public.audit_log;
CREATE POLICY "Users can view audit logs of their organization"
ON public.audit_log
FOR SELECT
USING (
    organization_id::text IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND organization_id = 'cfa' -- CFA can see everything (logic simplified)
    )
);
