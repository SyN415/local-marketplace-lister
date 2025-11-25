-- Email Logs: Audit trail for all inbound/outbound emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES email_proxy_assignments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  message_id TEXT UNIQUE,  -- Gmail message ID for deduplication
  is_spam BOOLEAN DEFAULT false,
  spam_score FLOAT,
  spam_reasons JSONB,
  forwarded_at TIMESTAMPTZ,
  forwarding_status TEXT CHECK (forwarding_status IN ('pending', 'sent', 'failed', 'blocked')),
  metadata JSONB,  -- Additional data like headers, attachments info
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_logs_user ON email_logs(user_id, created_at DESC);
CREATE INDEX idx_email_logs_assignment ON email_logs(assignment_id);
CREATE INDEX idx_email_logs_message_id ON email_logs(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_email_logs_spam ON email_logs(is_spam, created_at DESC) WHERE is_spam = true;

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON email_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON email_logs FOR ALL USING (auth.role() = 'service_role');