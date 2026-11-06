// Progressão da Jornada: nome e fase do Guardião dependem só dos dias seguidos.
// Os LovePoints servem apenas para comprar proteção.

// ── Sistema de dias (fonte de verdade do Guardião) ────────────────────────
// FlameStage inline para evitar dependência circular com @/types/flame
export type GuardianStage =
  | "faisca" | "brasa" | "chama" | "guardiao"
  | "sentinela" | "eterno" | "soberano";

export interface StreakLevelDef {
  level: number;
  name: string;
  stage: GuardianStage;
  minDays: number;
}

// 7 fases, alinhadas com os PNGs do Guardião.
export const STREAK_LEVELS: StreakLevelDef[] = [
  { level: 1, name: "Faísca",    stage: "faisca",    minDays: 0 },
  { level: 2, name: "Brasa",     stage: "brasa",     minDays: 3 },
  { level: 3, name: "Chama",     stage: "chama",     minDays: 7 },
  { level: 4, name: "Guardião",  stage: "guardiao",  minDays: 14 },
  { level: 5, name: "Sentinela", stage: "sentinela", minDays: 30 },
  { level: 6, name: "Eterno",    stage: "eterno",    minDays: 90 },
  { level: 7, name: "Soberano",  stage: "soberano",  minDays: 365 },
];

export interface StreakProgress {
  level: number;
  name: string;
  stage: GuardianStage;
  currentDays: number;
  nextLevelName: string | null;
  daysToNext: number | null;
  progressPct: number;
}

export function getStreakLevel(days: number): StreakProgress {
  let idx = 0;
  for (let i = 0; i < STREAK_LEVELS.length; i++) {
    if (days >= STREAK_LEVELS[i].minDays) idx = i;
  }
  const current = STREAK_LEVELS[idx];
  const next    = STREAK_LEVELS[idx + 1] ?? null;

  if (!next) {
    return { level: current.level, name: current.name, stage: current.stage,
      currentDays: days, nextLevelName: null, daysToNext: null, progressPct: 100 };
  }

  const span = next.minDays - current.minDays;
  const into = days - current.minDays;
  return {
    level: current.level, name: current.name, stage: current.stage,
    currentDays: days,
    nextLevelName: next.name,
    daysToNext: next.minDays - days,
    progressPct: Math.min(100, Math.round((into / span) * 100)),
  };
}

/**
 * Celebração "A vossa chama evoluiu!": só quando a fase sobe acima da mais
 * alta já vista neste aparelho. Na primeira vez (stored = 0) só se guarda.
 * Devolve a fase a guardar (null = não mexer) e se deve celebrar.
 */
export function levelUpCheck(stored: number, level: number): { celebrate: boolean; store: number | null } {
  return {
    celebrate: stored > 0 && level > stored,
    store: level > stored ? level : null,
  };
}
