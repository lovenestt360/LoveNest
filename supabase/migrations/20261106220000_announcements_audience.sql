-- Avisos (painel admin, parte 4):
--  * público: todos, só quem tem plano pago, ou só quem está em experiência;
--  * duração: o aviso some sozinho da Home quando passa ends_at;
--  * segurança: só admins criam, mudam ou apagam. A regra antiga deixava QUALQUER
--    pessoa (até sem sessão) escrever avisos que aparecem na Home de todos.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

ALTER TABLE public.admin_announcements
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

ALTER TABLE public.admin_announcements DROP CONSTRAINT IF EXISTS admin_announcements_audience_check;
ALTER TABLE public.admin_announcements
  ADD CONSTRAINT admin_announcements_audience_check CHECK (audience IN ('all', 'paid', 'trial'));

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.admin_announcements;
DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.admin_announcements;
DROP POLICY IF EXISTS "admin_announcements_admin_all" ON public.admin_announcements;
DROP POLICY IF EXISTS "admin_announcements_read" ON public.admin_announcements;

CREATE POLICY "admin_announcements_admin_all"
  ON public.admin_announcements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Cada casa só vê os avisos ativos, dentro do prazo e para o seu público.
CREATE POLICY "admin_announcements_read"
  ON public.admin_announcements FOR SELECT
  TO authenticated
  USING (
    active
    AND (ends_at IS NULL OR ends_at > now())
    AND (
      audience = 'all'
      OR EXISTS (
        SELECT 1 FROM public.couple_spaces cs
        WHERE cs.id = public.get_user_couple_space_id()
          AND (
            (audience = 'paid'
              AND cs.subscription_status = 'active'
              AND (cs.subscription_ends_at IS NULL OR cs.subscription_ends_at > now()))
            OR
            (audience = 'trial'
              AND cs.trial_ends_at > now()
              AND NOT (cs.subscription_status = 'active'
                       AND (cs.subscription_ends_at IS NULL OR cs.subscription_ends_at > now())))
          )
      )
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
