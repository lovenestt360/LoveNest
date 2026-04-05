-- 20260404000000_prevent_duplicate_members.sql

-- 1. CLEANUP PREVENTIVO
-- Limpar quaisquer duplicados residuais existentes antes de trancar a tabela.
-- Mantém a casa (couple_space_id) em que o utilizador entrou primeiro (joined_at ASC).
DELETE FROM public.members
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at ASC) as row_num
    FROM public.members
  ) duplicates
  WHERE duplicates.row_num > 1
);

-- 2. BLOQUEIO DEFINITIVO (CONSTRAINT UNIQUE)
-- Impede que existam 2 linhas para o mesmo user_id. 
-- Garante que um utilizador apenas pertence a um casal e nunca cria múltiplos memberships.

-- Criar índice único se não existir
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_space_membership ON public.members (user_id);

-- Para garantir que a PostgREST compreende exatamente a constraint (erros claros 23505)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'uc_members_user_id'
  ) THEN
    ALTER TABLE public.members 
    ADD CONSTRAINT uc_members_user_id UNIQUE USING INDEX unique_user_space_membership;
  END IF;
END $$;
