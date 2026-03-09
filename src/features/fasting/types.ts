// ================================================================
// Tipos do Módulo Jejum (Páscoa)
// ================================================================

export type PlanType = "partial" | "until_hour" | "daniel" | "digital" | "combined";

export type DayResult = "cumprido" | "parcial" | "falhei" | null;

export type ItemStatus = "consegui" | "falhei" | "pulei" | "pendente";

export type AbstentionCategory = "alimentar" | "comportamental" | "digital";

export type Priority = "alta" | "media" | "baixa";

export type ShareLevel = "privado" | "streak" | "checklist";

export type DayMood = "otimo" | "bom" | "neutro" | "mau" | null;

// ── Plano principal ──────────────────────────────────────────────
export interface FastingProfile {
  id: string;
  user_id: string;
  couple_space_id: string | null;
  plan_name: string;
  plan_type: PlanType;
  until_hour: string | null;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  total_days: number;
  rules_allowed: string | null;
  rules_forbidden: string | null;
  rules_exceptions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Abstenções ───────────────────────────────────────────────────
export interface Abstention {
  id: string;
  user_id: string;
  profile_id: string;
  category: AbstentionCategory;
  label: string;
  priority: Priority;
  note: string | null;
  sort_order: number;
  created_at: string;
}

// ── Template de checklist ────────────────────────────────────────
export interface ChecklistTemplate {
  id: string;
  user_id: string;
  profile_id: string;
  section: "fazer" | "evitar";
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ── Registo diário ───────────────────────────────────────────────
export interface DayLog {
  id: string;
  user_id: string;
  profile_id: string;
  day_key: string;      // YYYY-MM-DD
  day_number: number | null;
  result: DayResult;
  mood: DayMood;
  note: string | null;
  finalized: boolean;
  created_at: string;
  updated_at: string;
}

// ── Estado de cada item por dia ──────────────────────────────────
export interface DayItemLog {
  id: string;
  user_id: string;
  day_log_id: string;
  template_id: string | null;
  label: string;
  section: "fazer" | "evitar";
  status: ItemStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

// ── Lembretes ────────────────────────────────────────────────────
export interface FastingReminders {
  id: string;
  user_id: string;
  registar_dia: boolean;
  oracao: boolean;
  hora_terminar: boolean;
  reflexao_noturna: boolean;
  motivacao_dia: boolean;
  alerta_calendario: boolean;
  updated_at: string;
}

// ── Partilha com par ─────────────────────────────────────────────
export interface PartnerShare {
  id: string;
  user_id: string;
  couple_space_id: string | null;
  share_level: ShareLevel;
  support_message: string | null;
  updated_at: string;
}

// ── Tipos para criação ───────────────────────────────────────────
export interface CreatePlanInput {
  plan_name: string;
  plan_type: PlanType;
  until_hour?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  rules_allowed?: string;
  rules_forbidden?: string;
  rules_exceptions?: string;
  doItems: string[];
  avoidItems: string[];
}

// ── Tipos calculados ─────────────────────────────────────────────
export interface FastingStats {
  streak: number;
  completionRate: number;  // 0–100
  totalDays: number;
  loggedDays: number;
  topFailures: string[];
  topSuccesses: string[];
  weeklyData: WeeklyPoint[];
}

export interface WeeklyPoint {
  weekLabel: string;
  rate: number;   // 0–100
}

// ── Constantes ───────────────────────────────────────────────────
export const PLAN_TYPES: { value: PlanType; label: string; desc: string }[] = [
  { value: "partial",    label: "Jejum parcial",      desc: "Apenas uma refeição por dia" },
  { value: "until_hour", label: "Até certa hora",     desc: "Ex: Sem comer até às 15h" },
  { value: "daniel",     label: "Jejum Daniel",       desc: "Sem doces, fritos ou carnes" },
  { value: "digital",    label: "Jejum digital",      desc: "Sem redes sociais ou séries" },
  { value: "combined",   label: "Jejum combinado",    desc: "Alimentar + digital + hábitos" },
];

export const EASTER_2026 = "2026-04-05";

export const DEFAULT_DO_ITEMS: string[] = [
  "Oração da manhã",
  "Leitura bíblica",
  "Meditação / reflexão",
  "Acto de caridade",
  "Gratidão",
  "Silêncio (10 min)",
];

export const DEFAULT_AVOID_ITEMS: string[] = [
  "Redes sociais",
  "Discussões desnecessárias",
  "Palavrões",
  "Álcool",
];

export function easterDate(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getEasterDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const thisYearEaster = easterDate(year);
  return new Date(thisYearEaster + "T00:00:00") < now
    ? easterDate(year + 1)
    : thisYearEaster;
}

export function dayResultColor(result: DayResult): string {
  switch (result) {
    case "cumprido": return "bg-green-500";
    case "parcial":  return "bg-yellow-400";
    case "falhei":   return "bg-red-500";
    default:         return "bg-muted";
  }
}

export function dayResultLabel(result: DayResult): string {
  switch (result) {
    case "cumprido": return "✅ Cumprido";
    case "parcial":  return "⚠️ Parcial";
    case "falhei":   return "❌ Falhei";
    default:         return "— Não registado";
  }
}
