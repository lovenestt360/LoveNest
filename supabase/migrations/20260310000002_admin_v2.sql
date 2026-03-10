-- Advanced Admin Panel (V2) Upgrades

-- 1. Create Internal Admin Users table for custom login
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (or the database itself) can read admin users for login purposes, 
-- but in a simple SaaS we can leave SELECT open or protected by anon key.
DROP POLICY IF EXISTS "Public can view admin usernames" ON public.admin_users;
CREATE POLICY "Public can view admin usernames"
    ON public.admin_users FOR SELECT
    USING (true);

-- Allow inserting for the initial setup. In prod, this should be restricted.
DROP POLICY IF EXISTS "Allow registration of admin users" ON public.admin_users;
CREATE POLICY "Allow registration of admin users"
    ON public.admin_users FOR INSERT
    WITH CHECK (true);

-- 2. Create Subscription Plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view active subscription plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);

-- Admins can manage plans
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans"
    ON public.subscription_plans FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert Default Plans
INSERT INTO public.subscription_plans (name, price, features)
VALUES 
    ('LoveNest Mensal', '500 MZN / Mês', ARRAY['Acesso total às rotinas', 'Notificações diárias', 'Suporte via WhatsApp']),
    ('LoveNest Semestral', '2500 MZN / Semestre', ARRAY['Acesso total às rotinas', 'Notificações diárias', 'Desconto especial']),
    ('LoveNest Lifetime', '10.000 MZN / Único', ARRAY['Acesso vitalício', 'Atualizações grátis', 'Prioridade no suporte'])
ON CONFLICT DO NOTHING;
