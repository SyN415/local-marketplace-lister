-- Migration: Integration Updates
-- Created: 2025-11-21
-- Description: Updates database schema for Craigslist and Facebook integrations

-- Update marketplace_connections table
-- Adding oauth_token to specifically store OAuth access tokens (e.g. Facebook)
-- Note: access_token column already exists from initial schema, but we add oauth_token to explicitly match requirements
-- We also ensure refresh_token and token_expires_at exist (they should from initial schema)
DO $$
BEGIN
    -- Add oauth_token if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_connections' AND column_name = 'oauth_token') THEN
        ALTER TABLE public.marketplace_connections ADD COLUMN oauth_token TEXT;
    END IF;

    -- Add email_alias if it doesn't exist (for Craigslist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_connections' AND column_name = 'email_alias') THEN
        ALTER TABLE public.marketplace_connections ADD COLUMN email_alias TEXT;
    END IF;

    -- Ensure refresh_token exists (should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_connections' AND column_name = 'refresh_token') THEN
        ALTER TABLE public.marketplace_connections ADD COLUMN refresh_token TEXT;
    END IF;

    -- Ensure token_expires_at exists (should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_connections' AND column_name = 'token_expires_at') THEN
        ALTER TABLE public.marketplace_connections ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Ensure metadata exists (should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_connections' AND column_name = 'metadata') THEN
        ALTER TABLE public.marketplace_connections ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update posting_jobs table
-- Add fields for tracking external post status and details
DO $$
BEGIN
    -- Add external_id for tracking platform-specific IDs (e.g. CL post ID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posting_jobs' AND column_name = 'external_id') THEN
        ALTER TABLE public.posting_jobs ADD COLUMN external_id TEXT;
    END IF;

    -- Add platform_url for direct links to the post
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posting_jobs' AND column_name = 'platform_url') THEN
        ALTER TABLE public.posting_jobs ADD COLUMN platform_url TEXT;
    END IF;

    -- Add error_details for structured error information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posting_jobs' AND column_name = 'error_details') THEN
        ALTER TABLE public.posting_jobs ADD COLUMN error_details JSONB;
    END IF;
END $$;