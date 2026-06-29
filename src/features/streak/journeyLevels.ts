// Nível da Jornada — extensão da escada que já existia em
// LoveStreakCard.tsx (getRelationshipState: Faísca → Eternidade), agora
// calculada a partir de LovePoints acumulados em vez de só dias de
// streak. Por ser baseado em pontos (que nunca diminuem), o nível
// nunca desce, mesmo que a Chama quebre — ver docs/LOVENEST_PROGRESS_SYSTEM.md.

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
