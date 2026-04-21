-- ══════════════════════════════════════════════════════════════════════
-- REFERRAL REWARD SYSTEM (BONUS DE PONTOS)
--
-- ATUAÇÃO:
-- Quando um novo membro entra num LoveNest (insere em public.members),
-- verifica se ele foi convidado por alguém (tabela referrals).
-- Se sim:
--   1. Dá 70 pontos à Casa do Convidado (quem entra).
--   2. Dá 50 pontos à Casa do Convidador (quem convidou).
--   3. Marca a recompensa como entregue.
-- ══════════════════════════════════════════════════════════════════════

-- Garantir que a coluna "reward_given" existe na tabela referrals para evitar erros "column does not exist"
ALTER TABLE IF EXISTS public.referrals 
ADD COLUMN IF NOT EXISTS reward_given boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.trg_process_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_couple_space UUID;
BEGIN
  -- 1. Verificar se o membro recém-adicionado tem um referral pendente
  SELECT referrer_user_id
  INTO v_referrer_id
  FROM public.referrals
  WHERE new_user_id = NEW.user_id
    AND reward_given = false
  LIMIT 1;

  -- Se foi convidado por alguém e ainda não ganhou pontos
  IF v_referrer_id IS NOT NULL THEN
    
    -- 2. Dar 70 pontos à Casa do Convidado (a casa onde ele acabou de entrar)
    INSERT INTO public.points (couple_space_id, total_points, updated_at)
    VALUES (NEW.couple_space_id, 70, now())
    ON CONFLICT (couple_space_id) 
    DO UPDATE SET 
      total_points = public.points.total_points + 70,
      updated_at = now();

    -- 3. Marcar o convite como "Recompensa Entregue" para evitar duplicados
    UPDATE public.referrals
    SET reward_given = true
    WHERE new_user_id = NEW.user_id;

    -- 4. Encontrar a Casa atual do Convidador
    SELECT couple_space_id
    INTO v_referrer_couple_space
    FROM public.members
    WHERE user_id = v_referrer_id
    LIMIT 1;

    -- Se o convidador já estiver numa casa, damos-lhe os 50 pontos
    IF v_referrer_couple_space IS NOT NULL THEN
      INSERT INTO public.points (couple_space_id, total_points, updated_at)
      VALUES (v_referrer_couple_space, 50, now())
      ON CONFLICT (couple_space_id) 
      DO UPDATE SET 
        total_points = public.points.total_points + 50,
        updated_at = now();
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que não duplica
DROP TRIGGER IF EXISTS on_member_insert_reward_referral ON public.members;

-- Atrelar o Trigger à tabela Members (disparado logo que alguém entra numa casa)
CREATE TRIGGER on_member_insert_reward_referral
AFTER INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.trg_process_referral_reward();
