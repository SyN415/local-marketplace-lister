-- Update existing profiles to have 5 credits if they have 0 or NULL
UPDATE public.profiles
SET credits = 5
WHERE credits = 0 OR credits IS NULL;