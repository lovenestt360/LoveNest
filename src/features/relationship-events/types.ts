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
