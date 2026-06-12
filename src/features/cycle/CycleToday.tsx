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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notifyPartner } from "@/lib/notifyPartner";
import { CyclePartnerSummary } from "./CyclePartnerSummary";
import { differenceInDays } from "date-fns";
import { formatShortDate, formatLongDate } from "./engine";
import type { CycleData } from "./useCycleData";

// Phase accent colors — white cards, rose accents only where meaningful
const PHASE_ACCENT: Record<string, string> = {
  menstrual: "text-rose-500",
  folicular: "text-muted-foreground",
  ovulacao:  "text-rose-400",
  luteal:    "text-muted-foreground",
  sem_dados: "text-muted-foreground",
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


function ChipSelector({
  label, options, value, onChange, disabled = false,
}: {
  label: string; options: ChipOption[];
  value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value} type="button" disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium border transition-all duration-150 active:scale-95",
                value === opt.value
                  ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                  : "border-border text-muted-foreground hover:bg-muted",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StringChipSelector({
  label, options, value, onChange, disabled = false,
}: {
  label: string;
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value} type="button" disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium border transition-all duration-150 active:scale-95",
                value === opt.value
                  ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                  : "border-border text-muted-foreground hover:bg-muted",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FlowChip({ value, flowLevel, onChange }: {
  value: string; flowLevel: string; onChange: (v: string) => void;
}) {
  const flows = [
    { value: "light",  label: "Leve",     dots: 1 },
    { value: "medium", label: "Moderado", dots: 2 },
    { value: "heavy",  label: "Intenso",  dots: 3 },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fluxo</p>
      <div className="flex gap-2">
        {flows.map(f => (
          <button
            key={f.value} type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-medium transition-all duration-150 active:scale-95",
              flowLevel === f.value
                ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="flex gap-0.5 text-rose-400">
              {"●".repeat(f.dots)}
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

  return (
    <div className="space-y-5 pb-10">
        {engine ? (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="currentColor" className="text-rose-100 dark:text-rose-900/30" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="currentColor" strokeLinecap="round"
                    strokeDasharray={CYCLE_RING_CIRCUMFERENCE}
                    strokeDashoffset={CYCLE_RING_CIRCUMFERENCE * (1 - engine.cycleProgress / 100)}
                    className={cn("transition-all duration-700", accentColor)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <PhaseIcon className={cn("h-5 w-5 mb-0.5", accentColor)} strokeWidth={1.5} />
                  <span className="text-2xl font-bold text-foreground tabular-nums leading-none">{engine.cycleDay}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">de {engine.cycleLength}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Fase actual</p>
                <h2 className={cn("text-xl font-bold", accentColor)}>{engine.phaseLabel}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {engine.daysUntilNextPeriod > 0
                    ? `${engine.daysUntilNextPeriod}d até menstruação`
                    : engine.daysUntilNextPeriod === 0 ? "Menstruação chega hoje" : ""}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed italic">"{engine.insights[0]}"</p>

            {engine.insights.slice(1).map((insight, i) => (
              <div
                key={i}
                className="rounded-xl border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 flex items-start gap-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
              </div>
            ))}

            <div className="flex gap-2 flex-wrap">
              {engine.isInPeriod && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200/50 dark:border-rose-800/50">Em período</span>
              )}
              {engine.isInFertileWindow && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200/50 dark:border-rose-800/50">Janela fértil</span>
              )}
              {engine.isInPmsWindow && !engine.isInPeriod && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">TPM</span>
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

        {/* ── Menstruação ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Menstruação</p>
          </div>
          <div className="p-5 space-y-4">
            {openPeriod ? (
              <>
                <div className="rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                      </span>
                      <p className="text-sm font-semibold text-rose-500">Em curso</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Desde {formatLongDate(openPeriod.start_date)}</p>
                  </div>
                  <span className="text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-full">{periodDays}d</span>
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
                        onClick={() => setShowEndDate(!showEndDate)}
                        className="h-10 px-3 rounded-2xl border border-border text-xs text-muted-foreground flex items-center gap-1 hover:bg-muted transition-all"
                      >
                        <Calendar className="h-3 w-3" strokeWidth={1.5} /> Outra data
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <FlowChip value={flowLevel} flowLevel={flowLevel} onChange={setFlowLevel} />
                <Textarea
                  value={periodNotes}
                  onChange={e => setPeriodNotes(e.target.value)}
                  placeholder="Notas sobre este período (opcional)"
                  disabled={saving}
                  className="rounded-xl border-border bg-card text-sm resize-none min-h-[60px]"
                />
                <button
                  onClick={() => { setStartDate(today); handleStartPeriod(); }}
                  disabled={saving}
                  className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> : <PlayCircle className="h-4 w-4" strokeWidth={1.5} />}
                  {saved ? "Ciclo registado" : "Começou hoje"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Como me sinto hoje ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Como me sinto hoje</p>
          </div>
          <div className="p-5 space-y-5">
            <ChipSelector label="Dor" options={PAIN_OPTIONS} value={painLevel} onChange={setPainLevel} disabled={data.isMale || saving} />
            <ChipSelector label="Energia" options={ENERGY_OPTIONS} value={energyLevel} onChange={setEnergyLevel} disabled={data.isMale || saving} />
            <ChipSelector label="Stress" options={STRESS_OPTIONS} value={stress} onChange={setStress} disabled={data.isMale || saving} />
            <ChipSelector label="Libido" options={LIBIDO_OPTIONS} value={libido} onChange={setLibido} disabled={data.isMale || saving} />
            <StringChipSelector label="Secreção" options={DISCHARGE_OPTIONS} value={dischargeType} onChange={setDischargeType} disabled={data.isMale || saving} />
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sono (h)</p>
                <Input type="number" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="ex: 7.5" disabled={data.isMale || saving} className="rounded-xl border-border bg-card h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Qualidade do sono</p>
                <div className="flex gap-1.5">
                  {SLEEP_QUALITY_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" disabled={data.isMale || saving} onClick={() => setSleepQuality(opt.value)}
                      className={cn("flex-1 h-10 flex items-center justify-center rounded-xl border transition-all",
                        sleepQuality === opt.value
                          ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                          : "border-border text-muted-foreground hover:bg-muted",
                        (data.isMale || saving) && "opacity-50 cursor-not-allowed"
                      )}>
                      <opt.icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Thermometer className="h-3 w-3" strokeWidth={1.5} /> Temp. basal (°C)
                </p>
                <Input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="ex: 36.5" disabled={data.isMale || saving} className="rounded-xl border-border bg-card h-10 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Sintomas ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sintomas</p>
            {activeSymptoms > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold">{activeSymptoms} ativos</span>
            )}
          </div>
          <div className="p-5 space-y-5">
            {SYMPTOM_SECTIONS.map(section => (
              <div key={section.title} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</p>
                <div className="grid grid-cols-4 gap-2">
                  {section.items.map(s => {
                    const Icon = s.icon;
                    return (
                      <button key={s.key} type="button" disabled={data.isMale}
                        onClick={() => setSymptoms(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                        className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-[10px] font-medium transition-all active:scale-95",
                          symptoms[s.key]
                            ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                            : "border-border text-muted-foreground hover:bg-muted",
                          data.isMale && "opacity-50 cursor-not-allowed"
                        )}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                        <span className="leading-tight text-center">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Notas</p>
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
        <CyclePartnerSummary />
    </div>
  );
}
