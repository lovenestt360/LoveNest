import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SYMPTOM_BOOLEANS, daysBetween } from "./useCycleData";
import type { useCycleData } from "./useCycleData";
import type { DailySymptom } from "./useCycleData";

type CycleData = ReturnType<typeof useCycleData>;

const SYMPTOM_LABEL_MAP: Record<string, string> = {
  cramps: "Cólicas", headache: "Dor de cabeça", nausea: "Náusea", back_pain: "Dor lombar",
  leg_pain: "Pernas", fatigue: "Fadiga", dizziness: "Tontura", breast_tenderness: "Seios sensíveis",
  mood_swings: "Oscilação humor", acne: "Acne", cravings: "Desejos", bloating: "Inchaço",
  weakness: "Fraqueza", irritability: "Irritabilidade", anxiety: "Ansiedade", sadness: "Tristeza",
  sensitivity: "Sensibilidade", crying: "Choro", diarrhea: "Diarreia", constipation: "Obstipação",
  gas: "Gases", increased_appetite: "Apetite+",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
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
            <Lightbulb className="h-4 w-4 text-[#717171]" strokeWidth={1.5} />
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
        <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5]">
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
          </div>

          {topSymptoms.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#f5f5f5]">
              <SectionLabel>Sintomas recorrentes</SectionLabel>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {topSymptoms.map(([k, count]) => (
                  <span key={k} className="px-3 py-1 rounded-full border border-[#e5e5e5] text-[11px] font-medium text-foreground">
                    {SYMPTOM_LABEL_MAP[k] ?? k}
                    <span className="ml-1 text-[#717171]">·{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5]">
          <SectionLabel>Histórico</SectionLabel>
        </div>
        <div className="p-5">
          {cycles.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#717171]">Sem registos ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f5f5]">
              {cycles.slice(0, 12).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(c.start)}
                      <span className="mx-1.5 text-[#c4c4c4] text-xs">→</span>
                      {c.end ? formatDate(c.end) : <span className="text-rose-400">em curso</span>}
                    </p>
                    <p className="text-[11px] text-[#717171] mt-0.5">
                      {c.periodLength ? `${c.periodLength} dias de período` : "Aberto"}
                      {c.cycleLength  ? ` · ciclo de ${c.cycleLength}d` : ""}
                    </p>
                  </div>
                  {!c.end && (
                    <span className="px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium">ativo</span>
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
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5]">
            <SectionLabel>Configurações</SectionLabel>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Ciclo (dias)",   min: 18, max: 45, val: avgCycle,  set: setAvgCycle },
                { label: "Período (dias)", min: 1,  max: 12, val: avgPeriod, set: setAvgPeriod },
                { label: "Fase lútea",     min: 8,  max: 20, val: luteal,    set: setLuteal },
                { label: "Dias TPM",       min: 1,  max: 14, val: pmsDays,   set: setPmsDays },
              ].map(f => (
                <div key={f.label} className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">{f.label}</label>
                  <Input
                    type="number" min={f.min} max={f.max} value={f.val}
                    onChange={e => f.set(+e.target.value)}
                    className="rounded-2xl border-[#e5e5e5] bg-white h-11 text-sm focus-visible:ring-rose-400/30"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
                Partilha com o par
              </label>
              <Select value={shareLevel} onValueChange={setShareLevel}>
                <SelectTrigger className="rounded-2xl border-[#e5e5e5] h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="private">Privado — nada partilhado</SelectItem>
                  <SelectItem value="summary">Resumo — fase e data</SelectItem>
                  <SelectItem value="summary_signals">Resumo + sinais (dor/energia)</SelectItem>
                </SelectContent>
              </Select>
              <div className="rounded-2xl border border-[#e5e5e5] bg-[#f9f9f9] p-4">
                <p className="text-sm text-[#717171] leading-relaxed">
                  {shareLevel === "private"         && "O teu par não terá nenhum acesso aos dados do teu ciclo."}
                  {shareLevel === "summary"          && "O teu par verá apenas a tua fase actual e a data prevista."}
                  {shareLevel === "summary_signals"  && "O teu par verá a fase, data prevista e níveis médios de dor/energia."}
                </p>
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
