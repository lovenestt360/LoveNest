// Sintomas do registo rápido e como cada um se guarda em daily_symptoms.
// Os níveis antigos (dor, energia, libido, sono, stress) passam a ser
// derivados dos toques, para a visão do par e o histórico continuarem a ler
// os mesmos campos.
import type { CycleIconKind } from "./cycleIconsSvg";
import type { CyclePhase } from "./engine";
import type { DailySymptom } from "./useCycleData";

export type SymptomKey =
  | "colicas" | "cabeca" | "lombar" | "peito" | "inchaco" | "cansaco" | "nausea" | "pele"
  | "pernas" | "tontura" | "fraqueza"
  | "gases" | "diarreia" | "prisao" | "fome"
  | "sensivel" | "ansiedade" | "irritada" | "triste" | "choro" | "altos" | "radiante"
  | "sono" | "desejos" | "desejo";

export const SYMPTOM_GROUPS = ["Corpo", "Barriga", "Emoções", "Também"] as const;

type Row = Partial<DailySymptom> | null | undefined;

interface SymptomDef {
  label: string;
  icon: CycleIconKind;
  group: (typeof SYMPTOM_GROUPS)[number];
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
  pernas:    { label: "Pernas",    icon: "pernas",    group: "Corpo",   read: bool("leg_pain") },
  tontura:   { label: "Tonturas",  icon: "tontura",   group: "Corpo",   read: bool("dizziness") },
  fraqueza:  { label: "Fraqueza",  icon: "fraqueza",  group: "Corpo",   read: bool("weakness") },
  gases:     { label: "Gases",     icon: "gases",     group: "Barriga", read: bool("gas") },
  diarreia:  { label: "Diarreia",  icon: "diarreia",  group: "Barriga", read: bool("diarrhea") },
  prisao:    { label: "Prisão de ventre", icon: "prisao", group: "Barriga", read: bool("constipation") },
  fome:      { label: "Mais fome", icon: "fome",      group: "Barriga", read: bool("increased_appetite") },
  sensivel:  { label: "Sensível",  icon: "sensivel",  group: "Emoções", read: bool("sensitivity") },
  ansiedade: { label: "Ansiosa",   icon: "ansiedade", group: "Emoções", read: bool("anxiety") },
  irritada:  { label: "Irritada",  icon: "irritada",  group: "Emoções", read: bool("irritability") },
  triste:    { label: "Triste",    icon: "triste",    group: "Emoções", read: bool("sadness") },
  choro:     { label: "Vontade de chorar", icon: "choro", group: "Emoções", read: bool("crying") },
  altos:     { label: "Altos e baixos", icon: "altos", group: "Emoções", read: bool("mood_swings") },
  radiante:  { label: "Radiante",  icon: "radiante",  group: "Emoções", read: (r) => (r?.energy_level ?? 5) >= 8 },
  sono:      { label: "Dormi mal", icon: "sono",      group: "Também",  read: (r) => r?.sleep_quality === "mau" },
  desejos:   { label: "Desejos",   icon: "desejos",   group: "Também",  read: bool("cravings") },
  desejo:    { label: "Libido",    icon: "desejo",    group: "Também",  read: (r) => (r?.libido ?? 5) >= 8 },
};

/** Nove sugestões por fase — o que é mais comum sentir nesse momento. */
export const PHASE_SUGGESTIONS: Record<CyclePhase, SymptomKey[]> = {
  menstrual: ["colicas", "lombar", "cansaco", "cabeca", "inchaco", "sensivel", "pernas", "fraqueza", "sono"],
  folicular: ["radiante", "pele", "cabeca", "inchaco", "desejo", "cansaco", "ansiedade", "sono", "fome"],
  ovulacao:  ["desejo", "radiante", "inchaco", "peito", "pele", "cabeca", "colicas", "gases", "sensivel"],
  luteal:    ["inchaco", "desejos", "cabeca", "sensivel", "cansaco", "peito", "altos", "pele", "sono"],
  sem_dados: ["colicas", "cabeca", "cansaco", "sensivel", "inchaco", "desejos", "lombar", "altos", "sono"],
};

export function readSelection(row: Row): Set<SymptomKey> {
  return new Set((Object.keys(SYMPTOMS) as SymptomKey[]).filter((k) => SYMPTOMS[k].read(row)));
}

/** Campos a gravar para a seleção atual, preservando o que os toques não cobrem. */
export function selectionPayload(sel: Set<SymptomKey>, prev: Row) {
  const has = (k: SymptomKey) => sel.has(k);
  const pain = has("colicas") || has("cabeca") || has("lombar") || has("pernas");
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
    leg_pain: has("pernas"),
    dizziness: has("tontura"),
    weakness: has("fraqueza"),
    gas: has("gases"),
    diarrhea: has("diarreia"),
    constipation: has("prisao"),
    increased_appetite: has("fome"),
    sensitivity: has("sensivel"),
    anxiety: has("ansiedade"),
    irritability: has("irritada"),
    sadness: has("triste"),
    crying: has("choro"),
    mood_swings: has("altos"),
    cravings: has("desejos"),
    pain_level: pain ? Math.max(prev?.pain_level ?? 0, 6) : 0,
    energy_level: has("radiante") ? 9 : has("cansaco") ? 2 : 5,
    libido: has("desejo") ? 9 : 5,
    sleep_quality: has("sono") ? "mau" : prev?.sleep_quality === "bom" ? "bom" : "ok",
    stress: has("ansiedade") || has("irritada") ? Math.max(prevStress, 8) : Math.min(prevStress, 4),
  };
}
