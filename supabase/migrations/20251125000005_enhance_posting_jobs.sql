-- Enhance posting_jobs with retry logic and email alias tracking
ALTER TABLE posting_jobs
  ADD COLUMN IF NOT EXISTS email_alias TEXT,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Function for atomic job claiming with SKIP LOCKED
CREATE OR REPLACE FUNCTION claim_pending_jobs(worker_id TEXT, batch_size INTEGER DEFAULT 5)
RETURNS SETOF posting_jobs AS $$
BEGIN
  RETURN QUERY
  UPDATE posting_jobs
  SET 
    status = 'processing',
    locked_at = now(),
    locked_by = worker_id,
    updated_at = now()
  WHERE id IN (
    SELECT id FROM posting_jobs
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND attempts < max_attempts
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION claim_pending_jobs IS 'Atomically claims pending jobs for a worker, preventing race conditions';