// Reconstrução histórica do streak de um casal, para o LoveWrapped.
//
// Porquê: generate-love-wrapped guardava couple_spaces.streak_count tal como
// estava no momento da execução. Esse valor só é recalculado quando a casa
// volta a ter atividade (update_streak), por isso fica parado: uma casa
// inativa desde abril continuava a mostrar "1 dia". E num backfill (Wrapped de
// setembro gerado em outubro) o valor seria o de outubro, não o de setembro.
//
// Semântica (inalterada na intenção, agora calculada corretamente):
//   streak_days = streak que estava vivo no último dia do mês.
//
// Fonte: lovepoints_ledger com source = 'streak_diario'. update_streak()
// regista exatamente uma entrada por cada dia em que o streak foi contado
// (+1 ou recomeço a 1), por isso a lista dessas datas é o registo exato dos
// dias contados. Existe desde 2026-07-03.
//
// Regras replicadas de update_streak() (produção, 2026-10):
//   - dia D seguido ao anterior (gap 0)        → streak + 1
//   - gap de g dias e escudos >= g             → escudos -= g, streak + 1
//   - gap de g dias e escudos <  g             → escudos = 0, streak = 1
//   - escudos repõem-se a 3 no início de cada mês (get_streak, na primeira
//     abertura do mês). Até hoje não houve compras (fn_buy_loveshield).
// No fim do mês: o streak está vivo se os dias falhados desde o último dia
// contado (até ao último dia do mês, inclusive) couberem nos escudos
// disponíveis; caso contrário é 0 — é o que update_streak decidiria na
// próxima execução.
//
// Antes do ledger existir (last_streak_date < 2026-07-03), usa-se o par
// (streak_count, last_streak_date) atual com a mesma regra de "vivo no fim do
// mês" — suficiente porque esses streaks já estão parados há meses.

export const SHIELDS_PER_MONTH = 3;

const DAY = 86_400_000;

function toDay(iso: string): number {
  // "YYYY-MM-DD" (UTC, igual a CURRENT_DATE numa BD em UTC) → nº de dias
  return Math.floor(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DAY);
}

function monthKey(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 7);
}

export interface StreakInput {
  /** Datas (YYYY-MM-DD ou ISO) das entradas streak_diario da casa. */
  countedDays: string[];
  /** Último dia do mês do Wrapped, YYYY-MM-DD. */
  monthEnd: string;
  /** couple_spaces.streak_count / last_streak_date atuais (fallback pré-ledger). */
  currentStreak?: number | null;
  currentLastDate?: string | null;
  /** Primeiro dia coberto pelo ledger. */
  ledgerStart?: string;
}

export function streakAtMonthEnd(input: StreakInput): number {
  const end = toDay(input.monthEnd);
  const ledgerStart = toDay(input.ledgerStart ?? "2026-07-03");

  const days = Array.from(new Set(input.countedDays.map(toDay)))
    .filter((d) => d <= end)
    .sort((a, b) => a - b);

  let streak = 0;
  let last: number | null = null;
  let shields = SHIELDS_PER_MONTH;
  let shieldsMonth: string | null = null;

  for (const d of days) {
    if (monthKey(d) !== shieldsMonth) {
      shields = SHIELDS_PER_MONTH;
      shieldsMonth = monthKey(d);
    }
    if (last === null || streak === 0) {
      streak = 1;
    } else {
      const gap = d - last - 1;
      if (gap <= 0) {
        streak += 1;
      } else if (shields >= gap) {
        shields -= gap;
        streak += 1;
      } else {
        shields = 0;
        streak = 1;
      }
    }
    last = d;
  }

  // Fallback pré-ledger: sem dias contados no ledger até ao fim do mês.
  if (last === null) {
    const s = input.currentStreak ?? 0;
    if (!input.currentLastDate || s <= 0) return 0;
    const ld = toDay(input.currentLastDate);
    if (ld >= ledgerStart || ld > end) return 0; // o ledger devia tê-lo registado
    streak = s;
    last = ld;
    shieldsMonth = null;
  }

  // Vivo no fim do mês? Escudos repõem-se se o último dia contado foi noutro mês.
  const available = monthKey(end) === shieldsMonth ? shields : SHIELDS_PER_MONTH;
  const missed = end - last;
  return missed <= available ? streak : 0;
}

/** Valor máximo atingido durante a reconstrução — usado para validar contra longest_streak. */
export function replayLongest(countedDays: string[]): number {
  const days = Array.from(new Set(countedDays.map(toDay))).sort((a, b) => a - b);
  let streak = 0, best = 0, last: number | null = null, shields = SHIELDS_PER_MONTH;
  let sm: string | null = null;
  for (const d of days) {
    if (monthKey(d) !== sm) { shields = SHIELDS_PER_MONTH; sm = monthKey(d); }
    if (last === null || streak === 0) streak = 1;
    else {
      const gap = d - last - 1;
      if (gap <= 0) streak += 1;
      else if (shields >= gap) { shields -= gap; streak += 1; }
      else { shields = 0; streak = 1; }
    }
    last = d;
    best = Math.max(best, streak);
  }
  return best;
}
