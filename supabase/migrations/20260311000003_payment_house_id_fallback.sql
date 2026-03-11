-- 20260311000003_payment_house_id_fallback.sql

-- Se o frontend do Lovable (em cache) ainda procurar por 'house_id', isto garante que a coluna existe e espelha 'couple_space_id'.
-- Isto resolve o erro 'invalid syntax for type uuid: undefined' de forma permanente.

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS house_id UUID GENERATED ALWAYS AS (couple_space_id) STORED;
