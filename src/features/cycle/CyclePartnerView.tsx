import { cn } from "@/lib/utils";
import {
  Heart, Calendar, TrendingUp, Moon, Droplets,
  Zap, Brain, Activity, Lock, Sparkles,
} from "lucide-react";
import { formatShortDate } from "./engine";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// PHASE HERO CONFIG
// ─────────────────────────────────────────────

const PHASE_HERO: Record<string, {
  heroGradient: string;
  cardGradient: string;
  accent: string;
  softAccent: string;
  emoji: string;
  insight: string;
}> = {
  menstrual: {
    heroGradient: "linear-gradient(135deg, #FADADD 0%, #FFE4EC 50%, #FFF6F8 100%)",
    cardGradient: "linear-gradient(135deg, #FFE4EC, #FFFFFF)",
    accent: "#E94E77",
    softAccent: "#F8BBD0",
    emoji: "🌹",
    insight: "Ela está em período menstrual. Fadiga e sensibilidade emocional são comuns nesta fase — um gesto de carinho faz toda a diferença.",
  },
  folicular: {
    heroGradient: "linear-gradient(135deg, #FFF0F3 0%, #FFF6F8 50%, #FFFFFF 100%)",
    cardGradient: "linear-gradient(135deg, #FFF0F3, #FFFFFF)",
    accent: "#F06292",
    softAccent: "#FADADD",
    emoji: "🌸",
    insight: "Fase folicular: a energia está a recuperar gradualmente. É um bom momento para atividades a dois e conversas positivas.",
  },
  ovulacao: {
    heroGradient: "linear-gradient(135deg, #FADADD 0%, #FFE4EC 50%, #FFF6F8 100%)",
    cardGradient: "linear-gradient(135deg, #FFE4EC, #FFFFFF)",
    accent: "#E94E77",
    softAccent: "#F8BBD0",
    emoji: "✨",
    insight: "Fase de ovulação: pico de energia e mood elevado. Ela tende a sentir-se mais comunicativa e conectada nestes dias.",
  },
  luteal: {
    heroGradient: "linear-gradient(135deg, #F3E5F5 0%, #FADADD 50%, #FFF6F8 100%)",
    cardGradient: "linear-gradient(135deg, #F9F0FC, #FFFFFF)",
    accent: "#E94E77",
    softAccent: "#F8BBD0",
    emoji: "💜",
    insight: "Fase lútea (pré-menstrual). Podem surgir oscilações de humor e fadiga. Paciência e presença são o melhor apoio.",
  },
  sem_dados: {
    heroGradient: "linear-gradient(135deg, #FFF6F8 0%, #FFFFFF 100%)",
    cardGradient: "linear-gradient(135deg, #FFF6F8, #FFFFFF)",
    accent: "#F06292",
    softAccent: "#FADADD",
    emoji: "🌸",
    insight: "A aguardar dados suficientes para gerar insights personalizados.",
  },
};

// ─────────────────────────────────────────────
// SYMPTOM GROUPS
// ─────────────────────────────────────────────

const SYMPTOM_GROUPS = [
  {
    key: "physical", label: "Físico", emoji: "🏃",
    items: [
      { key: "cramps", label: "Cólicas" },
      { key: "headache", label: "Dor de cabeça" },
      { key: "back_pain", label: "Dor lombar" },
      { key: "leg_pain", label: "Dor nas pernas" },
      { key: "fatigue", label: "Fadiga" },
      { key: "dizziness", label: "Tonturas" },
      { key: "weakness", label: "Fraqueza" },
      { key: "breast_tenderness", label: "Sensibilidade nos seios" },
      { key: "nausea", label: "Náusea" },
      { key: "bloating", label: "Inchaço abdominal" },
    ],
  },
  {
    key: "emotional", label: "Emocional", emoji: "💭",
    items: [
      { key: "mood_swings", label: "Oscilações de humor" },
      { key: "irritability", label: "Irritabilidade" },
      { key: "anxiety", label: "Ansiedade" },
      { key: "sadness", label: "Tristeza" },
      { key: "sensitivity", label: "Sensibilidade emocional" },
      { key: "crying", label: "Necessidade de chorar" },
    ],
  },
  {
    key: "digestive", label: "Digestivo", emoji: "🌿",
    items: [
      { key: "diarrhea", label: "Diarreia" },
      { key: "constipation", label: "Obstipação" },
      { key: "gas", label: "Gases" },
    ],
  },
  {
    key: "other", label: "Outros", emoji: "🔆",
    items: [
      { key: "acne", label: "Acne" },
      { key: "cravings", label: "Desejos alimentares" },
      { key: "increased_appetite", label: "Apetite aumentado" },
    ],
  },
] as const;

// Métricas com visual priority
const ENERGY_META: Record<number, { label: string; description: string; intensity: "low" | "mid" | "high" }> = {
  2: { label: "Baixa", description: "Ela pode precisar de mais descanso.", intensity: "low" },
  5: { label: "Normal", description: "Energia equilibrada.", intensity: "mid" },
  9: { label: "Alta 🚀", description: "Cheia de energia hoje.", intensity: "high" },
};
const PAIN_META: Record<number, { label: string; description: string; intensity: "none" | "low" | "mid" | "high" }> = {
  0: { label: "Sem dor", description: "Nenhum desconforto reportado.", intensity: "none" },
  3: { label: "Leve", description: "Desconforto ligeiro.", intensity: "low" },
  6: { label: "Moderada", description: "Dor presente mas gerenciável.", intensity: "mid" },
  9: { label: "Intensa ⚠️", description: "Dor significativa.", intensity: "high" },
};
const STRESS_META: Record<number, { label: string; intensity: "none" | "mid" | "high" }> = {
  0: { label: "Calma 😌", intensity: "none" },
  4: { label: "Normal", intensity: "mid" },
  8: { label: "Muito stressada", intensity: "high" },
};
const DISCHARGE_LABELS: Record<string, string> = {
  seco: "Seco", pegajoso: "Pegajoso",
  cremoso: "Cremoso / Branco", clara_de_ovo: "Fértil (tipo clara de ovo)",
};
const SLEEP_QUALITY_LABELS: Record<string, string> = {
  mau: "Mau 😴", ok: "Razoável 😐", bom: "Bom 😊",
};

function closestValue(val: number, options: number[]): number {
  return options.reduce((prev, curr) =>
    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTES PREMIUM
// ─────────────────────────────────────────────

/** Cartão com gradiente e shadow premium */
function GlowCard({
  children, className, style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("rounded-[22px] overflow-hidden transition-all duration-300", className)}
      style={{
        background: "linear-gradient(135deg, #FFE4EC, #FFFFFF)",
        boxShadow: "0 8px 20px rgba(233, 78, 119, 0.07), 0 2px 8px rgba(233, 78, 119, 0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Linha de métrica com visual priority */
function MetricRow({
  label, value, sub, intensity = "mid",
}: {
  label: string;
  value: string;
  sub?: string;
  intensity?: "none" | "low" | "mid" | "high";
}) {
  const valueColor =
    intensity === "high" ? "text-[#E94E77] font-black" :
    intensity === "none" ? "text-[#AAAAAA] font-bold" :
    "text-[#777777] font-bold";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-rose-50 last:border-0">
      <p className="text-xs text-[#AAAAAA] font-medium tracking-wide">{label}</p>
      <div className="text-right">
        <p className={cn("text-sm", valueColor)}>{value}</p>
        {sub && <p className="text-[10px] text-[#CCCCCC] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/** Pílula de sintoma — lista vertical premium */
function SymptomItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: "linear-gradient(135deg, #E94E77, #F06292)" }}
      />
      <p className="text-sm text-[#777777]">{label}</p>
    </div>
  );
}

/** Header de secção dentro de card */
function CardSection({
  emoji, title, children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlowCard>
      <div className="px-5 py-3.5 border-b border-rose-50/80">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/60">{title}</p>
        </div>
      </div>
      <div className="px-5 pb-4 pt-1">{children}</div>
    </GlowCard>
  );
}

// ─────────────────────────────────────────────
// MAIN: CyclePartnerView
// ─────────────────────────────────────────────

export function CyclePartnerView({ data }: { data: CycleData }) {
  const { engine, profile, todaySymptoms, openPeriod } = data;

  // ── Sem perfil ──────────────────────────────────────────
  if (!profile) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 text-center rounded-[32px] mx-1"
        style={{ background: "linear-gradient(135deg, #FFF0F3, #FFF6F8)" }}
      >
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: "linear-gradient(135deg, #FADADD, #FFE4EC)", boxShadow: "0 8px 20px rgba(233,78,119,0.12)" }}
        >
          <span className="text-4xl">🌸</span>
        </div>
        <p className="font-black text-[#E94E77] text-lg mb-2">Ciclo não configurado</p>
        <p className="text-sm text-[#AAAAAA] max-w-[240px] leading-relaxed">
          A tua parceira ainda não começou a acompanhar o ciclo menstrual.
        </p>
      </div>
    );
  }

  // ── Dados privados ──────────────────────────────────────
  if (profile.share_level === "private") {
    return (
      <div
        className="rounded-[28px] p-10 text-center space-y-4"
        style={{ background: "linear-gradient(135deg, #FFF0F3, #FFFFFF)", boxShadow: "0 8px 24px rgba(233,78,119,0.06)" }}
      >
        <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center">
          <Lock className="h-6 w-6 text-[#E94E77]/40" />
        </div>
        <p className="font-black text-[#E94E77] text-lg">Dados privados</p>
        <p className="text-sm text-[#AAAAAA] leading-relaxed max-w-[220px] mx-auto">
          A tua parceira não partilhou o ciclo. É o espaço dela.
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const hero = PHASE_HERO[phaseKey] ?? PHASE_HERO.sem_dados;

  const s = todaySymptoms as any;
  const hasSymptoms = !!s;
  const isSignalsShared = profile.share_level === "summary_signals";

  const energyVal = s?.energy_level !== undefined ? closestValue(s.energy_level, [2, 5, 9]) : null;
  const painVal   = s?.pain_level   !== undefined ? closestValue(s.pain_level, [0, 3, 6, 9]) : null;
  const stressVal = s?.stress       !== undefined ? closestValue(s.stress, [0, 4, 8]) : null;

  const activeGroups = SYMPTOM_GROUPS.map((group) => ({
    ...group,
    active: group.items.filter((item) => s?.[item.key] === true),
  })).filter((g) => g.active.length > 0);

  return (
    <>
      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .partner-card { animation: fadeSlideUp 0.45s ease-out both; }
        .partner-card:nth-child(1) { animation-delay: 0.02s; }
        .partner-card:nth-child(2) { animation-delay: 0.08s; }
        .partner-card:nth-child(3) { animation-delay: 0.14s; }
        .partner-card:nth-child(4) { animation-delay: 0.20s; }
        .partner-card:nth-child(5) { animation-delay: 0.26s; }
        .partner-card:nth-child(6) { animation-delay: 0.32s; }
        .partner-card:nth-child(7) { animation-delay: 0.38s; }

        @keyframes growBar {
          from { width: 0%; }
          to   { width: var(--progress); }
        }
        .progress-bar-animated {
          animation: growBar 1.2s cubic-bezier(0.4, 0, 0.2, 1) both;
          animation-delay: 0.3s;
        }
      `}</style>

      <div className="space-y-4 pb-10">

        {/* ════ 1. HERO CARD ════ */}
        <div
          className="partner-card rounded-[32px] p-6 space-y-5 overflow-hidden"
          style={{
            background: hero.heroGradient,
            boxShadow: "0 12px 32px rgba(233, 78, 119, 0.10), 0 4px 12px rgba(233, 78, 119, 0.06)",
          }}
        >
          {/* Header hero */}
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              {/* Eyebrow */}
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#E94E77]/50" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E94E77]/50">
                  Ciclo da parceira
                </p>
              </div>
              {/* Phase */}
              <h2 className="text-3xl font-black tracking-tight text-[#E94E77] leading-none">
                {hero.emoji} {engine?.phaseLabel ?? "A aguardar"}
              </h2>
              {/* Period active */}
              {openPeriod && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E94E77] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E94E77]" />
                  </span>
                  <p className="text-[11px] font-bold text-[#E94E77]/80">Em período menstrual</p>
                </div>
              )}
            </div>
            {/* Day bubble */}
            {engine && (
              <div
                className="shrink-0 h-16 w-16 rounded-2xl flex flex-col items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,228,236,0.5))",
                  boxShadow: "0 4px 12px rgba(233,78,119,0.10)",
                }}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-[#E94E77]/50">Dia</p>
                <p className="text-3xl font-black text-[#E94E77] leading-none">{engine.cycleDay}</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {engine && (
            <div className="space-y-1.5">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(233,78,119,0.08)" }}
              >
                <div
                  className="progress-bar-animated h-full rounded-full"
                  style={{
                    "--progress": `${engine.cycleProgress}%`,
                    width: `${engine.cycleProgress}%`,
                    background: "linear-gradient(90deg, #E94E77, #F06292)",
                    boxShadow: "0 0 8px rgba(233,78,119,0.30)",
                  } as any}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#E94E77]/40 font-black uppercase tracking-widest">
                <span>Dia 1</span>
                <span>{engine.cycleProgress.toFixed(0)}% concluído</span>
                <span>Fim</span>
              </div>
            </div>
          )}

          {/* Próximos eventos */}
          {engine && (
            <div className="flex gap-2.5">
              {engine.nextPeriodStr && (
                <div
                  className="flex-1 rounded-2xl p-3 space-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    boxShadow: "0 2px 8px rgba(233,78,119,0.06)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#E94E77]/50">
                    Próx. menstruação
                  </p>
                  <p className="text-sm font-black text-[#E94E77]">{formatShortDate(engine.nextPeriodStr)}</p>
                  {engine.daysUntilNextPeriod > 0 && (
                    <p className="text-[10px] text-[#AAAAAA]">em {engine.daysUntilNextPeriod} dias</p>
                  )}
                </div>
              )}
              {engine.ovulationDateStr && (
                <div
                  className="flex-1 rounded-2xl p-3 space-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    boxShadow: "0 2px 8px rgba(233,78,119,0.06)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#E94E77]/50">
                    Ovulação
                  </p>
                  <p className="text-sm font-black text-[#E94E77]">{formatShortDate(engine.ovulationDateStr)}</p>
                  <p className="text-[10px] text-[#AAAAAA]">estimada</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ 2. INSIGHT CONTEXTUAL ════ */}
        <div
          className="partner-card rounded-[22px] px-5 py-4 flex gap-3 items-start"
          style={{
            background: "linear-gradient(135deg, #FFF0F3, #FFFFFF)",
            boxShadow: "0 6px 16px rgba(233,78,119,0.06)",
          }}
        >
          <span className="text-xl shrink-0 mt-0.5">💡</span>
          <p className="text-sm text-[#777777] leading-relaxed font-medium">{hero.insight}</p>
        </div>

        {/* ════ 3. MÉTRICAS — como ela se sente ════ */}
        {isSignalsShared && hasSymptoms && (
          <div
            className="partner-card rounded-[22px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #FFE4EC, #FFFFFF)",
              boxShadow: "0 8px 20px rgba(233,78,119,0.07)",
            }}
          >
            <div className="px-5 py-3.5 border-b border-rose-50">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/60">Como ela se sente hoje</p>
              </div>
            </div>
            <div className="px-5 pb-2 pt-1">
              {energyVal !== null && ENERGY_META[energyVal] && (
                <MetricRow
                  label="Energia"
                  value={ENERGY_META[energyVal].label}
                  sub={ENERGY_META[energyVal].description}
                  intensity={ENERGY_META[energyVal].intensity}
                />
              )}
              {painVal !== null && PAIN_META[painVal] && (
                <MetricRow
                  label="Dor / Desconforto"
                  value={PAIN_META[painVal].label}
                  sub={PAIN_META[painVal].description}
                  intensity={PAIN_META[painVal].intensity as any}
                />
              )}
              {stressVal !== null && STRESS_META[stressVal] && (
                <MetricRow
                  label="Stress"
                  value={STRESS_META[stressVal].label}
                  intensity={STRESS_META[stressVal].intensity as any}
                />
              )}
              {s?.libido !== undefined && (
                <MetricRow
                  label="Libido"
                  value={
                    closestValue(s.libido, [2, 5, 9]) <= 2 ? "Baixo ❄️" :
                    closestValue(s.libido, [2, 5, 9]) <= 5 ? "Normal" : "Alto 🔥"
                  }
                  intensity="mid"
                />
              )}
            </div>
          </div>
        )}

        {/* ════ 4. SINTOMAS POR GRUPO ════ */}
        {isSignalsShared && activeGroups.length > 0 && (
          <div
            className="partner-card rounded-[22px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #FFF0F3, #FFFFFF)",
              boxShadow: "0 8px 20px rgba(233,78,119,0.07)",
            }}
          >
            <div className="px-5 py-3.5 border-b border-rose-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🌺</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/60">
                  Sintomas reportados
                </p>
              </div>
            </div>
            <div className="px-5 pb-4 pt-2 space-y-4">
              {activeGroups.map((group, gi) => (
                <div key={group.key} className={gi > 0 ? "pt-3 border-t border-rose-50" : ""}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{group.emoji}</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#AAAAAA]">
                      {group.label}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {group.active.map((item) => (
                      <SymptomItem key={item.key} label={item.label} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ 5. SONO ════ */}
        {isSignalsShared && (s?.sleep_hours || s?.sleep_quality) && (
          <div
            className="partner-card rounded-[22px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #F9F0FC, #FFFFFF)",
              boxShadow: "0 8px 20px rgba(233,78,119,0.06)",
            }}
          >
            <div className="px-5 py-3.5 border-b border-purple-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🌙</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/60">Sono</p>
              </div>
            </div>
            <div className="px-5 pb-2 pt-1">
              {s?.sleep_hours && (
                <MetricRow
                  label="Horas dormidas"
                  value={`${s.sleep_hours}h`}
                  sub={s.sleep_hours < 6 ? "Abaixo do recomendado" : undefined}
                  intensity={s.sleep_hours < 6 ? "high" : "mid"}
                />
              )}
              {s?.sleep_quality && (
                <MetricRow
                  label="Qualidade do sono"
                  value={SLEEP_QUALITY_LABELS[s.sleep_quality] ?? s.sleep_quality}
                  intensity={s.sleep_quality === "mau" ? "high" : s.sleep_quality === "bom" ? "none" : "mid"}
                />
              )}
            </div>
          </div>
        )}

        {/* ════ 6. CORRIMENTO ════ */}
        {isSignalsShared && s?.discharge_type && s.discharge_type !== "seco" && (
          <div
            className="partner-card rounded-[22px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #FFE4EC, #FFFFFF)",
              boxShadow: "0 8px 20px rgba(233,78,119,0.06)",
            }}
          >
            <div className="px-5 py-3.5 border-b border-rose-50">
              <div className="flex items-center gap-2">
                <span className="text-base">💧</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/60">Corrimento</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#AAAAAA]">Tipo</p>
                <p className="text-sm font-bold text-[#777777]">
                  {DISCHARGE_LABELS[s.discharge_type] ?? s.discharge_type}
                </p>
              </div>
              {s.discharge_type === "clara_de_ovo" && (
                <p className="text-[11px] text-[#F06292]/70 mt-2 leading-snug">
                  ✨ Indica proximidade da ovulação.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ════ 7. NOTAS ════ */}
        {isSignalsShared && s?.notes && (
          <div
            className="partner-card rounded-[22px] px-5 py-4"
            style={{
              background: "linear-gradient(135deg, #FFF6F8, #FFFFFF)",
              boxShadow: "0 6px 16px rgba(233,78,119,0.05)",
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/50 mb-2">
              📝 Nota do dia
            </p>
            <p className="text-sm text-[#777777] leading-relaxed italic">"{s.notes}"</p>
          </div>
        )}

        {/* ════ Sem sintomas (signals partilhados mas sem registo de hoje) ════ */}
        {isSignalsShared && !hasSymptoms && (
          <div
            className="partner-card rounded-[22px] py-10 text-center"
            style={{
              background: "linear-gradient(135deg, #FFF0F3, #FFFFFF)",
              boxShadow: "0 6px 16px rgba(233,78,119,0.05)",
            }}
          >
            <p className="text-3xl mb-3">🌸</p>
            <p className="text-sm text-[#AAAAAA] italic">Sem registo de sintomas hoje.</p>
          </div>
        )}

        {/* ════ Partilha limitada (summary) ════ */}
        {profile.share_level === "summary" && (
          <div
            className="partner-card rounded-[20px] px-5 py-4 flex gap-3 items-start"
            style={{
              background: "linear-gradient(135deg, #FFF6F8, #FFFFFF)",
              boxShadow: "0 4px 12px rgba(233,78,119,0.04)",
            }}
          >
            <Lock className="h-4 w-4 text-[#E94E77]/30 shrink-0 mt-0.5" />
            <p className="text-xs text-[#AAAAAA] leading-relaxed">
              A tua parceira partilhou apenas a fase e os eventos. Os sintomas diários não
              estão disponíveis neste nível de partilha.
            </p>
          </div>
        )}

        {/* ════ Rodapé ════ */}
        <p className="text-center text-[9px] text-[#CCCCCC] font-bold uppercase tracking-[0.2em] pb-2">
          🔒 Apenas o que ela escolheu partilhar
        </p>
      </div>
    </>
  );
}
