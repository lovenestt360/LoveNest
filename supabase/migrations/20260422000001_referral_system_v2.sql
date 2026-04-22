-- ══════════════════════════════════════════════════════════════════════
-- REFERRAL REWARD SYSTEM V2 (CORREÇÃO)
-- 
-- REGRAS:
-- 1. Quando um utilizador entra num LoveNest (members insert):
--    - Verifica se há um referral pendente (tabela referrals).
--    - Se sim, aplica bónus: +70 (Convidado), +50 (Convidador).
-- 2. Atribuição via função atómica apply_referral_bonus.
-- 3. Logs com RAISE NOTICE.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Função Atómica para aplicar o bónus
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_inviter_couple_id UUID,
  p_new_couple_id     UUID
)
RETURNS VOID AS $$
BEGIN
  -- Bónus para o Convidador (+50)
  IF p_inviter_couple_id IS NOT NULL THEN
    INSERT INTO public.points (couple_space_id, total_points, updated_at)
    VALUES (p_inviter_couple_id, 50, now())
    ON CONFLICT (couple_space_id) 
    DO UPDATE SET 
      total_points = public.points.total_points + 50,
      updated_at = now();
      
    RAISE NOTICE 'Referral: +50 pontos aplicados ao convidador (couple: %)', p_inviter_couple_id;
  END IF;

  -- Bónus para o Convidado (+70)
  IF p_new_couple_id IS NOT NULL THEN
    INSERT INTO public.points (couple_space_id, total_points, updated_at)
    VALUES (p_new_couple_id, 70, now())
    ON CONFLICT (couple_space_id) 
    DO UPDATE SET 
      total_points = public.points.total_points + 70,
      updated_at = now();

    RAISE NOTICE 'Referral: +70 pontos aplicados ao convidado (couple: %)', p_new_couple_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função de Trigger para detetar entrada em CoupleSpace
CREATE OR REPLACE FUNCTION public.trg_on_member_join_referral()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id           UUID;
  v_referrer_couple_space UUID;
  v_reward_given          BOOLEAN;
BEGIN
  -- 1. Verificar se o utilizador foi referido
  SELECT referrer_user_id, reward_given
  INTO v_referrer_id, v_reward_given
  FROM public.referrals
  WHERE new_user_id = NEW.user_id
  LIMIT 1;

  -- 2. Se existe referral e ainda não foi recompensado
  IF v_referrer_id IS NOT NULL AND (v_reward_given IS FALSE OR v_reward_given IS NULL) THEN
    
    -- Evitar self-referral (apenas por segurança)
    IF v_referrer_id = NEW.user_id THEN
      RETURN NEW;
    END IF;

    -- 3. Encontrar a casa atual do convidador
    SELECT couple_space_id
    INTO v_referrer_couple_space
    FROM public.members
    WHERE user_id = v_referrer_id
    LIMIT 1;

    -- 4. Aplicar o bónus via função atómica
    -- Nota: p_inviter_couple_id pode ser NULL se o convidador ainda não estiver numa casa, 
    -- mas a função apply_referral_bonus lida com isso.
    PERFORM public.apply_referral_bonus(v_referrer_couple_space, NEW.couple_space_id);

    -- 5. Marcar como entregue (Garantir que só executa uma vez)
    UPDATE public.referrals
    SET reward_given = true
    WHERE new_user_id = NEW.user_id;

    RAISE NOTICE 'Referral Processado: NewUser=%, Referrer=%, InviterCouple=%', NEW.user_id, v_referrer_id, v_referrer_couple_space;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Configurar o Trigger
DROP TRIGGER IF EXISTS on_member_insert_reward_referral ON public.members;
DROP TRIGGER IF EXISTS on_member_insert_referral_v2 ON public.members;

CREATE TRIGGER on_member_insert_referral_v2
AFTER INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.trg_on_member_join_referral();

-- Garantir que a coluna existe na tabela referrals
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'reward_given'
    ) THEN
        ALTER TABLE public.referrals ADD COLUMN reward_given boolean DEFAULT false;
    END IF;
END $$;
