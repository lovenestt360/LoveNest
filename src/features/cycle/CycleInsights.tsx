import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Heart, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// PREMIUM PINK — todos os insights usam
// variações de rosa/neutro. Sem verde, roxo, âmbar.
// ─────────────────────────────────────────────

const PARTNER_PHASE_CONFIG: Record<string, {
  message: string;
  emoji: string;
}> = {
  Menstruação: {
    emoji: "🌹",
    message: "Ela pode estar mais sensível hoje — um abraço vale mais do que mil palavras 💖",
  },
  Lútea: {
    emoji: "💜",
    message: "Fase pré-menstrual — um pouco mais de paciência e atenção faz toda a diferença 🤍",
  },
  Folicular: {
    emoji: "🌸",
    message: "Ela está com energia em alta — bom momento para planos a dois! ✨",
  },
  Ovulação: {
    emoji: "✨",
    message: "Alta energia e conexão — ela está no melhor momento do ciclo! 🌸",
  },
};

export function CycleInsights({ data }: { data: CycleData }) {
  const { isMale, engine } = data;

  if (!engine) return null;

  const { phaseLabel, insights, daysUntilNextPeriod, isInFertileWindow } = engine;

  // ── Vista do PARCEIRO ──────────────────────────────────
  if (isMale) {
    const config = PARTNER_PHASE_CONFIG[phaseLabel] ?? {
      emoji: "💗",
      message: "Mantém o apoio e a compreensão — é sempre o momento certo 🤍",
    };

    return (
      <div className="rounded-2xl border border-[#F8BBD0]/40 bg-[#FADADD]/20 px-5 py-4 flex items-start gap-3 shadow-sm">
        <span className="text-xl shrink-0">{config.emoji}</span>
        <p className="text-sm font-medium leading-relaxed text-[#E94E77]">
          {config.message}
        </p>
      </div>
    );
  }

  // ── Vista da OWNER ─────────────────────────────────────
  const primaryInsight = insights[0];
  const urgentAlerts = insights.slice(1);

  // Alerta urgente: próxima menstruação ≤ 3 dias
  const isUrgent = daysUntilNextPeriod <= 3 && daysUntilNextPeriod >= 0;

  return (
    <div className="space-y-2">
      {/* Insight principal — rosa suave */}
      <div className="rounded-2xl border border-[#F8BBD0]/50 bg-[#FADADD]/25 px-5 py-4 flex items-start gap-3 shadow-sm">
        <Sparkles className="h-4 w-4 text-[#E94E77] shrink-0 mt-0.5" />
        <div className="space-y-0.5 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]/60">{phaseLabel}</p>
          <p className="text-sm leading-relaxed text-[#777777]">{primaryInsight}</p>
        </div>
      </div>

      {/* Alertas contextuais — todos em tons de pink/neutro */}
      {urgentAlerts.map((alert, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl border px-4 py-3 flex items-center gap-2.5 shadow-sm",
            isUrgent
              ? "border-[#E94E77]/20 bg-[#FADADD]/30"      // próx. menstruação: pink mais forte
              : "border-[#F8BBD0]/30 bg-[#F5F5F5]/60"     // outros: neutro suave
          )}
        >
          <AlertCircle className={cn(
            "h-4 w-4 shrink-0",
            isUrgent ? "text-[#E94E77]" : "text-[#777777]/50"
          )} />
          <p className={cn(
            "text-xs font-medium leading-snug",
            isUrgent ? "text-[#E94E77]" : "text-[#777777]"
          )}>
            {alert}
          </p>
        </div>
      ))}
    </div>
  );
}
