ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'unknown';
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_agent text DEFAULT '';