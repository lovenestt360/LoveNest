import { Loader2, Lightbulb, CheckCircle2, Circle, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ALL_SYMPTOM_BOOLEANS, daysBetween } from "./useCycleData";
import type { useCycleData } from "./useCycleData";
import type { DailySymptom } from "./useCycleData";

type CycleData = ReturnType<typeof useCycleData>;

const SHARE_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "private", label: "Privado", desc: "O teu par não terá nenhum acesso aos dados do teu ciclo." },
  { value: "summary", label: "Resumo", desc: "O teu par verá apenas a tua fase actual e a data prevista." },
  { value: "summary_signals", label: "Resumo + sinais", desc: "O teu par verá a fase, data prevista e níveis médios de dor/energia." },
];

const SYMPTOM_LABEL_MAP: Record<string, string> = {
  cramps: "Cólicas", headache: "Dor de cabeça", nausea: "Náusea", back_pain: "Dor lombar",
  leg_pain: "Pernas", fatigue: "Fadiga", dizziness: "Tontura", breast_tenderness: "Seios sensíveis",
  mood_swings: "Oscilação humor", acne: "Acne", cravings: "Desejos", bloating: "Inchaço",
  weakness: "Fraqueza", irritability: "Irritabilidade", anxiety: "Ansiedade", sadness: "Tristeza",
  sensitivity: "Sensibilidade", crying: "Choro", diarrhea: "Diarreia", constipation: "Obstipação",
  gas: "Gases", increased_appetite: "Apetite+",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function Stepper({
  label, value, onChange, min, max, suffix = "",
}: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card h-11 pl-1.5 pr-1.5">
        <button
          type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="h-8 w-8 flex items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-foreground tabular-nums">{value}{suffix}</span>
        <button
          type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="h-8 w-8 flex items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function CycleHistory({ data, onReset }: { data: CycleData; onReset?: () => void }) {
  const { profile, periods, reload, ensureProfile } = data;
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [avgCycle,   setAvgCycle]   = useState(profile?.avg_cycle_length ?? 28);
  const [avgPeriod,  setAvgPeriod]  = useState(profile?.avg_period_length ?? 5);
  const [luteal,     setLuteal]     = useState(profile?.luteal_length ?? 14);
  const [pmsDays,    setPmsDays]    = useState(profile?.pms_days ?? 5);
  const [shareLevel, setShareLevel] = useState(profile?.share_level ?? "private");
  const [allSymptoms, setAllSymptoms] = useState<DailySymptom[]>([]);

  useEffect(() => {
    if (!data.targetUserId) return;
    supabase.from("daily_symptoms").select("*")
      .eq("user_id", data.targetUserId).order("day_key", { ascending: false }).limit(200)
      .then(({ data }) => setAllSymptoms((data as DailySymptom[]) ?? []));
  }, [data.targetUserId]);

  const cycles = periods.map((p, i) => ({
    start: p.start_date,
    end: p.end_date,
    cycleLength:  i + 1 < periods.length ? daysBetween(periods[i + 1].start_date, p.start_date) : null,
    periodLength: p.end_date ? daysBetween(p.start_date, p.end_date) + 1 : null,
  }));

  const completed = cycles.filter(c => c.cycleLength !== null);
  const avg3 = completed.slice(0, 3).length > 0
    ? Math.round(completed.slice(0, 3).reduce((s, c) => s + c.cycleLength!, 0) / completed.slice(0, 3).length)
    : null;
  const avg6 = completed.slice(0, 6).length > 0
    ? Math.round(completed.slice(0, 6).reduce((s, c) => s + c.cycleLength!, 0) / completed.slice(0, 6).length)
    : null;
  const completedPeriods = cycles.filter(c => c.periodLength !== null);
  const avgPeriodCalc = completedPeriods.length > 0
    ? Math.round(completedPeriods.reduce((s, c) => s + c.periodLength!, 0) / completedPeriods.length)
    : null;
  const lengths = completed.map(c => c.cycleLength!);
  const irregularity = lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null;

  const symptomCounts: Record<string, number> = {};
  allSymptoms.forEach(s => {
    ALL_SYMPTOM_BOOLEANS.forEach(k => { if ((s as any)[k]) symptomCounts[k] = (symptomCounts[k] ?? 0) + 1; });
  });
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const avgPain   = allSymptoms.length > 0 ? (allSymptoms.reduce((s, d) => s + d.pain_level, 0) / allSymptoms.length).toFixed(1) : null;
  const avgEnergy = allSymptoms.length > 0 ? (allSymptoms.reduce((s, d) => s + ((d as any).energy_level ?? 5), 0) / allSymptoms.length).toFixed(1) : null;
  const tpmDays   = allSymptoms.filter(s => s.tpm).length;

  const tempReadings = allSymptoms.filter(s => (s as any).temperature_c != null);
  const avgTemp = tempReadings.length > 0
    ? (tempReadings.reduce((s, d) => s + (d as any).temperature_c, 0) / tempReadings.length).toFixed(1)
    : null;

  const insights: string[] = [];
  if (avg6 !== null && irregularity !== null) {
    insights.push(irregularity <= 3
      ? `Ciclo regular — média de ${avg6} dias (variação de ${irregularity}d).`
      : `Ciclo irregular — variação de ${irregularity} dias entre ciclos.`);
  }
  if (topSymptoms.length > 0) {
    insights.push(`Sintomas mais frequentes: ${topSymptoms.map(([k]) => SYMPTOM_LABEL_MAP[k] ?? k).join(", ")}.`);
  }
  if (avgPain && avgEnergy) {
    insights.push(`Dor média: ${avgPain}/10 · Energia média: ${avgEnergy}/10 em ${allSymptoms.length} registos.`);
  }

  const handleSave = async () => {
    setSaving(true);
    const p = await ensureProfile();
    if (p) {
      await supabase.from("cycle_profiles").update({
        avg_cycle_length: avgCycle, avg_period_length: avgPeriod,
        luteal_length: luteal, pms_days: pmsDays, share_level: shareLevel,
      }).eq("id", p.id);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    reload();
  };

  return (
    <div className="space-y-5 pb-10">

      {/* Insights */}
      {insights.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <SectionLabel>Insights do ciclo</SectionLabel>
          </div>
          <ul className="space-y-2">
            {insights.map((text, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-rose-400" />
                <p className="text-sm text-foreground leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estatísticas */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <SectionLabel>Estatísticas</SectionLabel>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Stat label="Ciclos registados"  value={periods.length} />
            <Stat label="Ciclo médio (3)"    value={avg3 ? `${avg3} dias` : "—"} />
            <Stat label="Ciclo médio (6)"    value={avg6 ? `${avg6} dias` : "—"} />
            <Stat label="Período médio"      value={avgPeriodCalc ? `${avgPeriodCalc} dias` : "—"} />
            <Stat label="Variação ciclo"     value={irregularity !== null ? `${irregularity}d` : "—"} />
            <Stat label="Dias com TPM"       value={tpmDays} />
            {avgTemp && <Stat label="Temp. basal média" value={`${avgTemp}°C`} />}
          </div>

          {topSymptoms.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <SectionLabel>Sintomas recorrentes</SectionLabel>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {topSymptoms.map(([k, count]) => (
                  <span key={k} className="px-3 py-1 rounded-full border border-border text-[11px] font-medium text-foreground">
                    {SYMPTOM_LABEL_MAP[k] ?? k}
                    <span className="ml-1 text-muted-foreground">·{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <SectionLabel>Histórico</SectionLabel>
        </div>
        <div className="p-5">
          {cycles.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Sem registos ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cycles.slice(0, 12).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(c.start)}
                      <span className="mx-1.5 text-muted-foreground/50 text-xs">→</span>
                      {c.end ? formatDate(c.end) : <span className="text-rose-400">em curso</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {c.periodLength ? `${c.periodLength} dias de período` : "Aberto"}
                      {c.cycleLength  ? ` · ciclo de ${c.cycleLength}d` : ""}
                    </p>
                  </div>
                  {!c.end && (
                    <span className="px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-[11px] font-medium">ativo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Configurações */}
      {!data.isMale && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <SectionLabel>Configurações</SectionLabel>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Ciclo"      value={avgCycle}  onChange={setAvgCycle}  min={18} max={45} suffix=" dias" />
              <Stepper label="Período"    value={avgPeriod} onChange={setAvgPeriod} min={1}  max={12} suffix=" dias" />
              <Stepper label="Fase lútea" value={luteal}    onChange={setLuteal}    min={8}  max={20} suffix=" dias" />
              <Stepper label="Dias TPM"   value={pmsDays}   onChange={setPmsDays}   min={1}  max={14} suffix=" dias" />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Partilha com o par
              </label>
              <div className="space-y-2">
                {SHARE_OPTIONS.map(opt => {
                  const selected = shareLevel === opt.value;
                  return (
                    <button
                      key={opt.value} type="button" onClick={() => setShareLevel(opt.value)}
                      className={cn(
                        "w-full text-left rounded-2xl border p-3.5 transition-all active:scale-[0.99]",
                        selected ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30" : "border-border hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={cn("text-sm font-semibold", selected ? "text-rose-500" : "text-foreground")}>{opt.label}</p>
                        {selected
                          ? <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" strokeWidth={1.5} />
                          : <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSave} disabled={saving}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> : null}
              {saved ? "Guardado" : "Guardar alterações"}
            </button>
          </div>
        </div>
      )}

      {/* Apagar dados */}
      {onReset && (
        <div className="glass-card p-5 border-dashed opacity-60 hover:opacity-80 transition-opacity">
          <SectionLabel>Gestão de dados</SectionLabel>
          <button
            type="button" onClick={onReset}
            className="mt-2 text-sm text-rose-400 hover:text-rose-500 underline underline-offset-4 transition-colors"
          >
            Apagar permanentemente histórico do ciclo
          </button>
        </div>
      )}
    </div>
  );
}
