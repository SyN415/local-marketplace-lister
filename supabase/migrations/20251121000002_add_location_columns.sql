-- Add location columns to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Create index for geospatial queries (if needed in future, but simple lat/lng for now is fine)
CREATE INDEX IF NOT EXISTS idx_listings_location_lat ON public.listings(location_lat);
CREATE INDEX IF NOT EXISTS idx_listings_location_lng ON public.listings(location_lng);