-- Enhance marketplace_connections for Craigslist email/phone and encrypted credentials
ALTER TABLE marketplace_connections 
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_credentials JSONB,
  ADD COLUMN IF NOT EXISTS proxy_assignment_id UUID REFERENCES email_proxy_assignments(id);

-- Comment on columns for documentation
COMMENT ON COLUMN marketplace_connections.contact_email IS 'User contact email for listing replies (Craigslist)';
COMMENT ON COLUMN marketplace_connections.contact_phone IS 'Optional user phone for listings';
COMMENT ON COLUMN marketplace_connections.encrypted_credentials IS 'AES-256-GCM encrypted platform credentials';
COMMENT ON COLUMN marketplace_connections.proxy_assignment_id IS 'Reference to assigned email proxy for this connection';

-- Index for proxy assignment lookup
CREATE INDEX IF NOT EXISTS idx_marketplace_connections_proxy ON marketplace_connections(proxy_assignment_id) WHERE proxy_assignment_id IS NOT NULL;