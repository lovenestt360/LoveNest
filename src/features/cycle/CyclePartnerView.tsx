import { cn } from "@/lib/utils";
import {
  Heart, Calendar, TrendingUp, Moon, Droplets,
  Zap, Brain, Activity, Lock,
} from "lucide-react";
import { formatShortDate } from "./engine";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// DESIGN TOKENS — Premium Pink (sem amarelo)
// ─────────────────────────────────────────────

const PHASE_HERO: Record<string, {
  gradient: string;
  border: string;
  accent: string;
  emoji: string;
  insight: string;       // ← mensagem de inteligência contextual
}> = {
  menstrual: {
    gradient: "bg-gradient-to-br from-white to-[#FADADD]/30",
    border: "border-[#F8BBD0]",
    accent: "text-[#E94E77]",
    emoji: "🌹",
    insight: "Ela está em período menstrual. Fadiga e sensibilidade emocional são comuns nesta fase — um gesto de carinho faz toda a diferença.",
  },
  folicular: {
    gradient: "bg-gradient-to-br from-white to-[#F5F5F5]/60",
    border: "border-slate-100",
    accent: "text-[#F06292]",
    emoji: "🌸",
    insight: "Fase folicular: a energia está a recuperar. É um bom momento para atividades a dois e conversas positivas.",
  },
  ovulacao: {
    gradient: "bg-gradient-to-br from-white to-[#FADADD]/15",
    border: "border-[#F8BBD0]/40",
    accent: "text-[#E94E77]",
    emoji: "✨",
    insight: "Fase de ovulação: pico de energia e mood elevado. Ela tende a sentir-se mais comunicativa e conectada.",
  },
  luteal: {
    gradient: "bg-gradient-to-br from-white to-[#FADADD]/20",
    border: "border-[#F8BBD0]/40",
    accent: "text-[#E94E77]",
    emoji: "💜",
    insight: "Fase lútea (pré-menstrual). Pode haver oscilações de humor, sensibilidade e fadiga. Paciência e apoio são o melhor presente.",
  },
  sem_dados: {
    gradient: "bg-white",
    border: "border-slate-100",
    accent: "text-[#777777]",
    emoji: "🌸",
    insight: "A aguardar dados suficientes para gerar insights.",
  },
};

// ─────────────────────────────────────────────
// DADOS DE SINTOMAS — Labels e grupos
// ─────────────────────────────────────────────

const SYMPTOM_GROUPS = [
  {
    key: "physical",
    label: "Físico",
    icon: Activity,
    items: [
      { key: "cramps",           label: "Cólicas" },
      { key: "headache",         label: "Dor de cabeça" },
      { key: "back_pain",        label: "Dor lombar" },
      { key: "leg_pain",         label: "Dor nas pernas" },
      { key: "fatigue",          label: "Fadiga" },
      { key: "dizziness",        label: "Tonturas" },
      { key: "weakness",         label: "Fraqueza" },
      { key: "breast_tenderness",label: "Sensibilidade nos seios" },
      { key: "nausea",           label: "Náusea" },
      { key: "bloating",         label: "Inchaço abdominal" },
    ],
  },
  {
    key: "emotional",
    label: "Emocional",
    icon: Brain,
    items: [
      { key: "mood_swings",   label: "Oscilações de humor" },
      { key: "irritability",  label: "Irritabilidade" },
      { key: "anxiety",       label: "Ansiedade" },
      { key: "sadness",       label: "Tristeza" },
      { key: "sensitivity",   label: "Sensibilidade emocional" },
      { key: "crying",        label: "Necessidade de chorar" },
    ],
  },
  {
    key: "digestive",
    label: "Digestivo",
    icon: Droplets,
    items: [
      { key: "diarrhea",     label: "Diarreia" },
      { key: "constipation", label: "Obstipação" },
      { key: "gas",          label: "Gases" },
    ],
  },
  {
    key: "other",
    label: "Outros",
    icon: Activity,
    items: [
      { key: "acne",               label: "Acne" },
      { key: "cravings",           label: "Desejos alimentares" },
      { key: "increased_appetite", label: "Apetite aumentado" },
    ],
  },
] as const;

const ENERGY_LABELS: Record<number, { label: string; description: string }> = {
  2: { label: "Baixa", description: "Ela pode precisar de mais descanso hoje." },
  5: { label: "Normal", description: "Níveis de energia equilibrados." },
  9: { label: "Alta", description: "Ela está com bastante energia hoje." },
};

const PAIN_LABELS: Record<number, { label: string; description: string }> = {
  0: { label: "Sem dor", description: "Sem desconforto reportado." },
  3: { label: "Leve", description: "Desconforto ligeiro." },
  6: { label: "Moderada", description: "Dor presente mas gerenciável." },
  9: { label: "Intensa", description: "Dor significativa — pode precisar de atenção." },
};

const STRESS_LABELS: Record<number, string> = {
  0: "Calma",
  4: "Stress normal",
  8: "Muito stressada",
};

const DISCHARGE_LABELS: Record<string, string> = {
  seco:          "Seco",
  pegajoso:      "Pegajoso",
  cremoso:       "Cremoso / Branco",
  clara_de_ovo:  "Tipo clara de ovo (fértil)",
};

const SLEEP_QUALITY_LABELS: Record<string, string> = {
  mau: "Mau",
  ok:  "Razoável",
  bom: "Bom",
};

// Aproximar o valor ao chip mais próximo
function closestValue(val: number, options: number[]): number {
  return options.reduce((prev, curr) =>
    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, children, accent = false,
}: {
  icon: any; title: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-[20px] border bg-white overflow-hidden shadow-sm",
      accent ? "border-[#F8BBD0]/60" : "border-slate-100"
    )}>
      <div className={cn(
        "px-4 py-3 border-b flex items-center gap-2",
        accent ? "border-[#F8BBD0]/30 bg-[#FADADD]/10" : "border-[#F5F5F5]"
      )}>
        <Icon className={cn("h-3.5 w-3.5", accent ? "text-[#E94E77]" : "text-[#777777]/60")} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/60">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MetricRow({
  label, value, sub, highlight = false,
}: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
      <p className="text-xs text-[#777777]/70 font-medium">{label}</p>
      <div className="text-right">
        <p className={cn("text-sm font-black", highlight ? "text-[#E94E77]" : "text-[#777777]")}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-[#777777]/40">{sub}</p>}
      </div>
    </div>
  );
}

function SymptomPill({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-1.5 py-1 text-xs text-[#777777]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#E94E77]/40 shrink-0" />
      {label}
    </span>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-[#FADADD]/10 border border-[#F8BBD0]/30 p-3 space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-[#777777]/50">{label}</p>
      <p className="text-xl font-black text-[#E94E77] leading-none">{value}</p>
      {sub && <p className="text-[10px] text-[#777777]/50">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN: CyclePartnerView
// ─────────────────────────────────────────────

export function CyclePartnerView({ data }: { data: CycleData }) {
  const { engine, profile, todaySymptoms, openPeriod } = data;

  // ── Sem perfil ──────────────────────────────
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-[#FADADD] flex items-center justify-center shadow-sm">
          <span className="text-3xl">🌸</span>
        </div>
        <div className="space-y-1.5 max-w-[260px]">
          <p className="font-black text-[#E94E77]">Ciclo ainda não configurado</p>
          <p className="text-sm text-[#777777]/70 leading-relaxed">
            A tua parceira ainda não começou a acompanhar o ciclo menstrual.
          </p>
        </div>
      </div>
    );
  }

  // ── Dados privados ──────────────────────────
  if (profile.share_level === "private") {
    return (
      <div className="rounded-[28px] border border-dashed border-[#F8BBD0] bg-white p-10 text-center space-y-3 shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#FADADD]/40 flex items-center justify-center">
          <Lock className="h-5 w-5 text-[#E94E77]/50" />
        </div>
        <p className="font-black text-[#E94E77]">Dados privados</p>
        <p className="text-sm text-[#777777]/60 leading-relaxed max-w-[220px] mx-auto">
          A tua parceira não partilhou o ciclo. É o espaço dela.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const hero = PHASE_HERO[phaseKey] ?? PHASE_HERO.sem_dados;

  // ── Sintomas de hoje calculados ─────────────
  const s = todaySymptoms as any;
  const hasSymptoms = !!s;

  const energyVal = s?.energy_level !== undefined
    ? closestValue(s.energy_level, [2, 5, 9])
    : null;
  const painVal = s?.pain_level !== undefined
    ? closestValue(s.pain_level, [0, 3, 6, 9])
    : null;
  const stressVal = s?.stress !== undefined
    ? closestValue(s.stress, [0, 4, 8])
    : null;

  const activeGroups = SYMPTOM_GROUPS.map((group) => ({
    ...group,
    active: group.items.filter((item) => s?.[item.key] === true),
  })).filter((g) => g.active.length > 0);

  const hasSleepData = s?.sleep_hours || s?.sleep_quality;
  const hasDischarge = s?.discharge_type && s.discharge_type !== "seco";
  const isSignalsShared = profile.share_level === "summary_signals";

  return (
    <div className="space-y-4 pb-10">

      {/* ── HEADER CONTEXTUAL ── */}
      <div className="flex items-center gap-3 px-1">
        <div className="h-9 w-9 rounded-full bg-[#FADADD] flex items-center justify-center shadow-sm shrink-0">
          <Heart className="h-4 w-4 text-[#E94E77]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/50">
            A acompanhar
          </p>
          <p className="text-sm font-black text-[#E94E77]">Ciclo da tua parceira</p>
        </div>
      </div>

      {/* ── HERO: FASE ATUAL ── */}
      {engine ? (
        <div className={cn(
          "rounded-[28px] border p-6 space-y-5 shadow-md transition-all",
          hero.gradient, hero.border
        )}>
          {/* Fase + dia */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#777777]/40">
                Fase actual
              </p>
              <h2 className={cn("text-2xl font-black tracking-tight", hero.accent)}>
                {hero.emoji} {engine.phaseLabel}
              </h2>
              {openPeriod && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E94E77] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E94E77]" />
                  </span>
                  <p className="text-[11px] font-bold text-[#E94E77]">Em período</p>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#777777]/40">Dia</p>
              <p className={cn("text-5xl font-black leading-none tracking-tighter", hero.accent)}>
                {engine.cycleDay}
              </p>
              <p className="text-[10px] text-[#777777]/40 font-bold uppercase tracking-widest mt-0.5">
                do ciclo
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full overflow-hidden bg-[#F5F5F5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E94E77] to-[#F06292] transition-all duration-1000 ease-out"
                style={{ width: `${engine.cycleProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#777777]/40 font-bold uppercase tracking-widest">
              <span>Início</span>
              <span>{engine.cycleProgress.toFixed(0)}% concluído</span>
              <span>Fim</span>
            </div>
          </div>

          {/* Próximos eventos inline */}
          <div className="flex gap-2.5">
            {engine.nextPeriodStr && (
              <div className="flex-1 rounded-2xl bg-white/70 border border-[#F8BBD0]/30 p-3 space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#777777]/40">Próx. menstruação</p>
                <p className="text-sm font-black text-[#E94E77]">{formatShortDate(engine.nextPeriodStr)}</p>
                {engine.daysUntilNextPeriod > 0 && (
                  <p className="text-[10px] text-[#777777]/50">em {engine.daysUntilNextPeriod} dias</p>
                )}
              </div>
            )}
            {engine.ovulationDateStr && (
              <div className="flex-1 rounded-2xl bg-white/70 border border-[#F8BBD0]/30 p-3 space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#777777]/40">Ovulação</p>
                <p className="text-sm font-black text-[#E94E77]">{formatShortDate(engine.ovulationDateStr)}</p>
                <p className="text-[10px] text-[#777777]/50">estimada</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] bg-white border border-slate-100 p-10 text-center space-y-2 shadow-sm">
          <p className="text-5xl animate-pulse">🌸</p>
          <p className="font-black text-[#E94E77]">A aguardar dados do ciclo</p>
          <p className="text-xs text-[#777777]/60">O ciclo ainda não tem registos suficientes.</p>
        </div>
      )}

      {/* ── INSIGHT CONTEXTUAL ── */}
      <div className="rounded-2xl border border-[#F8BBD0]/40 bg-[#FADADD]/15 px-5 py-4 flex gap-3 items-start shadow-sm">
        <span className="text-base shrink-0 mt-0.5">💡</span>
        <p className="text-sm text-[#777777] leading-relaxed font-medium">
          {hero.insight}
        </p>
      </div>

      {/* ── SINTOMAS DE HOJE ── */}
      {isSignalsShared && (
        <>
          {/* Métricas principais */}
          {hasSymptoms && (
            <SectionCard icon={Zap} title="Como ela se sente hoje" accent>
              <div className="space-y-0">
                {energyVal !== null && ENERGY_LABELS[energyVal] && (
                  <MetricRow
                    label="Energia"
                    value={ENERGY_LABELS[energyVal].label}
                    sub={ENERGY_LABELS[energyVal].description}
                    highlight={energyVal === 9}
                  />
                )}
                {painVal !== null && PAIN_LABELS[painVal] && (
                  <MetricRow
                    label="Dor / Desconforto"
                    value={PAIN_LABELS[painVal].label}
                    sub={PAIN_LABELS[painVal].description}
                    highlight={painVal >= 6}
                  />
                )}
                {stressVal !== null && STRESS_LABELS[stressVal] && (
                  <MetricRow
                    label="Nível de stress"
                    value={STRESS_LABELS[stressVal]}
                    highlight={stressVal === 8}
                  />
                )}
                {s?.libido !== undefined && (
                  <MetricRow
                    label="Libido"
                    value={
                      closestValue(s.libido, [2, 5, 9]) <= 2 ? "Baixo" :
                      closestValue(s.libido, [2, 5, 9]) <= 5 ? "Normal" : "Alto"
                    }
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* Grupos de sintomas activos */}
          {activeGroups.length > 0 && (
            <SectionCard icon={Activity} title="Sintomas reportados">
              <div className="space-y-4">
                {activeGroups.map((group) => (
                  <div key={group.key}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/40 mb-1.5">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.active.map((item) => (
                        <SymptomPill key={item.key} label={item.label} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Sono */}
          {hasSleepData && (
            <SectionCard icon={Moon} title="Sono">
              <div className="space-y-0">
                {s?.sleep_hours && (
                  <MetricRow
                    label="Horas dormidas"
                    value={`${s.sleep_hours}h`}
                    highlight={s.sleep_hours < 6}
                  />
                )}
                {s?.sleep_quality && (
                  <MetricRow
                    label="Qualidade"
                    value={SLEEP_QUALITY_LABELS[s.sleep_quality] ?? s.sleep_quality}
                    highlight={s.sleep_quality === "mau"}
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* Corrimento — só info não invasiva */}
          {hasDischarge && (
            <SectionCard icon={Droplets} title="Corrimento vaginal">
              <MetricRow
                label="Tipo"
                value={DISCHARGE_LABELS[s.discharge_type] ?? s.discharge_type}
              />
              {s.discharge_type === "clara_de_ovo" && (
                <p className="text-[10px] text-[#777777]/50 mt-2 leading-snug">
                  Corrimento fértil — indica proximidade da ovulação.
                </p>
              )}
            </SectionCard>
          )}

          {/* Notas (se existirem) */}
          {s?.notes && (
            <div className="rounded-2xl border border-[#F8BBD0]/30 bg-white px-5 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/40 mb-2">
                Nota do dia
              </p>
              <p className="text-sm text-[#777777] leading-relaxed italic">"{s.notes}"</p>
            </div>
          )}

          {/* Sem sintomas registados */}
          {!hasSymptoms && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center shadow-sm">
              <p className="text-3xl mb-2">🌸</p>
              <p className="text-sm text-[#777777]/50 italic">Sem registo de sintomas hoje.</p>
            </div>
          )}
        </>
      )}

      {/* ── AVISO PARTILHA LIMITADA ── */}
      {profile.share_level === "summary" && (
        <div className="rounded-2xl border border-[#F8BBD0]/30 bg-[#FADADD]/10 px-4 py-4 flex gap-3 items-start">
          <Lock className="h-4 w-4 text-[#E94E77]/40 shrink-0 mt-0.5" />
          <p className="text-xs text-[#777777]/60 leading-relaxed">
            A tua parceira partilhou apenas a fase e os eventos. Os sintomas diários não estão
            disponíveis neste nível de partilha.
          </p>
        </div>
      )}

      {/* ── RODAPÉ ── */}
      <p className="text-center text-[9px] text-[#777777]/30 font-black uppercase tracking-widest px-4 pb-2">
        🔒 Apenas dados que ela escolheu partilhar
      </p>
    </div>
  );
}
