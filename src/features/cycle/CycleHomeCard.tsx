import { useNavigate } from "react-router-dom";
import { ChevronRight, Droplet, Flower2, Moon, Sparkles, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate, runCycleEngineFromProfile } from "./engine";
import { useCycleData } from "./useCycleData";
import { PHASE_INSIGHTS } from "./CyclePartnerView";

// Versão compacta do topo do ecrã do Ciclo (CycleToday / CyclePartnerView):
// o mesmo anel com o ícone da fase e o dia, "Fase actual" com o nome a cor,
// a frase da fase e os selos — para a Home dizer o mesmo que o Ciclo diz.

const PHASE_ACCENT: Record<string, string> = {
  menstrual: "text-rose-500",
  folicular: "text-sky-500",
  ovulacao:  "text-emerald-500",
  luteal:    "text-violet-500",
  sem_dados: "text-muted-foreground",
};

const PHASE_ICONS: Record<string, LucideIcon> = {
  menstrual: Droplet,
  folicular: Sprout,
  ovulacao:  Sparkles,
  luteal:    Moon,
  sem_dados: Flower2,
};

const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

const CARD =
  "w-full overflow-hidden rounded-[1.4rem] bg-card text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_8px_22px_-14px_rgba(11,19,36,0.14)] active:scale-[0.99] transition-transform dark:border dark:border-border/60";

const CHIP = "rounded-full border px-2 py-0.5 text-[10px] font-medium";

// Primeira frase — o texto do parceiro é longo para a Home.
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

export function CycleHomeCard({ partnerName }: { partnerName?: string | null }) {
  const navigate = useNavigate();
  const { profile, lastPeriod, isMale, loading } = useCycleData();

  if (loading) return null;

  // Sem ciclo configurado → o mesmo convite do ecrã do Ciclo, em pequeno
  if (!profile) {
    return (
      <button type="button" onClick={() => navigate("/ciclo")} className={cn(CARD, "flex items-center gap-3 p-3 pl-3.5")}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40">
          <Flower2 className="h-5 w-5 text-rose-400" strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-foreground">
            {isMale ? "Ciclo da tua parceira" : "Começa a acompanhar o teu ciclo"}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {isMale ? "Quando ela o ativar, acompanhas a fase dela aqui" : "Regista a menstruação e recebe insights"}
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
      </button>
    );
  }

  const engine = runCycleEngineFromProfile(profile, lastPeriod);
  if (!engine) return null;

  const phaseKey  = engine.phase ?? "sem_dados";
  const accent    = PHASE_ACCENT[phaseKey] ?? PHASE_ACCENT.sem_dados;
  const PhaseIcon = PHASE_ICONS[phaseKey] ?? Flower2;
  const herName   = partnerName?.split(" ")[0];
  const label     = isMale ? (herName ? `Ciclo da ${herName}` : "Ciclo dela") : "O teu ciclo";
  const quote     = isMale
    ? firstSentence(PHASE_INSIGHTS[phaseKey] ?? PHASE_INSIGHTS.sem_dados)
    : engine.insights[0];

  const angle = (engine.cycleProgress / 100) * 2 * Math.PI;
  const dotX  = 50 + RING_R * Math.sin(angle);
  const dotY  = 50 - RING_R * Math.cos(angle);

  return (
    <button type="button" onClick={() => navigate("/ciclo")} className={cn(CARD, "p-3 pl-3.5")}>
      <div className="flex items-center gap-3.5">
        {/* Anel do ciclo — igual ao do ecrã do Ciclo, em pequeno */}
        <div className="relative h-[60px] w-[60px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RING_R} fill="none" strokeWidth="8" stroke="currentColor" className="text-muted/60 dark:text-muted/30" />
            <circle
              cx="50" cy="50" r={RING_R} fill="none" strokeWidth="8" stroke="currentColor" strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - engine.cycleProgress / 100)}
              className={cn("transition-all duration-700", accent)}
            />
          </svg>
          <span
            className={cn("absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full", accent.replace("text-", "bg-"))}
            style={{ left: `${dotX}%`, top: `${dotY}%` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <PhaseIcon className={cn("h-3 w-3", accent)} strokeWidth={1.8} />
            <span className="text-[17px] font-bold leading-none tabular-nums text-foreground">{engine.cycleDay}</span>
            <span className="text-[8.5px] leading-tight text-muted-foreground">de {engine.cycleLength}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</p>
          <p className={cn("text-[16px] font-bold leading-tight", accent)}>{engine.phaseLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            {engine.daysUntilNextPeriod > 0
              ? `${engine.daysUntilNextPeriod}d até menstruação`
              : engine.daysUntilNextPeriod === 0 ? "Menstruação chega hoje" : "Menstruação atrasada"}
          </p>
        </div>

        <ChevronRight className="h-3.5 w-3.5 shrink-0 self-start text-muted-foreground/50" strokeWidth={1.5} />
      </div>

      {quote && (
        <p className={cn("mt-2 line-clamp-2 text-[12px] font-medium italic leading-snug", accent)}>"{quote}"</p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {engine.isInPeriod && (
          <span className={cn(CHIP, "border-rose-200/50 bg-rose-50 text-rose-500 dark:border-rose-800/50 dark:bg-rose-950/30")}>Em período</span>
        )}
        {engine.isInFertileWindow && (
          <span className={cn(CHIP, "border-sky-200/50 bg-sky-50 text-sky-500 dark:border-sky-800/50 dark:bg-sky-950/30")}>Janela fértil</span>
        )}
        {engine.isInPmsWindow && !engine.isInPeriod && (
          <span className={cn(CHIP, "border-violet-200/50 bg-violet-50 text-violet-500 dark:border-violet-800/50 dark:bg-violet-950/30")}>TPM</span>
        )}
        <span className={cn(CHIP, "border-border bg-muted text-muted-foreground")}>
          Próx. {formatShortDate(engine.nextPeriodStr)}
        </span>
      </div>
    </button>
  );
}
