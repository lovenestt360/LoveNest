-- ══════════════════════════════════════════════════════════════════════
-- FIX: feature_flags — eliminar duplicados + UNIQUE constraint + UPSERT
--
-- Problemas encontrados:
--   1. home_capsula, home_memories, system_enabled tinham 2 linhas cada
--      → toggleGlobal encontrava duplicadas → resultado imprevisível
--   2. Sem UNIQUE constraint → cada toggle criava nova linha em vez de UPDATE
--   3. setTimeout(fetchData) trazia duplicadas e revertia o estado
-- ══════════════════════════════════════════════════════════════════════

-- 1) Eliminar duplicados (manter o mais recente de cada key+scope+target_id)
DELETE FROM public.feature_flags a
USING public.feature_flags b
WHERE a.id < b.id
  AND a.key = b.key
  AND a.scope = b.scope
  AND (a.target_id = b.target_id OR (a.target_id IS NULL AND b.target_id IS NULL));

-- 2) Adicionar coluna auxiliar para UNIQUE (target_id nullable não funciona em UNIQUE directamente)
-- Usar UNIQUE parcial para global (target_id IS NULL) e normal para overrides

-- UNIQUE para flags globais (target_id IS NULL)
DROP INDEX IF EXISTS feature_flags_global_unique;
CREATE UNIQUE INDEX feature_flags_global_unique
  ON public.feature_flags (key, scope)
  WHERE target_id IS NULL;

-- UNIQUE para overrides (target_id NOT NULL)
DROP INDEX IF EXISTS feature_flags_override_unique;
CREATE UNIQUE INDEX feature_flags_override_unique
  ON public.feature_flags (key, scope, target_id)
  WHERE target_id IS NOT NULL;

-- 3) Função UPSERT para o frontend usar (evita INSERT/UPDATE separados)
CREATE OR REPLACE FUNCTION public.upsert_feature_flag(
  p_key      TEXT,
  p_scope    TEXT,
  p_enabled  BOOLEAN,
  p_target_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_target_id IS NULL THEN
    -- Flag global
    INSERT INTO public.feature_flags (key, scope, enabled, target_id)
    VALUES (p_key, p_scope, p_enabled, NULL)
    ON CONFLICT (key, scope) WHERE target_id IS NULL
    DO UPDATE SET enabled = EXCLUDED.enabled
    RETURNING id INTO v_id;
  ELSE
    -- Override por utilizador/casal
    INSERT INTO public.feature_flags (key, scope, enabled, target_id)
    VALUES (p_key, p_scope, p_enabled, p_target_id)
    ON CONFLICT (key, scope, target_id) WHERE target_id IS NOT NULL
    DO UPDATE SET enabled = EXCLUDED.enabled
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_feature_flag(TEXT, TEXT, BOOLEAN, UUID) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
SELECT 'feature_flags deduplicado + UNIQUE indexes + upsert function ✓' AS resultado;
