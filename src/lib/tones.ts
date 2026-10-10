// Tons suaves por funcionalidade — os mesmos da Home (ícones do "Dia a dia",
// aventuras) e dos cabeçalhos das páginas, para cada função ter a sua cor.
export type Tone = "rose" | "blue" | "violet" | "orange" | "green" | "pink";

export const TONE: Record<Tone, string> = {
  rose: "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300",
  pink: "bg-pink-50 text-pink-500 dark:bg-pink-950/40 dark:text-pink-300",
  blue: "bg-[#EDF2FF] text-[#3F68E6] dark:bg-blue-950/40 dark:text-blue-300",
  violet: "bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300",
  orange: "bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-300",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
};
