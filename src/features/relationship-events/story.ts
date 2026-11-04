import { addDays, addMonths, addYears, differenceInCalendarDays, startOfDay } from "date-fns";
import type { RelationshipEvent } from "./types";

/** "2025-09-03" → data local à meia-noite (sem desvios de fuso). */
export function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

/** 426 → "1 ano, 2 meses e 1 dia". */
export function buildTimeLabel(totalDays: number): string {
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = (totalDays % 365) % 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
}

export interface Milestone {
  /** "500 dias juntos" */
  label: string;
  /** "500 dias" */
  short: string;
  date: Date;
  /** Tamanho na história: "xl" para os anos, "sm" para a primeira semana. */
  weight: "sm" | "md" | "xl";
}

const DAY_MARKS = [100, 500, 1000, 2000, 3000, 5000, 10000];

/** Todos os marcos de tempo juntos a partir do início, por ordem. */
export function milestonesFor(start: Date, maxYears = 60): Milestone[] {
  const list: Milestone[] = [
    { label: "1 semana juntos", short: "1 semana", date: addDays(start, 7), weight: "sm" },
    { label: "1 mês juntos", short: "1 mês", date: addMonths(start, 1), weight: "md" },
    { label: "3 meses juntos", short: "3 meses", date: addMonths(start, 3), weight: "md" },
    { label: "6 meses juntos", short: "6 meses", date: addMonths(start, 6), weight: "md" },
  ];
  for (const d of DAY_MARKS) list.push({ label: `${d} dias juntos`, short: `${d} dias`, date: addDays(start, d), weight: "md" });
  for (let y = 1; y <= maxYears; y++) {
    const short = `${y} ${y === 1 ? "ano" : "anos"}`;
    list.push({ label: `${short} juntos`, short, date: addYears(start, y), weight: "xl" });
  }
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Marcos que já chegaram (inclui o de hoje). */
export function pastMilestones(startIso: string, today = new Date()): Milestone[] {
  const t = startOfDay(today);
  return milestonesFor(parseDateOnly(startIso)).filter((m) => differenceInCalendarDays(m.date, t) <= 0);
}

export interface NextMilestone {
  next: Milestone;
  prev: Milestone | null;
  daysLeft: number;
  /** 0–1: caminho feito desde o marco anterior (ou do início) até ao próximo. */
  progress: number;
}

/** O próximo marco (o de hoje conta como próximo, com daysLeft = 0). */
export function nextMilestone(startIso: string, today = new Date()): NextMilestone | null {
  const start = parseDateOnly(startIso);
  const t = startOfDay(today);
  if (differenceInCalendarDays(t, start) < 0) return null;
  const all = milestonesFor(start);
  const idx = all.findIndex((m) => differenceInCalendarDays(m.date, t) >= 0);
  if (idx < 0) return null;
  const next = all[idx];
  const prev = idx > 0 ? all[idx - 1] : null;
  const from = prev?.date ?? start;
  const span = differenceInCalendarDays(next.date, from);
  const done = differenceInCalendarDays(t, from);
  return {
    next,
    prev,
    daysLeft: differenceInCalendarDays(next.date, t),
    progress: span > 0 ? Math.min(1, Math.max(0, done / span)) : 1,
  };
}

/** "dia 405 juntos": o dia de início é o dia 1. Null antes do início. */
export function dayNumber(startIso: string | null, dateIso: string): number | null {
  if (!startIso) return null;
  const n = differenceInCalendarDays(parseDateOnly(dateIso), parseDateOnly(startIso)) + 1;
  return n >= 1 ? n : null;
}

/** Capítulo surpresa que este utilizador ainda não abriu. */
export function isSealedFor(event: RelationshipEvent, userId: string | undefined): boolean {
  return !!event.is_surprise && !event.opened_at && !!userId && event.created_by !== userId;
}

/** Capítulo surpresa que eu escrevi e o outro ainda não abriu. */
export function isWaitingToBeOpened(event: RelationshipEvent, userId: string | undefined): boolean {
  return !!event.is_surprise && !event.opened_at && !!userId && event.created_by === userId;
}

/** Ordem do livro: data do momento, depois quando foi escrito. */
export function sortChapters(events: RelationshipEvent[]): RelationshipEvent[] {
  return [...events].sort(
    (a, b) => a.event_date.localeCompare(b.event_date) || a.created_at.localeCompare(b.created_at),
  );
}

/** id → número do capítulo (1 = o mais antigo). */
export function chapterNumbers(events: RelationshipEvent[]): Map<string, number> {
  return new Map(sortChapters(events).map((e, i) => [e.id, i + 1]));
}

/** Um capítulo de anos anteriores que aconteceu neste mesmo dia e mês. */
export function onThisDay(
  events: RelationshipEvent[],
  today = new Date(),
): { event: RelationshipEvent; years: number } | null {
  const md = (d: Date) => d.getMonth() * 100 + d.getDate();
  const hits = events
    .map((event) => ({ event, d: parseDateOnly(event.event_date) }))
    .filter(({ d }) => md(d) === md(today) && d.getFullYear() < today.getFullYear())
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  if (hits.length === 0) return null;
  return { event: hits[0].event, years: today.getFullYear() - hits[0].d.getFullYear() };
}

const PHRASES: Record<string, string> = {
  "1 semana juntos": "Os primeiros sete dias de uma história que acabou de começar.",
  "1 mês juntos": "Trinta dias onde tudo se transformou.",
  "3 meses juntos": "Três meses a descobrir um ao outro.",
  "100 dias juntos": "Cem dias de pequenos grandes momentos.",
  "6 meses juntos": "Metade de um ano de cumplicidade e carinho.",
  "1 ano juntos": "Um ano inteiro de momentos que nunca vão ser esquecidos.",
  "500 dias juntos": "Quinhentos dias a escolherem-se, todos os dias.",
  "2 anos juntos": "Dois anos a escrever uma história linda juntos.",
  "1000 dias juntos": "Mil dias. E a história ainda agora começou.",
  "3 anos juntos": "Três anos de amor que continua a crescer.",
  "5 anos juntos": "Cinco anos de uma vida partilhada com todo o coração.",
  "10 anos juntos": "Uma década juntos. Uma vida construída, capítulo a capítulo.",
};

/** A frase que acompanha cada marco na história. */
export function milestonePhrase(label: string): string {
  if (PHRASES[label]) return PHRASES[label];
  if (/anos juntos$/.test(label)) return `${label.replace(" juntos", "")} de amor que continua a crescer.`;
  return "Mais um marco na vossa história.";
}
