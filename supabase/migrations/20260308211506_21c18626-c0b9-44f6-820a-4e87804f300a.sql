
-- Create push_subscriptions table to store Web Push API subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public access since no auth in this app)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert subscriptions
CREATE POLICY "Anyone can insert push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read subscriptions (needed by edge function)
CREATE POLICY "Anyone can read push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (true);

-- Allow anyone to delete their subscription
CREATE POLICY "Anyone can delete push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (true);

-- Create vapid_config table to store generated VAPID keys
CREATE TABLE public.vapid_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vapid_config ENABLE ROW LEVEL SECURITY;

-- Only allow reading public key (not private)
CREATE POLICY "Anyone can read vapid public key"
  ON public.vapid_config FOR SELECT
  USING (true);
