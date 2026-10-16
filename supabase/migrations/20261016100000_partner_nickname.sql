-- Alcunha carinhosa que cada pessoa dá ao seu par ("Amor", "Mozão"…).
-- Fica no perfil de quem a escolhe e a app mostra-a no lugar do nome do par.
-- A RLS de profiles já deixa cada pessoa atualizar o próprio perfil.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_nickname text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_nickname_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_nickname_length
  CHECK (partner_nickname IS NULL OR char_length(partner_nickname) <= 30);
