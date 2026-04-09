import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Droplets, Calendar, StopCircle, PlayCircle, AlertTriangle, Info, Flower2 } from "lucide-react";
import { notifyPartner } from "@/lib/notifyPartner";
import { CyclePartnerSummary } from "./CyclePartnerSummary";
import { differenceInDays } from "date-fns";
import { formatShortDate, formatLongDate } from "./engine";
import type { CycleData } from "./useCycleData";

type CycleData = ReturnType<typeof useCycleData> & { engine: import("./engine").CycleEngineOutput | null };

const PHASE_COLORS: Record<string, string> = {
  "Menstruação": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Fértil": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "TPM": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Folicular": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Lútea": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const PHASE_TIPS: Record<string, string> = {
  "Menstruação": "Descansa, hidrata-te e evita esforços intensos. É normal sentir cólicas e fadiga.",
  "Fértil": "Período de maior energia e fertilidade. Ideal para actividades físicas e sociais.",
  "TPM": "Pratica auto-cuidado, evita cafeína em excesso e mantém uma alimentação equilibrada.",
  "Folicular": "Energia a subir! Bom momento para começar novos projectos e exercício.",
  "Lútea": "Fase de descanso progressivo. Reduz o stress e prioriza o sono.",
  "sem dados": "Regista a tua menstruação para começar a acompanhar o ciclo.",
};

const SYMPTOM_SECTIONS = [
  {
    title: "Físicos",
    items: [
      { key: "cramps", label: "Cólicas", emoji: "🤕" },
      { key: "headache", label: "Dor de cabeça", emoji: "🤯" },
      { key: "back_pain", label: "Dor lombar", emoji: "😣" },
      { key: "leg_pain", label: "Dor nas pernas", emoji: "🦵" },
      { key: "fatigue", label: "Fadiga", emoji: "😴" },
      { key: "dizziness", label: "Tontura", emoji: "💫" },
      { key: "weakness", label: "Fraqueza", emoji: "😵" },
      { key: "breast_tenderness", label: "Seios sensíveis", emoji: "🩹" },
      { key: "nausea", label: "Náusea", emoji: "🤢" },
      { key: "bloating", label: "Inchaço", emoji: "🎈" },
    ],
  },
  {
    title: "Emocionais",
    items: [
      { key: "mood_swings", label: "Oscilação humor", emoji: "🎭" },
      { key: "irritability", label: "Irritabilidade", emoji: "😤" },
      { key: "anxiety", label: "Ansiedade", emoji: "😰" },
      { key: "sadness", label: "Tristeza", emoji: "😢" },
      { key: "sensitivity", label: "Sensibilidade", emoji: "🥺" },
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
    title: "Pele / Apetite",
    items: [
      { key: "acne", label: "Acne", emoji: "😕" },
      { key: "cravings", label: "Desejos", emoji: "🍫" },
      { key: "increased_appetite", label: "Apetite aumentado", emoji: "🍽️" },
    ],
  },
] as const;

const ALL_SYMPTOM_KEYS = SYMPTOM_SECTIONS.flatMap((s) => s.items.map((i) => i.key));

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function formatDateLong(d: string) {
  return format(new Date(d + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: pt });
}

export function CycleToday({ data }: { data: CycleData }) {
  // Usar engine para todos os dados calculados
  const { profile, engine, openPeriod, todaySymptoms, reload, ensureProfile, spaceId, user, today, lastPeriod } = data;
  const cycleInfo = data.cycleInfo; // compatibilidade
  const [saving, setSaving] = useState(false);
  const [flowLevel, setFlowLevel] = useState<string>("medium");

  // Backdating: start period on a past date
  const [startDate, setStartDate] = useState(today);
  const [showBackdate, setShowBackdate] = useState(false);

  // End period on a specific date (not just today)
  const [endDate, setEndDate] = useState(today);
  const [showEndDate, setShowEndDate] = useState(false);

  // Pain level for period entry
  const [periodPain, setPeriodPain] = useState(0);
  const [periodPms, setPeriodPms] = useState(0);
  const [periodNotes, setPeriodNotes] = useState("");

  // Symptom toggles
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    ALL_SYMPTOM_KEYS.forEach((k) => { s[k] = (todaySymptoms as any)?.[k] ?? false; });
    return s;
  });

  // Metrics
  const [painLevel, setPainLevel] = useState(todaySymptoms?.pain_level ?? 0);
  const [energyLevel, setEnergyLevel] = useState((todaySymptoms as any)?.energy_level ?? 5);
  const [stress, setStress] = useState((todaySymptoms as any)?.stress ?? 0);
  const [libido, setLibido] = useState(todaySymptoms?.libido ?? 5);
  const [sleepHours, setSleepHours] = useState<string>((todaySymptoms as any)?.sleep_hours?.toString() ?? "");
  const [sleepQuality, setSleepQuality] = useState<string>((todaySymptoms as any)?.sleep_quality ?? "ok");
  const [dischargeType, setDischargeType] = useState<string>((todaySymptoms as any)?.discharge_type ?? "seco");
  const [notes, setNotes] = useState(todaySymptoms?.notes ?? "");

  // Sync state when data changes
  useEffect(() => {
    if (todaySymptoms) {
      const s: Record<string, boolean> = {};
      ALL_SYMPTOM_KEYS.forEach((k) => { s[k] = (todaySymptoms as any)?.[k] ?? false; });
      setSymptoms(s);
      setPainLevel(todaySymptoms.pain_level ?? 0);
      setEnergyLevel((todaySymptoms as any)?.energy_level ?? 5);
      setStress((todaySymptoms as any)?.stress ?? 0);
      setLibido(todaySymptoms.libido ?? 5);
      setSleepHours((todaySymptoms as any)?.sleep_hours?.toString() ?? "");
      setSleepQuality((todaySymptoms as any)?.sleep_quality ?? "ok");
      setDischargeType((todaySymptoms as any)?.discharge_type ?? "seco");
      setNotes(todaySymptoms.notes ?? "");
    }
  }, [todaySymptoms]);

  const activeSymptoms = Object.values(symptoms).filter(Boolean).length;

  const sendPartnerNotif = () => {
    if (!spaceId || !profile || profile.share_level === "private") return;
    notifyPartner({
      couple_space_id: spaceId,
      title: "🌸 Ciclo",
      body: "Atualização no ciclo (resumo)",
      url: "/ciclo",
      type: "ciclo_par",
    });
  };

  const handleStartPeriod = async () => {
    if (!user || !spaceId) return;
    setSaving(true);
    await ensureProfile();
    await supabase.from("period_entries").insert({
      user_id: user.id,
      couple_space_id: spaceId,
      start_date: startDate,
      flow_level: flowLevel,
      pain_level: periodPain,
      pms_level: periodPms,
      notes: periodNotes || null,
    });
    sendPartnerNotif();
    setSaving(false);
    setShowBackdate(false);
    setPeriodNotes("");
    setPeriodPain(0);
    setPeriodPms(0);
    reload();
  };

  const handleEndPeriod = async () => {
    if (!openPeriod) return;
    setSaving(true);
    await supabase.from("period_entries").update({
      end_date: endDate,
      pain_level: periodPain,
      pms_level: periodPms,
      notes: periodNotes || null,
    }).eq("id", openPeriod.id);
    sendPartnerNotif();
    setSaving(false);
    setShowEndDate(false);
    setPeriodNotes("");
    reload();
  };

  const handleSaveSymptoms = async () => {
    if (!user || !spaceId) return;
    setSaving(true);
    await ensureProfile();

    const payload = {
      user_id: user.id,
      couple_space_id: spaceId,
      day_key: today,
      pain_level: painLevel,
      energy_level: energyLevel,
      stress,
      libido,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      sleep_quality: sleepQuality,
      discharge_type: dischargeType,
      discharge: "none",
      notes: notes || null,
      tpm: engine?.phase === "luteal" || cycleInfo.phase === "TPM",
      ...symptoms,
    } as any;

    if (todaySymptoms) {
      await supabase.from("daily_symptoms").update(payload).eq("id", todaySymptoms.id);
    } else {
      await supabase.from("daily_symptoms").insert(payload);
    }

    sendPartnerNotif();
    setSaving(false);
    reload();
  };

  // Formatar datas — usa helpers do engine
  function formatDate(d: string) {
    return formatShortDate(d);
  }
  function formatDateLong(d: string) {
    return formatLongDate(d);
  }

  // Período duration
  const periodDays = openPeriod
    ? differenceInDays(new Date(), new Date(openPeriod.start_date + "T12:00:00")) + 1
    : 0;

  // Fase para exibição — usar engine se disponível
  const displayPhase = engine?.phaseLabel ?? cycleInfo.phase;
  const displayCycleDay = engine?.cycleDay ?? cycleInfo.cycleDay;
  const displayNextPeriod = engine?.nextPeriodStr ?? cycleInfo.nextPeriod;
  const displayOvulation = engine?.ovulationDateStr ?? cycleInfo.ovulationDate;
  const displayFertileStart = engine?.fertileStartStr ?? cycleInfo.fertileStart;
  const displayFertileEnd = engine?.fertileEndStr ?? cycleInfo.fertileEnd;
  const displayPmsStart = engine?.pmsStartStr ?? cycleInfo.pmsStart;
  const hasData = !!engine || cycleInfo.phase !== "sem dados";

  if (data.isMale && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-70">
        <div className="h-14 w-14 rounded-full bg-pink-500/10 flex items-center justify-center">
          <Flower2 className="h-7 w-7 text-pink-500" />
        </div>
        <p className="text-sm font-medium">Ciclo não encontrado</p>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          A tua parceira ainda não configurou o acompanhamento do ciclo menstrual no perfil dela.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Phase summary ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Fase actual
            {hasData && (
              <Badge className={cn("text-xs", PHASE_COLORS[displayPhase] ?? "bg-muted text-muted-foreground")}>
                {displayPhase}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasData ? (
            <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Regista a tua menstruação para começar a acompanhar o ciclo. Podes indicar uma data passada se te esqueceste de registar no dia certo.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                {displayCycleDay > 0 && (
                  <span className="text-sm text-muted-foreground">Dia <strong className="text-foreground">{displayCycleDay}</strong> do ciclo</span>
                )}
              </div>

              {/* Key dates */}
              <div className="grid grid-cols-2 gap-2">
                {displayNextPeriod && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Próx. menstruação</p>
                    <p className="text-sm font-bold text-red-600">{formatDate(displayNextPeriod)}</p>
                  </div>
                )}
                {displayOvulation && (
                  <div className="rounded-xl bg-green-50 dark:bg-green-950/20 p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Ovulação estimada</p>
                    <p className="text-sm font-bold text-green-600">{formatDate(displayOvulation)}</p>
                  </div>
                )}
                {displayFertileStart && displayFertileEnd && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Janela fértil</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {formatDate(displayFertileStart)} – {formatDate(displayFertileEnd)}
                    </p>
                  </div>
                )}
                {displayPmsStart && (
                  <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Início TPM</p>
                    <p className="text-sm font-bold text-purple-600">{formatDate(displayPmsStart)}</p>
                  </div>
                )}
              </div>

              {/* Phase tip */}
              <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {PHASE_TIPS[displayPhase] ?? PHASE_TIPS["sem dados"]}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Period start/end ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-4 w-4 text-red-500" /> Menstruação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {openPeriod ? (
            <>
              {/* Period is ongoing */}
              <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    Período a decorrer
                  </p>
                  <span className="text-xs text-muted-foreground font-medium">{periodDays} dia{periodDays !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Início: <strong>{formatDateLong(openPeriod.start_date)}</strong>
                </p>
              </div>

              {/* End period controls */}
              {!data.isMale && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setEndDate(today);
                        setShowEndDate(false);
                        handleEndPeriod();
                      }}
                      disabled={saving}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <StopCircle className="mr-2 h-4 w-4" />
                      Terminou hoje
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEndDate(!showEndDate)}
                      className="text-xs text-muted-foreground"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      Outra data
                    </Button>
                  </div>

                  {showEndDate && (
                    <div className="rounded-xl bg-muted/50 p-3 space-y-2 animate-fade-in">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Escolhe a data em que terminou o período:
                      </p>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        min={openPeriod.start_date}
                        max={today}
                      />
                      <Button
                        onClick={handleEndPeriod}
                        disabled={saving || endDate < openPeriod.start_date || endDate > today}
                        variant="outline"
                        className="w-full border-red-200 text-red-700"
                        size="sm"
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Terminou a {formatDate(endDate)}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* No open period — start new */}
              {data.isMale ? (
                <p className="text-sm text-muted-foreground">Sem menstruação a decorrer.</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Nível de fluxo</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "light", label: "Leve", emoji: "💧" },
                        { value: "medium", label: "Moderado", emoji: "💧💧" },
                        { value: "heavy", label: "Intenso", emoji: "💧💧💧" },
                      ].map(f => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFlowLevel(f.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-medium transition-all",
                            flowLevel === f.value
                              ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30"
                              : "border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <span>{f.emoji}</span>
                          <span>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start today */}
                  <Button
                    onClick={() => { setStartDate(today); handleStartPeriod(); }}
                    disabled={saving}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Começou hoje
                  </Button>

                  {/* Backdate toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBackdate(!showBackdate)}
                    className="w-full text-xs text-muted-foreground"
                  >
                    <Calendar className="mr-1 h-3 w-3" />
                    Esqueci-me de registar? Indicar data passada
                  </Button>

                  {showBackdate && (
                    <div className="rounded-xl bg-muted/50 p-3 space-y-3 animate-fade-in">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Escolhe a data em que começou o período:
                      </p>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        max={today}
                      />
                      <div className="space-y-1">
                        <Label className="text-xs">Nível de dor (opcional)</Label>
                        <Slider value={[periodPain]} onValueChange={([v]) => setPeriodPain(v)} max={10} step={1} />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Sem dor</span>
                          <span>{periodPain}/10</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nível de TPM (opcional)</Label>
                        <Slider value={[periodPms]} onValueChange={([v]) => setPeriodPms(v)} max={10} step={1} />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Sem TPM</span>
                          <span>{periodPms}/10</span>
                        </div>
                      </div>
                      <Textarea
                        value={periodNotes}
                        onChange={e => setPeriodNotes(e.target.value)}
                        placeholder="Notas sobre este período…"
                        rows={2}
                      />
                      <Button
                        onClick={handleStartPeriod}
                        disabled={saving || startDate > today}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Começou a {formatDate(startDate)}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Metrics ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Métricas do dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricSlider label="Dor" value={painLevel} onChange={setPainLevel} emoji="😣" color="text-red-500" disabled={data.isMale || saving} />
          <MetricSlider label="Energia" value={energyLevel} onChange={setEnergyLevel} emoji="⚡" color="text-amber-500" disabled={data.isMale || saving} />
          <MetricSlider label="Stress" value={stress} onChange={setStress} emoji="😤" color="text-purple-500" disabled={data.isMale || saving} />
          <MetricSlider label="Libido" value={libido} onChange={setLibido} emoji="❤️‍🔥" color="text-pink-500" disabled={data.isMale || saving} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Horas de sono</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="7.5"
                disabled={data.isMale || saving}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qualidade do sono</Label>
              <Select value={sleepQuality} onValueChange={setSleepQuality} disabled={data.isMale || saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mau">😴 Mau</SelectItem>
                  <SelectItem value="ok">😐 OK</SelectItem>
                  <SelectItem value="bom">😊 Bom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Symptoms by category ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Sintomas de hoje</span>
            {activeSymptoms > 0 && (
              <Badge variant="secondary" className="text-xs">{activeSymptoms} activos</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SYMPTOM_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</p>
              <div className="grid grid-cols-3 gap-2">
                {section.items.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={data.isMale || saving}
                    onClick={() => setSymptoms((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all active:scale-95",
                      symptoms[s.key]
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:bg-accent",
                      (data.isMale || saving) && "opacity-80 cursor-not-allowed active:scale-100"
                    )}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span className="leading-tight text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Discharge type */}
          <div className="space-y-2">
            <Label>Corrimento</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "seco", label: "Seco", emoji: "🏜️" },
                { value: "pegajoso", label: "Pegajoso", emoji: "🍯" },
                { value: "cremoso", label: "Cremoso", emoji: "🥛" },
                { value: "clara_de_ovo", label: "Clara de ovo", emoji: "🥚" },
              ].map(d => (
                <button
                  key={d.value}
                  type="button"
                  disabled={data.isMale || saving}
                  onClick={() => setDischargeType(d.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-medium transition-all",
                    dischargeType === d.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                    (data.isMale || saving) && "opacity-80 cursor-not-allowed"
                  )}
                >
                  <span className="text-base">{d.emoji}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={data.isMale ? "A parceira não deixou notas." : "Notas privadas do dia…"}
            className="min-h-[60px] resize-none"
            maxLength={500}
            disabled={data.isMale || saving}
          />

          {!data.isMale && (
            <Button onClick={handleSaveSymptoms} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {todaySymptoms ? "Actualizar registo" : "Guardar registo de hoje"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Partner summary ── */}
      <CyclePartnerSummary />
    </div>
  );
}

function MetricSlider({ label, value, onChange, emoji, color, disabled }: {
  label: string; value: number; onChange: (v: number) => void; emoji?: string; color?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          {emoji && <span>{emoji}</span>}
          {label}
        </span>
        <span className={cn("font-bold tabular-nums", color)}>{value}/10</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} max={10} step={1} disabled={disabled} />
    </div>
  );
}
