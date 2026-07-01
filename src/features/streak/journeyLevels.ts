// Sistemas de progressão da Jornada.
// STREAK_LEVELS: fonte de verdade única para nome e fase visual do
// Guardião, baseada em dias de streak consecutivos.
// JOURNEY_LEVELS: mantido para o contador de LovePoints acumulados
// (nunca desce) mas já não define o nome/fase do Guardião.

import type { FlameStage } from "@/types/flame";

// ── Sistema de dias (fonte de verdade do Guardião) ────────────────────────

export interface StreakLevelDef {
  level: number;
  name: string;
  stage: FlameStage;
  minDays: number;
}

export const STREAK_LEVELS: StreakLevelDef[] = [
  { level: 1, name: "Faísca",     stage: "faisca",    minDays: 0  },
  { level: 2, name: "Brasa",      stage: "brasa",     minDays: 3  },
  { level: 3, name: "Chama",      stage: "chama",     minDays: 7  },
  { level: 4, name: "Chama Viva", stage: "guardiao",  minDays: 14 },
  { level: 5, name: "Farol",      stage: "sentinela", minDays: 30 },
  { level: 6, name: "Eternidade", stage: "eterno",    minDays: 90 },
];

export interface StreakProgress {
  level: number;
  name: string;
  stage: FlameStage;
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

// ── Sistema de pontos (contador LovePoints — mantido) ─────────────────────

export interface JourneyLevelDef {
  level: number;
  name: string;
  minPoints: number;
}

export const JOURNEY_LEVELS: JourneyLevelDef[] = [
  { level: 1, name: "Início",      minPoints: 0 },
  { level: 2, name: "Faísca",      minPoints: 50 },
  { level: 3, name: "Brasa",       minPoints: 150 },
  { level: 4, name: "Chama",       minPoints: 400 },
  { level: 5, name: "Chama Viva",  minPoints: 900 },
  { level: 6, name: "Farol",       minPoints: 1800 },
  { level: 7, name: "Eternidade",  minPoints: 3200 },
];

export interface JourneyProgress {
  level: number;
  name: string;
  totalPoints: number;
  nextLevelName: string | null;
  pointsToNextLevel: number | null; // null = já está no nível máximo
  progressPct: number;              // 0-100, dentro do nível atual
}

export function getJourneyLevel(totalPoints: number): JourneyProgress {
  let idx = 0;
  for (let i = 0; i < JOURNEY_LEVELS.length; i++) {
    if (totalPoints >= JOURNEY_LEVELS[i].minPoints) idx = i;
  }
  const current = JOURNEY_LEVELS[idx];
  const next = JOURNEY_LEVELS[idx + 1] ?? null;

  if (!next) {
    return {
      level: current.level, name: current.name, totalPoints,
      nextLevelName: null, pointsToNextLevel: null, progressPct: 100,
    };
  }

  const span = next.minPoints - current.minPoints;
  const into = totalPoints - current.minPoints;
  return {
    level: current.level,
    name: current.name,
    totalPoints,
    nextLevelName: next.name,
    pointsToNextLevel: next.minPoints - totalPoints,
    progressPct: Math.min(100, Math.round((into / span) * 100)),
  };
}
