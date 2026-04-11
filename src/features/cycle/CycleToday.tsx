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
// DESIGN SYSTEM — Premium Pink (Cohesive & Minimal)
// ─────────────────────────────────────────────

const PHASE_SOFT: Record<string, {
  bg: string; border: string; accent: string; pill: string;
  progressFill: string; progressBg: string; glow: string;
}> = {
  menstrual: {
    bg: "bg-gradient-to-br from-white via-[#FADADD]/40 to-[#FADADD]/20 dark:from-rose-950/30 dark:to-rose-900/10",
    border: "border-[#F8BBD0] dark:border-rose-900/30",
    accent: "text-[#E94E77]",
    pill: "bg-[#FADADD] text-[#E94E77]",
    progressFill: "bg-gradient-to-r from-[#E94E77] to-[#F06292]",
    progressBg: "bg-[#F5F5F5] dark:bg-rose-900/40",
    glow: "shadow-rose-100",
  },
  folicular: {
    bg: "bg-gradient-to-br from-white to-[#F5F5F5] dark:from-sky-950/20 dark:to-sky-900/10",
    border: "border-slate-200 dark:border-sky-900/30",
    accent: "text-[#777777]",
    pill: "bg-[#F5F5F5] text-[#777777]",
    progressFill: "bg-gradient-to-r from-[#F06292] to-rose-300",
    progressBg: "bg-slate-100",
    glow: "shadow-slate-100",
  },
  ovulacao: {
    bg: "bg-gradient-to-br from-white to-[#FADADD]/10 dark:from-emerald-950/20 dark:to-emerald-900/10",
    border: "border-[#F8BBD0]/30",
    accent: "text-[#E94E77]",
    pill: "bg-rose-50 text-[#E94E77] font-black",
    progressFill: "bg-gradient-to-r from-[#E94E77] to-[#F06292]",
    progressBg: "bg-rose-50",
    glow: "shadow-rose-100",
  },
  luteal: {
    bg: "bg-gradient-to-br from-white to-[#FADADD]/20 dark:from-purple-950/20 dark:to-purple-900/10",
    border: "border-[#F8BBD0]/40",
    accent: "text-[#E94E77]",
    pill: "bg-[#FADADD]/60 text-[#E94E77]",
    progressFill: "bg-gradient-to-r from-[#E94E77] to-[#F06292]",
    progressBg: "bg-[#FADADD]/20",
    glow: "shadow-rose-100",
  },
  sem_dados: {
    bg: "bg-white",
    border: "border-slate-100",
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

function ChipSelector({
  label, emoji, options, value, onChange, disabled = false,
}: {
  label: string; emoji?: string; options: ChipOption[];
  value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/60">
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
                ? "bg-gradient-to-br from-[#E94E77] to-[#F06292] text-white shadow-md shadow-rose-200/60 scale-[1.06]"
                : "bg-white text-[#777777] border border-slate-100 hover:border-[#F8BBD0] hover:bg-[#FADADD]/10",
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
      <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/60">
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
                ? "bg-gradient-to-br from-[#E94E77] to-[#F06292] text-white shadow-md shadow-rose-200/60 scale-[1.06]"
                : "bg-white text-[#777777] border border-slate-100 hover:border-[#F8BBD0] hover:bg-[#FADADD]/10",
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

function FlowChip({ value, flowLevel, onChange }: {
  value: string; flowLevel: string; onChange: (v: string) => void;
}) {
  const flows = [
    { value: "light", label: "Leve", drops: 1, color: "from-[#FADADD] to-[#F8BBD0]" },
    { value: "medium", label: "Moderado", drops: 2, color: "from-[#F06292] to-[#E94E77]" },
    { value: "heavy", label: "Intenso", drops: 3, color: "from-[#E11D48] to-[#991B1B]" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/60">Fluxo</p>
      <div className="flex gap-2">
        {flows.map((f) => (
          <button
            key={f.value} type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-bold transition-all duration-200",
              flowLevel === f.value
                ? `bg-gradient-to-b ${f.color} text-white border-transparent shadow-md shadow-rose-200/50 scale-[1.04]`
                : "bg-white border-slate-100 text-[#777777] hover:bg-rose-50/40"
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

export function CycleToday({ data }: { data: CycleData }) {
  const {
    profile, engine, openPeriod, todaySymptoms,
    reload, ensureProfile, spaceId, user, today,
  } = data;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  if (data.isMale && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-70">
        <div className="h-14 w-14 rounded-full bg-[#FADADD] flex items-center justify-center shadow-sm">
          <Flower2 className="h-7 w-7 text-[#E94E77]" />
        </div>
        <p className="text-sm font-bold text-[#E94E77]">Ciclo não encontrado</p>
        <p className="text-xs text-[#777777] max-w-[250px]">
          A tua parceira ainda não configurou o acompanhamento do ciclo menstrual.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const colors = PHASE_SOFT[phaseKey] ?? PHASE_SOFT.sem_dados;

  return (
    <>
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
        {engine ? (
          <div className={cn(
            "relative rounded-[32px] border p-6 space-y-5 shadow-lg transition-all duration-700",
            colors.bg, colors.border, colors.glow
          )}>
            <FloatPetal visible={showPetals} />
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777777]/50">
                  Fase actual
                </p>
                <h2 className={cn("text-2xl font-black tracking-tight", colors.accent)}>
                  {PHASE_EMOJIS[phaseKey]} {engine.phaseLabel}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777777]/50">Dia</p>
                <p className={cn("text-4xl font-black leading-none tracking-tighter", colors.accent)}>{engine.cycleDay}</p>
              </div>
            </div>
            <p className="text-[15px] text-[#777777] leading-relaxed font-medium italic">
              "{engine.insights[0]}"
            </p>
            <div className="space-y-2">
              <div className={cn("h-2 rounded-full overflow-hidden", colors.progressBg)}>
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors.progressFill)}
                  style={{ width: `${engine.cycleProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#777777]/50 font-bold uppercase tracking-wider">
                <span>Dia 1</span>
                <span>
                  {engine.daysUntilNextPeriod > 0
                    ? `${engine.daysUntilNextPeriod}d até menstruação`
                    : engine.daysUntilNextPeriod === 0 ? "Chega hoje" : ""}
                </span>
              </div>
            </div>
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
          <div className="rounded-[32px] bg-gradient-to-br from-white to-[#FADADD]/30 border border-[#F8BBD0]/40 p-8 text-center space-y-2 shadow-sm">
            <p className="text-5xl mb-2 animate-pulse">🌸</p>
            <p className="font-black text-[#E94E77]">Começa a acompanhar o teu ciclo</p>
            <p className="text-xs text-[#777777]/60">Regista a tua menstruação para receber insights personalizados</p>
          </div>
        )}

        <div className="rounded-[28px] border border-slate-100 bg-white/70 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#E94E77]/80 flex items-center gap-2">
              🩸 Menstruação
            </p>
          </div>
          <div className="p-6 space-y-4">
            {openPeriod ? (
              <>
                <div className="rounded-2xl bg-[#FADADD]/20 border border-[#F8BBD0]/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#E94E77] flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E94E77] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E94E77]" />
                        </span>
                        Em curso
                      </p>
                      <p className="text-xs text-[#777777]/60 mt-0.5">
                        Desde {formatLongDate(openPeriod.start_date)}
                      </p>
                    </div>
                    <span className="text-xs bg-[#FADADD] text-[#E94E77] font-black px-3 py-1.5 rounded-full">
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
                        className="flex-1 border-[#F8BBD0] text-[#E94E77] hover:bg-[#FADADD]/20 rounded-2xl font-bold"
                      >
                        {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <StopCircle className="mr-1 h-3.5 w-3.5" />}
                        Terminou hoje
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowEndDate(!showEndDate)}
                        className="text-xs text-[#777777]/60 rounded-2xl">
                        <Calendar className="mr-1 h-3 w-3" /> Outra data
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <FlowChip value={flowLevel} flowLevel={flowLevel} onChange={setFlowLevel} />
                <Button
                  onClick={() => { setStartDate(today); handleStartPeriod(); }}
                  disabled={saving}
                  className={cn(
                    "w-full rounded-2xl font-bold text-white transition-all duration-300 h-12 bg-gradient-to-r from-[#E94E77] to-[#F06292] shadow-lg shadow-rose-200/50",
                    saved && "from-emerald-400 to-emerald-500 scale-95"
                  )}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                  {saved ? "Ciclo registado 🌸" : "Começou hoje"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white/70 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777777]/50">Como me sinto hoje</p>
          </div>
          <div className="p-6 space-y-6">
            <ChipSelector label="Dor" emoji="😣" options={PAIN_OPTIONS} value={painLevel} onChange={setPainLevel} disabled={data.isMale || saving} />
            <ChipSelector label="Energia" emoji="⚡" options={ENERGY_OPTIONS} value={energyLevel} onChange={setEnergyLevel} disabled={data.isMale || saving} />
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-2 text-[#777777]">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">😴 Sono (h)</p>
                <Input type="number" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="ex: 7.5" disabled={data.isMale || saving} className="rounded-xl border-slate-100 bg-white" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/60">Qualidade</p>
                <div className="flex gap-1.5">
                  {SLEEP_QUALITY_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setSleepQuality(opt.value)} className={cn("flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all", sleepQuality === opt.value ? "border-[#F8BBD0] bg-[#FADADD]/20 text-[#E94E77]" : "border-slate-100 text-[#777777]")}>
                      {opt.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-50 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777777]/50">Sintomas</p>
            {activeSymptoms > 0 && <span className="px-2.5 py-0.5 rounded-full bg-[#FADADD] text-[#E94E77] text-[10px] font-black uppercase tracking-wider">{activeSymptoms} ativos</span>}
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-4 gap-2">
              {SYMPTOM_SECTIONS[0].items.map((s) => (
                <button key={s.key} onClick={() => setSymptoms((prev) => ({ ...prev, [s.key]: !prev[s.key] }))} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-[10px] font-bold transition-all", symptoms[s.key] ? "border-[#F8BBD0]/60 bg-[#FADADD]/20 text-[#E94E77] scale-[1.05]" : "border-slate-100 text-[#777777]")}>
                  <span className="text-lg">{s.emoji}</span>
                  <span className="leading-tight text-center">{s.label}</span>
                </button>
              ))}
            </div>
            {!data.isMale && (
              <Button onClick={handleSaveSymptoms} disabled={saving} className={cn("w-full rounded-2xl h-12 font-bold text-white transition-all bg-gradient-to-r from-[#E94E77] to-[#F06292]", saved && "from-emerald-400 to-emerald-500 scale-95")}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saved ? "Guardado 🌸" : todaySymptoms ? "Atualizar" : "Guardar hoje"}
              </Button>
            )}
          </div>
        </div>
        <CyclePartnerSummary />
      </div>
    </>
  );
}
