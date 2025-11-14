-- Local Marketplace Lister - Initial Database Schema
-- Created: November 14, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')) NOT NULL DEFAULT 'good',
  status TEXT CHECK (status IN ('draft', 'active', 'sold', 'inactive')) NOT NULL DEFAULT 'draft',
  location TEXT,
  phone TEXT,
  email TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace connections table (OAuth tokens)
CREATE TABLE IF NOT EXISTS public.marketplace_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'offerup', 'craigslist')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, platform)
);

-- Posted listings table (track cross-posted items)
CREATE TABLE IF NOT EXISTS public.posted_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'offerup', 'craigslist')),
  platform_listing_id TEXT,
  status TEXT CHECK (status IN ('pending', 'posted', 'failed', 'deleted')) NOT NULL DEFAULT 'pending',
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(listing_id, platform)
);

-- Messages table (buyer communications)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  platform_message_id TEXT,
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at);
CREATE INDEX IF NOT EXISTS idx_posted_listings_listing_id ON public.posted_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON public.messages(listing_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posted_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Listings policies
CREATE POLICY "Users can view their own listings" ON public.listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listings" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);

-- Marketplace connections policies
CREATE POLICY "Users can manage their own marketplace connections" ON public.marketplace_connections
  FOR ALL USING (auth.uid() = user_id);

-- Posted listings policies
CREATE POLICY "Users can view their own posted listings" ON public.posted_listings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = posted_listings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own posted listings" ON public.posted_listings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = posted_listings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own posted listings" ON public.posted_listings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = posted_listings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages for their listings" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = messages.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posted_listings_updated_at BEFORE UPDATE ON public.posted_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();