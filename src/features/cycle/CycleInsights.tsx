import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Heart, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CycleData } from "./useCycleData";

// ── Mapeamento de fase para ícone/cores (parceiro masculino)
const PARTNER_PHASE_CONFIG: Record<string, {
  message: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
}> = {
  Menstruação: {
    message: "Ela pode estar mais sensível hoje — um abraço vale mais do que mil palavras 💗",
    icon: <Heart className="h-5 w-5 text-pink-500 fill-pink-500/20" />,
    bg: "bg-pink-500/5",
    border: "border-pink-500/10",
  },
  Lútea: {
    message: "Fase lútea — um pouco mais de paciência e atenção fazem toda a diferença 💜",
    icon: <Heart className="h-5 w-5 text-purple-400" />,
    bg: "bg-purple-400/5",
    border: "border-purple-400/10",
  },
  Folicular: {
    message: "Ela está com energia em alta — bom momento para planos a dois! ✨",
    icon: <Sparkles className="h-5 w-5 text-green-500" />,
    bg: "bg-green-500/5",
    border: "border-green-500/10",
  },
  Ovulação: {
    message: "Alta energia e conexão — ela está no melhor momento do ciclo! ⭐",
    icon: <Sparkles className="h-5 w-5 text-amber-500" />,
    bg: "bg-amber-500/5",
    border: "border-amber-500/10",
  },
};

export function CycleInsights({ data }: { data: CycleData }) {
  const { isMale, engine } = data;

  // Sem dados do engine — nada a mostrar
  if (!engine) return null;

  const { phaseLabel, insights, daysUntilNextPeriod, isInPeriod, isInFertileWindow } = engine;

  // ── Vista do PARCEIRO (homem)
  if (isMale) {
    const config = PARTNER_PHASE_CONFIG[phaseLabel] ?? {
      message: "Mantém o apoio e a compreensão — é sempre o momento certo 💛",
      icon: <Info className="h-5 w-5 text-blue-500" />,
      bg: "bg-blue-500/5",
      border: "border-blue-500/10",
    };

    return (
      <Card className={cn("border shadow-sm overflow-hidden", config.bg, config.border)}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">{config.icon}</div>
          <p className="text-sm font-medium leading-snug text-foreground/90">
            {config.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Vista da UTILIZADORA (mulher)
  // Exibe o primeiro insight do engine + alertas urgentes
  const primaryInsight = insights[0];
  const urgentAlerts = insights.slice(1); // alertas de dias até menstruação, janela fértil, etc.

  return (
    <div className="space-y-2">
      {/* Insight principal da fase */}
      <Card className="border border-amber-500/10 bg-amber-500/5 shadow-sm overflow-hidden">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-semibold text-foreground/90">{phaseLabel}</p>
            <p className="text-sm text-foreground/70 leading-snug">{primaryInsight}</p>
          </div>
        </CardContent>
      </Card>

      {/* Alertas contextuais */}
      {urgentAlerts.map((alert, i) => (
        <Card key={i} className={cn(
          "border shadow-sm overflow-hidden",
          daysUntilNextPeriod <= 3 && daysUntilNextPeriod >= 0
            ? "border-red-500/15 bg-red-500/5"
            : isInFertileWindow
              ? "border-green-500/15 bg-green-500/5"
              : "border-purple-500/15 bg-purple-500/5",
        )}>
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertCircle className={cn(
              "h-4 w-4 shrink-0",
              daysUntilNextPeriod <= 3 && daysUntilNextPeriod >= 0
                ? "text-red-500"
                : isInFertileWindow
                  ? "text-green-500"
                  : "text-purple-500",
            )} />
            <p className="text-xs font-medium text-foreground/80">{alert}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
