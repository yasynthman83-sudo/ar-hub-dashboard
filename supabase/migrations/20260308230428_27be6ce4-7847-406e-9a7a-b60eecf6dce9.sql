-- Drop all existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can read push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update push subscriptions" ON public.push_subscriptions;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Allow public insert push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public select push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public update push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO anon, authenticated
  USING (true);