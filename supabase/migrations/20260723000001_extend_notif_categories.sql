-- ══════════════════════════════════════════════════════════════════════
-- Estender notification_settings com categorias de ciclo
-- + política INSERT para utilizadores autenticados
-- ══════════════════════════════════════════════════════════════════════

-- 1. Remover constraint antiga e adicionar com categorias de ciclo
ALTER TABLE public.notification_settings
  DROP CONSTRAINT IF EXISTS category_check;

ALTER TABLE public.notification_settings
  ADD CONSTRAINT category_check CHECK (
    category IN (
      'engagement', 'emotion', 'partner', 'system',
      'ciclo_lembrete', 'ciclo_menstruacao', 'ciclo_fertil'
    )
  );

-- 2. Política INSERT que faltava (upsert da UI precisa de INSERT + UPDATE)
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.notification_settings;
CREATE POLICY "Users can insert their own settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
SELECT 'ciclo notif categories estendidas ✓' AS resultado;
