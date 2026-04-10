import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb } from "lucide-react";
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
  const { profile, periods, reload, ensureProfile, user } = data;
  const [saving, setSaving] = useState(false);
  const [avgCycle, setAvgCycle] = useState(profile?.avg_cycle_length ?? 28);
  const [avgPeriod, setAvgPeriod] = useState(profile?.avg_period_length ?? 5);
  const [luteal, setLuteal] = useState(profile?.luteal_length ?? 14);
  const [pmsDays, setPmsDays] = useState(profile?.pms_days ?? 5);
  const [shareLevel, setShareLevel] = useState(profile?.share_level ?? "private");
  const [allSymptoms, setAllSymptoms] = useState<DailySymptom[]>([]);

  // Fetch all symptoms for insights
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

  // Compute cycle stats
  const cycles: { start: string; end: string | null; cycleLength: number | null; periodLength: number | null }[] = [];
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    let cycleLength: number | null = null;
    if (i + 1 < periods.length) {
      cycleLength = daysBetween(periods[i + 1].start_date, p.start_date);
    }
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

  // Irregularity
  const cycleLengths = completedCycles.map((c) => c.cycleLength!);
  const irregularity = cycleLengths.length >= 2
    ? Math.max(...cycleLengths) - Math.min(...cycleLengths)
    : null;

  // Top symptoms
  const symptomCounts: Record<string, number> = {};
  allSymptoms.forEach((s) => {
    ALL_SYMPTOM_BOOLEANS.forEach((k) => {
      if ((s as any)[k]) symptomCounts[k] = (symptomCounts[k] ?? 0) + 1;
    });
  });
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Avg pain and energy
  const avgPain = allSymptoms.length > 0
    ? (allSymptoms.reduce((s, d) => s + d.pain_level, 0) / allSymptoms.length).toFixed(1)
    : null;
  const avgEnergy = allSymptoms.length > 0
    ? (allSymptoms.reduce((s, d) => s + ((d as any).energy_level ?? 5), 0) / allSymptoms.length).toFixed(1)
    : null;

  // Days with TPM
  const tpmDays = allSymptoms.filter((s) => s.tpm).length;

  // Insights
  const insights: string[] = [];
  if (avg6 !== null && irregularity !== null) {
    insights.push(irregularity <= 3
      ? `✅ Ciclo regular — média de ${avg6} dias (variação de ${irregularity}d).`
      : `⚠️ Ciclo irregular — variação de ${irregularity} dias entre ciclos.`);
  }
  if (topSymptoms.length > 0) {
    insights.push(`🏷️ Sintomas mais frequentes: ${topSymptoms.map(([k]) => SYMPTOM_LABEL_MAP[k] ?? k).join(", ")}.`);
  }
  if (avgPain && avgEnergy) {
    insights.push(`📊 Dor média: ${avgPain}/10 · Energia média: ${avgEnergy}/10 em ${allSymptoms.length} registos.`);
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
    reload();
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Insights — soft premium style */}
      {insights.length > 0 && (
        <div className="rounded-[32px] border border-border/30 bg-muted/20 px-6 py-5 space-y-3 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5" /> Insights do ciclo
          </p>
          <ul className="space-y-2 text-sm text-foreground/75 leading-relaxed">
            {insights.map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 mt-1 h-1 w-1 rounded-full bg-primary/40" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="rounded-[32px] border border-border/40 bg-card overflow-hidden shadow-sm">
        <div className="px-6 pt-5 pb-3 border-b border-border/30">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Estatísticas</p>
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
            <div className="mt-6 pt-5 border-t border-border/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Sintomas recorrentes</p>
              <div className="flex flex-wrap gap-1.5">
                {topSymptoms.map(([k, count]) => (
                  <Badge key={k} variant="secondary" className="text-[11px] font-bold px-2.5 py-0.5 border-none bg-muted/60">
                    {SYMPTOM_LABEL_MAP[k] ?? k} <span className="ml-1 opacity-40">{count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cycles list */}
      <div className="rounded-[32px] border border-border/40 bg-card overflow-hidden shadow-sm">
        <div className="px-6 pt-5 pb-3 border-b border-border/30">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Histórico de ciclos</p>
        </div>
        <div className="p-6">
          {cycles.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic">Sem registos ainda.</p>
          ) : (
            <div className="space-y-4">
              {cycles.slice(0, 12).map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/20 pb-4 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold tracking-tight text-foreground/80">
                      {formatDate(c.start)} <span className="mx-1.5 opacity-30 text-[10px]">→</span> {c.end ? formatDate(c.end) : <span className="text-rose-400">em curso</span>}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground/60">
                      {c.periodLength ? `${c.periodLength} dias de período` : "Aberto"}
                      {c.cycleLength ? ` · Ciclo de ${c.cycleLength} dias` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings (owner only) */}
      {!data.isMale && (
        <div className="rounded-[32px] border border-border/40 bg-card overflow-hidden shadow-sm">
          <div className="px-6 pt-5 pb-3 border-b border-border/30">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">Configurações</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 ml-1">Ciclo (dias)</Label>
                <Input type="number" min={18} max={45} value={avgCycle} onChange={(e) => setAvgCycle(+e.target.value)} className="rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 ml-1">Período (dias)</Label>
                <Input type="number" min={1} max={12} value={avgPeriod} onChange={(e) => setAvgPeriod(+e.target.value)} className="rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 ml-1">Fase lútea</Label>
                <Input type="number" min={8} max={20} value={luteal} onChange={(e) => setLuteal(+e.target.value)} className="rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 ml-1">Dias TPM</Label>
                <Input type="number" min={1} max={14} value={pmsDays} onChange={(e) => setPmsDays(+e.target.value)} className="rounded-xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20" />
              </div>
            </div>

            {/* Share level */}
            <div className="space-y-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50 ml-1">Partilha com o par</Label>
              <Select value={shareLevel} onValueChange={setShareLevel}>
                <SelectTrigger className="rounded-xl bg-muted/30 border-none h-11 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40">
                  <SelectItem value="private">🔒 Privado — nada partilhado</SelectItem>
                  <SelectItem value="summary">📋 Resumo — fase e data</SelectItem>
                  <SelectItem value="summary_signals">📋+ Resumo + sinais (dor/energia)</SelectItem>
                </SelectContent>
              </Select>
              <div className="rounded-2xl bg-muted/40 p-4 border border-border/20">
                <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
                  {shareLevel === "private" && "O teu par não terá nenhum acesso aos dados do teu ciclo."}
                  {shareLevel === "summary" && "O teu par verá apenas a tua fase actual e a data prevista da próxima menstruação."}
                  {shareLevel === "summary_signals" && "O teu par verá a fase, data prevista e níveis médios de dor/energia."}
                </p>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full h-12 rounded-2xl font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-primary/10">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar alterações
            </Button>
          </div>
        </div>
      )}

      {/* Data management – minimal */}
      {onReset && (
        <div className="rounded-[32px] border border-border/30 p-6 space-y-4 bg-muted/10 opacity-60">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2 ml-1">
            Gestão de dados
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-bold text-destructive/50 hover:text-destructive underline underline-offset-4 transition-colors"
          >
            Apagar permanentemente histórico do ciclo
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{label}</p>
      <p className="text-2xl font-black tracking-tighter text-foreground/80">{value}</p>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
