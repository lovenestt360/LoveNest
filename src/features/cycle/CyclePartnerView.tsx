import { Lock, Lightbulb, Moon, Zap, Droplets, FileText } from "lucide-react";
import { formatShortDate } from "./engine";
import type { CycleData } from "./useCycleData";
import { cn } from "@/lib/utils";

// Phase insights — kept as content, clean text
const PHASE_INSIGHTS: Record<string, string> = {
  menstrual: "Ela está em período menstrual. Fadiga e sensibilidade emocional são comuns nesta fase — um gesto de carinho faz toda a diferença.",
  folicular: "Fase folicular: a energia está a recuperar gradualmente. É um bom momento para atividades a dois e conversas positivas.",
  ovulacao:  "Fase de ovulação: pico de energia e mood elevado. Ela tende a sentir-se mais comunicativa e conectada nestes dias.",
  luteal:    "Fase lútea (pré-menstrual). Podem surgir oscilações de humor e fadiga. Paciência e presença são o melhor apoio.",
  sem_dados: "A aguardar dados suficientes para gerar insights personalizados.",
};

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: "🌹", folicular: "🌸", ovulacao: "✨", luteal: "💜", sem_dados: "🌸",
};

const ENERGY_LABELS: Record<number, string>  = { 2: "Baixa", 5: "Normal", 9: "Alta" };
const PAIN_LABELS:   Record<number, string>  = { 0: "Sem dor", 3: "Leve", 6: "Moderada", 9: "Intensa" };
const STRESS_LABELS: Record<number, string>  = { 0: "Calma", 4: "Normal", 8: "Muito stressada" };
const SLEEP_LABELS:  Record<string, string>  = { mau: "Mau", ok: "Razoável", bom: "Bom" };
const DISCHARGE_LABELS: Record<string, string> = {
  seco: "Seco", pegajoso: "Pegajoso", cremoso: "Cremoso", clara_de_ovo: "Fértil",
};

const SYMPTOM_GROUPS = [
  { key: "physical",   label: "Físico",    items: [
    { key: "cramps", label: "Cólicas" }, { key: "headache", label: "Dor de cabeça" },
    { key: "back_pain", label: "Dor lombar" }, { key: "fatigue", label: "Fadiga" },
    { key: "nausea", label: "Náusea" }, { key: "bloating", label: "Inchaço" },
    { key: "breast_tenderness", label: "Seios sensíveis" }, { key: "weakness", label: "Fraqueza" },
  ]},
  { key: "emotional",  label: "Emocional", items: [
    { key: "mood_swings", label: "Oscilações de humor" }, { key: "irritability", label: "Irritabilidade" },
    { key: "anxiety", label: "Ansiedade" }, { key: "sadness", label: "Tristeza" },
    { key: "sensitivity", label: "Sensibilidade emocional" },
  ]},
] as const;

function closest(val: number, opts: number[]) {
  return opts.reduce((p, c) => Math.abs(c - val) < Math.abs(p - val) ? c : p);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">{children}</p>;
}

function MetricRow({ label, value, sub, highlight = false }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f5f5f5] last:border-0">
      <p className="text-sm text-[#717171]">{label}</p>
      <div className="text-right">
        <p className={cn("text-sm font-medium", highlight ? "text-rose-500" : "text-foreground")}>{value}</p>
        {sub && <p className="text-[11px] text-[#717171] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function CyclePartnerView({ data }: { data: CycleData }) {
  const { engine, profile, todaySymptoms, openPeriod } = data;

  // No profile
  if (!profile) {
    return (
      <div className="glass-card p-10 text-center space-y-3">
        <p className="text-4xl">🌸</p>
        <p className="text-base font-semibold text-foreground">Ciclo não configurado</p>
        <p className="text-sm text-[#717171] max-w-[240px] mx-auto leading-relaxed">
          A tua parceira ainda não começou a acompanhar o ciclo menstrual.
        </p>
      </div>
    );
  }

  // Private
  if (profile.share_level === "private") {
    return (
      <div className="glass-card p-10 text-center space-y-3">
        <div className="w-14 h-14 rounded-full border border-[#e5e5e5] bg-[#f5f5f5] flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6 text-[#717171]" strokeWidth={1.5} />
        </div>
        <p className="text-base font-semibold text-foreground">Dados privados</p>
        <p className="text-sm text-[#717171] max-w-[220px] mx-auto leading-relaxed">
          A tua parceira não partilhou o ciclo. É o espaço dela.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const s = todaySymptoms as any;
  const hasSymptoms      = !!s;
  const isSignalsShared  = profile.share_level === "summary_signals";

  const energyVal = s?.energy_level !== undefined ? closest(s.energy_level, [2, 5, 9]) : null;
  const painVal   = s?.pain_level   !== undefined ? closest(s.pain_level, [0, 3, 6, 9]) : null;
  const stressVal = s?.stress       !== undefined ? closest(s.stress, [0, 4, 8]) : null;

  const activeGroups = SYMPTOM_GROUPS.map(g => ({
    ...g, active: g.items.filter(item => s?.[item.key] === true),
  })).filter(g => g.active.length > 0);

  return (
    <div className="space-y-4 pb-10">

      {/* ── Hero card ── */}
      <div className="glass-card p-5 space-y-4">
        {/* Phase */}
        <div className="flex items-start justify-between">
          <div>
            <SectionLabel>Ciclo da parceira</SectionLabel>
            <h2 className="text-2xl font-bold text-foreground mt-1">
              {PHASE_EMOJIS[phaseKey]} {engine?.phaseLabel ?? "A aguardar"}
            </h2>
            {openPeriod && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                </span>
                <p className="text-[11px] font-medium text-rose-500">Em período menstrual</p>
              </div>
            )}
          </div>
          {engine && (
            <div className="text-right">
              <SectionLabel>Dia</SectionLabel>
              <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{engine.cycleDay}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        {engine && (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-[#f5f5f5] overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-400 transition-all duration-700"
                style={{ width: `${engine.cycleProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#717171]">
              <span>Dia 1</span>
              <span>{engine.cycleProgress.toFixed(0)}% concluído</span>
              <span>Fim</span>
            </div>
          </div>
        )}

        {/* Next events */}
        {engine && (engine.nextPeriodStr || engine.ovulationDateStr) && (
          <div className="flex gap-2">
            {engine.nextPeriodStr && (
              <div className="flex-1 rounded-2xl border border-[#e5e5e5] p-3">
                <SectionLabel>Próx. menstruação</SectionLabel>
                <p className="text-sm font-semibold text-foreground mt-1">{formatShortDate(engine.nextPeriodStr)}</p>
                {engine.daysUntilNextPeriod > 0 && (
                  <p className="text-[11px] text-[#717171] mt-0.5">em {engine.daysUntilNextPeriod} dias</p>
                )}
              </div>
            )}
            {engine.ovulationDateStr && (
              <div className="flex-1 rounded-2xl border border-[#e5e5e5] p-3">
                <SectionLabel>Ovulação</SectionLabel>
                <p className="text-sm font-semibold text-foreground mt-1">{formatShortDate(engine.ovulationDateStr)}</p>
                <p className="text-[11px] text-[#717171] mt-0.5">estimada</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Insight ── */}
      <div className="glass-card p-5 flex gap-3 items-start">
        <Lightbulb className="h-4 w-4 text-[#717171] shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-sm text-foreground leading-relaxed">{PHASE_INSIGHTS[phaseKey]}</p>
      </div>

      {/* ── Métricas ── */}
      {isSignalsShared && hasSymptoms && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5] flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#717171]" strokeWidth={1.5} />
            <SectionLabel>Como ela se sente hoje</SectionLabel>
          </div>
          <div className="px-5 pb-1 pt-1">
            {energyVal !== null && <MetricRow label="Energia" value={ENERGY_LABELS[energyVal] ?? "—"} />}
            {painVal !== null && (
              <MetricRow label="Dor / Desconforto" value={PAIN_LABELS[painVal] ?? "—"} highlight={painVal >= 6} />
            )}
            {stressVal !== null && (
              <MetricRow label="Stress" value={STRESS_LABELS[stressVal] ?? "—"} highlight={stressVal >= 8} />
            )}
            {s?.libido !== undefined && (
              <MetricRow label="Libido" value={
                closest(s.libido, [2, 5, 9]) <= 2 ? "Baixo" :
                closest(s.libido, [2, 5, 9]) <= 5 ? "Normal" : "Alto"
              } />
            )}
          </div>
        </div>
      )}

      {/* ── Sintomas ── */}
      {isSignalsShared && activeGroups.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5]">
            <SectionLabel>Sintomas reportados</SectionLabel>
          </div>
          <div className="px-5 pb-4 pt-3 space-y-4">
            {activeGroups.map((group, gi) => (
              <div key={group.key} className={gi > 0 ? "pt-3 border-t border-[#f5f5f5]" : ""}>
                <p className="text-[11px] font-semibold text-[#717171] mb-2">{group.label}</p>
                <div className="space-y-1.5">
                  {group.active.map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                      <p className="text-sm text-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sono ── */}
      {isSignalsShared && (s?.sleep_hours || s?.sleep_quality) && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#f5f5f5] flex items-center gap-2">
            <Moon className="h-4 w-4 text-[#717171]" strokeWidth={1.5} />
            <SectionLabel>Sono</SectionLabel>
          </div>
          <div className="px-5 pb-1 pt-1">
            {s?.sleep_hours && (
              <MetricRow
                label="Horas dormidas"
                value={`${s.sleep_hours}h`}
                sub={s.sleep_hours < 6 ? "Abaixo do recomendado" : undefined}
                highlight={s.sleep_hours < 6}
              />
            )}
            {s?.sleep_quality && (
              <MetricRow label="Qualidade" value={SLEEP_LABELS[s.sleep_quality] ?? s.sleep_quality} />
            )}
          </div>
        </div>
      )}

      {/* ── Notas ── */}
      {isSignalsShared && s?.notes && (
        <div className="glass-card p-5 flex gap-3 items-start">
          <FileText className="h-4 w-4 text-[#717171] shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-foreground leading-relaxed italic">"{s.notes}"</p>
        </div>
      )}

      {/* ── Sem sintomas ── */}
      {isSignalsShared && !hasSymptoms && (
        <div className="glass-card py-10 text-center space-y-2">
          <p className="text-3xl">🌸</p>
          <p className="text-sm text-[#717171]">Sem registo de sintomas hoje.</p>
        </div>
      )}

      {/* ── Partilha limitada ── */}
      {profile.share_level === "summary" && (
        <div className="glass-card p-5 flex gap-3 items-start">
          <Lock className="h-4 w-4 text-[#717171] shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-[#717171] leading-relaxed">
            A tua parceira partilhou apenas a fase e os eventos. Os sintomas diários não estão disponíveis.
          </p>
        </div>
      )}

      {/* ── Footer ── */}
      <p className="text-center text-[11px] text-[#717171] font-medium pb-2">
        Apenas o que ela escolheu partilhar
      </p>
    </div>
  );
}
