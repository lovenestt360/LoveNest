// Sintomas do registo rápido e como cada um se guarda em daily_symptoms.
// Os níveis antigos (dor, energia, libido, sono, stress) passam a ser
// derivados dos toques, para a visão do par e o histórico continuarem a ler
// os mesmos campos.
import type { CycleIconKind } from "./cycleIconsSvg";
import type { CyclePhase } from "./engine";
import type { DailySymptom } from "./useCycleData";

export type SymptomKey =
  | "colicas" | "cabeca" | "lombar" | "peito" | "inchaco" | "cansaco" | "nausea" | "pele"
  | "sensivel" | "ansiedade" | "irritada" | "radiante"
  | "sono" | "desejos" | "desejo";

type Row = Partial<DailySymptom> | null | undefined;

interface SymptomDef {
  label: string;
  icon: CycleIconKind;
  group: "Corpo" | "Emoções" | "Também";
  read: (row: Row) => boolean;
}

const bool = (col: keyof DailySymptom) => (row: Row) => !!row?.[col];

export const SYMPTOMS: Record<SymptomKey, SymptomDef> = {
  colicas:   { label: "Cólicas",   icon: "colicas",   group: "Corpo",   read: bool("cramps") },
  cabeca:    { label: "Cabeça",    icon: "cabeca",    group: "Corpo",   read: bool("headache") },
  lombar:    { label: "Lombar",    icon: "lombar",    group: "Corpo",   read: bool("back_pain") },
  peito:     { label: "Peito",     icon: "peito",     group: "Corpo",   read: bool("breast_tenderness") },
  inchaco:   { label: "Inchaço",   icon: "inchaco",   group: "Corpo",   read: bool("bloating") },
  cansaco:   { label: "Cansaço",   icon: "cansaco",   group: "Corpo",   read: bool("fatigue") },
  nausea:    { label: "Náusea",    icon: "nausea",    group: "Corpo",   read: bool("nausea") },
  pele:      { label: "Pele",      icon: "pele",      group: "Corpo",   read: bool("acne") },
  sensivel:  { label: "Sensível",  icon: "sensivel",  group: "Emoções", read: bool("sensitivity") },
  ansiedade: { label: "Ansiosa",   icon: "ansiedade", group: "Emoções", read: bool("anxiety") },
  irritada:  { label: "Irritada",  icon: "irritada",  group: "Emoções", read: bool("irritability") },
  radiante:  { label: "Radiante",  icon: "radiante",  group: "Emoções", read: (r) => (r?.energy_level ?? 5) >= 8 },
  sono:      { label: "Dormi mal", icon: "sono",      group: "Também",  read: (r) => r?.sleep_quality === "mau" },
  desejos:   { label: "Desejos",   icon: "desejos",   group: "Também",  read: bool("cravings") },
  desejo:    { label: "Libido",    icon: "desejo",    group: "Também",  read: (r) => (r?.libido ?? 5) >= 8 },
};

export const SYMPTOM_GROUPS = ["Corpo", "Emoções", "Também"] as const;

/** Quatro sugestões por fase — o que é mais comum sentir nesse momento. */
export const PHASE_SUGGESTIONS: Record<CyclePhase, SymptomKey[]> = {
  menstrual: ["colicas", "lombar", "cansaco", "cabeca"],
  folicular: ["radiante", "pele", "cabeca", "inchaco"],
  ovulacao:  ["desejo", "radiante", "inchaco", "peito"],
  luteal:    ["inchaco", "desejos", "cabeca", "sensivel"],
  sem_dados: ["colicas", "cabeca", "cansaco", "sensivel"],
};

export function readSelection(row: Row): Set<SymptomKey> {
  return new Set((Object.keys(SYMPTOMS) as SymptomKey[]).filter((k) => SYMPTOMS[k].read(row)));
}

/** Campos a gravar para a seleção atual, preservando o que os toques não cobrem. */
export function selectionPayload(sel: Set<SymptomKey>, prev: Row) {
  const has = (k: SymptomKey) => sel.has(k);
  const pain = has("colicas") || has("cabeca") || has("lombar");
  const prevStress = prev?.stress ?? 0;
  return {
    cramps: has("colicas"),
    headache: has("cabeca"),
    back_pain: has("lombar"),
    breast_tenderness: has("peito"),
    bloating: has("inchaco"),
    fatigue: has("cansaco"),
    nausea: has("nausea"),
    acne: has("pele"),
    sensitivity: has("sensivel"),
    anxiety: has("ansiedade"),
    irritability: has("irritada"),
    cravings: has("desejos"),
    pain_level: pain ? Math.max(prev?.pain_level ?? 0, 6) : 0,
    energy_level: has("radiante") ? 9 : has("cansaco") ? 2 : 5,
    libido: has("desejo") ? 9 : 5,
    sleep_quality: has("sono") ? "mau" : prev?.sleep_quality === "bom" ? "bom" : "ok",
    stress: has("ansiedade") || has("irritada") ? Math.max(prevStress, 8) : Math.min(prevStress, 4),
  };
}
