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

export interface TogetherMilestone {
  label: string;
  add: (start: Date) => Date;
}

export const TOGETHER_MILESTONES: TogetherMilestone[] = [
  { label: "1 semana juntos", add: (d) => addDays(d, 7) },
  { label: "1 mês juntos", add: (d) => addMonths(d, 1) },
  { label: "3 meses juntos", add: (d) => addMonths(d, 3) },
  { label: "6 meses juntos", add: (d) => addMonths(d, 6) },
  { label: "1 ano juntos", add: (d) => addYears(d, 1) },
  { label: "2 anos juntos", add: (d) => addYears(d, 2) },
  { label: "3 anos juntos", add: (d) => addYears(d, 3) },
  { label: "5 anos juntos", add: (d) => addYears(d, 5) },
  { label: "10 anos juntos", add: (d) => addYears(d, 10) },
];

/** Marcador computado (não persistido) misturado na timeline. */
export interface ComputedMilestoneEntry {
  kind: "milestone";
  label: string;
  date: Date;
}

export interface RealEventEntry {
  kind: "event";
  event: RelationshipEvent;
  date: Date;
}

export type TimelineEntry = ComputedMilestoneEntry | RealEventEntry;
