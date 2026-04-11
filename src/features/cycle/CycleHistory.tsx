import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

export function CycleHistory({ data, onReset }: { data: CycleData; onReset?: () => void }) {
  const { profile, periods, reload, ensureProfile } = data;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avgCycle, setAvgCycle] = useState(profile?.avg_cycle_length ?? 28);
  const [avgPeriod, setAvgPeriod] = useState(profile?.avg_period_length ?? 5);
  const [luteal, setLuteal] = useState(profile?.luteal_length ?? 14);
  const [pmsDays, setPmsDays] = useState(profile?.pms_days ?? 5);
  const [shareLevel, setShareLevel] = useState(profile?.share_level ?? "private");
  const [allSymptoms, setAllSymptoms] = useState<DailySymptom[]>([]);

  useEffect(() => {
    if (!data.targetUserId) return;
    supabase
      .from("daily_symptoms")
      .select("*")
      .eq("user_id", data.targetUserId)
      .order("day_key", { ascending: false })
      .limit(200)
      .then(({ data }) => setAllSymptoms((data as DailySymptom[]) ?? []));
  }, [data.targetUserId]);

  const cycles: { start: string; end: string | null; cycleLength: number | null; periodLength: number | null }[] = [];
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    let cycleLength: number | null = null;
    if (i + 1 < periods.length) cycleLength = daysBetween(periods[i + 1].start_date, p.start_date);
    const periodLength = p.end_date ? daysBetween(p.start_date, p.end_date) + 1 : null;
    cycles.push({ start: p.start_date, end: p.end_date, cycleLength, periodLength });
  }

  const completedCycles = cycles.filter((c) => c.cycleLength !== null);
  const last3 = completedCycles.slice(0, 3);
  const last6 = completedCycles.slice(0, 6);
  const avg3 = last3.length > 0 ? Math.round(last3.reduce((s, c) => s + c.cycleLength!, 0) / last3.length) : null;
  const avg6 = last6.length > 0 ? Math.round(last6.reduce((s, c) => s + c.cycleLength!, 0) / last6.length) : null;
  const completedPeriods = cycles.filter((c) => c.periodLength !== null);
  const avgPeriodCalc = completedPeriods.length > 0 ? Math.round(completedPeriods.reduce((s, c) => s + c.periodLength!, 0) / completedPeriods.length) : null;

  const cycleLengths = completedCycles.map((c) => c.cycleLength!);
  const irregularity = cycleLengths.length >= 2 ? Math.max(...cycleLengths) - Math.min(...cycleLengths) : null;

  const symptomCounts: Record<string, number> = {};
  allSymptoms.forEach((s) => {
    ALL_SYMPTOM_BOOLEANS.forEach((k) => {
      if ((s as any)[k]) symptomCounts[k] = (symptomCounts[k] ?? 0) + 1;
    });
  });
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const avgPain = allSymptoms.length > 0
    ? (allSymptoms.reduce((s, d) => s + d.pain_level, 0) / allSymptoms.length).toFixed(1)
    : null;
  const avgEnergy = allSymptoms.length > 0
    ? (allSymptoms.reduce((s, d) => s + ((d as any).energy_level ?? 5), 0) / allSymptoms.length).toFixed(1)
    : null;
  const tpmDays = allSymptoms.filter((s) => s.tpm).length;

  // ── Insights — apenas usando cores da paleta
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

  const handleSaveSettings = async () => {
    setSaving(true);
    const p = await ensureProfile();
    if (p) {
      await supabase.from("cycle_profiles").update({
        avg_cycle_length: avgCycle,
        avg_period_length: avgPeriod,
        luteal_length: luteal,
        pms_days: pmsDays,
        share_level: shareLevel,
      }).eq("id", p.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    reload();
  };

  return (
    <div className="space-y-5 pb-10">

      {/* ── Insights — pink suave ── */}
      {insights.length > 0 && (
        <div className="rounded-[28px] border border-[#F8BBD0]/40 bg-white px-6 py-5 space-y-3 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#777777]/50 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-[#E94E77]" /> Insights do ciclo
          </p>
          <ul className="space-y-2.5">
            {insights.map((text, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-[#E94E77]/40" />
                <p className="text-sm text-[#777777] leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-sm">
        <div className="px-6 pt-5 pb-3 border-b border-[#F5F5F5]">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777777]/50">Estatísticas</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <Stat label="Ciclos registados" value={periods.length} />
            <Stat label="Ciclo médio (3)" value={avg3 ? `${avg3} dias` : "—"} />
            <Stat label="Ciclo médio (6)" value={avg6 ? `${avg6} dias` : "—"} />
            <Stat label="Período médio" value={avgPeriodCalc ? `${avgPeriodCalc} dias` : "—"} />
            <Stat label="Variação ciclo" value={irregularity !== null ? `${irregularity}d` : "—"} />
            <Stat label="Dias com TPM" value={tpmDays} />
          </div>

          {topSymptoms.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[#F5F5F5]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/40 mb-3">
                Sintomas recorrentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topSymptoms.map(([k, count]) => (
                  <span key={k} className="px-3 py-1 rounded-full bg-[#FADADD]/40 border border-[#F8BBD0]/40 text-[10px] font-black uppercase tracking-widest text-[#E94E77]">
                    {SYMPTOM_LABEL_MAP[k] ?? k}
                    <span className="ml-1 opacity-50">·{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Histórico de ciclos ── */}
      <div className="rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-sm">
        <div className="px-6 pt-5 pb-3 border-b border-[#F5F5F5]">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777777]/50">Histórico</p>
        </div>
        <div className="p-6">
          {cycles.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-3xl">🌸</p>
              <p className="text-sm text-[#777777]/50 italic">Sem registos ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cycles.slice(0, 12).map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#F5F5F5] pb-4 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold tracking-tight text-[#777777]">
                      {formatDate(c.start)}
                      <span className="mx-1.5 text-[#F8BBD0] text-[10px]">→</span>
                      {c.end ? formatDate(c.end) : <span className="text-[#E94E77]">em curso</span>}
                    </p>
                    <p className="text-[11px] text-[#777777]/50">
                      {c.periodLength ? `${c.periodLength} dias de período` : "Aberto"}
                      {c.cycleLength ? ` · ciclo de ${c.cycleLength}d` : ""}
                    </p>
                  </div>
                  {!c.end && (
                    <span className="px-2.5 py-1 rounded-full bg-[#FADADD] text-[#E94E77] text-[10px] font-black uppercase tracking-widest">
                      ativo
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Configurações (só owner) ── */}
      {!data.isMale && (
        <div className="rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-[#F5F5F5]">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777777]/50">Configurações</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Ciclo (dias)", min: 18, max: 45, val: avgCycle, set: setAvgCycle },
                { label: "Período (dias)", min: 1, max: 12, val: avgPeriod, set: setAvgPeriod },
                { label: "Fase lútea", min: 8, max: 20, val: luteal, set: setLuteal },
                { label: "Dias TPM", min: 1, max: 14, val: pmsDays, set: setPmsDays },
              ].map((f) => (
                <div key={f.label} className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#777777]/50">{f.label}</Label>
                  <Input
                    type="number" min={f.min} max={f.max} value={f.val}
                    onChange={(e) => f.set(+e.target.value)}
                    className="rounded-xl bg-[#F5F5F5] border-none h-11 focus-visible:ring-[#E94E77]/20 text-[#777777] font-bold"
                  />
                </div>
              ))}
            </div>

            {/* Partilha */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#777777]/50">
                Partilha com o par
              </Label>
              <Select value={shareLevel} onValueChange={setShareLevel}>
                <SelectTrigger className="rounded-xl bg-[#F5F5F5] border-none h-11 focus:ring-[#E94E77]/20 text-[#777777] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-[#F8BBD0]/30">
                  <SelectItem value="private">🔒 Privado — nada partilhado</SelectItem>
                  <SelectItem value="summary">🌸 Resumo — fase e data</SelectItem>
                  <SelectItem value="summary_signals">🌸+ Resumo + sinais (dor/energia)</SelectItem>
                </SelectContent>
              </Select>

              <div className="rounded-2xl bg-[#FADADD]/15 border border-[#F8BBD0]/30 p-4">
                <p className="text-xs text-[#777777]/70 leading-relaxed font-medium">
                  {shareLevel === "private" && "O teu par não terá nenhum acesso aos dados do teu ciclo."}
                  {shareLevel === "summary" && "O teu par verá apenas a tua fase actual e a data prevista da próxima menstruação."}
                  {shareLevel === "summary_signals" && "O teu par verá a fase, data prevista e níveis médios de dor/energia."}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveSettings} disabled={saving}
              className={`w-full h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-sm ${
                saved
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white"
                  : "bg-gradient-to-r from-[#E94E77] to-[#F06292] text-white shadow-rose-100"
              }`}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
              {saved ? "Guardado! 🌸" : "Guardar alterações"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Zona de perigo — subtil ── */}
      {onReset && (
        <div className="rounded-[28px] border border-dashed border-slate-200 p-6 space-y-4 opacity-50 hover:opacity-70 transition-opacity">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#777777]/50">
            Gestão de dados
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-bold text-rose-400/70 hover:text-[#E94E77] underline underline-offset-4 transition-colors"
          >
            Apagar permanentemente histórico do ciclo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-componente Stat ─────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/40">{label}</p>
      <p className="text-2xl font-black tracking-tighter text-[#E94E77]">{value}</p>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
