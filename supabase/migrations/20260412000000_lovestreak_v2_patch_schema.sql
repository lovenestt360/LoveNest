-- ══════════════════════════════════════════════════════════════
-- LOVESTREAK V2 — Fix Definitivo da Tabela streaks
--
-- PROBLEMA: tabela tem dupla coluna: couple_space_id (original NOT NULL)
--           e couple_id (adicionada), causando violação de constraint.
-- SOLUÇÃO:  Unificar: renomear couple_space_id → couple_id ou vice-versa.
-- ══════════════════════════════════════════════════════════════

-- ── PASSO 1: Resolver conflito de colunas couple_space_id / couple_id ──

DO $$
DECLARE
  has_space_id BOOLEAN;
  has_couple_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'streaks' AND column_name = 'couple_space_id'
  ) INTO has_space_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'streaks' AND column_name = 'couple_id'
  ) INTO has_couple_id;

  IF has_space_id AND NOT has_couple_id THEN
    -- Só couple_space_id → renomear para couple_id
    RAISE NOTICE 'Renaming couple_space_id → couple_id';
    ALTER TABLE public.streaks RENAME COLUMN couple_space_id TO couple_id;

  ELSIF has_space_id AND has_couple_id THEN
    -- Ambas existem → copiar dados e dropar a antiga
    RAISE NOTICE 'Both columns exist: merging couple_space_id → couple_id';

    -- Garantir que couple_id tem os dados de couple_space_id onde está NULL
    UPDATE public.streaks
    SET couple_id = couple_space_id
    WHERE couple_id IS NULL AND couple_space_id IS NOT NULL;

    -- Remover a coluna antiga (e o seu FK constraint antes)
    ALTER TABLE public.streaks DROP COLUMN couple_space_id CASCADE;

  ELSE
    RAISE NOTICE 'Column couple_id already correct — nothing to rename';
  END IF;
END $$;


-- ── PASSO 2: Adicionar colunas em falta ────────────────────────────────

ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- status com CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'streaks' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.streaks ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE public.streaks ADD CONSTRAINT streaks_status_check
      CHECK (status IN ('active', 'broken', 'frozen'));
  END IF;
END $$;


-- ── PASSO 3: Migrar last_valid_day → last_active_date ──────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'streaks' AND column_name = 'last_valid_day'
  ) THEN
    UPDATE public.streaks
    SET last_active_date = last_valid_day
    WHERE last_active_date IS NULL AND last_valid_day IS NOT NULL;

    ALTER TABLE public.streaks DROP COLUMN IF EXISTS last_valid_day;
    RAISE NOTICE 'Migrated last_valid_day → last_active_date';
  END IF;
END $$;


-- ── PASSO 4: Garantir UNIQUE(couple_id) ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'streaks'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE public.streaks ADD CONSTRAINT streaks_couple_id_unique UNIQUE (couple_id);
    RAISE NOTICE 'Added UNIQUE constraint on couple_id';
  END IF;
END $$;


-- ── PASSO 5: Sincronizar longest_streak ────────────────────────────────

UPDATE public.streaks
SET longest_streak = current_streak
WHERE longest_streak = 0 AND current_streak > 0;


-- ── PASSO 6: Criar registo para todos os casais (se não existir) ───────

INSERT INTO public.streaks (couple_id, current_streak, longest_streak, last_active_date, status)
SELECT id, 0, 0, NULL, 'active'
FROM public.couple_spaces
ON CONFLICT DO NOTHING;


-- ── PASSO 7: daily_activity — garantir activity_date e UNIQUE ──────────

ALTER TABLE public.daily_activity
  ADD COLUMN IF NOT EXISTS activity_date DATE NOT NULL DEFAULT CURRENT_DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'daily_activity'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'daily_activity_unique_per_day'
  ) THEN
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_unique_per_day
      UNIQUE (couple_id, user_id, activity_date);
    RAISE NOTICE 'Added UNIQUE constraint on daily_activity';
  END IF;
END $$;


-- ── RESULTADO ───────────────────────────────────────────────────────────

SELECT
  'streaks schema OK' AS check_1,
  (SELECT COUNT(*) FROM public.streaks) AS streak_rows,
  (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'streaks'
  ) AS columns;
