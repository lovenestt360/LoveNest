-- Função para validar o limite de 2 membros por LoveNest
CREATE OR REPLACE FUNCTION public.check_couple_space_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT count(*) INTO member_count
  FROM public.members
  WHERE couple_space_id = NEW.couple_space_id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'couple_space_full' USING MESSAGE = 'Este LoveNest já está completo (máximo 2 membros).';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para aplicar a validação antes de inserir
DROP TRIGGER IF EXISTS tr_check_member_limit ON public.members;
CREATE TRIGGER tr_check_member_limit
BEFORE INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.check_couple_space_member_limit();
