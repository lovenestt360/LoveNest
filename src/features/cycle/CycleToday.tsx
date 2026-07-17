import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Loader2, Calendar, StopCircle, PlayCircle, CheckCircle2,
  Flower2, Droplet, Droplets, Sprout, Sparkles, Moon,
  Zap, Brain, Bone, Footprints, BatteryLow, BatteryWarning, Battery,
  RotateCw, HeartPulse, Frown, CircleDot, Shuffle, Flame, Waves,
  CloudRain, Heart, Wind, CircleSlash, Cloud, Smile, Meh, AlertTriangle,
  Snowflake, Thermometer, Rocket, Egg, Sun, Dot, Cookie, UtensilsCrossed,
  HeartHandshake, Shield, ShieldOff, ShieldAlert, ShieldCheck, Pill, Disc, HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notifyPartner } from "@/lib/notifyPartner";
import { CycleHistoryStrip } from "./CycleHistoryStrip";
import { differenceInDays } from "date-fns";
import { formatShortDate, formatLongDate } from "./engine";
import type { CycleData } from "./useCycleData";

const PHASE_ACCENT: Record<string, string> = {
  menstrual: "text-rose-500",
  folicular: "text-sky-500",
  ovulacao:  "text-emerald-500",
  luteal:    "text-violet-500",
  sem_dados: "text-muted-foreground",
};

const PHASE_QUOTE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  menstrual: { bg: "bg-gradient-to-br from-rose-50 to-rose-100/40 dark:from-rose-950/50 dark:to-rose-900/20",   border: "border-rose-200/60 dark:border-rose-800/30",    text: "text-rose-600 dark:text-rose-300",    dot: "bg-rose-400" },
  folicular:  { bg: "bg-gradient-to-br from-sky-50 to-sky-100/40 dark:from-sky-950/50 dark:to-sky-900/20",     border: "border-sky-200/60 dark:border-sky-800/30",      text: "text-sky-600 dark:text-sky-300",      dot: "bg-sky-400" },
  ovulacao:   { bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/50 dark:to-emerald-900/20", border: "border-emerald-200/60 dark:border-emerald-800/30", text: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-400" },
  luteal:     { bg: "bg-gradient-to-br from-violet-50 to-violet-100/40 dark:from-violet-950/50 dark:to-violet-900/20", border: "border-violet-200/60 dark:border-violet-800/30", text: "text-violet-600 dark:text-violet-300", dot: "bg-violet-400" },
  sem_dados:  { bg: "bg-gradient-to-br from-rose-50/60 to-transparent dark:from-rose-950/30 dark:to-transparent", border: "border-rose-200/40 dark:border-rose-800/20",   text: "text-rose-500 dark:text-rose-300",    dot: "bg-rose-300" },
};

const CYCLE_RING_CIRCUMFERENCE = 2 * Math.PI * 44;

const PHASE_ICONS: Record<string, LucideIcon> = {
  menstrual: Droplet,
  folicular: Sprout,
  ovulacao: Sparkles,
  luteal: Moon,
  sem_dados: Flower2,
};

const SYMPTOM_SECTIONS = [
  {
    title: "Físicos",
    items: [
      { key: "cramps", label: "Cólicas", icon: Zap },
      { key: "headache", label: "Cabeça", icon: Brain },
      { key: "back_pain", label: "Lombar", icon: Bone },
      { key: "leg_pain", label: "Pernas", icon: Footprints },
      { key: "fatigue", label: "Fadiga", icon: BatteryLow },
      { key: "dizziness", label: "Tontura", icon: RotateCw },
      { key: "weakness", label: "Fraqueza", icon: BatteryWarning },
      { key: "breast_tenderness", label: "Seios", icon: HeartPulse },
      { key: "nausea", label: "Náusea", icon: Frown },
      { key: "bloating", label: "Inchaço", icon: CircleDot },
    ],
  },
  {
    title: "Emocionais",
    items: [
      { key: "mood_swings", label: "Humor", icon: Shuffle },
      { key: "irritability", label: "Irritável", icon: Flame },
      { key: "anxiety", label: "Ansiedade", icon: Waves },
      { key: "sadness", label: "Tristeza", icon: CloudRain },
      { key: "sensitivity", label: "Sensível", icon: Heart },
      { key: "crying", label: "Choro", icon: Droplets },
    ],
  },
  {
    title: "Digestivo",
    items: [
      { key: "diarrhea", label: "Diarreia", icon: Wind },
      { key: "constipation", label: "Obstipação", icon: CircleSlash },
      { key: "gas", label: "Gases", icon: Cloud },
    ],
  },
  {
    title: "Outros",
    items: [
      { key: "acne", label: "Acne", icon: Dot },
      { key: "cravings", label: "Desejos", icon: Cookie },
      { key: "increased_appetite", label: "Apetite", icon: UtensilsCrossed },
    ],
  },
] as const;

const ALL_SYMPTOM_KEYS = SYMPTOM_SECTIONS.flatMap((s) => s.items.map((i) => i.key));

const SECTION_STYLES: Record<string, { soft: string; solid: string; text: string; border: string }> = {
  "Físicos":    { soft: "bg-rose-50 dark:bg-rose-950/30",       solid: "bg-rose-500",    text: "text-rose-500",    border: "border-rose-300 dark:border-rose-700" },
  "Emocionais": { soft: "bg-violet-50 dark:bg-violet-950/30",   solid: "bg-violet-500",  text: "text-violet-500",  border: "border-violet-300 dark:border-violet-700" },
  "Digestivo":  { soft: "bg-sky-50 dark:bg-sky-950/30",         solid: "bg-sky-500",     text: "text-sky-500",     border: "border-sky-300 dark:border-sky-700" },
  "Outros":     { soft: "bg-emerald-50 dark:bg-emerald-950/30", solid: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-300 dark:border-emerald-700" },
};

const FEELING_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  rose:    { text: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30",      border: "border-rose-300 dark:border-rose-700" },
  orange:  { text: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30",  border: "border-orange-300 dark:border-orange-700" },
  fuchsia: { text: "text-fuchsia-500", bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-300 dark:border-fuchsia-700" },
  red:     { text: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30",        border: "border-red-300 dark:border-red-700" },
  teal:    { text: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950/30",      border: "border-teal-300 dark:border-teal-700" },
  indigo:  { text: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30",  border: "border-indigo-300 dark:border-indigo-700" },
  pink:    { text: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30",      border: "border-pink-300 dark:border-pink-700" },
};

// Sombra colorida por tema — dá "glow" ao chip selecionado sem ser excessivo
const CHIP_SHADOWS: Record<keyof typeof FEELING_STYLES, string> = {
  rose:    "shadow-[0_4px_14px_rgba(244,63,94,0.22)]",
  orange:  "shadow-[0_4px_14px_rgba(249,115,22,0.22)]",
  fuchsia: "shadow-[0_4px_14px_rgba(217,70,239,0.22)]",
  red:     "shadow-[0_4px_14px_rgba(239,68,68,0.22)]",
  teal:    "shadow-[0_4px_14px_rgba(20,184,166,0.22)]",
  indigo:  "shadow-[0_4px_14px_rgba(99,102,241,0.22)]",
  pink:    "shadow-[0_4px_14px_rgba(236,72,153,0.22)]",
};

const SECTION_CHIP_SHADOWS: Record<string, string> = {
  "Físicos":    "shadow-[0_4px_14px_rgba(244,63,94,0.22)]",
  "Emocionais": "shadow-[0_4px_14px_rgba(139,92,246,0.22)]",
  "Digestivo":  "shadow-[0_4px_14px_rgba(14,165,233,0.22)]",
  "Outros":     "shadow-[0_4px_14px_rgba(16,185,129,0.22)]",
};

// Mensagens de carinho que aparecem após guardar — rotação aleatória
const CARE_MESSAGES = [
  "Registado. Cuida bem de ti.",
  "O teu bem-estar faz parte da vossa história.",
  "Cada detalhe que registas é um gesto de amor próprio.",
  "Guardado com carinho.",
  "Obrigada por cuidares de ti.",
];

const PROTECTION_OPTIONS = [
  { value: "nenhum", label: "Nenhum", icon: ShieldOff },
  { value: "preservativo", label: "Preservativo", icon: Shield },
  { value: "pilula", label: "Pílula", icon: Pill },
  { value: "diu", label: "DIU", icon: Disc },
  { value: "outro", label: "Outro", icon: HelpCircle },
];

const RISK_STYLES: Record<string, { text: string; bg: string; border: string; icon: LucideIcon }> = {
  alto:        { text: "text-red-500",            bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-200 dark:border-red-800",     icon: ShieldAlert },
  moderado:    { text: "text-orange-500",          bg: "bg-orange-50 dark:bg-orange-950/30",   border: "border-orange-200 dark:border-orange-800", icon: Shield },
  baixo:       { text: "text-emerald-500",         bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: ShieldCheck },
  sem_registo: { text: "text-muted-foreground",    bg: "bg-muted",                             border: "border-border",                           icon: ShieldOff },
};

type ChipOption = { value: number; label: string; icon?: LucideIcon };

const PAIN_OPTIONS: ChipOption[] = [
  { value: 0, label: "Nenhuma", icon: Smile },
  { value: 3, label: "Leve", icon: Meh },
  { value: 6, label: "Moderada", icon: Frown },
  { value: 9, label: "Intensa", icon: AlertTriangle },
];
const ENERGY_OPTIONS: ChipOption[] = [
  { value: 2, label: "Baixa", icon: BatteryLow },
  { value: 5, label: "Normal", icon: Battery },
  { value: 9, label: "Alta", icon: Rocket },
];
const STRESS_OPTIONS: ChipOption[] = [
  { value: 0, label: "Calma", icon: Smile },
  { value: 4, label: "Normal", icon: Meh },
  { value: 8, label: "Stressada", icon: Flame },
];
const LIBIDO_OPTIONS: ChipOption[] = [
  { value: 2, label: "Baixo", icon: Snowflake },
  { value: 5, label: "Normal", icon: Thermometer },
  { value: 9, label: "Alto", icon: Flame },
];
const SLEEP_QUALITY_OPTIONS = [
  { value: "mau", label: "Mau", icon: Moon },
  { value: "ok", label: "Ok", icon: Meh },
  { value: "bom", label: "Bom", icon: Smile },
];
const DISCHARGE_OPTIONS = [
  { value: "seco", label: "Seco", icon: Sun },
  { value: "pegajoso", label: "Pegajoso", icon: Droplet },
  { value: "cremoso", label: "Cremoso", icon: Droplets },
  { value: "clara_de_ovo", label: "Fértil", icon: Egg },
];

function valueToChip(value: number, options: ChipOption[]): number {
  let closest = options[0].value;
  let minDiff = Math.abs(value - closest);
  for (const opt of options) {
    const diff = Math.abs(value - opt.value);
    if (diff < minDiff) { minDiff = diff; closest = opt.value; }
  }
  return closest;
}

// ── Chip numérico — estado selecionado com escala + sombra + ícone expressivo
function ChipSelector({
  label, options, value, onChange, disabled = false, color = "rose",
}: {
  label: string; options: ChipOption[];
  value: number; onChange: (v: number) => void; disabled?: boolean; color?: keyof typeof FEELING_STYLES;
}) {
  const style = FEELING_STYLES[color];
  const shadow = CHIP_SHADOWS[color];
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value} type="button" disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-200 ease-out",
                active
                  ? cn(style.border, style.bg, style.text, shadow, "scale-[1.04]")
                  : "border-border/60 text-muted-foreground/70 hover:bg-muted/60 hover:border-border active:scale-95",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {Icon && (
                <Icon
                  className={cn("h-3.5 w-3.5 transition-all duration-200", active ? "" : "opacity-60")}
                  strokeWidth={active ? 2 : 1.5}
                />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Chip textual — mesmo tratamento visual
function StringChipSelector({
  label, options, value, onChange, disabled = false, color = "rose",
}: {
  label: string;
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string; onChange: (v: string) => void; disabled?: boolean; color?: keyof typeof FEELING_STYLES;
}) {
  const style = FEELING_STYLES[color];
  const shadow = CHIP_SHADOWS[color];
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value} type="button" disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-200 ease-out",
                active
                  ? cn(style.border, style.bg, style.text, shadow, "scale-[1.04]")
                  : "border-border/60 text-muted-foreground/70 hover:bg-muted/60 hover:border-border active:scale-95",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {Icon && (
                <Icon
                  className={cn("h-3.5 w-3.5 transition-all duration-200", active ? "" : "opacity-60")}
                  strokeWidth={active ? 2 : 1.5}
                />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Fluxo — dots como elementos HTML, escala quando selecionado
function FlowChip({ flowLevel, onChange }: {
  flowLevel: string; onChange: (v: string) => void;
}) {
  const flows = [
    { value: "light",  label: "Leve",     dots: 1 },
    { value: "medium", label: "Moderado", dots: 2 },
    { value: "heavy",  label: "Intenso",  dots: 3 },
  ];
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Fluxo</p>
      <div className="flex gap-2">
        {flows.map(f => {
          const active = flowLevel === f.value;
          return (
            <button
              key={f.value} type="button"
              onClick={() => onChange(f.value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl border text-xs font-semibold transition-all duration-200 ease-out",
                active
                  ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500 shadow-[0_4px_14px_rgba(244,63,94,0.22)] scale-[1.04]"
                  : "border-border/60 text-muted-foreground/70 hover:bg-muted/60 hover:border-border active:scale-95"
              )}
            >
              <span className="flex gap-1">
                {Array.from({ length: f.dots }).map((_, i) => (
                  <span key={i} className={cn("w-2 h-2 rounded-full transition-all duration-200", active ? "bg-rose-400" : "bg-muted-foreground/25")} />
                ))}
              </span>
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Cabeçalho de secção com identidade própria
function SectionHeader({
  accentClass, markerClass, children, right,
}: {
  accentClass: string; markerClass: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <>
      <div className="px-5 pt-4 pb-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-4 rounded-full shrink-0", markerClass)} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</p>
        </div>
        {right}
      </div>
    </>
  );
}

export function CycleToday({ data }: { data: CycleData }) {
  const {
    profile, engine, openPeriod, todaySymptoms,
    reload, ensureProfile, spaceId, user, today,
    todayIntimacy, intimacyLogs, pregnancyRisk,
  } = data;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPetals, setShowPetals] = useState(false);
  const [careMessage, setCareMessage] = useState("");
  const [flowLevel, setFlowLevel] = useState<string>("medium");
  const [startDate, setStartDate] = useState(today);
  const [showBackdate, setShowBackdate] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [showEndDate, setShowEndDate] = useState(false);
  const [periodNotes, setPeriodNotes] = useState("");

  const [savingIntimacy, setSavingIntimacy] = useState(false);
  const [intimacyDate, setIntimacyDate] = useState(today);
  const [showIntimacyDate, setShowIntimacyDate] = useState(false);
  const [hadActivityToday, setHadActivityToday] = useState(() => !!todayIntimacy);
  const [protectionMethod, setProtectionMethod] = useState(() => todayIntimacy?.protection_method ?? "nenhum");

  const [symptoms, setSymptoms] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    ALL_SYMPTOM_KEYS.forEach((k) => { s[k] = (todaySymptoms as any)?.[k] ?? false; });
    return s;
  });

  const [painLevel, setPainLevel] = useState(() => valueToChip(todaySymptoms?.pain_level ?? 0, PAIN_OPTIONS));
  const [energyLevel, setEnergyLevel] = useState(() => valueToChip((todaySymptoms as any)?.energy_level ?? 5, ENERGY_OPTIONS));
  const [stress, setStress] = useState(() => valueToChip((todaySymptoms as any)?.stress ?? 0, STRESS_OPTIONS));
  const [libido, setLibido] = useState(() => valueToChip(todaySymptoms?.libido ?? 5, LIBIDO_OPTIONS));
  const [sleepQuality, setSleepQuality] = useState<string>((todaySymptoms as any)?.sleep_quality ?? "ok");
  const [sleepHours, setSleepHours] = useState<string>((todaySymptoms as any)?.sleep_hours?.toString() ?? "");
  const [dischargeType, setDischargeType] = useState<string>((todaySymptoms as any)?.discharge_type ?? "seco");
  const [temperature, setTemperature] = useState<string>((todaySymptoms as any)?.temperature_c?.toString() ?? "");
  const [notes, setNotes] = useState(todaySymptoms?.notes ?? "");

  useEffect(() => {
    if (!todaySymptoms) return;
    const s: Record<string, boolean> = {};
    ALL_SYMPTOM_KEYS.forEach((k) => { s[k] = (todaySymptoms as any)?.[k] ?? false; });
    setSymptoms(s);
    setPainLevel(valueToChip(todaySymptoms.pain_level ?? 0, PAIN_OPTIONS));
    setEnergyLevel(valueToChip((todaySymptoms as any)?.energy_level ?? 5, ENERGY_OPTIONS));
    setStress(valueToChip((todaySymptoms as any)?.stress ?? 0, STRESS_OPTIONS));
    setLibido(valueToChip(todaySymptoms.libido ?? 5, LIBIDO_OPTIONS));
    setSleepQuality((todaySymptoms as any)?.sleep_quality ?? "ok");
    setSleepHours((todaySymptoms as any)?.sleep_hours?.toString() ?? "");
    setDischargeType((todaySymptoms as any)?.discharge_type ?? "seco");
    setTemperature((todaySymptoms as any)?.temperature_c?.toString() ?? "");
    setNotes(todaySymptoms.notes ?? "");
  }, [todaySymptoms]);

  useEffect(() => {
    const log = intimacyLogs.find((l) => l.day_key === intimacyDate) ?? null;
    setHadActivityToday(!!log);
    setProtectionMethod(log?.protection_method ?? "nenhum");
  }, [intimacyDate, intimacyLogs]);

  const activeSymptoms = Object.values(symptoms).filter(Boolean).length;

  const sendPartnerNotif = () => {
    if (!spaceId || !profile || profile.share_level === "private") return;
    notifyPartner({ couple_space_id: spaceId, title: "Ciclo", body: "Actualização no ciclo", url: "/ciclo", type: "ciclo_par" });
  };

  const triggerSavedFeedback = useCallback(() => {
    setCareMessage(CARE_MESSAGES[Math.floor(Math.random() * CARE_MESSAGES.length)]);
    setSaved(true);
    setShowPetals(true);
    setTimeout(() => { setSaved(false); setShowPetals(false); }, 2600);
  }, []);

  const handleStartPeriod = async () => {
    if (!user || !spaceId) return;
    setSaving(true);
    await ensureProfile();
    await supabase.from("period_entries").insert({
      user_id: user.id, couple_space_id: spaceId, start_date: startDate,
      flow_level: flowLevel, pain_level: 0, pms_level: 0, notes: periodNotes || null,
    });
    sendPartnerNotif(); setSaving(false); setShowBackdate(false); setPeriodNotes("");
    triggerSavedFeedback(); reload();
  };

  const handleEndPeriod = async () => {
    if (!openPeriod) return;
    setSaving(true);
    await supabase.from("period_entries").update({ end_date: endDate, notes: periodNotes || null }).eq("id", openPeriod.id);
    sendPartnerNotif(); setSaving(false); setShowEndDate(false); setPeriodNotes("");
    triggerSavedFeedback(); reload();
  };

  const handleSaveSymptoms = async () => {
    if (!user || !spaceId) return;
    setSaving(true);
    await ensureProfile();
    const payload = {
      user_id: user.id, couple_space_id: spaceId, day_key: today,
      pain_level: painLevel, energy_level: energyLevel, stress, libido,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      temperature_c: temperature ? parseFloat(temperature) : null,
      sleep_quality: sleepQuality, discharge_type: dischargeType, discharge: "none",
      notes: notes || null, tpm: engine?.phase === "luteal", ...symptoms,
    } as any;
    if (todaySymptoms) {
      await supabase.from("daily_symptoms").update(payload).eq("id", todaySymptoms.id);
    } else {
      await supabase.from("daily_symptoms").insert(payload);
    }
    sendPartnerNotif(); setSaving(false);
    triggerSavedFeedback(); reload();
  };

  const handleSaveIntimacy = async () => {
    if (!user || !spaceId) return;
    setSavingIntimacy(true);
    await ensureProfile();
    const existing = intimacyLogs.find((l) => l.day_key === intimacyDate) ?? null;
    if (!hadActivityToday) {
      if (existing) {
        await (supabase.from("intimacy_logs" as any).delete().eq("id", existing.id) as any);
      }
    } else {
      const payload = {
        user_id: user.id, couple_space_id: spaceId, day_key: intimacyDate,
        protection_method: protectionMethod,
      };
      if (existing) {
        await (supabase.from("intimacy_logs" as any).update(payload).eq("id", existing.id) as any);
      } else {
        await (supabase.from("intimacy_logs" as any).insert(payload) as any);
      }
    }
    setSavingIntimacy(false);
    setShowIntimacyDate(false); setIntimacyDate(today);
    triggerSavedFeedback(); reload();
  };

  const periodDays = openPeriod
    ? differenceInDays(new Date(), new Date(openPeriod.start_date + "T12:00:00")) + 1 : 0;

  if (data.isMale && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-70">
        <div className="h-14 w-14 rounded-full bg-[#FADADD] dark:bg-rose-950/30 flex items-center justify-center shadow-sm">
          <Flower2 className="h-7 w-7 text-[#E94E77] dark:text-rose-300" />
        </div>
        <p className="text-sm font-bold text-[#E94E77] dark:text-rose-300">Ciclo não encontrado</p>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          A tua parceira ainda não configurou o acompanhamento do ciclo menstrual.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const accentColor = PHASE_ACCENT[phaseKey] ?? "text-muted-foreground";
  const PhaseIcon = PHASE_ICONS[phaseKey] ?? Flower2;

  const ringAngle = ((engine?.cycleProgress ?? 0) / 100) * 2 * Math.PI;
  const ringDotX = 50 + 44 * Math.sin(ringAngle);
  const ringDotY = 50 - 44 * Math.cos(ringAngle);

  return (
    <>
      <div className="space-y-6">

        {/* ── Hero de fase ── */}
        {engine ? (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="currentColor" className="text-muted/50 dark:text-muted/30" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="currentColor" strokeLinecap="round"
                    strokeDasharray={CYCLE_RING_CIRCUMFERENCE}
                    strokeDashoffset={CYCLE_RING_CIRCUMFERENCE * (1 - engine.cycleProgress / 100)}
                    className={cn("transition-all duration-700", accentColor)}
                  />
                </svg>
                <div
                  className={cn("absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 animate-glow-pulse", accentColor.replace("text-", "bg-"))}
                  style={{ left: `${ringDotX}%`, top: `${ringDotY}%` }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <PhaseIcon className={cn("h-5 w-5 mb-0.5", accentColor)} strokeWidth={1.5} />
                  <span className="text-2xl font-bold text-foreground tabular-nums leading-none">{engine.cycleDay}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">de {engine.cycleLength}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Fase actual</p>
                <h2 className={cn("text-xl font-bold", accentColor)}>{engine.phaseLabel}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {engine.daysUntilNextPeriod > 0
                    ? `${engine.daysUntilNextPeriod}d até menstruação`
                    : engine.daysUntilNextPeriod === 0 ? "Menstruação chega hoje" : ""}
                </p>
              </div>
            </div>

            <p className={cn("text-sm font-medium leading-relaxed italic", accentColor)}>"{engine.insights[0]}"</p>

            {engine.insights.slice(1).map((insight, i) => (
              <div key={i} className="rounded-xl border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
              </div>
            ))}

            <div className="flex gap-2 flex-wrap">
              {engine.isInPeriod && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200/50 dark:border-rose-800/50">Em período</span>
              )}
              {engine.isInFertileWindow && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/30 text-sky-500 border border-sky-200/50 dark:border-sky-800/50">Janela fértil</span>
              )}
              {engine.isInPmsWindow && !engine.isInPeriod && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-violet-50 dark:bg-violet-950/30 text-violet-500 border border-violet-200/50 dark:border-violet-800/50">TPM</span>
              )}
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                Próx. {formatShortDate(engine.nextPeriodStr)}
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center space-y-2">
            <Flower2 className="h-10 w-10 mx-auto mb-2 text-rose-300" strokeWidth={1.5} />
            <p className="font-semibold text-foreground">Começa a acompanhar o teu ciclo</p>
            <p className="text-sm text-muted-foreground">Regista a tua menstruação para receber insights personalizados</p>
          </div>
        )}

        {engine && <CycleHistoryStrip data={data} />}

        {/* ── Risco de gravidez ── */}
        {engine && (() => {
          const riskStyle = RISK_STYLES[pregnancyRisk.level];
          const RiskIcon = riskStyle.icon;
          return (
            <div className={cn("glass-card p-4 flex items-start gap-3 border", riskStyle.border)}>
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", riskStyle.bg)}>
                <RiskIcon className={cn("h-4.5 w-4.5", riskStyle.text)} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", riskStyle.text)}>{pregnancyRisk.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{pregnancyRisk.description}</p>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed mt-1">
                  Estimativa informativa — não substitui um método contracetivo nem aconselhamento médico.
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Menstruação ── */}
        <div className="glass-card overflow-hidden">
          <SectionHeader accentClass="from-rose-300/60 via-rose-200/30 dark:from-rose-700/40" markerClass="bg-rose-400/70">
            Menstruação
          </SectionHeader>
          <div className="p-5 space-y-4">
            {openPeriod ? (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-950/10 border border-rose-100 dark:border-rose-900/40 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shrink-0 animate-glow-pulse">
                    <Droplet className="w-4.5 h-4.5 text-white" fill="currentColor" strokeWidth={0} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rose-500">Em curso</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Desde {formatLongDate(openPeriod.start_date)}</p>
                  </div>
                  <span className="text-xs font-semibold bg-white/80 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-full tabular-nums shrink-0">{periodDays}d</span>
                </div>
                {!data.isMale && (
                  <div className="space-y-3">
                    <Textarea
                      value={periodNotes}
                      onChange={e => setPeriodNotes(e.target.value)}
                      placeholder="Notas sobre este período (opcional)"
                      disabled={saving}
                      className="rounded-xl border-border bg-card text-sm resize-none min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEndDate(today); setShowEndDate(false); handleEndPeriod(); }}
                        disabled={saving}
                        className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-2xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-all disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        Terminou hoje
                      </button>
                      <button
                        onClick={() => { setShowEndDate(!showEndDate); setEndDate(today); }}
                        className={cn(
                          "h-10 px-3 rounded-2xl border text-xs flex items-center gap-1 transition-all duration-200",
                          showEndDate
                            ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                            : "border-border/60 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Calendar className="h-3 w-3" strokeWidth={1.5} /> Outra data
                      </button>
                    </div>
                    {showEndDate && (
                      <div className="space-y-2">
                        <Input
                          type="date" value={endDate} max={today} min={openPeriod?.start_date}
                          onChange={(e) => setEndDate(e.target.value)} disabled={saving}
                          className="rounded-xl border-border bg-card h-10 text-sm"
                        />
                        <button
                          onClick={handleEndPeriod} disabled={saving || !endDate}
                          className="w-full h-10 flex items-center justify-center gap-1.5 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition-all"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          Confirmar data de fim
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <FlowChip flowLevel={flowLevel} onChange={setFlowLevel} />
                <Textarea
                  value={periodNotes}
                  onChange={e => setPeriodNotes(e.target.value)}
                  placeholder="Notas sobre este período (opcional)"
                  disabled={saving}
                  className="rounded-xl border-border bg-card text-sm resize-none min-h-[60px]"
                />
                <button
                  onClick={() => { setStartDate(today); setShowBackdate(false); handleStartPeriod(); }}
                  disabled={saving}
                  className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> : <PlayCircle className="h-4 w-4" strokeWidth={1.5} />}
                  {saved ? "Ciclo registado" : "Começou hoje"}
                </button>
                <button
                  onClick={() => { setShowBackdate(!showBackdate); setStartDate(today); }}
                  disabled={saving}
                  className={cn(
                    "w-full h-10 flex items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium transition-all duration-200 disabled:opacity-60",
                    showBackdate
                      ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                      : "border-border/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Calendar className="h-4 w-4" strokeWidth={1.5} />
                  Começou noutro dia
                </button>
                {showBackdate && (
                  <div className="space-y-2">
                    <Input
                      type="date" value={startDate} max={today}
                      onChange={(e) => setStartDate(e.target.value)} disabled={saving}
                      className="rounded-xl border-border bg-card h-10 text-sm"
                    />
                    <button
                      onClick={handleStartPeriod} disabled={saving || !startDate}
                      className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" strokeWidth={1.5} />}
                      Confirmar início
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Como me sinto hoje ── */}
        <div className="glass-card overflow-hidden">
          <SectionHeader accentClass="from-violet-300/60 via-violet-200/20 dark:from-violet-700/40" markerClass="bg-violet-400/70">
            Como me sinto hoje
          </SectionHeader>
          <div className="p-5 space-y-6">
            <ChipSelector label="Dor" options={PAIN_OPTIONS} value={painLevel} onChange={setPainLevel} disabled={data.isMale || saving} color="rose" />
            <ChipSelector label="Energia" options={ENERGY_OPTIONS} value={energyLevel} onChange={setEnergyLevel} disabled={data.isMale || saving} color="orange" />
            <ChipSelector label="Stress" options={STRESS_OPTIONS} value={stress} onChange={setStress} disabled={data.isMale || saving} color="fuchsia" />
            <ChipSelector label="Libido" options={LIBIDO_OPTIONS} value={libido} onChange={setLibido} disabled={data.isMale || saving} color="red" />
            <StringChipSelector label="Secreção" options={DISCHARGE_OPTIONS} value={dischargeType} onChange={setDischargeType} disabled={data.isMale || saving} color="teal" />
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sono (h)</p>
                <Input type="number" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="ex: 7.5" disabled={data.isMale || saving} className="rounded-xl border-border bg-card h-10 text-sm" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Qualidade do sono</p>
                <div className="flex gap-1.5">
                  {SLEEP_QUALITY_OPTIONS.map(opt => {
                    const activeQ = sleepQuality === opt.value;
                    return (
                      <button key={opt.value} type="button" disabled={data.isMale || saving} onClick={() => setSleepQuality(opt.value)}
                        className={cn("flex-1 h-10 flex items-center justify-center rounded-xl border transition-all duration-200 ease-out",
                          activeQ
                            ? cn(FEELING_STYLES.indigo.border, FEELING_STYLES.indigo.bg, FEELING_STYLES.indigo.text, CHIP_SHADOWS.indigo, "scale-[1.04]")
                            : "border-border/60 text-muted-foreground/70 hover:bg-muted/60 hover:border-border active:scale-95",
                          (data.isMale || saving) && "opacity-50 cursor-not-allowed"
                        )}>
                        <opt.icon className={cn("h-4 w-4 transition-all", activeQ ? "" : "opacity-60")} strokeWidth={activeQ ? 2 : 1.5} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Thermometer className="h-3 w-3" strokeWidth={1.5} /> Temp. basal (°C)
                </p>
                <Input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="ex: 36.5" disabled={data.isMale || saving} className="rounded-xl border-border bg-card h-10 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Intimidade ── */}
        <div className="glass-card overflow-hidden">
          <SectionHeader
            accentClass="from-pink-300/60 via-pink-200/20 dark:from-pink-700/40"
            markerClass="bg-pink-400/70"
            right={
              <button type="button" disabled={data.isMale}
                onClick={() => {
                  if (showIntimacyDate) { setShowIntimacyDate(false); setIntimacyDate(today); }
                  else setShowIntimacyDate(true);
                }}
                className="h-7 px-3 rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 text-pink-500 text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
              >
                <Calendar className="h-3 w-3" strokeWidth={2} />
                {intimacyDate === today ? "Hoje" : formatShortDate(intimacyDate)}
              </button>
            }
          >
            Intimidade
          </SectionHeader>
          <div className="p-5 space-y-4">
            {showIntimacyDate && (
              <Input
                type="date" value={intimacyDate} max={today}
                onChange={(e) => setIntimacyDate(e.target.value)}
                disabled={data.isMale || savingIntimacy}
                className="rounded-xl border-border bg-card h-10 text-sm"
              />
            )}

            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Houve relação?</p>
              <div className="flex gap-2">
                {[{ value: false, label: "Não" }, { value: true, label: "Sim" }].map(opt => {
                  const activeYN = hadActivityToday === opt.value;
                  return (
                    <button key={String(opt.value)} type="button" disabled={data.isMale || savingIntimacy}
                      onClick={() => setHadActivityToday(opt.value)}
                      className={cn("flex-1 py-3 rounded-2xl border text-xs font-semibold transition-all duration-200 ease-out",
                        activeYN
                          ? cn(FEELING_STYLES.pink.border, FEELING_STYLES.pink.bg, FEELING_STYLES.pink.text, CHIP_SHADOWS.pink, "scale-[1.04]")
                          : "border-border/60 text-muted-foreground/70 hover:bg-muted/60 hover:border-border active:scale-95",
                        (data.isMale || savingIntimacy) && "opacity-50 cursor-not-allowed"
                      )}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {hadActivityToday && (
              <StringChipSelector
                label="Prevenção"
                options={PROTECTION_OPTIONS}
                value={protectionMethod}
                onChange={setProtectionMethod}
                disabled={data.isMale || savingIntimacy}
                color="pink"
              />
            )}

            {!data.isMale && (
              <button onClick={handleSaveIntimacy} disabled={savingIntimacy}
                className="w-full h-11 rounded-2xl bg-pink-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {savingIntimacy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
                Guardar
              </button>
            )}
          </div>
        </div>

        {/* ── Sintomas ── */}
        <div className="glass-card overflow-hidden">
          <SectionHeader
            accentClass="from-rose-300/50 via-violet-200/20 dark:from-rose-700/40"
            markerClass="bg-gradient-to-b from-rose-400/80 to-violet-400/60"
            right={activeSymptoms > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold">{activeSymptoms} ativos</span>
            ) : undefined}
          >
            Sintomas
          </SectionHeader>
          <div className="p-5 space-y-6">
            {SYMPTOM_SECTIONS.map(section => {
              const style = SECTION_STYLES[section.title];
              const chipShadow = SECTION_CHIP_SHADOWS[section.title];
              return (
                <div key={section.title} className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1 h-3 rounded-full shrink-0", style.solid)} />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{section.title}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {section.items.map(s => {
                      const Icon = s.icon;
                      const active = symptoms[s.key];
                      return (
                        <button key={s.key} type="button" disabled={data.isMale}
                          onClick={() => setSymptoms(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                          className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-[10px] font-semibold transition-all duration-200 ease-out",
                            active
                              ? cn(style.border, style.soft, chipShadow, "scale-[1.05]")
                              : "border-border/60 hover:bg-muted/60 hover:border-border active:scale-95",
                            data.isMale && "opacity-50 cursor-not-allowed"
                          )}>
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                            active ? cn(style.solid, "shadow-sm") : style.soft)}>
                            <Icon className={cn("h-[17px] w-[17px] transition-all duration-200", active ? "text-white" : cn(style.text, "opacity-70"))} strokeWidth={active ? 2 : 1.75} />
                          </div>
                          <span className={cn("leading-tight text-center transition-colors duration-200", active ? style.text : "text-muted-foreground")}>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notas</p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Algo que queiras registar sobre hoje..."
                disabled={data.isMale || saving}
                className="rounded-xl border-border bg-card text-sm resize-none min-h-[80px]"
              />
            </div>

            {!data.isMale && (
              <button onClick={handleSaveSymptoms} disabled={saving}
                className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
                {saved ? "Guardado" : todaySymptoms ? "Atualizar" : "Guardar hoje"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast de carinho — aparece suavemente e desaparece após guardar */}
      <div
        className={cn(
          "fixed left-4 right-4 bottom-24 z-50 flex justify-center transition-all duration-500 ease-out pointer-events-none",
          saved ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        )}
      >
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 shadow-xl rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" strokeWidth={2} />
          </div>
          <p className="text-[13px] text-foreground font-medium leading-snug">{careMessage}</p>
        </div>
      </div>
    </>
  );
}
