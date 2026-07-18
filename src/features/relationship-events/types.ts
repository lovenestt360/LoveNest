import { addDays, addMonths, addYears } from "date-fns";
import { Heart, HeartHandshake, Gem, Infinity as InfinityIcon, Plane, Sparkles, type LucideIcon } from "lucide-react";

export type RelationshipEventType =
  | "first_meeting"
  | "dating"
  | "engagement"
  | "marriage"
  | "trip"
  | "custom";

export interface RelationshipEvent {
  id: string;
  couple_space_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_type: RelationshipEventType;
  event_date: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export const EVENT_TYPE_CONFIG: Record<RelationshipEventType, { label: string; icon: LucideIcon }> = {
  first_meeting: { label: "Primeiro encontro", icon: Heart },
  dating: { label: "Início do namoro", icon: HeartHandshake },
  engagement: { label: "Noivado", icon: Gem },
  marriage: { label: "Casamento", icon: InfinityIcon },
  trip: { label: "Viagem", icon: Plane },
  custom: { label: "Outra data", icon: Sparkles },
};

export const DEFAULT_EVENT_ICON: LucideIcon = Sparkles;

export const EVENT_COLORS: Record<RelationshipEventType, {
  iconBg: string; iconText: string; topBar: string; dateText: string;
  gradient: string; milestoneText: string; dot: string;
}> = {
  first_meeting: {
    iconBg: "bg-rose-50 dark:bg-rose-950/30",   iconText: "text-rose-400",
    topBar: "bg-rose-400",   dateText: "text-rose-400",
    gradient: "from-rose-500 to-rose-600",
    milestoneText: "text-rose-500 dark:text-rose-400",
    dot: "border-rose-300 dark:border-rose-700",
  },
  dating: {
    iconBg: "bg-pink-50 dark:bg-pink-950/30",   iconText: "text-pink-400",
    topBar: "bg-pink-400",   dateText: "text-pink-400",
    gradient: "from-pink-500 to-pink-600",
    milestoneText: "text-pink-500 dark:text-pink-400",
    dot: "border-pink-300 dark:border-pink-700",
  },
  engagement: {
    iconBg: "bg-violet-50 dark:bg-violet-950/30", iconText: "text-violet-400",
    topBar: "bg-violet-400", dateText: "text-violet-400",
    gradient: "from-violet-500 to-violet-600",
    milestoneText: "text-violet-500 dark:text-violet-400",
    dot: "border-violet-300 dark:border-violet-700",
  },
  marriage: {
    iconBg: "bg-purple-50 dark:bg-purple-950/30", iconText: "text-purple-400",
    topBar: "bg-purple-400", dateText: "text-purple-400",
    gradient: "from-purple-500 to-purple-600",
    milestoneText: "text-purple-500 dark:text-purple-400",
    dot: "border-purple-300 dark:border-purple-700",
  },
  trip: {
    iconBg: "bg-sky-50 dark:bg-sky-950/30",     iconText: "text-sky-400",
    topBar: "bg-sky-400",   dateText: "text-sky-400",
    gradient: "from-sky-500 to-sky-600",
    milestoneText: "text-sky-500 dark:text-sky-400",
    dot: "border-sky-300 dark:border-sky-700",
  },
  custom: {
    iconBg: "bg-muted",                          iconText: "text-muted-foreground",
    topBar: "bg-muted-foreground/30",            dateText: "text-muted-foreground/60",
    gradient: "from-rose-400 to-pink-500",
    milestoneText: "text-muted-foreground",
    dot: "border-border",
  },
};

export type MilestoneWeight = "xs" | "sm" | "md" | "xl";

export interface TogetherMilestone {
  label: string;
  weight: MilestoneWeight;
  add: (start: Date) => Date;
}

export const TOGETHER_MILESTONES: TogetherMilestone[] = [
  { label: "1 semana juntos",  weight: "xs", add: (d) => addDays(d, 7) },
  { label: "1 mês juntos",     weight: "sm", add: (d) => addMonths(d, 1) },
  { label: "3 meses juntos",   weight: "md", add: (d) => addMonths(d, 3) },
  { label: "6 meses juntos",   weight: "md", add: (d) => addMonths(d, 6) },
  { label: "1 ano juntos",     weight: "xl", add: (d) => addYears(d, 1) },
  { label: "2 anos juntos",    weight: "xl", add: (d) => addYears(d, 2) },
  { label: "3 anos juntos",    weight: "xl", add: (d) => addYears(d, 3) },
  { label: "5 anos juntos",    weight: "xl", add: (d) => addYears(d, 5) },
  { label: "10 anos juntos",   weight: "xl", add: (d) => addYears(d, 10) },
];

export const MILESTONE_PHRASES: Record<string, string> = {
  "1 semana juntos":  "Os primeiros sete dias de uma história que acabou de começar.",
  "1 mês juntos":     "Trinta dias onde tudo se transformou.",
  "3 meses juntos":   "Três meses a descobrir um ao outro.",
  "6 meses juntos":   "Metade de um ano de cumplicidade e carinho.",
  "1 ano juntos":     "Um ano inteiro de momentos que nunca vão ser esquecidos.",
  "2 anos juntos":    "Dois anos a escrever uma história linda juntos.",
  "3 anos juntos":    "Três anos de amor que continua a crescer.",
  "5 anos juntos":    "Cinco anos de uma vida partilhada com todo o coração.",
  "10 anos juntos":   "Uma década juntos. Uma vida construída, capítulo a capítulo.",
};

/** Marcador computado (não persistido) misturado na timeline. */
export interface ComputedMilestoneEntry {
  kind: "milestone";
  label: string;
  weight: MilestoneWeight;
  date: Date;
}

export interface RealEventEntry {
  kind: "event";
  event: RelationshipEvent;
  date: Date;
}

export type TimelineEntry = ComputedMilestoneEntry | RealEventEntry;
