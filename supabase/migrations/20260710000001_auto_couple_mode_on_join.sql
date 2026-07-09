-- ─────────────────────────────────────────────────────────────────────────────
-- Transição solo → casal automática
--
-- Quando um segundo utilizador entra num couple_space (INSERT em members),
-- este trigger actualiza usage_mode = 'couple' em todos os perfis desse espaço.
-- Funciona independentemente de onde o join é feito (CoupleSpace.tsx, Edge
-- Function join-couple-space, ou SQL directo).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_auto_couple_mode_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só actua quando o espaço passa a ter 2 ou mais membros
  IF (SELECT COUNT(*) FROM members WHERE couple_space_id = NEW.couple_space_id) >= 2 THEN
    UPDATE profiles
    SET usage_mode = 'couple'
    WHERE user_id IN (
      SELECT user_id FROM members WHERE couple_space_id = NEW.couple_space_id
    )
    AND (usage_mode IS NULL OR usage_mode != 'couple');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_couple_mode ON members;
CREATE TRIGGER trg_auto_couple_mode
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_couple_mode_on_join();
