-- Allow service_role to manage profiles (insert, update, select, delete)
-- This fixes the "new row violates row-level security policy" error when the Admin Client creates users.

CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);