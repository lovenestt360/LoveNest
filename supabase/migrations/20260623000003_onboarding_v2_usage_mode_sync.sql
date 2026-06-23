-- ══════════════════════════════════════════════════════════════════
-- ONBOARDING V2 — sincroniza usage_mode quando um segundo membro entra
-- ══════════════════════════════════════════════════════════════════
-- Quando alguém entra num couple_space que já tinha 1 membro (modo solo),
-- ambos os perfis passam a usage_mode='couple' — desbloqueia as
-- funcionalidades de casal na Home sem qualquer ação manual do utilizador
-- original (que pode nem estar online quando o parceiro entra).

CREATE OR REPLACE FUNCTION public.fn_sync_usage_mode_on_join()
RETURNS trigger
SECURITY DEFINER SET search_path = public AS $$
DECLARE
    member_count integer;
BEGIN
    SELECT COUNT(*) INTO member_count FROM public.members WHERE couple_space_id = NEW.couple_space_id;

    IF member_count >= 2 THEN
        UPDATE public.profiles SET usage_mode = 'couple'
        WHERE user_id IN (SELECT user_id FROM public.members WHERE couple_space_id = NEW.couple_space_id)
          AND (usage_mode IS NULL OR usage_mode = 'solo');
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_usage_mode_on_join ON public.members;
CREATE TRIGGER sync_usage_mode_on_join
    AFTER INSERT ON public.members
    FOR EACH ROW EXECUTE PROCEDURE fn_sync_usage_mode_on_join();

NOTIFY pgrst, 'reload schema';

SELECT 'Onboarding V2: usage_mode sincronizado ao emparelhar ✓' AS resultado;
