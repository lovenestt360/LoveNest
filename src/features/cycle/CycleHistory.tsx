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
    <div className="space-y-4">
      {/* Insights */}
      {insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-primary" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {insights.map((text, i) => <li key={i}>{text}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Ciclos registados" value={periods.length} />
            <Stat label="Ciclo médio (3)" value={avg3 ? `${avg3}d` : "—"} />
            <Stat label="Ciclo médio (6)" value={avg6 ? `${avg6}d` : "—"} />
            <Stat label="Período médio" value={avgPeriodCalc ? `${avgPeriodCalc}d` : "—"} />
            <Stat label="Variação ciclo" value={irregularity !== null ? `${irregularity}d` : "—"} />
            <Stat label="Dias com TPM" value={tpmDays} />
          </div>
          {topSymptoms.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Top sintomas</p>
              <div className="flex flex-wrap gap-1">
                {topSymptoms.map(([k, count]) => (
                  <Badge key={k} variant="secondary" className="text-xs">
                    {SYMPTOM_LABEL_MAP[k] ?? k} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cycles list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de ciclos</CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registos ainda.</p>
          ) : (
            <div className="space-y-3">
              {cycles.slice(0, 12).map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(c.start)} → {c.end ? formatDate(c.end) : "em curso"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.periodLength ? `${c.periodLength}d período` : "Aberto"}
                      {c.cycleLength ? ` · ciclo ${c.cycleLength}d` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings (owner only) */}
      {!data.isMale && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configurações do ciclo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ciclo (dias)</Label>
                <Input type="number" min={18} max={45} value={avgCycle} onChange={(e) => setAvgCycle(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período (dias)</Label>
                <Input type="number" min={1} max={12} value={avgPeriod} onChange={(e) => setAvgPeriod(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fase lútea</Label>
                <Input type="number" min={8} max={20} value={luteal} onChange={(e) => setLuteal(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dias TPM</Label>
                <Input type="number" min={1} max={14} value={pmsDays} onChange={(e) => setPmsDays(+e.target.value)} />
              </div>
            </div>

            {/* Share level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Partilha com o par</Label>
              <Select value={shareLevel} onValueChange={setShareLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">🔒 Privado — nada partilhado</SelectItem>
                  <SelectItem value="summary">📋 Resumo — fase e data prevista</SelectItem>
                  <SelectItem value="summary_signals">📋+ Resumo + sinais — fase, data e níveis (dor/energia)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {shareLevel === "private" && "O teu par não verá nenhum dado do ciclo."}
                {shareLevel === "summary" && "O teu par verá apenas a fase actual e a data prevista da próxima menstruação."}
                {shareLevel === "summary_signals" && "O teu par verá a fase, data prevista e níveis de dor/energia (sem sintomas detalhados)."}
              </p>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar configurações
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data management – minimal */}
      {onReset && (
        <div className="rounded-2xl border border-muted p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            ⚙️ Gestão de dados
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2 transition-colors"
          >
            Apagar todos os dados do ciclo
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
