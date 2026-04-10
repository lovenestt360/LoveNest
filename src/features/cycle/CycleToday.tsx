import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Loader2, Droplets, Calendar, StopCircle, PlayCircle,
  AlertTriangle, Flower2, CheckCircle2, Sparkles,
} from "lucide-react";
import { notifyPartner } from "@/lib/notifyPartner";
import { CyclePartnerSummary } from "./CyclePartnerSummary";
import { differenceInDays } from "date-fns";
import { formatShortDate, formatLongDate } from "./engine";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// DESIGN SYSTEM
// ─────────────────────────────────────────────

const PHASE_GRADIENTS: Record<string, string> = {
  menstrual: "from-rose-400 via-pink-500 to-red-500",
  folicular: "from-sky-400 via-blue-400 to-cyan-500",
  ovulacao: "from-emerald-400 via-green-400 to-teal-500",
  luteal: "from-purple-400 via-violet-500 to-indigo-500",
  sem_dados: "from-slate-400 via-slate-400 to-slate-500",
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

// ─────────────────────────────────────────────
// CHIP OPTIONS
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function valueToChip(value: number, options: ChipOption[]): number {
  let closest = options[0].value;
  let minDiff = Math.abs(value - closest);
  for (const opt of options) {
    const diff = Math.abs(value - opt.value);
    if (diff < minDiff) { minDiff = diff; closest = opt.value; }
  }
  return closest;
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function ChipSelector({
  label, emoji, options, value, onChange, disabled = false,
}: {
  label: string; emoji?: string; options: ChipOption[];
  value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {emoji && <span className="mr-1">{emoji}</span>}{label}
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95",
              value === opt.value
                ? "bg-primary text-primary-foreground shadow-sm scale-[1.04]"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
              disabled && "opacity-60 cursor-not-allowed active:scale-100"
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
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {emoji && <span className="mr-1">{emoji}</span>}{label}
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95",
              value === opt.value
                ? "bg-primary text-primary-foreground shadow-sm scale-[1.04]"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
              disabled && "opacity-60 cursor-not-allowed active:scale-100"
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

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function CycleToday({ data }: { data: CycleData }) {
  const {
    profile, engine, openPeriod, todaySymptoms,
    reload, ensureProfile, spaceId, user, today,
  } = data;

  const [saving, setSaving] = useState(false);
  const [flowLevel, setFlowLevel] = useState<string>("medium");
  const [startDate, setStartDate] = useState(today);
  const [showBackdate, setShowBackdate] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [showEndDate, setShowEndDate] = useState(false);
  const [periodNotes, setPeriodNotes] = useState("");

  // Symptom toggles
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    ALL_SYMPTOM_KEYS.forEach((k) => { s[k] = (todaySymptoms as any)?.[k] ?? false; });
    return s;
  });

  // Chip states
  const [painLevel, setPainLevel] = useState(() =>
    valueToChip(todaySymptoms?.pain_level ?? 0, PAIN_OPTIONS));
  const [energyLevel, setEnergyLevel] = useState(() =>
    valueToChip((todaySymptoms as any)?.energy_level ?? 5, ENERGY_OPTIONS));
  const [stress, setStress] = useState(() =>
    valueToChip((todaySymptoms as any)?.stress ?? 0, STRESS_OPTIONS));
  const [libido, setLibido] = useState(() =>
    valueToChip(todaySymptoms?.libido ?? 5, LIBIDO_OPTIONS));
  const [sleepQuality, setSleepQuality] = useState<string>(
    (todaySymptoms as any)?.sleep_quality ?? "ok");
  const [sleepHours, setSleepHours] = useState<string>(
    (todaySymptoms as any)?.sleep_hours?.toString() ?? "");
  const [dischargeType, setDischargeType] = useState<string>(
    (todaySymptoms as any)?.discharge_type ?? "seco");
  const [notes, setNotes] = useState(todaySymptoms?.notes ?? "");

  // Sync when data loads
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

  const handleStartPeriod = async () => {
    if (!user || !spaceId) return;
    setSaving(true);
    await ensureProfile();
    await supabase.from("period_entries").insert({
      user_id: user.id, couple_space_id: spaceId, start_date: startDate,
      flow_level: flowLevel, pain_level: 0, pms_level: 0, notes: periodNotes || null,
    });
    sendPartnerNotif(); setSaving(false); setShowBackdate(false); setPeriodNotes(""); reload();
  };

  const handleEndPeriod = async () => {
    if (!openPeriod) return;
    setSaving(true);
    await supabase.from("period_entries").update({ end_date: endDate, notes: periodNotes || null }).eq("id", openPeriod.id);
    sendPartnerNotif(); setSaving(false); setShowEndDate(false); setPeriodNotes(""); reload();
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
    sendPartnerNotif(); setSaving(false); reload();
  };

  const periodDays = openPeriod
    ? differenceInDays(new Date(), new Date(openPeriod.start_date + "T12:00:00")) + 1 : 0;

  // ── Male: partner not configured
  if (data.isMale && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-70">
        <div className="h-14 w-14 rounded-full bg-pink-500/10 flex items-center justify-center">
          <Flower2 className="h-7 w-7 text-pink-500" />
        </div>
        <p className="text-sm font-bold">Ciclo não encontrado</p>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          A tua parceira ainda não configurou o acompanhamento do ciclo menstrual.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";

  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════
          PHASE HERO CARD
      ══════════════════════════════════════ */}
      {engine ? (
        <div className={cn(
          "rounded-3xl p-5 text-white shadow-lg bg-gradient-to-br",
          PHASE_GRADIENTS[phaseKey] ?? PHASE_GRADIENTS.sem_dados
        )}>
          {/* Phase + Day */}
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Fase actual</p>
              <h2 className="text-2xl font-black leading-tight">
                {PHASE_EMOJIS[phaseKey]} {engine.phaseLabel}
              </h2>
            </div>
            <div className="text-right bg-white/15 rounded-2xl px-3.5 py-2.5">
              <p className="text-[9px] opacity-70 font-black uppercase tracking-wider">Dia</p>
              <p className="text-3xl font-black leading-none">{engine.cycleDay}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 mb-4">
            <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${engine.cycleProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] opacity-60 font-medium">
              <span>Início do ciclo</span>
              <span>
                {engine.daysUntilNextPeriod > 0
                  ? `${engine.daysUntilNextPeriod}d até menstruação`
                  : engine.daysUntilNextPeriod === 0
                    ? "Menstruação prevista hoje"
                    : "Menstruação prevista"}
              </span>
            </div>
          </div>

          {/* Status chips */}
          <div className="flex gap-2 flex-wrap mb-4">
            {engine.isInPeriod && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black backdrop-blur-sm">
                🔴 Em período
              </span>
            )}
            {engine.isInFertileWindow && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black backdrop-blur-sm">
                🌿 Janela fértil
              </span>
            )}
            {engine.isInPmsWindow && !engine.isInPeriod && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black backdrop-blur-sm">
                💜 TPM
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black backdrop-blur-sm">
              📅 Próx. {formatShortDate(engine.nextPeriodStr)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black backdrop-blur-sm">
              🥚 Ovulação {formatShortDate(engine.ovulationDateStr)}
            </span>
          </div>

          {/* Primary insight */}
          <div className="border-t border-white/20 pt-3.5">
            <p className="text-sm opacity-90 font-medium leading-relaxed">
              {engine.insights[0]}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-7 text-center space-y-2">
          <p className="text-4xl mb-2">🌸</p>
          <p className="font-black text-slate-700 dark:text-slate-200">Começa a acompanhar o teu ciclo</p>
          <p className="text-xs text-slate-400">Regista a tua menstruação para receber insights personalizados</p>
        </div>
      )}

      {/* ══════════════════════════════════════
          INSIGHTS DE HOJE (alertas extra)
      ══════════════════════════════════════ */}
      {engine && engine.insights.length > 1 && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30 p-4 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Insights de hoje
          </p>
          <div className="space-y-2">
            {engine.insights.slice(1).map((insight, i) => (
              <p key={i} className="text-sm text-foreground/80 leading-snug">{insight}</p>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          PERIOD MANAGEMENT
      ══════════════════════════════════════ */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/50">
          <p className="text-sm font-black flex items-center gap-2">
            <Droplets className="h-4 w-4 text-rose-500" /> Menstruação
          </p>
        </div>
        <div className="p-4 space-y-3">
          {openPeriod ? (
            <>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                      </span>
                      Em curso
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Desde {formatLongDate(openPeriod.start_date)}
                    </p>
                  </div>
                  <span className="text-xs bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-black px-2.5 py-1 rounded-full">
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
                      className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                    >
                      {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <StopCircle className="mr-1 h-3.5 w-3.5" />}
                      Terminou hoje
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowEndDate(!showEndDate)}
                      className="text-xs text-muted-foreground rounded-xl">
                      <Calendar className="mr-1 h-3 w-3" /> Outra data
                    </Button>
                  </div>
                  {showEndDate && (
                    <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Data em que terminou:
                      </p>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        min={openPeriod.start_date} max={today} className="rounded-xl" />
                      <Button onClick={handleEndPeriod}
                        disabled={saving || endDate < openPeriod.start_date || endDate > today}
                        variant="outline" size="sm"
                        className="w-full border-rose-200 text-rose-700 rounded-xl">
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
                <div className="space-y-3">
                  <StringChipSelector
                    label="Fluxo" emoji="💧"
                    options={[
                      { value: "light", label: "Leve", emoji: "💧" },
                      { value: "medium", label: "Moderado", emoji: "💧💧" },
                      { value: "heavy", label: "Intenso", emoji: "💧💧💧" },
                    ]}
                    value={flowLevel} onChange={setFlowLevel}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => { setStartDate(today); handleStartPeriod(); }} disabled={saving}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                      Começou hoje
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowBackdate(!showBackdate)}
                      className="text-xs text-muted-foreground rounded-xl">
                      <Calendar className="mr-1 h-3 w-3" /> Data passada
                    </Button>
                  </div>
                  {showBackdate && (
                    <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Data em que começou:
                      </p>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        max={today} className="rounded-xl" />
                      <Button onClick={handleStartPeriod} disabled={saving || startDate > today}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl" size="sm">
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

      {/* ══════════════════════════════════════
          COMO ME SINTO HOJE (chips)
      ══════════════════════════════════════ */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/50">
          <p className="text-sm font-black">Como me sinto hoje</p>
        </div>
        <div className="p-4 space-y-5">
          <ChipSelector label="Dor" emoji="😣" options={PAIN_OPTIONS} value={painLevel} onChange={setPainLevel} disabled={data.isMale || saving} />
          <ChipSelector label="Energia" emoji="⚡" options={ENERGY_OPTIONS} value={energyLevel} onChange={setEnergyLevel} disabled={data.isMale || saving} />
          <ChipSelector label="Stress" emoji="😤" options={STRESS_OPTIONS} value={stress} onChange={setStress} disabled={data.isMale || saving} />
          <ChipSelector label="Libido" emoji="❤️‍🔥" options={LIBIDO_OPTIONS} value={libido} onChange={setLibido} disabled={data.isMale || saving} />

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">😴 Sono (h)</p>
              <Input
                type="number" min={0} max={24} step={0.5}
                value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
                placeholder="ex: 7.5" disabled={data.isMale || saving} className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qualidade do sono</p>
              <div className="flex gap-1.5">
                {SLEEP_QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value} type="button" disabled={data.isMale || saving}
                    onClick={() => setSleepQuality(opt.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[10px] font-bold transition-all",
                      sleepQuality === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
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

      {/* ══════════════════════════════════════
          SINTOMAS
      ══════════════════════════════════════ */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/50 flex items-center justify-between">
          <p className="text-sm font-black">Sintomas</p>
          {activeSymptoms > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black">
              {activeSymptoms} activos
            </span>
          )}
        </div>
        <div className="p-4 space-y-4">
          {SYMPTOM_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{section.title}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {section.items.map((s) => (
                  <button
                    key={s.key} type="button"
                    disabled={data.isMale || saving}
                    onClick={() => setSymptoms((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-bold transition-all active:scale-90",
                      symptoms[s.key]
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:bg-accent",
                      (data.isMale || saving) && "opacity-60 cursor-not-allowed active:scale-100"
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
            className="min-h-[60px] resize-none rounded-xl"
            maxLength={500} disabled={data.isMale || saving}
          />

          {!data.isMale && (
            <Button onClick={handleSaveSymptoms} disabled={saving} className="w-full rounded-xl gap-2 h-11">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {todaySymptoms ? "Actualizar registo" : "Guardar registo de hoje"}
            </Button>
          )}
        </div>
      </div>

      {/* Partner summary */}
      <CyclePartnerSummary />
    </div>
  );
}
