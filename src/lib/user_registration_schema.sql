-- User Registration Requests Table
-- This table stores pending registration requests that need CFA approval

CREATE TABLE IF NOT EXISTS user_registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  requested_cra_id TEXT NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- Enable Row Level Security
ALTER TABLE user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public registration)
CREATE POLICY "Allow public registration" ON user_registration_requests
  FOR INSERT WITH CHECK (true);

-- Policy: CFA users can view all requests
CREATE POLICY "CFA can view all requests" ON user_registration_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = 'cfa'
    )
  );

-- Policy: CFA users can update requests
CREATE POLICY "CFA can update requests" ON user_registration_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = 'cfa'
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON user_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON user_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_cpf ON user_registration_requests(cpf);
