
-- Drop the RESTRICTIVE policies
DROP POLICY IF EXISTS "Allow public delete push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public select push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public update push subscriptions" ON public.push_subscriptions;

-- Recreate as PERMISSIVE (explicit)
CREATE POLICY "push_sub_insert" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "push_sub_select" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "push_sub_update" ON public.push_subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "push_sub_delete" ON public.push_subscriptions FOR DELETE TO anon, authenticated USING (true);
