-- FIX: Ensure 'users' table has a policy allowing users to read their own profile
-- This is required for other policies (like messages) to lookup the user's organization

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
FOR SELECT
USING (
  auth.uid() = id
);

-- RE-APPLY Messages Policies (just to be sure)
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
FOR INSERT
WITH CHECK (
  -- Ensure sender_org matches the user's organization
  -- Using lower() to be case-insensitive just in case
  lower(sender_org) = (
    SELECT lower(organization_id) FROM users 
    WHERE users.id = auth.uid()
  )
);
