-- Migration: 20251229000001_pc_resale_scanner_tables.sql
-- PC Resale Scanner feature: Analyze PC build listings for profitable part resale

-- PC Resale Opportunities: Analyzed PC build listings
CREATE TABLE IF NOT EXISTS public.pc_resale_opportunities (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Source Listing Info
    platform TEXT NOT NULL, -- 'facebook', 'craigslist'
    platform_listing_url TEXT NOT NULL,
    listing_title TEXT NOT NULL,
    listing_description TEXT,
    listing_price NUMERIC(10,2) NOT NULL,
    listing_image_urls JSONB DEFAULT '[]',
    seller_location TEXT,
    
    -- Component Analysis
    extracted_components JSONB DEFAULT '{}', -- {cpu: [...], gpu: [...], ram: [...], storage: [...], psu: [...], motherboard: [...]}
    estimated_tier TEXT, -- 'budget', 'mid-range', 'high-end', 'unknown'
    missing_specs TEXT[], -- Missing critical component types
    
    -- Valuation
    total_component_value NUMERIC(10,2), -- Aggregated eBay value
    component_breakdown JSONB DEFAULT '{}', -- Per-component valuations
    valuation_confidence NUMERIC(3,2), -- 0.0-1.0
    
    -- Profitability Analysis
    gross_profit NUMERIC(10,2),
    net_profit NUMERIC(10,2),
    roi_percentage NUMERIC(6,2),
    roi_multiplier NUMERIC(4,2),
    cost_breakdown JSONB DEFAULT '{}', -- {dismantling, shipping, ebay_fees, packaging, total}
    profit_threshold_met BOOLEAN DEFAULT false,
    recommendation TEXT, -- 'BUY', 'SKIP'
    recommendation_reason TEXT,
    
    -- Status
    status TEXT DEFAULT 'analyzed', -- 'analyzed', 'bookmarked', 'purchased', 'passed', 'sold'
    user_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_listing UNIQUE (user_id, platform, platform_listing_url)
);

CREATE INDEX idx_pc_resale_user ON public.pc_resale_opportunities(user_id);
CREATE INDEX idx_pc_resale_recommendation ON public.pc_resale_opportunities(recommendation);
CREATE INDEX idx_pc_resale_status ON public.pc_resale_opportunities(status);
CREATE INDEX idx_pc_resale_roi ON public.pc_resale_opportunities(roi_percentage DESC);

-- PC Component Valuations: Cached per-component eBay values
CREATE TABLE IF NOT EXISTS public.pc_component_valuations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    
    -- Component Info
    component_type TEXT NOT NULL, -- 'cpu', 'gpu', 'ram', 'storage', 'psu', 'motherboard', 'case', 'cooling'
    component_name TEXT NOT NULL, -- e.g., 'RTX 3080', 'Ryzen 7 5800X'
    normalized_name TEXT NOT NULL, -- Lowercased, cleaned for caching
    condition TEXT DEFAULT 'used', -- 'new', 'used', 'refurbished'
    
    -- eBay Pricing Data
    avg_price NUMERIC(10,2),
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2),
    sample_count INTEGER,
    sample_listings JSONB DEFAULT '[]', -- Top 5 examples
    
    -- Cache Control
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    CONSTRAINT unique_component UNIQUE (normalized_name, condition)
);

CREATE INDEX idx_component_val_name ON public.pc_component_valuations(normalized_name);
CREATE INDEX idx_component_val_type ON public.pc_component_valuations(component_type);
CREATE INDEX idx_component_val_expires ON public.pc_component_valuations(expires_at);

-- PC Resale Reports: Aggregated analysis reports
CREATE TABLE IF NOT EXISTS public.pc_resale_reports (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Report Summary
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_listings_analyzed INTEGER DEFAULT 0,
    profitable_opportunities INTEGER DEFAULT 0,
    skip_listings INTEGER DEFAULT 0,
    total_potential_profit NUMERIC(10,2) DEFAULT 0,
    average_roi_percentage NUMERIC(6,2) DEFAULT 0,
    
    -- Top Opportunities (top 10)
    top_opportunities JSONB DEFAULT '[]',
    
    -- Metadata
    platforms_scanned TEXT[] DEFAULT ARRAY['facebook', 'craigslist'],
    scan_location TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_report_date UNIQUE (user_id, report_date)
);

CREATE INDEX idx_resale_report_user ON public.pc_resale_reports(user_id);
CREATE INDEX idx_resale_report_date ON public.pc_resale_reports(report_date DESC);

-- RLS Policies
ALTER TABLE public.pc_resale_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_component_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_resale_reports ENABLE ROW LEVEL SECURITY;

-- User policies for pc_resale_opportunities
CREATE POLICY "Users can manage their own PC resale opportunities"
    ON public.pc_resale_opportunities
    USING (auth.uid() = user_id);

-- Component valuations are readable by all authenticated users (shared cache)
CREATE POLICY "Component valuations are readable by all authenticated users"
    ON public.pc_component_valuations
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage component valuations"
    ON public.pc_component_valuations
    TO service_role
    USING (true)
    WITH CHECK (true);

-- User policies for pc_resale_reports
CREATE POLICY "Users can manage their own PC resale reports"
    ON public.pc_resale_reports
    USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_pc_resale_opportunities_updated_at
    BEFORE UPDATE ON public.pc_resale_opportunities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

