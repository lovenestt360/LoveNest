import {
  Lock, Moon, Zap, Droplets, FileText, Flower2, Droplet, Sprout, Sparkles,
  HeartHandshake, Shield, ShieldOff, ShieldAlert, ShieldCheck, Heart, Brain,
  Bone, BatteryLow, Frown, CircleDot, Shuffle, Flame, Waves, CloudRain, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatShortDate, formatLongDate } from "./engine";
import type { CycleData } from "./useCycleData";
import { cn } from "@/lib/utils";

// ── Paleta emocional por fase — espelha CycleToday
const PHASE_PALETTE: Record<string, {
  accent: string; quote: string; quoteBg: string; quoteBorder: string;
  dot: string; heroBg: string; heroGlow: string; bar: string;
}> = {
  menstrual: {
    accent: "text-rose-500", quote: "text-rose-600 dark:text-rose-300",
    quoteBg: "bg-gradient-to-br from-rose-50 to-rose-100/40 dark:from-rose-950/50 dark:to-rose-900/20",
    quoteBorder: "border-rose-200/70 dark:border-rose-800/40",
    dot: "bg-rose-400", heroBg: "from-rose-50/30 dark:from-rose-950/20",
    heroGlow: "rgba(244,63,94,0.12)", bar: "bg-rose-400",
  },
  folicular: {
    accent: "text-sky-500", quote: "text-sky-600 dark:text-sky-300",
    quoteBg: "bg-gradient-to-br from-sky-50 to-sky-100/40 dark:from-sky-950/50 dark:to-sky-900/20",
    quoteBorder: "border-sky-200/70 dark:border-sky-800/40",
    dot: "bg-sky-400", heroBg: "from-sky-50/30 dark:from-sky-950/20",
    heroGlow: "rgba(14,165,233,0.12)", bar: "bg-sky-400",
  },
  ovulacao: {
    accent: "text-emerald-500", quote: "text-emerald-600 dark:text-emerald-300",
    quoteBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/50 dark:to-emerald-900/20",
    quoteBorder: "border-emerald-200/70 dark:border-emerald-800/40",
    dot: "bg-emerald-400", heroBg: "from-emerald-50/30 dark:from-emerald-950/20",
    heroGlow: "rgba(16,185,129,0.12)", bar: "bg-emerald-400",
  },
  luteal: {
    accent: "text-violet-500", quote: "text-violet-600 dark:text-violet-300",
    quoteBg: "bg-gradient-to-br from-violet-50 to-violet-100/40 dark:from-violet-950/50 dark:to-violet-900/20",
    quoteBorder: "border-violet-200/70 dark:border-violet-800/40",
    dot: "bg-violet-400", heroBg: "from-violet-50/30 dark:from-violet-950/20",
    heroGlow: "rgba(139,92,246,0.12)", bar: "bg-violet-400",
  },
  sem_dados: {
    accent: "text-rose-400", quote: "text-rose-500 dark:text-rose-300",
    quoteBg: "bg-gradient-to-br from-rose-50/60 to-transparent dark:from-rose-950/30 dark:to-transparent",
    quoteBorder: "border-rose-200/50 dark:border-rose-800/30",
    dot: "bg-rose-300", heroBg: "from-rose-50/20 dark:from-rose-950/10",
    heroGlow: "rgba(244,63,94,0.08)", bar: "bg-rose-300",
  },
};

const CYCLE_RING_CIRCUMFERENCE = 2 * Math.PI * 44;

const PHASE_ICONS: Record<string, LucideIcon> = {
  menstrual: Droplet, folicular: Sprout, ovulacao: Sparkles, luteal: Moon, sem_dados: Flower2,
};

// Insights escritos na perspectiva do parceiro
const PHASE_INSIGHTS: Record<string, string> = {
  menstrual: "Ela está em período menstrual. Fadiga e sensibilidade emocional são comuns nesta fase — um gesto de carinho faz toda a diferença.",
  folicular: "A energia está a recuperar. É um bom momento para atividades a dois e conversas positivas.",
  ovulacao:  "Fase de ovulação: pico de energia e mood elevado. Ela tende a sentir-se mais comunicativa e conectada nestes dias.",
  luteal:    "Fase pré-menstrual. Podem surgir oscilações de humor e fadiga. Paciência e presença são o melhor apoio.",
  sem_dados: "A aguardar dados suficientes para gerar insights personalizados.",
};

const RISK_STYLES: Record<string, { text: string; bg: string; border: string; icon: LucideIcon }> = {
  alto:        { text: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30",       border: "border-red-200 dark:border-red-800",       icon: ShieldAlert },
  moderado:    { text: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", icon: Shield },
  baixo:       { text: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: ShieldCheck },
  sem_registo: { text: "text-muted-foreground", bg: "bg-muted", border: "border-border", icon: ShieldOff },
};

const PROTECTION_LABELS: Record<string, string> = {
  nenhum: "Sem prevenção", preservativo: "Preservativo", pilula: "Pílula", diu: "DIU", outro: "Outro",
};

const ENERGY_LABELS:   Record<number, string> = { 2: "Baixa", 5: "Normal", 9: "Alta" };
const PAIN_LABELS:     Record<number, string> = { 0: "Sem dor", 3: "Leve", 6: "Moderada", 9: "Intensa" };
const STRESS_LABELS:   Record<number, string> = { 0: "Calma", 4: "Normal", 8: "Muito stressada" };
const SLEEP_LABELS:    Record<string, string> = { mau: "Mau", ok: "Razoável", bom: "Bom" };

const SYMPTOM_GROUPS = [
  { key: "physical",  label: "Físico",    color: "text-rose-500",   chipBg: "bg-rose-50 dark:bg-rose-950/30",   chipBorder: "border-rose-200/60 dark:border-rose-800/40", items: [
    { key: "cramps",            label: "Cólicas",          icon: Zap },
    { key: "headache",          label: "Cabeça",           icon: Brain },
    { key: "back_pain",         label: "Lombar",           icon: Bone },
    { key: "fatigue",           label: "Fadiga",           icon: BatteryLow },
    { key: "nausea",            label: "Náusea",           icon: Frown },
    { key: "bloating",          label: "Inchaço",          icon: CircleDot },
    { key: "breast_tenderness", label: "Seios sensíveis",  icon: Heart },
  ]},
  { key: "emotional", label: "Emocional", color: "text-violet-500", chipBg: "bg-violet-50 dark:bg-violet-950/30", chipBorder: "border-violet-200/60 dark:border-violet-800/40", items: [
    { key: "mood_swings",  label: "Humor",     icon: Shuffle },
    { key: "irritability", label: "Irritável", icon: Flame },
    { key: "anxiety",      label: "Ansiedade", icon: Waves },
    { key: "sadness",      label: "Tristeza",  icon: CloudRain },
    { key: "sensitivity",  label: "Sensível",  icon: Heart },
  ]},
] as const;

function closest(val: number, opts: number[]) {
  return opts.reduce((p, c) => Math.abs(c - val) < Math.abs(p - val) ? c : p);
}

// Header de secção — marcador colorido + título escuro
function SectionHeader({ markerClass, children }: { markerClass: string; children: React.ReactNode }) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-border/40 flex items-center gap-2">
      <div className={cn("w-[3px] h-4 rounded-full shrink-0", markerClass)} />
      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">{children}</p>
    </div>
  );
}

// Linha de métrica com valor colorido
function MetricRow({ label, value, sub, valueClass = "text-foreground" }: {
  label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-right">
        <p className={cn("text-sm font-semibold", valueClass)}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function CyclePartnerView({ data }: { data: CycleData }) {
  const { engine, profile, todaySymptoms, openPeriod, pregnancyRisk, intimacyLogs } = data;

  if (!profile) {
    return (
      <div className="glass-card p-10 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center mx-auto">
          <Flower2 className="h-7 w-7 text-rose-400" strokeWidth={1.5} />
        </div>
        <p className="text-base font-semibold text-foreground">Ciclo não configurado</p>
        <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
          A tua parceira ainda não começou a acompanhar o ciclo menstrual.
        </p>
      </div>
    );
  }

  if (profile.share_level === "private") {
    return (
      <div className="glass-card p-10 text-center space-y-3">
        <div className="w-14 h-14 rounded-full border border-border bg-muted flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-base font-semibold text-foreground">Dados privados</p>
        <p className="text-sm text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
          A tua parceira não partilhou o ciclo. É o espaço dela.
        </p>
      </div>
    );
  }

  const phaseKey       = engine?.phase ?? "sem_dados";
  const palette        = PHASE_PALETTE[phaseKey] ?? PHASE_PALETTE.sem_dados;
  const PhaseIcon      = PHASE_ICONS[phaseKey] ?? Flower2;
  const s              = todaySymptoms as any;
  const isSignalsShared = profile.share_level === "summary_signals";

  const energyVal = s?.energy_level !== undefined ? closest(s.energy_level, [2, 5, 9]) : null;
  const painVal   = s?.pain_level   !== undefined ? closest(s.pain_level,   [0, 3, 6, 9]) : null;
  const stressVal = s?.stress       !== undefined ? closest(s.stress,       [0, 4, 8]) : null;

  const activeGroups = SYMPTOM_GROUPS.map(g => ({
    ...g, active: g.items.filter(item => s?.[item.key] === true),
  })).filter(g => g.active.length > 0);

  const ringAngle = ((engine?.cycleProgress ?? 0) / 100) * 2 * Math.PI;
  const ringDotX  = 50 + 44 * Math.sin(ringAngle);
  const ringDotY  = 50 - 44 * Math.cos(ringAngle);

  return (
    <div className="space-y-6">

      {/* ── Hero de fase — anel + badges, mesmo estilo que CycleToday ── */}
      <div className="glass-card relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 20% 50%, ${palette.heroGlow} 0%, transparent 70%)` }} />
        <div className="relative p-6 space-y-4">
          <div className="flex items-center gap-5">
            {/* Anel de progresso */}
            {engine ? (
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="currentColor" className="text-muted/40 dark:text-muted/25" />
                  <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" stroke="currentColor" strokeLinecap="round"
                    strokeDasharray={CYCLE_RING_CIRCUMFERENCE}
                    strokeDashoffset={CYCLE_RING_CIRCUMFERENCE * (1 - engine.cycleProgress / 100)}
                    className={cn("transition-all duration-700", palette.accent)} />
                </svg>
                <div className={cn("absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 animate-glow-pulse", palette.dot)}
                  style={{ left: `${ringDotX}%`, top: `${ringDotY}%` }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <PhaseIcon className={cn("h-5 w-5 mb-0.5", palette.accent)} strokeWidth={1.5} />
                  <span className="text-2xl font-bold text-foreground tabular-nums leading-none">{engine.cycleDay}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">de {engine.cycleLength}</span>
                </div>
              </div>
            ) : (
              <div className="h-24 w-24 shrink-0 rounded-full bg-muted/40 flex items-center justify-center">
                <PhaseIcon className="h-9 w-9 text-muted-foreground/40" strokeWidth={1.5} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Fase actual</p>
              <h2 className={cn("text-2xl font-bold tracking-tight", palette.accent)}>{engine?.phaseLabel ?? "A aguardar"}</h2>
              {engine && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {engine.daysUntilNextPeriod > 0 ? `${engine.daysUntilNextPeriod}d até menstruação` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {openPeriod && (
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/70 dark:border-rose-800/40 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400" />
                </span>
                Em período
              </span>
            )}
            {engine?.isInFertileWindow && (
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-200/70 dark:border-sky-800/40">Janela fértil</span>
            )}
            {engine?.isInPmsWindow && !openPeriod && (
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-500 border border-violet-200/70 dark:border-violet-800/40">TPM</span>
            )}
            {engine?.nextPeriodStr && (
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                Próx. {formatShortDate(engine.nextPeriodStr)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Quote de fase — mesmo card emocional que CycleToday ── */}
      <div className={cn("rounded-3xl border px-5 py-5", palette.quoteBg, palette.quoteBorder)}>
        <p className={cn("text-[15px] font-medium leading-relaxed", palette.quote)}>
          {PHASE_INSIGHTS[phaseKey]}
        </p>
        <div className="flex items-center gap-2 mt-3.5">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", palette.dot)} />
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em] opacity-60", palette.quote)}>
            {engine?.phaseLabel ?? "Ciclo"}
          </p>
        </div>
      </div>

      {/* ── Risco de gravidez ── */}
      {isSignalsShared && pregnancyRisk.level !== "sem_registo" && (() => {
        const riskStyle = RISK_STYLES[pregnancyRisk.level];
        const RiskIcon = riskStyle.icon;
        const recentLogs = intimacyLogs.slice(0, 5);
        return (
          <div className="glass-card overflow-hidden">
            <SectionHeader markerClass="bg-pink-400/80">Prevenção e risco</SectionHeader>
            <div className="p-5 space-y-4">
              <div className={cn("flex items-start gap-3 rounded-2xl border p-3.5", riskStyle.border, riskStyle.bg)}>
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", riskStyle.bg)}>
                  <RiskIcon className={cn("h-4 w-4", riskStyle.text)} strokeWidth={1.5} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", riskStyle.text)}>{pregnancyRisk.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{pregnancyRisk.description}</p>
                </div>
              </div>
              {recentLogs.length > 0 && (
                <div className="divide-y divide-border/40">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-muted-foreground">{formatLongDate(log.day_key)}</span>
                      <span className="text-sm font-semibold text-pink-500">{PROTECTION_LABELS[log.protection_method] ?? log.protection_method}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                Estimativa informativa — não substitui um método contracetivo nem aconselhamento médico.
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Como ela se sente hoje ── */}
      {isSignalsShared && s && (
        <div className="glass-card overflow-hidden">
          <SectionHeader markerClass="bg-gradient-to-b from-rose-400 to-violet-400">Como ela se sente hoje</SectionHeader>
          <div className="px-5 pb-2 pt-1">
            {energyVal !== null && (
              <MetricRow label="Energia" value={ENERGY_LABELS[energyVal] ?? "—"}
                valueClass={energyVal <= 2 ? "text-orange-500" : energyVal >= 9 ? "text-emerald-500" : "text-foreground"} />
            )}
            {painVal !== null && (
              <MetricRow label="Dor" value={PAIN_LABELS[painVal] ?? "—"}
                sub={painVal >= 6 ? "Ela pode precisar de apoio extra" : undefined}
                valueClass={painVal >= 6 ? "text-rose-500" : "text-foreground"} />
            )}
            {stressVal !== null && (
              <MetricRow label="Stress" value={STRESS_LABELS[stressVal] ?? "—"}
                valueClass={stressVal >= 8 ? "text-fuchsia-500" : "text-foreground"} />
            )}
            {s?.libido !== undefined && (
              <MetricRow label="Libido" value={
                closest(s.libido, [2, 5, 9]) <= 2 ? "Baixo" :
                closest(s.libido, [2, 5, 9]) <= 5 ? "Normal" : "Alto"
              } valueClass="text-pink-500" />
            )}
            {s?.sleep_hours && (
              <MetricRow label="Sono"
                value={`${s.sleep_hours}h — ${SLEEP_LABELS[s?.sleep_quality] ?? s.sleep_quality ?? ""}`}
                sub={s.sleep_hours < 6 ? "Abaixo do recomendado" : undefined}
                valueClass={s.sleep_hours < 6 ? "text-rose-500" : "text-indigo-500"} />
            )}
          </div>
        </div>
      )}

      {/* ── Sintomas ── chips com cor da categoria ── */}
      {isSignalsShared && activeGroups.length > 0 && (
        <div className="glass-card overflow-hidden">
          <SectionHeader markerClass="bg-rose-400/80">Sintomas de hoje</SectionHeader>
          <div className="p-5 space-y-5">
            {activeGroups.map((group) => (
              <div key={group.key} className="space-y-2.5">
                <p className={cn("text-[11px] font-bold uppercase tracking-widest", group.color)}>{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.active.map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-medium", group.chipBg, group.chipBorder, group.color)}>
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notas ── */}
      {isSignalsShared && s?.notes && (
        <div className="rounded-3xl border border-rose-200/50 dark:border-rose-800/30 bg-rose-50/40 dark:bg-rose-950/20 p-5 flex gap-3 items-start">
          <FileText className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed italic">"{s.notes}"</p>
        </div>
      )}

      {/* ── Aviso menstruação em período com dor ── */}
      {openPeriod && painVal !== null && painVal >= 6 && (
        <div className="rounded-2xl border border-rose-200/70 dark:border-rose-800/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3.5 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-muted-foreground leading-relaxed">Ela está com dor significativa durante o período. Um gesto de carinho pode fazer muita diferença hoje.</p>
        </div>
      )}

      {/* ── Sem registo hoje ── */}
      {isSignalsShared && !s && (
        <div className="glass-card py-10 text-center space-y-2">
          <Flower2 className="h-8 w-8 mx-auto text-rose-300" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Sem registo de hoje ainda.</p>
        </div>
      )}

      {/* ── Partilha limitada ── */}
      {profile.share_level === "summary" && (
        <div className="glass-card p-5 flex gap-3 items-start">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            A tua parceira partilhou apenas a fase e os eventos. Os sintomas diários não estão disponíveis.
          </p>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/60 font-medium pb-2">
        Apenas o que ela escolheu partilhar
      </p>

    </div>
  );
}
