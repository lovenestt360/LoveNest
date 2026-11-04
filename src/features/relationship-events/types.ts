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
  /** Capítulo surpresa: o outro só o vê depois de o abrir (migração 20261104120000). */
  is_surprise?: boolean | null;
  opened_at?: string | null;
}

export const EVENT_TYPE_CONFIG: Record<RelationshipEventType, { label: string; short: string; icon: LucideIcon }> = {
  first_meeting: { label: "Primeiro encontro", short: "Encontro", icon: Heart },
  dating: { label: "Início do namoro", short: "Namoro", icon: HeartHandshake },
  engagement: { label: "Noivado", short: "Noivado", icon: Gem },
  marriage: { label: "Casamento", short: "Casamento", icon: InfinityIcon },
  trip: { label: "Viagem", short: "Viagem", icon: Plane },
  custom: { label: "Momento", short: "Outro", icon: Sparkles },
};
