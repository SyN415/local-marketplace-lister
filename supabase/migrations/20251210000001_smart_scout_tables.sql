-- Migration: 20251210000001_smart_scout_tables.sql

-- Watchlist Searches: User-saved keyword monitors
CREATE TABLE IF NOT EXISTS public.watchlist_searches (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Search Configuration
    keywords TEXT NOT NULL,
    platforms TEXT[] DEFAULT ARRAY['facebook', 'craigslist'],
    max_price NUMERIC(10,2),
    min_price NUMERIC(10,2),
    location TEXT,
    radius_miles INTEGER DEFAULT 25,
    
    -- Notification Settings
    notification_enabled BOOLEAN DEFAULT true,
    notification_sound BOOLEAN DEFAULT false,
    check_interval_minutes INTEGER DEFAULT 30, -- Min 15, enforced in app
    
    -- State
    is_active BOOLEAN DEFAULT true,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    total_matches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_watchlist_user ON public.watchlist_searches(user_id);
CREATE INDEX idx_watchlist_active ON public.watchlist_searches(is_active);

-- Price Intelligence: Cached eBay comparison data
CREATE TABLE IF NOT EXISTS public.price_intelligence (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    
    -- Query Info
    search_query TEXT NOT NULL,
    normalized_query TEXT NOT NULL, -- Lowercased, cleaned for caching
    
    -- eBay Data
    ebay_avg_price NUMERIC(10,2),
    ebay_low_price NUMERIC(10,2),
    ebay_high_price NUMERIC(10,2),
    ebay_sold_count INTEGER,
    ebay_active_count INTEGER,
    ebay_sample_listings JSONB DEFAULT '[]', -- Top 5 examples
    
    -- Cache Control
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    CONSTRAINT unique_normalized_query UNIQUE (normalized_query)
);

CREATE INDEX idx_price_intel_query ON public.price_intelligence(normalized_query);
CREATE INDEX idx_price_intel_expires ON public.price_intelligence(expires_at);

-- Market Comparisons: User-saved deal analyses
CREATE TABLE IF NOT EXISTS public.market_comparisons (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Source Listing Info
    platform TEXT NOT NULL,
    platform_listing_url TEXT NOT NULL,
    listing_title TEXT NOT NULL,
    listing_price NUMERIC(10,2) NOT NULL,
    listing_image_url TEXT,
    
    -- Comparison Results
    price_intelligence_id UUID REFERENCES public.price_intelligence(id),
    spread_amount NUMERIC(10,2), -- Positive = potential profit
    spread_percentage NUMERIC(5,2),
    deal_score INTEGER, -- 1-100 rating
    
    -- User Actions
    is_bookmarked BOOLEAN DEFAULT false,
    user_notes TEXT,
    status TEXT DEFAULT 'new', -- new, contacted, purchased, passed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_comp_user ON public.market_comparisons(user_id);
CREATE INDEX idx_market_comp_status ON public.market_comparisons(status);

-- Watchlist Match History: Tracks found items for deduplication
CREATE TABLE IF NOT EXISTS public.watchlist_matches (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES public.watchlist_searches(id) ON DELETE CASCADE,
    
    -- Match Info
    platform TEXT NOT NULL,
    platform_listing_id TEXT NOT NULL, -- FB/CL internal ID if available
    platform_listing_url TEXT NOT NULL,
    listing_title TEXT NOT NULL,
    listing_price NUMERIC(10,2),
    listing_image_url TEXT,
    
    -- Notification
    notified_at TIMESTAMP WITH TIME ZONE,
    
    -- User Action
    is_dismissed BOOLEAN DEFAULT false,
    
    found_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_watchlist_listing UNIQUE (watchlist_id, platform, platform_listing_id)
);

CREATE INDEX idx_watchlist_matches_watchlist ON public.watchlist_matches(watchlist_id);

-- RLS Policies
ALTER TABLE public.watchlist_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_matches ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can manage their own watchlist searches" 
    ON public.watchlist_searches 
    USING (auth.uid() = user_id);

CREATE POLICY "Price intelligence is readable by all authenticated users" 
    ON public.price_intelligence 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Service role can manage price intelligence" 
    ON public.price_intelligence 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can manage their own market comparisons" 
    ON public.market_comparisons 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view matches for their watchlists" 
    ON public.watchlist_matches 
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.watchlist_searches 
        WHERE id = watchlist_matches.watchlist_id 
        AND user_id = auth.uid()
    ));

-- Triggers
CREATE TRIGGER update_watchlist_searches_updated_at 
    BEFORE UPDATE ON public.watchlist_searches 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_comparisons_updated_at 
    BEFORE UPDATE ON public.market_comparisons 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();