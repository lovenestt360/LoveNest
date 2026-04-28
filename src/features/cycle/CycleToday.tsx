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

// Phase accent colors — white cards, rose accents only where meaningful
const PHASE_ACCENT: Record<string, string> = {
  menstrual: "text-rose-500",
  folicular: "text-[#717171]",
  ovulacao:  "text-rose-400",
  luteal:    "text-[#717171]",
  sem_dados: "text-[#717171]",
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


function ChipSelector({
  label, emoji, options, value, onChange, disabled = false,
}: {
  label: string; emoji?: string; options: ChipOption[];
  value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium border transition-all duration-150 active:scale-95",
              value === opt.value
                ? "border-rose-300 bg-rose-50 text-rose-500"
                : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]",
              disabled && "opacity-50 cursor-not-allowed"
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
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value} type="button" disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium border transition-all duration-150 active:scale-95",
              value === opt.value
                ? "border-rose-300 bg-rose-50 text-rose-500"
                : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]",
              disabled && "opacity-50 cursor-not-allowed"
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
    { value: "light",  label: "Leve",     dots: 1 },
    { value: "medium", label: "Moderado", dots: 2 },
    { value: "heavy",  label: "Intenso",  dots: 3 },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Fluxo</p>
      <div className="flex gap-2">
        {flows.map(f => (
          <button
            key={f.value} type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-medium transition-all duration-150 active:scale-95",
              flowLevel === f.value
                ? "border-rose-300 bg-rose-50 text-rose-500"
                : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
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
  const accentColor = PHASE_ACCENT[phaseKey] ?? "text-[#717171]";

  return (
    <div className="space-y-5 pb-10">
        {engine ? (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-1">Fase actual</p>
                <h2 className={cn("text-xl font-bold", accentColor)}>
                  {PHASE_EMOJIS[phaseKey]} {engine.phaseLabel}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-1">Dia</p>
                <p className={cn("text-4xl font-bold leading-none tabular-nums", accentColor)}>{engine.cycleDay}</p>
              </div>
            </div>

            <p className="text-sm text-[#717171] leading-relaxed italic">"{engine.insights[0]}"</p>

            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full bg-[#f5f5f5] overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-700"
                  style={{ width: `${engine.cycleProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#717171]">
                <span>Dia 1</span>
                <span>
                  {engine.daysUntilNextPeriod > 0
                    ? `${engine.daysUntilNextPeriod}d até menstruação`
                    : engine.daysUntilNextPeriod === 0 ? "Chega hoje" : ""}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {engine.isInPeriod && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-500 border border-rose-200/50">Em período</span>
              )}
              {engine.isInFertileWindow && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-500 border border-rose-200/50">Janela fértil</span>
              )}
              {engine.isInPmsWindow && !engine.isInPeriod && (
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#f5f5f5] text-[#717171] border border-[#e5e5e5]">TPM</span>
              )}
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#f5f5f5] text-[#717171] border border-[#e5e5e5]">
                Próx. {formatShortDate(engine.nextPeriodStr)}
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center space-y-2">
            <p className="text-4xl mb-2">🌸</p>
            <p className="font-semibold text-foreground">Começa a acompanhar o teu ciclo</p>
            <p className="text-sm text-[#717171]">Regista a tua menstruação para receber insights personalizados</p>
          </div>
        )}

        {/* ── Menstruação ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Menstruação</p>
          </div>
          <div className="p-5 space-y-4">
            {openPeriod ? (
              <>
                <div className="rounded-2xl bg-rose-50/60 border border-rose-100 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                      </span>
                      <p className="text-sm font-semibold text-rose-500">Em curso</p>
                    </div>
                    <p className="text-[11px] text-[#717171] mt-0.5">Desde {formatLongDate(openPeriod.start_date)}</p>
                  </div>
                  <span className="text-xs font-semibold bg-rose-50 text-rose-500 border border-rose-200 px-3 py-1 rounded-full">{periodDays}d</span>
                </div>
                {!data.isMale && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEndDate(today); setShowEndDate(false); handleEndPeriod(); }}
                      disabled={saving}
                      className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-2xl border border-[#e5e5e5] text-sm font-medium text-foreground hover:bg-[#f5f5f5] transition-all disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      Terminou hoje
                    </button>
                    <button
                      onClick={() => setShowEndDate(!showEndDate)}
                      className="h-10 px-3 rounded-2xl border border-[#e5e5e5] text-xs text-[#717171] flex items-center gap-1 hover:bg-[#f5f5f5] transition-all"
                    >
                      <Calendar className="h-3 w-3" strokeWidth={1.5} /> Outra data
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <FlowChip value={flowLevel} flowLevel={flowLevel} onChange={setFlowLevel} />
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
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Como me sinto hoje</p>
          </div>
          <div className="p-5 space-y-5">
            <ChipSelector label="Dor" options={PAIN_OPTIONS} value={painLevel} onChange={setPainLevel} disabled={data.isMale || saving} />
            <ChipSelector label="Energia" options={ENERGY_OPTIONS} value={energyLevel} onChange={setEnergyLevel} disabled={data.isMale || saving} />
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Sono (h)</p>
                <Input type="number" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="ex: 7.5" disabled={data.isMale || saving} className="rounded-xl border-[#e5e5e5] bg-white h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Qualidade</p>
                <div className="flex gap-1.5">
                  {SLEEP_QUALITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setSleepQuality(opt.value)}
                      className={cn("flex-1 py-2 rounded-xl border text-sm transition-all",
                        sleepQuality === opt.value
                          ? "border-rose-300 bg-rose-50 text-rose-500"
                          : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
                      )}>
                      {opt.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sintomas ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5] flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Sintomas</p>
            {activeSymptoms > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-200 text-[10px] font-semibold">{activeSymptoms} ativos</span>
            )}
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-4 gap-2">
              {SYMPTOM_SECTIONS[0].items.map(s => (
                <button key={s.key}
                  onClick={() => setSymptoms(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                  className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-[10px] font-medium transition-all active:scale-95",
                    symptoms[s.key]
                      ? "border-rose-300 bg-rose-50 text-rose-500"
                      : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
                  )}>
                  <span className="text-lg">{s.emoji}</span>
                  <span className="leading-tight text-center">{s.label}</span>
                </button>
              ))}
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
