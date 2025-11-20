-- Migration to switch from subscription model to credit-based model

-- Remove subscription fields
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS subscription_plan,
DROP COLUMN IF EXISTS subscription_end_date;

-- Add credits field with default 5 for new users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5 NOT NULL;

-- Ensure Stripe Customer ID exists (it might already be there from previous migrations)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_credits ON public.profiles(credits);