-- Email Proxy Pool: Manages disposable Gmail accounts for Craigslist automation
CREATE TABLE IF NOT EXISTS email_proxy_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  encrypted_credentials JSONB NOT NULL,  -- OAuth tokens, encrypted with AES-256-GCM
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'cooldown', 'disabled')),
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  last_used_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  daily_send_count INTEGER DEFAULT 0,
  daily_receive_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_email_proxy_pool_status ON email_proxy_pool(status);
CREATE INDEX idx_email_proxy_pool_available ON email_proxy_pool(status, health_score DESC) WHERE status = 'available';

-- RLS: Only service role can access (backend-managed)
ALTER TABLE email_proxy_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON email_proxy_pool FOR ALL USING (auth.role() = 'service_role');