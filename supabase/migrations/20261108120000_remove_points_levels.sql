-- Os LovePoints deixam de contar para níveis: a fase depende só dos dias seguidos.
-- Remove a função que somava os pontos ganhos e o registo da celebração antiga.
-- A app já não usa nenhum dos dois. O extrato de pontos não é alterado.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase, depois do merge.

BEGIN;

DROP FUNCTION IF EXISTS public.get_lifetime_points(UUID);
DROP FUNCTION IF EXISTS public.get_lifetime_points__sem_porta(UUID);

DELETE FROM public.ceremonies_log WHERE ceremony_type = 'level_up';

NOTIFY pgrst, 'reload schema';

COMMIT;
