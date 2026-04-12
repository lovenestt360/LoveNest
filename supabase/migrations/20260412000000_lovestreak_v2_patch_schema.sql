-- ══════════════════════════════════════════════════════════════
-- LOVESTREAK V2 — Patch de Migração da Tabela streaks Existente
-- Problema: tabela criada sem longest_streak, status, last_active_date
-- Solução:  ALTER TABLE para adicionar colunas em falta + renomear
-- ══════════════════════════════════════════════════════════════

-- 1. Adicionar longest_streak se não existir
ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

-- 2. Adicionar status se não existir
ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'broken', 'frozen'));

-- 3. Adicionar last_active_date se não existir
ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- 4. Copiar dados de last_valid_day → last_active_date (se a coluna antiga existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'streaks'
      AND column_name  = 'last_valid_day'
  ) THEN
    UPDATE public.streaks
    SET last_active_date = last_valid_day
    WHERE last_active_date IS NULL AND last_valid_day IS NOT NULL;

    -- Remover coluna antiga após migrar os dados
    ALTER TABLE public.streaks DROP COLUMN IF EXISTS last_valid_day;
  END IF;
END $$;

-- 5. Sincronizar longest_streak com current_streak nos registos existentes
UPDATE public.streaks
SET longest_streak = current_streak
WHERE longest_streak = 0 AND current_streak > 0;

-- 6. Garantir que todos os couple_spaces têm um registo em streaks
INSERT INTO public.streaks (couple_id, current_streak, longest_streak, last_active_date, status)
SELECT id, 0, 0, NULL, 'active'
FROM public.couple_spaces
ON CONFLICT (couple_id) DO NOTHING;

-- 7. Adicionar daily_activity.activity_date se não existir
ALTER TABLE public.daily_activity
  ADD COLUMN IF NOT EXISTS activity_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 8. Garantir constraint UNIQUE em daily_activity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'daily_activity'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'daily_activity_couple_id_user_id_activity_date_key'
  ) THEN
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_couple_id_user_id_activity_date_key
      UNIQUE (couple_id, user_id, activity_date);
  END IF;
END $$;

SELECT 'Patch aplicado com sucesso ✓' AS resultado;
