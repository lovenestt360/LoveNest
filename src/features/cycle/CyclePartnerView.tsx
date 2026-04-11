import { cn } from "@/lib/utils";
import { Lock, Heart, Calendar, Sparkles, TrendingUp } from "lucide-react";
import { formatShortDate } from "./engine";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// DESIGN SYSTEM — Phases for partner view
// ─────────────────────────────────────────────

const PHASE_STYLES: Record<string, {
  gradient: string;
  border: string;
  accent: string;
  pill: string;
  emoji: string;
  description: string;
  tip: string;
}> = {
  menstrual: {
    gradient: "bg-gradient-to-br from-rose-50 via-pink-50/60 to-rose-100/40 dark:from-rose-950/30 dark:to-rose-900/10",
    border: "border-rose-100/60 dark:border-rose-900/30",
    accent: "text-rose-500 dark:text-rose-400",
    pill: "bg-rose-100/90 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
    emoji: "🌹",
    description: "Ela está em período menstrual.",
    tip: "É um bom momento para mostrar carinho e cuidado extra. 💛",
  },
  folicular: {
    gradient: "bg-gradient-to-br from-sky-50 via-blue-50/50 to-cyan-50/40 dark:from-sky-950/20 dark:to-sky-900/10",
    border: "border-sky-100/60 dark:border-sky-900/30",
    accent: "text-sky-500 dark:text-sky-400",
    pill: "bg-sky-100/80 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
    emoji: "🌱",
    description: "Fase folicular — energia a recuperar.",
    tip: "Ela tende a sentir-se mais enérgica e bem-disposta. ✨",
  },
  ovulacao: {
    gradient: "bg-gradient-to-br from-emerald-50 via-green-50/50 to-teal-50/40 dark:from-emerald-950/20 dark:to-emerald-900/10",
    border: "border-emerald-100/60 dark:border-emerald-900/30",
    accent: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    emoji: "✨",
    description: "Janela fértil — fase de pico.",
    tip: "Mood elevado, comunicação fluida. Bom momento para estar juntos. 💚",
  },
  luteal: {
    gradient: "bg-gradient-to-br from-purple-50 via-violet-50/50 to-fuchsia-50/40 dark:from-purple-950/20 dark:to-purple-900/10",
    border: "border-purple-100/60 dark:border-purple-900/30",
    accent: "text-purple-500 dark:text-purple-400",
    pill: "bg-purple-100/80 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
    emoji: "💜",
    description: "Fase lútea — pode haver TPM.",
    tip: "Ela pode precisar de mais compreensão e espaço nesta fase. 🤍",
  },
  sem_dados: {
    gradient: "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-900/10",
    border: "border-slate-100/60",
    accent: "text-slate-400",
    pill: "bg-slate-100 text-slate-500",
    emoji: "🌸",
    description: "A aguardar dados do ciclo.",
    tip: "",
  },
};

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: "🌹",
  folicular: "🌱",
  ovulacao: "✨",
  luteal: "💜",
  sem_dados: "🌸",
};

// ─────────────────────────────────────────────
// HELPER: sintomas ativos formatados
// ─────────────────────────────────────────────

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cólicas", headache: "Cabeça", nausea: "Náusea",
  back_pain: "Lombar", fatigue: "Fadiga", dizziness: "Tontura",
  mood_swings: "Humor variável", irritability: "Irritabilidade",
  anxiety: "Ansiedade", sadness: "Tristeza", bloating: "Inchaço",
  breast_tenderness: "Sensibilidade", weakness: "Fraqueza",
};

function getActiveSymptomsLabel(todaySymptoms: any): string[] {
  if (!todaySymptoms) return [];
  return Object.entries(SYMPTOM_LABELS)
    .filter(([k]) => todaySymptoms[k] === true)
    .map(([, v]) => v);
}

// ─────────────────────────────────────────────
// MINI STAT CARD
// ─────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 p-3.5 space-y-0.5 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className="text-lg font-black leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN: CyclePartnerView
// ─────────────────────────────────────────────

export function CyclePartnerView({ data }: { data: CycleData }) {
  const { engine, profile, todaySymptoms, openPeriod } = data;

  // ── Sem perfil → parceira ainda não configurou
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center shadow-sm">
          <span className="text-3xl">🌸</span>
        </div>
        <div className="space-y-1.5 max-w-[260px]">
          <p className="font-black text-foreground/80">Ciclo ainda não configurado</p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            A tua parceira ainda não começou a acompanhar o ciclo menstrual.
          </p>
        </div>
      </div>
    );
  }

  // ── Privacidade: partilha desativada
  if (profile.share_level === "private") {
    return (
      <div className="rounded-[28px] border border-dashed border-rose-200/50 bg-rose-50/30 dark:bg-rose-950/10 p-8 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-rose-100/60 flex items-center justify-center">
          <Lock className="h-5 w-5 text-rose-400" />
        </div>
        <p className="font-black text-foreground/70">Dados privados</p>
        <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-[240px] mx-auto">
          A tua parceira não partilhou o ciclo. É o espaço dela. 🤍
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const style = PHASE_STYLES[phaseKey] ?? PHASE_STYLES.sem_dados;
  const activeSymptoms = getActiveSymptomsLabel(todaySymptoms);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header de contexto ── */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-200 to-pink-200 flex items-center justify-center shadow-sm">
          <Heart className="h-4 w-4 text-rose-500" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">A seguir o ciclo de</p>
          <p className="text-sm font-black text-foreground/80">A tua parceira 💛</p>
        </div>
      </div>

      {/* ── Hero Card: Fase atual ── */}
      {engine ? (
        <div className={cn(
          "rounded-[32px] border p-6 space-y-5 shadow-lg transition-all duration-500",
          style.gradient, style.border
        )}>
          {/* Phase + Day */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                Fase actual
              </p>
              <h2 className={cn("text-2xl font-black tracking-tight", style.accent)}>
                {PHASE_EMOJIS[phaseKey]} {engine.phaseLabel}
              </h2>
              <p className="text-sm text-muted-foreground/60 font-medium">{style.description}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">Dia</p>
              <p className={cn("text-4xl font-black leading-none tracking-tighter", style.accent)}>
                {engine.cycleDay}
              </p>
              <p className="text-[10px] text-muted-foreground/40 font-bold">do ciclo</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-2 rounded-full overflow-hidden bg-white/40 dark:bg-black/20">
              <div
                className={cn("h-full rounded-full transition-all duration-1000 ease-out",
                  phaseKey === "menstrual" ? "bg-gradient-to-r from-rose-300 to-rose-400" :
                  phaseKey === "ovulacao"  ? "bg-gradient-to-r from-emerald-300 to-teal-400" :
                  phaseKey === "luteal"    ? "bg-gradient-to-r from-purple-300 to-violet-400" :
                                             "bg-gradient-to-r from-sky-300 to-sky-400"
                )}
                style={{ width: `${engine.cycleProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/40 font-bold">
              {engine.cycleProgress.toFixed(0)}% do ciclo concluído
            </p>
          </div>

          {/* Status pills */}
          <div className="flex gap-2 flex-wrap">
            {engine.isInPeriod && (
              <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold", style.pill)}>
                🩸 Em período
              </span>
            )}
            {engine.isInFertileWindow && (
              <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold", style.pill)}>
                🌿 Janela fértil
              </span>
            )}
            {engine.isInPmsWindow && !engine.isInPeriod && (
              <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold", style.pill)}>
                💜 TPM
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[32px] bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 border border-rose-100/40 p-8 text-center space-y-2">
          <p className="text-5xl">🌸</p>
          <p className="font-black text-rose-600">A aguardar dados do ciclo</p>
          <p className="text-xs text-rose-400/60">O ciclo ainda não tem registos suficientes.</p>
        </div>
      )}

      {/* ── Partner tip ── */}
      {style.tip && (
        <div className="rounded-2xl border border-amber-100/50 bg-gradient-to-br from-amber-50/60 to-yellow-50/40 px-4 py-4 flex gap-3 items-start">
          <span className="text-xl shrink-0">💡</span>
          <p className="text-sm text-amber-700/80 dark:text-amber-300/70 font-medium leading-relaxed">
            {style.tip}
          </p>
        </div>
      )}

      {/* ── Stats: Próximos eventos ── */}
      {engine && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Próximos eventos
          </p>
          <div className="flex gap-2.5">
            {engine.nextPeriodStr && (
              <StatCard
                label="Próx. menstruação"
                value={formatShortDate(engine.nextPeriodStr)}
                sub={engine.daysUntilNextPeriod > 0 ? `em ${engine.daysUntilNextPeriod} dias` : "Em breve"}
              />
            )}
            {engine.ovulationDateStr && (
              <StatCard
                label="Ovulação"
                value={formatShortDate(engine.ovulationDateStr)}
                sub="estimada"
              />
            )}
          </div>
          {engine.fertileStartStr && engine.fertileEndStr && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 to-green-50/40 border border-emerald-100/40 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Janela fértil</p>
              </div>
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {formatShortDate(engine.fertileStartStr)} – {formatShortDate(engine.fertileEndStr)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Sintomas hoje (se partilhados) ── */}
      {profile.share_level === "summary_signals" && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-rose-300" /> Como ela se sente hoje
          </p>
          {todaySymptoms ? (
            <div className="rounded-[24px] border border-border/25 bg-white/60 dark:bg-card/50 backdrop-blur-sm p-5 space-y-4">
              {/* Energy / Pain resumo */}
              <div className="flex gap-3">
                {(todaySymptoms as any)?.energy_level !== undefined && (
                  <div className="flex-1 rounded-2xl bg-gradient-to-b from-amber-50 to-yellow-50/50 border border-amber-100/40 p-3 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/70 mb-1">Energia</p>
                    <p className="text-xl font-black">
                      {(todaySymptoms as any).energy_level <= 3 ? "💤 Baixa" :
                       (todaySymptoms as any).energy_level <= 6 ? "⚡ Normal" : "🚀 Alta"}
                    </p>
                  </div>
                )}
                {(todaySymptoms as any)?.pain_level > 0 && (
                  <div className="flex-1 rounded-2xl bg-gradient-to-b from-rose-50 to-pink-50/50 border border-rose-100/40 p-3 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-400/70 mb-1">Desconforto</p>
                    <p className="text-xl font-black">
                      {(todaySymptoms as any).pain_level <= 3 ? "😊 Leve" :
                       (todaySymptoms as any).pain_level <= 6 ? "😣 Moderado" : "🤯 Intenso"}
                    </p>
                  </div>
                )}
              </div>

              {/* Sintomas ativos */}
              {activeSymptoms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground/50">A sentir hoje</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSymptoms.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100/50 text-[11px] font-bold text-rose-500">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas (se existirem) */}
              {(todaySymptoms as any)?.notes && (
                <p className="text-sm text-muted-foreground/70 italic leading-relaxed border-t border-border/20 pt-3">
                  "{(todaySymptoms as any).notes}"
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/20 bg-muted/20 py-6 text-center">
              <p className="text-sm text-muted-foreground/50">Sem registo de sintomas hoje.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Período em curso ── */}
      {openPeriod && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/60 border border-rose-100/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-300">Período em curso</p>
              <p className="text-xs text-muted-foreground/60">
                Desde {new Date(openPeriod.start_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
              </p>
            </div>
          </div>
          <TrendingUp className="h-4 w-4 text-rose-400" />
        </div>
      )}

      {/* ── Nota de privacidade ── */}
      <p className="text-center text-[10px] text-muted-foreground/30 font-medium px-4">
        🔒 Estás a ver apenas o que a tua parceira escolheu partilhar.
      </p>
    </div>
  );
}
