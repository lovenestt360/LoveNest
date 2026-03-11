-- 20260310000005_payment_settings.sql

-- 1. Create payment_settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mpesa_number TEXT,
    emola_number TEXT,
    mkesh_number TEXT,
    account_name TEXT,
    whatsapp_number TEXT,
    whatsapp_message_template TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert initial default configuration
INSERT INTO public.payment_settings (
    mpesa_number, 
    emola_number, 
    mkesh_number, 
    account_name, 
    whatsapp_number, 
    whatsapp_message_template
) VALUES (
    '841234567',
    '861234567',
    '',
    'Dilson Quenita',
    '258841234567',
    'Olá, acabei de pagar o plano LoveNest.

Nome: {user_name}
Email: {user_email}
Casa: {house_name}
Plano: {plan_name}
Valor: {plan_price}

Segue o comprovativo para activação.'
);

-- 3. Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public can read
DROP POLICY IF EXISTS "Public can view payment settings" ON public.payment_settings;
CREATE POLICY "Public can view payment settings"
    ON public.payment_settings FOR SELECT
    USING (true);

-- Admins can update (assuming admins check via app logic, but setting true for ALL ops like the other admin tables in this project)
DROP POLICY IF EXISTS "Admins can update payment settings" ON public.payment_settings;
CREATE POLICY "Admins can update payment settings"
    ON public.payment_settings FOR ALL
    USING (true)
    WITH CHECK (true);
