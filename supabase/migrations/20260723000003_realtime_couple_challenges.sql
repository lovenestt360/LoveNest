-- Ativa Realtime na tabela couple_challenges para que INSERT/UPDATE/DELETE
-- propaguem instantaneamente para ambos os parceiros sem necessidade de refresh.

ALTER PUBLICATION supabase_realtime ADD TABLE couple_challenges;
