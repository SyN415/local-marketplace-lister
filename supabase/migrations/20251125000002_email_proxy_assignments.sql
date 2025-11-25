-- Email Proxy Assignments: Maps users to their assigned proxy emails
CREATE TABLE IF NOT EXISTS email_proxy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proxy_pool_id UUID NOT NULL REFERENCES email_proxy_pool(id) ON DELETE RESTRICT,
  alias_prefix TEXT NOT NULL,  -- e.g., "listing-abc123"
  full_alias TEXT GENERATED ALWAYS AS (alias_prefix || '+' || id::text) STORED,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, proxy_pool_id)
);

-- Indexes
CREATE INDEX idx_email_proxy_assignments_user ON email_proxy_assignments(user_id) WHERE is_active = true;
CREATE INDEX idx_email_proxy_assignments_alias ON email_proxy_assignments(full_alias);

-- RLS
ALTER TABLE email_proxy_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assignments" ON email_proxy_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON email_proxy_assignments FOR ALL USING (auth.role() = 'service_role');