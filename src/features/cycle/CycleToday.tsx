import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Loader2, Calendar, StopCircle, PlayCircle,
  AlertTriangle, Flower2, CheckCircle2, Sparkles,
} from "lucide-react";
import { notifyPartner } from "@/lib/notifyPartner";
import { CyclePartnerSummary } from "./CyclePartnerSummary";
import { differenceInDays } from "date-fns";
import { formatShortDate, formatLongDate } from "./engine";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// DESIGN SYSTEM — Premium Soft Feminine (Flo-inspired)
// ─────────────────────────────────────────────

const PHASE_SOFT: Record<string, {
  bg: string; border: string; accent: string; pill: string;
  progressFill: string; progressBg: string; glow: string;
}> = {
  menstrual: {
    bg: "bg-gradient-to-br from-rose-50 via-pink-50/60 to-rose-100/40 dark:from-rose-950/30 dark:to-rose-900/10",
    border: "border-rose-100/60 dark:border-rose-900/30",
    accent: "text-rose-500 dark:text-rose-400",
    pill: "bg-rose-100/90 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
    progressFill: "bg-gradient-to-r from-rose-300 to-rose-400",
    progressBg: "bg-rose-100/80 dark:bg-rose-900/40",
    glow: "shadow-rose-100 dark:shadow-rose-900/20",
  },
  folicular: {
    bg: "bg-gradient-to-br from-sky-50 via-blue-50/50 to-cyan-50/40 dark:from-sky-950/20 dark:to-sky-900/10",
    border: "border-sky-100/60 dark:border-sky-900/30",
    accent: "text-sky-500 dark:text-sky-400",
    pill: "bg-sky-100/80 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
    progressFill: "bg-gradient-to-r from-sky-300 to-sky-400",
    progressBg: "bg-sky-100/80 dark:bg-sky-900/40",
    glow: "shadow-sky-100 dark:shadow-sky-900/20",
  },
  ovulacao: {
    bg: "bg-gradient-to-br from-emerald-50 via-green-50/50 to-teal-50/40 dark:from-emerald-950/20 dark:to-emerald-900/10",
    border: "border-emerald-100/60 dark:border-emerald-900/30",
    accent: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    progressFill: "bg-gradient-to-r from-emerald-300 to-emerald-400",
    progressBg: "bg-emerald-100/80 dark:bg-emerald-900/40",
    glow: "shadow-emerald-100 dark:shadow-emerald-900/20",
  },
  luteal: {
    bg: "bg-gradient-to-br from-purple-50 via-violet-50/50 to-fuchsia-50/40 dark:from-purple-950/20 dark:to-purple-900/10",
    border: "border-purple-100/60 dark:border-purple-900/30",
    accent: "text-purple-500 dark:text-purple-400",
    pill: "bg-purple-100/80 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
    progressFill: "bg-gradient-to-r from-purple-300 to-purple-400",
    progressBg: "bg-purple-100/80 dark:bg-purple-900/40",
    glow: "shadow-purple-100 dark:shadow-purple-900/20",
  },
  sem_dados: {
    bg: "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-900/10",
    border: "border-slate-100/60 dark:border-slate-700/30",
    accent: "text-slate-400",
    pill: "bg-slate-100 text-slate-500",
    progressFill: "bg-slate-300",
    progressBg: "bg-slate-100",
    glow: "shadow-slate-100",
  },
};

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: "🌹",
  folicular: "🌱",
  ovulacao: "✨",
  luteal: "💜",
  sem_dados: "🌸",
};

const SYMPTOM_SECTIONS = [
  {
    title: "Físicos",
    items: [
      { key: "cramps", label: "Cólicas", emoji: "🤕" },
      { key: "headache", label: "Cabeça", emoji: "🤯" },
      { key: "back_pain", label: "Lombar", emoji: "😣" },
      { key: "leg_pain", label: "Pernas", emoji: "🦵" },
      { key: "fatigue", label: "Fadiga", emoji: "😴" },
      { key: "dizziness", label: "Tontura", emoji: "💫" },
      { key: "weakness", label: "Fraqueza", emoji: "😵" },
      { key: "breast_tenderness", label: "Seios", emoji: "🩹" },
      { key: "nausea", label: "Náusea", emoji: "🤢" },
      { key: "bloating", label: "Inchaço", emoji: "🎈" },
    ],
  },
  {
    title: "Emocionais",
    items: [
      { key: "mood_swings", label: "Humor", emoji: "🎭" },
      { key: "irritability", label: "Irritável", emoji: "😤" },
      { key: "anxiety", label: "Ansiedade", emoji: "😰" },
      { key: "sadness", label: "Tristeza", emoji: "😢" },
      { key: "sensitivity", label: "Sensível", emoji: "🥺" },
      { key: "crying", label: "Choro", emoji: "😭" },
    ],
  },
  {
    title: "Digestivo",
    items: [
      { key: "diarrhea", label: "Diarreia", emoji: "💧" },
      { key: "constipation", label: "Obstipação", emoji: "🧱" },
      { key: "gas", label: "Gases", emoji: "💨" },
    ],
  },
  {
    title: "Outros",
    items: [
      { key: "acne", label: "Acne", emoji: "😕" },
      { key: "cravings", label: "Desejos", emoji: "🍫" },
      { key: "increased_appetite", label: "Apetite", emoji: "🍽️" },
    ],
  },
] as const;

const ALL_SYMPTOM_KEYS = SYMPTOM_SECTIONS.flatMap((s) => s.items.map((i) => i.key));

type ChipOption = { value: number; label: string; emoji?: string };

const PAIN_OPTIONS: ChipOption[] = [
  { value: 0, label: "Nenhuma", emoji: "😊" },
  { value: 3, label: "Leve", emoji: "😣" },
  { value: 6, label: "Moderada", emoji: "😫" },
  { value: 9, label: "Intensa", emoji: "🤯" },
];
const ENERGY_OPTIONS: ChipOption[] = [
  { value: 2, label: "Baixa", emoji: "💤" },
  { value: 5, label: "Normal", emoji: "⚡" },
  { value: 9, label: "Alta", emoji: "🚀" },
];
const STRESS_OPTIONS: ChipOption[] = [
  { value: 0, label: "Calma", emoji: "😌" },
  { value: 4, label: "Normal", emoji: "😐" },
  { value: 8, label: "Stressada", emoji: "😰" },
];
const LIBIDO_OPTIONS: ChipOption[] = [
  { value: 2, label: "Baixo", emoji: "❄️" },
  { value: 5, label: "Normal", emoji: "🌡️" },
  { value: 9, label: "Alto", emoji: "🔥" },
];
const SLEEP_QUALITY_OPTIONS = [
  { value: "mau", label: "Mau", emoji: "😴" },
  { value: "ok", label: "Ok", emoji: "😐" },
  { value: "bom", label: "Bom", emoji: "😊" },
];
const DISCHARGE_OPTIONS = [
  { value: "seco", label: "Seco", emoji: "🏜️" },
  { value: "pegajoso", label: "Pegajoso", emoji: "🍯" },
  { value: "cremoso", label: "Cremoso", emoji: "🥛" },
  { value: "clara_de_ovo", label: "Fértil", emoji: "🥚" },
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

// ── Floating Petal / Sparkle confirmation feedback ──────────────────────────

function FloatPetal({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]" aria-hidden>
      {["🌸", "✨", "🌸", "✨", "🌸"].map((e, i) => (
        <span
          key={i}
          className="absolute text-lg animate-float-up"
          style={{
            left: `${15 + i * 18}%`,
            bottom: "12px",
            animationDelay: `${i * 0.12}s`,
            animationDuration: "1.4s",
            animationFillMode: "forwards",
          }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

// ── Premium Chip Selector ────────────────────────────────────────────────────

function ChipSelector({
  label, emoji, options, value, onChange, disabled = false,
}: {
  label: string; emoji?: string; options: ChipOption[];
  value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        {emoji && <span className="mr-1">{emoji}</span>}{label}
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300",
              value === opt.value
                ? "bg-gradient-to-br from-rose-400 to-pink-400 text-white shadow-md shadow-rose-200/60 scale-[1.06] dark:shadow-rose-900/30"
                : "bg-white/60 dark:bg-white/5 text-muted-foreground border border-border/40 hover:border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-900/10",
              disabled && "opacity-50 cursor-not-allowed scale-100"
            )}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StringChipSelector({
  label, emoji, options, value, onChange, disabled = false,
}: {
  label: string; emoji?: string;
  options: { value: string; label: string; emoji?: string }[];
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        {emoji && <span className="mr-1">{emoji}</span>}{label}
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200",
              value === opt.value
                ? "bg-gradient-to-br from-rose-400 to-pink-400 text-white shadow-md shadow-rose-200/60 scale-[1.06]"
                : "bg-white/60 dark:bg-white/5 text-muted-foreground border border-border/40 hover:border-rose-200 hover:bg-rose-50/50",
              disabled && "opacity-50 cursor-not-allowed scale-100"
            )}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Flow level chip — premium blood drop indicator ────────────────────────

function FlowChip({ value, flowLevel, onChange }: {
  value: string; flowLevel: string; onChange: (v: string) => void;
}) {
  const flows = [
    { value: "light", label: "Leve", drops: 1, color: "from-rose-200 to-pink-300" },
    { value: "medium", label: "Moderado", drops: 2, color: "from-rose-400 to-rose-500" },
    { value: "heavy", label: "Intenso", drops: 3, color: "from-rose-600 to-rose-700" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Fluxo</p>
      <div className="flex gap-2">
        {flows.map((f) => (
          <button
            key={f.value} type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-bold transition-all duration-200",
              flowLevel === f.value
                ? `bg-gradient-to-b ${f.color} text-white border-transparent shadow-md shadow-rose-200/50 scale-[1.04]`
                : "bg-white/50 border-border/30 text-muted-foreground hover:bg-rose-50/40"
            )}
          >
            <span className="flex gap-0.5">
              {Array.from({ length: f.drops }).map((_, i) => (
                <span key={i} className={cn(
                  "text-sm",
                  flowLevel === f.value ? "opacity-100" : "opacity-40"
                )}>🩸</span>
              ))}
            </span>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────────────

export function CycleToday({ data }: { data: CycleData }) {
  const {
    profile, engine, openPeriod, todaySymptoms,
    reload, ensureProfile, spaceId, user, today,
  } = data;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);       // ← emotional feedback
  const [showPetals, setShowPetals] = useState(false);
  const [flowLevel, setFlowLevel] = useState<string>("medium");
  const [startDate, setStartDate] = useState(today);
  const [showBackdate, setShowBackdate] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [showEndDate, setShowEndDate] = useState(false);
  const [periodNotes, setPeriodNotes] = useState("");

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
    setNotes(todaySymptoms.notes ?? "");
  }, [todaySymptoms]);

  const activeSymptoms = Object.values(symptoms).filter(Boolean).length;

  const sendPartnerNotif = () => {
    if (!spaceId || !profile || profile.share_level === "private") return;
    notifyPartner({ couple_space_id: spaceId, title: "🌸 Ciclo", body: "Actualização no ciclo", url: "/ciclo", type: "ciclo_par" });
  };

  // Emotional feedback helper
  const triggerSavedFeedback = useCallback(() => {
    setSaved(true);
    setShowPetals(true);
    setTimeout(() => { setSaved(false); setShowPetals(false); }, 2200);
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

  const periodDays = openPeriod
    ? differenceInDays(new Date(), new Date(openPeriod.start_date + "T12:00:00")) + 1 : 0;

  // ── Male: partner not configured
  if (data.isMale && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-70">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shadow-sm">
          <Flower2 className="h-7 w-7 text-pink-400" />
        </div>
        <p className="text-sm font-bold">Ciclo não encontrado</p>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          A tua parceira ainda não configurou o acompanhamento do ciclo menstrual.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const colors = PHASE_SOFT[phaseKey] ?? PHASE_SOFT.sem_dados;

  return (
    <>
      {/* ── CSS para animação float-up ── */}
      <style>{`
        @keyframes float-up {
          0%   { opacity: 0; transform: translateY(0) scale(0.8); }
          20%  { opacity: 1; transform: translateY(-10px) scale(1.1); }
          80%  { opacity: 0.7; transform: translateY(-40px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
        }
        .animate-float-up { animation: float-up 1.4s ease-out forwards; }
      `}</style>

      <div className="space-y-5 pb-10">

        {/* ════════════════════════════════════════
            PHASE HERO CARD — premium
        ════════════════════════════════════════ */}
        {engine ? (
          <div className={cn(
            "relative rounded-[32px] border p-6 space-y-5 shadow-lg transition-all duration-700",
            colors.bg, colors.border, colors.glow
          )}>
            <FloatPetal visible={showPetals} />

            {/* Phase + Day */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                  Fase actual
                </p>
                <h2 className={cn("text-2xl font-black tracking-tight", colors.accent)}>
                  {PHASE_EMOJIS[phaseKey]} {engine.phaseLabel}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">Dia</p>
                <p className={cn("text-4xl font-black leading-none tracking-tighter", colors.accent)}>{engine.cycleDay}</p>
              </div>
            </div>

            {/* Insight */}
            <p className="text-[15px] text-foreground/70 leading-relaxed font-medium italic">
              "{engine.insights[0]}"
            </p>

            {/* Progress — gradient bar */}
            <div className="space-y-2">
              <div className={cn("h-2 rounded-full overflow-hidden", colors.progressBg)}>
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors.progressFill)}
                  style={{ width: `${engine.cycleProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/40 font-bold uppercase tracking-wider">
                <span>Dia 1</span>
                <span>
                  {engine.daysUntilNextPeriod > 0
                    ? `${engine.daysUntilNextPeriod}d até menstruação`
                    : engine.daysUntilNextPeriod === 0 ? "Chega hoje" : ""}
                </span>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex gap-2 flex-wrap pt-1">
              {engine.isInPeriod && (
                <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight", colors.pill)}>Em período</span>
              )}
              {engine.isInFertileWindow && (
                <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight", colors.pill)}>Janela fértil</span>
              )}
              {engine.isInPmsWindow && !engine.isInPeriod && (
                <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight", colors.pill)}>TPM</span>
              )}
              <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight", colors.pill)}>
                Próx. {formatShortDate(engine.nextPeriodStr)}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 dark:from-rose-950/30 dark:to-fuchsia-950/20 border border-rose-100/40 p-8 text-center space-y-2 shadow-sm">
            <p className="text-5xl mb-2 animate-pulse">🌸</p>
            <p className="font-black text-rose-700 dark:text-rose-300">Começa a acompanhar o teu ciclo</p>
            <p className="text-xs text-rose-400/70">Regista a tua menstruação para receber insights personalizados</p>
          </div>
        )}

        {/* Insights adicionais */}
        {engine && engine.insights.length > 1 && (
          <div className="rounded-2xl border border-rose-100/30 bg-gradient-to-br from-white/60 to-rose-50/30 dark:bg-rose-950/10 px-4 py-4 space-y-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-rose-300" /> Para hoje
            </p>
            <div className="space-y-1.5">
              {engine.insights.slice(1).map((insight, i) => (
                <p key={i} className="text-sm text-foreground/65 leading-snug">{insight}</p>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            PERIOD MANAGEMENT — premium card
        ════════════════════════════════════════ */}
        <div className="rounded-[28px] border border-rose-100/50 bg-white/70 dark:bg-card backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-rose-100/40">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-rose-400/80 flex items-center gap-2">
              🩸 Menstruação
            </p>
          </div>
          <div className="p-6 space-y-4">
            {openPeriod ? (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-200/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-300 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                        Em curso
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Desde {formatLongDate(openPeriod.start_date)}
                      </p>
                    </div>
                    <span className="text-xs bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 font-black px-3 py-1.5 rounded-full">
                      {periodDays}d
                    </span>
                  </div>
                </div>

                {!data.isMale && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => { setEndDate(today); setShowEndDate(false); handleEndPeriod(); }}
                        disabled={saving} variant="outline" size="sm"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl font-bold"
                      >
                        {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <StopCircle className="mr-1 h-3.5 w-3.5" />}
                        Terminou hoje
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowEndDate(!showEndDate)}
                        className="text-xs text-muted-foreground rounded-2xl">
                        <Calendar className="mr-1 h-3 w-3" /> Outra data
                      </Button>
                    </div>
                    {showEndDate && (
                      <div className="rounded-2xl bg-rose-50/60 dark:bg-rose-950/10 border border-rose-100/40 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Data em que terminou:
                        </p>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                          min={openPeriod.start_date} max={today} className="rounded-xl border-rose-200/60" />
                        <Button onClick={handleEndPeriod}
                          disabled={saving || endDate < openPeriod.start_date || endDate > today}
                          variant="outline" size="sm"
                          className="w-full border-rose-200 text-rose-600 rounded-xl">
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Terminou a {formatShortDate(endDate)}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {data.isMale ? (
                  <p className="text-sm text-muted-foreground">Sem menstruação em curso.</p>
                ) : (
                  <div className="space-y-4">
                    <FlowChip value={flowLevel} flowLevel={flowLevel} onChange={setFlowLevel} />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => { setStartDate(today); handleStartPeriod(); }}
                        disabled={saving}
                        className={cn(
                          "flex-1 rounded-2xl font-bold text-white transition-all duration-300 h-12",
                          "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
                          "shadow-lg shadow-rose-200/50 dark:shadow-rose-900/30",
                          saved ? "scale-95 from-emerald-400 to-emerald-500" : "active:scale-95"
                        )}
                      >
                        {saving
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : saved
                            ? <CheckCircle2 className="mr-2 h-4 w-4" />
                            : <PlayCircle className="mr-2 h-4 w-4" />
                        }
                        {saved ? "Ciclo registado 🌸" : "Começou hoje"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowBackdate(!showBackdate)}
                        className="text-xs text-muted-foreground rounded-xl">
                        <Calendar className="mr-1 h-3 w-3" /> Data passada
                      </Button>
                    </div>

                    {showBackdate && (
                      <div className="rounded-2xl bg-rose-50/50 border border-rose-100/40 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Data em que começou:
                        </p>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                          max={today} className="rounded-xl border-rose-200/60" />
                        <Button onClick={handleStartPeriod} disabled={saving || startDate > today}
                          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl" size="sm">
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Começou a {formatShortDate(startDate)}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            COMO ME SINTO HOJE
        ════════════════════════════════════════ */}
        <div className="rounded-[28px] border border-border/30 bg-white/70 dark:bg-card backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-border/20">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/50">Como me sinto hoje</p>
          </div>
          <div className="p-6 space-y-6">
            <ChipSelector label="Dor" emoji="😣" options={PAIN_OPTIONS} value={painLevel} onChange={setPainLevel} disabled={data.isMale || saving} />
            <ChipSelector label="Energia" emoji="⚡" options={ENERGY_OPTIONS} value={energyLevel} onChange={setEnergyLevel} disabled={data.isMale || saving} />
            <ChipSelector label="Stress" emoji="😤" options={STRESS_OPTIONS} value={stress} onChange={setStress} disabled={data.isMale || saving} />
            <ChipSelector label="Libido" emoji="❤️‍🔥" options={LIBIDO_OPTIONS} value={libido} onChange={setLibido} disabled={data.isMale || saving} />

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">😴 Sono (h)</p>
                <Input
                  type="number" min={0} max={24} step={0.5}
                  value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="ex: 7.5" disabled={data.isMale || saving}
                  className="rounded-xl border-border/40 bg-white/60"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Qualidade do sono</p>
                <div className="flex gap-1.5">
                  {SLEEP_QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value} type="button" disabled={data.isMale || saving}
                      onClick={() => setSleepQuality(opt.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[10px] font-bold transition-all duration-200",
                        sleepQuality === opt.value
                          ? "border-rose-300 bg-gradient-to-b from-rose-50 to-pink-50 text-rose-600 shadow-sm"
                          : "border-border/30 bg-white/40 text-muted-foreground hover:bg-rose-50/30"
                      )}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SINTOMAS — premium grid
        ════════════════════════════════════════ */}
        <div className="rounded-[28px] border border-border/30 bg-white/70 dark:bg-card backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-border/20 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/50">Sintomas</p>
            {activeSymptoms > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100/80 text-rose-500 text-[10px] font-black uppercase tracking-wider">
                {activeSymptoms} activos
              </span>
            )}
          </div>
          <div className="p-6 space-y-6">
            {SYMPTOM_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">{section.title}</p>
                <div className="grid grid-cols-4 gap-2">
                  {section.items.map((s) => (
                    <button
                      key={s.key} type="button"
                      disabled={data.isMale || saving}
                      onClick={() => setSymptoms((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-[10px] font-bold transition-all duration-200",
                        symptoms[s.key]
                          ? "border-rose-300/60 bg-gradient-to-b from-rose-50 to-pink-50 text-rose-600 shadow-md shadow-rose-100/50 scale-[1.05]"
                          : "border-border/30 bg-white/40 text-muted-foreground hover:border-rose-200 hover:bg-rose-50/30",
                        (data.isMale || saving) && "opacity-50 cursor-not-allowed scale-100"
                      )}
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span className="leading-tight text-center">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <StringChipSelector
              label="Corrimento" emoji="🌊"
              options={DISCHARGE_OPTIONS}
              value={dischargeType} onChange={setDischargeType}
              disabled={data.isMale || saving}
            />

            <Textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={data.isMale ? "A parceira não deixou notas." : "Notas privadas do dia…"}
              className="min-h-[60px] resize-none rounded-xl bg-white/50 border-border/30 focus:border-rose-200"
              maxLength={500} disabled={data.isMale || saving}
            />

            {!data.isMale && (
              <Button
                onClick={handleSaveSymptoms}
                disabled={saving}
                className={cn(
                  "w-full rounded-2xl gap-2 h-12 font-bold text-white transition-all duration-300",
                  "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
                  "shadow-lg shadow-rose-200/50 dark:shadow-rose-900/20 active:scale-95",
                  saved && "from-emerald-400 to-emerald-500 scale-95"
                )}
              >
                {saving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : saved
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <CheckCircle2 className="h-4 w-4" />
                }
                {saved
                  ? "Registo guardado 🌸"
                  : todaySymptoms
                    ? "Actualizar registo"
                    : "Guardar registo de hoje"
                }
              </Button>
            )}
          </div>
        </div>

        {/* Partner summary */}
        <CyclePartnerSummary />
      </div>
    </>
  );
}
