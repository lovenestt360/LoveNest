-- ============================================================
-- Fix: ajustar pontos de bónus referral
-- Convidado: 70 → 60 pts  |  Convidador: 50 pts (sem alteração)
-- ============================================================

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
      updated_at   = now();

    RAISE NOTICE 'Referral: +50 pontos aplicados ao convidador (couple: %)', p_inviter_couple_id;
  END IF;

  -- Bónus para o Convidado (+60)
  IF p_new_couple_id IS NOT NULL THEN
    INSERT INTO public.points (couple_space_id, total_points, updated_at)
    VALUES (p_new_couple_id, 60, now())
    ON CONFLICT (couple_space_id)
    DO UPDATE SET
      total_points = public.points.total_points + 60,
      updated_at   = now();

    RAISE NOTICE 'Referral: +60 pontos aplicados ao convidado (couple: %)', p_new_couple_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Bónus referral actualizado: convidado +60, convidador +50 ✓' AS resultado;
