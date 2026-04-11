import { cn } from "@/lib/utils";
import { Lock, Heart, Calendar, Sparkles, TrendingUp } from "lucide-react";
import { formatShortDate } from "./engine";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// DESIGN SYSTEM — Premium Pink Palette
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
    gradient: "bg-gradient-to-br from-[#FFFFFF] to-[#FADADD] dark:from-rose-950/30 dark:to-rose-900/10",
    border: "border-[#F8BBD0] dark:border-rose-900/30",
    accent: "text-[#E94E77]",
    pill: "bg-[#FADADD] text-[#E94E77] font-black",
    emoji: "🌹",
    description: "Ela está em período menstrual.",
    tip: "É um bom momento para mostrar carinho e cuidado extra. 💖",
  },
  folicular: {
    gradient: "bg-gradient-to-br from-[#FFFFFF] to-rose-50/50 dark:from-sky-950/20 dark:to-sky-900/10",
    border: "border-[#F8BBD0]/50",
    accent: "text-[#F06292]",
    pill: "bg-rose-50 text-[#F06292] font-black",
    emoji: "🌱",
    description: "Fase folicular — energia a recuperar.",
    tip: "Ela tende a sentir-se mais enérgica e bem-disposta. ✨",
  },
  ovulacao: {
    gradient: "bg-gradient-to-br from-[#FFFFFF] to-emerald-50/30 dark:from-emerald-950/20 dark:to-emerald-900/10",
    border: "border-emerald-100/40",
    accent: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-50 text-emerald-700 font-black",
    emoji: "✨",
    description: "Janela fértil — fase de pico.",
    tip: "Mood elevado, comunicação fluida. Bom momento para estar juntos. 💝",
  },
  luteal: {
    gradient: "bg-gradient-to-br from-[#FFFFFF] to-[#FADADD]/30 dark:from-purple-950/20 dark:to-purple-900/10",
    border: "border-[#F8BBD0]/40",
    accent: "text-[#E94E77]/80",
    pill: "bg-rose-50 text-rose-400 font-black",
    emoji: "💜",
    description: "Fase lútea — pode haver TPM.",
    tip: "Ela pode precisar de mais compreensão e espaço nesta fase. 🤍",
  },
  sem_dados: {
    gradient: "bg-gradient-to-br from-white to-[#F5F5F5]",
    border: "border-slate-100",
    accent: "text-[#777777]",
    pill: "bg-slate-100 text-[#777777]",
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

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: any }) {
  return (
    <div className="flex-1 rounded-2xl bg-white border border-[#F8BBD0]/30 p-3.5 space-y-0.5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3 w-3 text-[#E94E77]/60" />}
        <p className="text-[9px] font-black uppercase tracking-widest text-[#777777]/60">{label}</p>
      </div>
      <p className="text-lg font-black leading-none text-[#E94E77]">{value}</p>
      {sub && <p className="text-[10px] text-[#777777]/60">{sub}</p>}
    </div>
  );
}

export function CyclePartnerView({ data }: { data: CycleData }) {
  const { engine, profile, todaySymptoms, openPeriod } = data;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-[#FADADD] flex items-center justify-center shadow-sm">
          <span className="text-3xl">🌸</span>
        </div>
        <div className="space-y-1.5 max-w-[260px]">
          <p className="font-black text-[#E94E77]">Ciclo ainda não configurado</p>
          <p className="text-sm text-[#777777] leading-relaxed">
            A tua parceira ainda não começou a acompanhar o ciclo menstrual.
          </p>
        </div>
      </div>
    );
  }

  if (profile.share_level === "private") {
    return (
      <div className="rounded-[28px] border border-dashed border-[#F8BBD0] bg-[#FADADD]/20 p-8 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#FADADD]/60 flex items-center justify-center">
          <Lock className="h-5 w-5 text-[#E94E77]/60" />
        </div>
        <p className="font-black text-[#E94E77]">Dados privados</p>
        <p className="text-sm text-[#777777] leading-relaxed max-w-[240px] mx-auto">
          A tua parceira não partilhou o ciclo. É o espaço dela. 🤍
        </p>
      </div>
    );
  }

  const phaseKey = engine?.phase ?? "sem_dados";
  const style = PHASE_STYLES[phaseKey] ?? PHASE_STYLES.sem_dados;
  
  const getActiveSymptoms = (s: any) => {
    const labels: Record<string, string> = {
      cramps: "Cólicas", headache: "Cabeça", fatigue: "Fadiga", irritability: "Irritabilidade",
      mood_swings: "Humor", anxiety: "Ansiedade", bloating: "Inchaço", weakness: "Fraqueza"
    };
    if (!s) return [];
    return Object.entries(labels).filter(([k]) => s[k]).map(([, v]) => v);
  };
  
  const activeSymptoms = getActiveSymptoms(todaySymptoms);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="h-8 w-8 rounded-full bg-[#FADADD] flex items-center justify-center shadow-sm">
          <Heart className="h-4 w-4 text-[#E94E77]" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#777777]/50">A seguir o ciclo de</p>
          <p className="text-sm font-black text-[#E94E77]">A tua parceira 💖</p>
        </div>
      </div>

      {/* ── Hero Card ── */}
      {engine ? (
        <div className={cn(
          "rounded-[32px] border p-6 space-y-5 shadow-lg transition-all duration-500",
          style.gradient, style.border
        )}>
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777777]/50">
                Fase actual
              </p>
              <h2 className={cn("text-2xl font-black tracking-tight", style.accent)}>
                {PHASE_EMOJIS[phaseKey]} {engine.phaseLabel}
              </h2>
              <p className="text-sm text-[#777777] font-medium">{style.description}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777777]/50">Dia</p>
              <p className={cn("text-4xl font-black leading-none tracking-tighter", style.accent)}>
                {engine.cycleDay}
              </p>
              <p className="text-[10px] text-[#777777]/40 font-bold uppercase tracking-widest">ciclo</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 rounded-full overflow-hidden bg-[#F5F5F5] dark:bg-black/20">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-[#E94E77] to-[#F06292]"
                style={{ width: `${engine.cycleProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-[#777777]/40 font-bold uppercase tracking-widest">
              {engine.cycleProgress.toFixed(0)}% concluído
            </p>
          </div>

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
                ✨ TPM
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[32px] bg-gradient-to-br from-white to-[#FADADD]/30 border border-[#F8BBD0]/40 p-8 text-center space-y-2 shadow-sm">
          <p className="text-5xl">🌸</p>
          <p className="font-black text-[#E94E77]">A aguardar dados do ciclo</p>
          <p className="text-xs text-[#777777]/60">O ciclo ainda não tem registos suficientes.</p>
        </div>
      )}

      {/* ── Partner tip (Soft Pink) ── */}
      {style.tip && (
        <div className="rounded-2xl border border-[#F8BBD0]/40 bg-[#FADADD]/30 px-4 py-4 flex gap-3 items-start shadow-sm transition-all hover:bg-[#FADADD]/40">
          <span className="text-xl shrink-0">✨</span>
          <p className="text-sm text-[#E94E77] font-medium leading-relaxed">
            {style.tip}
          </p>
        </div>
      )}

      {/* ── Stats ── */}
      {engine && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/50 px-1 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Próximos eventos
          </p>
          <div className="flex gap-2.5">
            {engine.nextPeriodStr && (
              <StatCard
                label="Próx. menstruação"
                value={formatShortDate(engine.nextPeriodStr)}
                sub={engine.daysUntilNextPeriod > 0 ? `em ${engine.daysUntilNextPeriod} dias` : "Hoje"}
                icon={TrendingUp}
              />
            )}
            {engine.ovulationDateStr && (
              <StatCard
                label="Ovulação prevista"
                value={formatShortDate(engine.ovulationDateStr)}
                icon={Sparkles}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Sintomas ── */}
      {profile.share_level === "summary_signals" && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#777777]/50 px-1 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Como ela se sente hoje
          </p>
          {todaySymptoms ? (
            <div className="rounded-[24px] border border-[#F8BBD0]/30 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex gap-3">
                {(todaySymptoms as any)?.energy_level !== undefined && (
                  <div className="flex-1 rounded-2xl bg-[#F5F5F5] border border-slate-100 p-3 text-center transition-all hover:bg-white hover:border-[#F8BBD0]/40 active:scale-95">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#777777]/60 mb-1">Energia</p>
                    <p className="text-lg font-black text-[#E94E77]">
                      {(todaySymptoms as any).energy_level <= 3 ? "低💤" :
                       (todaySymptoms as any).energy_level <= 6 ? "中⚡" : "高🚀"}
                    </p>
                  </div>
                )}
                {(todaySymptoms as any)?.pain_level > 0 && (
                  <div className="flex-1 rounded-2xl bg-[#FADADD]/20 border border-[#F8BBD0]/30 p-3 text-center transition-all hover:bg-white hover:border-[#F8BBD0]/40 active:scale-95">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#E94E77]/60 mb-1">Conforto</p>
                    <p className="text-lg font-black text-[#E94E77]">
                      {(todaySymptoms as any).pain_level <= 3 ? "😊" :
                       (todaySymptoms as any).pain_level <= 6 ? "😣" : "🤯"}
                    </p>
                  </div>
                )}
              </div>

              {activeSymptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeSymptoms.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-[#FADADD]/40 border border-[#F8BBD0]/50 text-[10px] font-black uppercase tracking-widest text-[#E94E77]">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-6 text-center shadow-sm">
              <p className="text-sm text-[#777777]/50 italic">Sem registo de sintomas hoje.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Nota final ── */}
      <p className="text-center text-[10px] text-[#777777]/40 font-bold uppercase tracking-widest px-4">
        🔒 Visualização Premium Pink · Encriptado
      </p>
    </div>
  );
}
