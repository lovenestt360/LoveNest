import type { CeremonyContent } from "@/lib/ceremonies";

// ── Content per streak milestone ──────────────────────────────────────────────
// O modal full-screen antigo foi substituído pela Cerimónia (ver
// CeremonyOverlay.tsx) — este ficheiro mantém-se só como o catálogo de
// texto por marco, usado por getMilestoneCeremonyContent() e pela
// legenda "micro-memória" de 24h na Home.

const MILESTONE_DATA: Record<number, {
  title: string;
  description: string;
  microMemory: string;
}> = {
  7: {
    title: "Primeira semana juntos",
    description: "Pequenos gestos tornam-se história.",
    microMemory: "Sete dias de presença juntos.",
  },
  14: {
    title: "Duas semanas de presença",
    description: "O amor cresce nos dias repetidos.",
    microMemory: "Duas semanas a aparecerem um para o outro.",
  },
  30: {
    title: "Um mês a escolherem-se",
    description: "O vosso espaço está a ganhar raízes.",
    microMemory: "Um mês de amor construído.",
  },
  50: {
    title: "Cinquenta dias de cuidado",
    description: "Continuem a aparecer um para o outro.",
    microMemory: "Cinquenta dias de presença partilhada.",
  },
  100: {
    title: "Cem dias de presença",
    description: "Uma chama que não se apaga.",
    microMemory: "Cem dias. Uma história que continua.",
  },
  365: {
    title: "Um ano a escolherem-se",
    description: "Um ano inteiro de gestos que ficam.",
    microMemory: "Um ano inteiro a aparecerem um para o outro.",
  },
};

export function getMilestoneMicroMemory(value: number): string {
  return MILESTONE_DATA[value]?.microMemory ?? "";
}

export function getMilestoneCeremonyContent(value: number): CeremonyContent | null {
  const data = MILESTONE_DATA[value];
  if (!data) return null;
  return {
    type: "streak_milestone",
    eyebrow: `${value} ${value === 1 ? "dia" : "dias"} de chama`,
    title: data.title,
    subtitle: data.description,
  };
}
