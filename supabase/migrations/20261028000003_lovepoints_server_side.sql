-- LovePoints calculados no servidor.
-- Antes, o browser chamava award_lovepoints() com o valor que quisesse (até 500
-- por pedido, sem limite de repetições). Agora os pontos das ações do cliente
-- são dados por triggers quando a linha real é criada, com valor fixo e uma
-- única vez por linha (ref_id). award_lovepoints() deixa de estar exposta ao
-- browser; as funções do servidor que a usam (missões, streak, loja do
-- Guardião) correm como dono e não são afetadas.
-- Aplicar ANTES do deploy do frontend que deixa de chamar award_lovepoints.

ALTER TABLE public.lovepoints_ledger ADD COLUMN IF NOT EXISTS ref_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS lovepoints_ledger_source_ref_key
  ON public.lovepoints_ledger (source, ref_id) WHERE ref_id IS NOT NULL;

-- Dá pontos uma única vez por (source, ref_id).
CREATE OR REPLACE FUNCTION public.grant_lovepoints_once(
  p_couple_space_id uuid, p_user_id uuid, p_amount integer,
  p_source text, p_description text, p_ref_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.lovepoints_ledger (couple_space_id, user_id, amount, source, description, ref_id)
  VALUES (p_couple_space_id, p_user_id, p_amount, p_source, p_description, p_ref_id)
  ON CONFLICT (source, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, p_amount)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + p_amount, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_lovepoints_on_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'photos' THEN
    PERFORM public.grant_lovepoints_once(NEW.couple_space_id, NEW.uploaded_by, 5,
      'memoria', 'Nova memória guardada', NEW.id);
  ELSIF TG_TABLE_NAME = 'relationship_events' THEN
    PERFORM public.grant_lovepoints_once(NEW.couple_space_id, NEW.created_by, 15,
      'data_especial', 'Data importante: ' || NEW.title, NEW.id);
  ELSIF TG_TABLE_NAME = 'book_reflections' THEN
    PERFORM public.grant_lovepoints_once(NEW.couple_space_id, NEW.user_id, 5,
      'reflexao', 'Reflexão de leitura partilhada', NEW.id);
  ELSIF TG_TABLE_NAME = 'book_reading_progress' THEN
    -- Uma vez por pessoa e livro (a linha é única por book_id + user_id).
    IF NEW.completed_at IS NOT NULL
       AND (TG_OP = 'INSERT' OR OLD.completed_at IS NULL) THEN
      PERFORM public.grant_lovepoints_once(NEW.couple_space_id, NEW.user_id, 50,
        'livro_concluido', 'Livro terminado', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lovepoints_on_photo ON public.photos;
CREATE TRIGGER lovepoints_on_photo AFTER INSERT ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.tr_lovepoints_on_action();

DROP TRIGGER IF EXISTS lovepoints_on_relationship_event ON public.relationship_events;
CREATE TRIGGER lovepoints_on_relationship_event AFTER INSERT ON public.relationship_events
  FOR EACH ROW EXECUTE FUNCTION public.tr_lovepoints_on_action();

DROP TRIGGER IF EXISTS lovepoints_on_book_reflection ON public.book_reflections;
CREATE TRIGGER lovepoints_on_book_reflection AFTER INSERT ON public.book_reflections
  FOR EACH ROW EXECUTE FUNCTION public.tr_lovepoints_on_action();

DROP TRIGGER IF EXISTS lovepoints_on_book_completed ON public.book_reading_progress;
CREATE TRIGGER lovepoints_on_book_completed AFTER INSERT OR UPDATE OF completed_at ON public.book_reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.tr_lovepoints_on_action();

REVOKE EXECUTE ON FUNCTION public.grant_lovepoints_once(uuid, uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tr_lovepoints_on_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_lovepoints(uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_lovepoints(uuid, integer, text, text, uuid) TO service_role;
