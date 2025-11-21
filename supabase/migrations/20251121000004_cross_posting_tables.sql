-- Create posting_jobs table
CREATE TABLE IF NOT EXISTS public.posting_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
  result_data JSONB,
  error_log TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add credentials column to marketplace_connections if it doesn't exist
-- The table was created in 20251114000001_initial_schema.sql
ALTER TABLE public.marketplace_connections ADD COLUMN IF NOT EXISTS credentials JSONB;

-- Enable RLS on posting_jobs
ALTER TABLE public.posting_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for posting_jobs
CREATE POLICY "Users can view their own posting jobs" ON public.posting_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posting jobs" ON public.posting_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users generally shouldn't update job status manually, but might retry? 
-- For now, restricting update to service role or strict status changes might be better, 
-- but adhering to "Users can only see/manage their own jobs" implies some control.
CREATE POLICY "Users can update their own posting jobs" ON public.posting_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_posting_jobs_updated_at BEFORE UPDATE ON public.posting_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to service_role (implicit usually, but good practice if needed for specific setups)
GRANT ALL ON public.posting_jobs TO service_role;
GRANT ALL ON public.marketplace_connections TO service_role;