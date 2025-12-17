-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages relevant to them
CREATE POLICY "Users can view relevant messages" ON messages
FOR SELECT
USING (
  -- User is from CFA (sees all)
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.organization_id = 'cfa'
  )
  OR
  -- Message is sent by user's org
  sender_org = (
    SELECT organization_id FROM users 
    WHERE users.id = auth.uid()
  )
  OR
  -- Message is sent to user's org
  recipient_org = (
    SELECT organization_id FROM users 
    WHERE users.id = auth.uid()
  )
  OR
  -- Broadcast messages
  recipient_org = 'all'
);

-- Policy: Users can insert messages from their org
CREATE POLICY "Users can send messages" ON messages
FOR INSERT
WITH CHECK (
  -- Sender org must match user's org
  sender_org = (
    SELECT organization_id FROM users 
    WHERE users.id = auth.uid()
  )
);

-- Policy: Users can update messages (e.g. mark as read)
CREATE POLICY "Users can update relevant messages" ON messages
FOR UPDATE
USING (
  -- Allow update if user can view it (simplified for now as schema seems to have shared read status)
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.organization_id = 'cfa'
  )
  OR
  sender_org = (
    SELECT organization_id FROM users 
    WHERE users.id = auth.uid()
  )
  OR
  recipient_org = (
    SELECT organization_id FROM users 
    WHERE users.id = auth.uid()
  )
);
