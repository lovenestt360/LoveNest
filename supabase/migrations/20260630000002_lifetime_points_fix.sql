-- Corrige bug critico: o Nivel da Jornada estava a ser calculado a
-- partir do saldo atual de LovePoints (points.total_points), que
-- desce quando se compra algo na loja. Isto viola a regra central do
-- documento (secção 6.1): "o Nivel da Jornada nunca desce". O nivel
-- deve refletir o total ALGUMA VEZ ganho (historico), nao o saldo
-- gastavel. lovepoints_ledger já tem esse historico completo — basta
-- somar só as entradas positivas (compras já escrevem entradas
-- negativas via award_lovepoints, e fn_buy_loveshield nunca escreveu
-- no ledger, por isso também não interfere aqui).

CREATE OR REPLACE FUNCTION public.get_lifetime_points(p_couple_space_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.lovepoints_ledger
  WHERE couple_space_id = p_couple_space_id AND amount > 0;
$function$;

GRANT EXECUTE ON FUNCTION public.get_lifetime_points(uuid) TO authenticated;
