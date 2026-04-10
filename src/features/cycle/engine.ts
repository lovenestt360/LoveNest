/**
 * ============================================================
 *  CYCLE ENGINE — Motor de Inteligência do Ciclo Menstrual
 *  Fonte única de verdade para todos os cálculos do ciclo.
 *  Os componentes NUNCA devem fazer cálculos — usam apenas
 *  os outputs deste módulo.
 * ============================================================
 */

// ─────────────────────────────────────────────
// TIPOS PÚBLICOS
// ─────────────────────────────────────────────

export type CyclePhase =
  | "menstrual"
  | "folicular"
  | "ovulacao"
  | "luteal"
  | "sem_dados";

export interface CycleEngineInput {
  /** Comprimento médio do ciclo em dias (default: 28) */
  cycleLength: number;
  /** Duração média do período em dias (default: 5) */
  periodLength: number;
  /** Número de dias na fase lútea (default: 14) */
  lutealLength: number;
  /** Dias de TPM antes do próximo período (default: 5) */
  pmsDays: number;
  /** Data de início do último período (ISO "YYYY-MM-DD") */
  lastPeriodDate: string;
  /** Data de fim do último período (ou null se ainda em curso) */
  lastPeriodEndDate: string | null;
}

export interface CycleEngineOutput {
  cycleDay: number;
  phase: CyclePhase;
  /** Fase em português para exibição na UI */
  phaseLabel: string;
  nextPeriod: Date;
  nextPeriodStr: string; // "YYYY-MM-DD"
  fertileWindow: Date[];
  fertileStart: Date;
  fertileEnd: Date;
  fertileStartStr: string;
  fertileEndStr: string;
  ovulationDate: Date;
  ovulationDateStr: string;
  pmsWindow: Date[];
  pmsStart: Date;
  pmsStartStr: string;
  insights: string[];
  /** Dias até a próxima menstruação (negativo = passou) */
  daysUntilNextPeriod: number;
  /** Percentagem de progresso dentro do ciclo (0–100) */
  cycleProgress: number;
  /** Verdadeiro se hoje está dentro do período menstrual */
  isInPeriod: boolean;
  /** Verdadeiro se estamos na janela fértil */
  isInFertileWindow: boolean;
  /** Verdadeiro se estamos na janela de TPM */
  isInPmsWindow: boolean;
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const DEFAULTS = {
  cycleLength: 28,
  periodLength: 5,
  lutealLength: 14,
  pmsDays: 5,
} as const;

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: "Menstruação",
  folicular: "Folicular",
  ovulacao: "Ovulação",
  luteal: "Lútea",
  sem_dados: "Sem dados",
};

// ─────────────────────────────────────────────
// UTILITÁRIOS INTERNOS
// ─────────────────────────────────────────────

/** Cria uma data normalizada (UTC noon) a partir de uma string "YYYY-MM-DD" */
function parseDate(str: string): Date {
  return new Date(str + "T12:00:00Z");
}

/** Formata uma Date para "YYYY-MM-DD" */
export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Adiciona `n` dias a uma string de data, retorna nova string */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/** Número de dias entre duas strings de data (b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000
  );
}

/** "YYYY-MM-DD" para exibição curta: "15 abr." */
export function formatShortDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

/** "YYYY-MM-DD" para exibição longa: "terça-feira, 15 de abril" */
export function formatLongDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─────────────────────────────────────────────
// FUNÇÕES EXPORTADAS INDIVIDUAIS
// ─────────────────────────────────────────────

/** Dia actual do ciclo (1 = primeiro dia da menstruação) */
export function getCycleDay(today: string, lastPeriodDate: string): number {
  return daysBetween(lastPeriodDate, today) + 1;
}

/** Fase do ciclo com base no dia actual */
export function getCurrentPhase(
  cycleDay: number,
  periodLength = DEFAULTS.periodLength,
  ovulationDay: number = DEFAULTS.cycleLength - DEFAULTS.lutealLength,
  cycleLength = DEFAULTS.cycleLength,
  pmsDays = DEFAULTS.pmsDays,
  isInPeriod = false
): CyclePhase {
  if (isInPeriod || (cycleDay >= 1 && cycleDay <= periodLength)) {
    return "menstrual";
  }
  if (cycleDay === ovulationDay) {
    return "ovulacao";
  }
  const pmsStart = cycleLength - pmsDays;
  if (cycleDay >= pmsStart) {
    return "luteal"; // últimos dias = lútea/TPM
  }
  if (cycleDay > ovulationDay) {
    return "luteal";
  }
  return "folicular";
}

/** Data prevista da próxima menstruação */
export function getNextPeriodDate(
  lastPeriodDate: string,
  cycleLength = DEFAULTS.cycleLength
): string {
  return addDays(lastPeriodDate, cycleLength);
}

/** Janela fértil: ovulação ± 2 dias → 5 dias no total */
export function getFertileWindow(
  lastPeriodDate: string,
  cycleLength = DEFAULTS.cycleLength,
  lutealLength = DEFAULTS.lutealLength
): { start: string; end: string; ovulation: string; days: string[] } {
  const ovDay = cycleLength - lutealLength;
  const ovulation = addDays(lastPeriodDate, ovDay);
  const start = addDays(lastPeriodDate, ovDay - 2);
  const end = addDays(lastPeriodDate, ovDay + 2);
  const days: string[] = [];
  for (let i = ovDay - 2; i <= ovDay + 2; i++) {
    days.push(addDays(lastPeriodDate, i));
  }
  return { start, end, ovulation, days };
}

/** Janela de TPM: últimos `pmsDays` antes do próximo período */
export function getPmsWindow(
  lastPeriodDate: string,
  cycleLength = DEFAULTS.cycleLength,
  pmsDays = DEFAULTS.pmsDays
): { start: string; end: string; days: string[] } {
  const nextPeriod = getNextPeriodDate(lastPeriodDate, cycleLength);
  const start = addDays(nextPeriod, -pmsDays);
  const end = addDays(nextPeriod, -1);
  const days: string[] = [];
  for (let i = 0; i < pmsDays; i++) {
    days.push(addDays(start, i));
  }
  return { start, end, days };
}

// ─────────────────────────────────────────────
// SISTEMA DE INSIGHTS
// ─────────────────────────────────────────────

const PHASE_INSIGHTS: Record<CyclePhase, string[]> = {
  menstrual: [
    "Hoje o teu corpo pede descanso e gentileza. Cuida de ti.",
    "É tempo de abrandar. O teu corpo renova-se — honra esse processo.",
    "Dores são normais agora. Calor do saco de agua quente e chá podem ajudar.",
  ],
  folicular: [
    "A tua energia está a despertar. Sentes que estás a voltar a ser tu.",
    "É um bom momento para começar algo novo — estás cheia de potencial.",
    "O teu corpo está em modo de reconstrução. Aproveita esta leveza.",
  ],
  ovulacao: [
    "Sentes-te radiante e cheia de vitalidade. Aprecia este momento.",
    "A tua energia está no pico. Ideal para conexão, criatividade e movimento.",
    "Hoje a tua confiança está no máximo — é o melhor momento do ciclo.",
  ],
  luteal: [
    "Hoje podes sentir mais sensibilidade emocional. Cuida de ti.",
    "É normal precisar de mais calma e atenção nesta fase. Sê gentil contigo.",
    "O teu corpo está a preparar-se. Respeita o descanso e a emoção.",
  ],
  sem_dados: [
    "Regista o teu ciclo para começares a receber mensagens personalizadas. 🌸",
  ],
};

function getInsights(
  phase: CyclePhase,
  daysUntilNextPeriod: number,
  isInFertileWindow: boolean,
  isInPmsWindow: boolean
): string[] {
  const base = PHASE_INSIGHTS[phase] ?? [];
  const extras: string[] = [];

  if (daysUntilNextPeriod === 1) {
    extras.push("A menstruação está prevista para amanhã. Tens tudo o que precisas?");
  } else if (daysUntilNextPeriod > 0 && daysUntilNextPeriod <= 3) {
    extras.push(`A menstruação estará aqui em ${daysUntilNextPeriod} dias. Prepara-te com carinho.`);
  }

  if (isInFertileWindow) {
    extras.push("Estás na janela fértil — os dias de maior probabilidade de conceção.");
  }

  if (isInPmsWindow && phase !== "menstrual") {
    extras.push("A TPM pode estar a influenciar o teu humor. Tudo bem sentir.");
  }

  return [base[0], ...extras].filter(Boolean);
}

// ─────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — runCycleEngine
// ─────────────────────────────────────────────

/**
 * Executa o motor do ciclo e retorna o objeto unificado de saída.
 * Retorna `null` se os dados de entrada forem insuficientes.
 */
export function runCycleEngine(
  input: Partial<CycleEngineInput> & { lastPeriodDate: string }
): CycleEngineOutput {
  const {
    lastPeriodDate,
    lastPeriodEndDate = null,
    cycleLength = DEFAULTS.cycleLength,
    periodLength = DEFAULTS.periodLength,
    lutealLength = DEFAULTS.lutealLength,
    pmsDays = DEFAULTS.pmsDays,
  } = input;

  const today = new Date().toISOString().slice(0, 10);

  // ── Dia do ciclo
  const cycleDay = getCycleDay(today, lastPeriodDate);

  // ── Verificar se está no período
  const periodEndBoundary = lastPeriodEndDate ?? addDays(lastPeriodDate, periodLength - 1);
  const isInPeriod =
    today >= lastPeriodDate && today <= periodEndBoundary;

  // ── Próxima menstruação
  const nextPeriodStr = getNextPeriodDate(lastPeriodDate, cycleLength);
  const nextPeriod = parseDate(nextPeriodStr);

  // ── Janela fértil
  const fertile = getFertileWindow(lastPeriodDate, cycleLength, lutealLength);
  const isInFertileWindow = today >= fertile.start && today <= fertile.end;
  const fertileWindow = fertile.days.map(parseDate);

  // ── Janela de TPM
  const pms = getPmsWindow(lastPeriodDate, cycleLength, pmsDays);
  const isInPmsWindow = today >= pms.start && today <= pms.end;
  const pmsWindow = pms.days.map(parseDate);

  // ── Fase actual
  const ovulationDay = cycleLength - lutealLength;
  const phase = getCurrentPhase(
    cycleDay,
    periodLength,
    ovulationDay,
    cycleLength,
    pmsDays,
    isInPeriod
  );

  // ── Dias até próxima menstruação
  const daysUntilNextPeriod = daysBetween(today, nextPeriodStr);

  // ── Progresso no ciclo (0–100)
  const cycleProgress = Math.min(100, Math.max(0, Math.round((cycleDay / cycleLength) * 100)));

  // ── Insights
  const insights = getInsights(phase, daysUntilNextPeriod, isInFertileWindow, isInPmsWindow);

  return {
    cycleDay,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    nextPeriod,
    nextPeriodStr,
    fertileWindow,
    fertileStart: parseDate(fertile.start),
    fertileEnd: parseDate(fertile.end),
    fertileStartStr: fertile.start,
    fertileEndStr: fertile.end,
    ovulationDate: parseDate(fertile.ovulation),
    ovulationDateStr: fertile.ovulation,
    pmsWindow,
    pmsStart: parseDate(pms.start),
    pmsStartStr: pms.start,
    insights,
    daysUntilNextPeriod,
    cycleProgress,
    isInPeriod,
    isInFertileWindow,
    isInPmsWindow,
  };
}

/**
 * Retorna o output do motor com base no CycleProfile + última PeriodEntry existentes.
 * Compatível com o formato actual da base de dados.
 */
export function runCycleEngineFromProfile(
  profile: {
    avg_cycle_length?: number;
    avg_period_length?: number;
    luteal_length?: number;
    pms_days?: number;
  } | null,
  lastPeriod: {
    start_date: string;
    end_date?: string | null;
  } | null
): CycleEngineOutput | null {
  if (!lastPeriod) return null;

  return runCycleEngine({
    lastPeriodDate: lastPeriod.start_date,
    lastPeriodEndDate: lastPeriod.end_date ?? null,
    cycleLength: profile?.avg_cycle_length ?? DEFAULTS.cycleLength,
    periodLength: profile?.avg_period_length ?? DEFAULTS.periodLength,
    lutealLength: profile?.luteal_length ?? DEFAULTS.lutealLength,
    pmsDays: profile?.pms_days ?? DEFAULTS.pmsDays,
  });
}

// ─────────────────────────────────────────────
// HELPERS DE CALENDÁRIO
// ─────────────────────────────────────────────

export type DayType = "period" | "fertile" | "ovulation" | "pms" | "luteal" | "folicular" | "today" | "none";

/**
 * Para um dado dia (string "YYYY-MM-DD"), retorna o tipo de dia
 * com base nos dados do motor. Usado para colorir o calendário.
 */
export function getDayType(
  dayStr: string,
  engineOutput: CycleEngineOutput | null,
  periods: Array<{ start_date: string; end_date: string | null }>,
  today: string
): DayType {
  if (!engineOutput) return dayStr === today ? "today" : "none";

  // Período real registado
  for (const p of periods) {
    const end = p.end_date ?? p.start_date;
    if (dayStr >= p.start_date && dayStr <= end) return "period";
  }

  if (dayStr === engineOutput.ovulationDateStr) return "ovulation";
  if (dayStr >= engineOutput.fertileStartStr && dayStr <= engineOutput.fertileEndStr) return "fertile";
  if (dayStr >= engineOutput.pmsStartStr && dayStr < engineOutput.nextPeriodStr) return "pms";

  return "none";
}
