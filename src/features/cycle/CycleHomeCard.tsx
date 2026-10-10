import { useNavigate } from "react-router-dom";
import { ChevronRight, Droplets, Wind, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { runCycleEngineFromProfile } from "./engine";
import { useCycleData } from "./useCycleData";
import type { CycleEngineOutput } from "./engine";

// ── Metadados por fase ────────────────────────────────────────────────────────

type PhaseMeta = { label: string; dot: string; bar: string; textColor: string; Icon: typeof Droplets };

const PHASE_META: Record<string, PhaseMeta> = {
  menstrual: { label: "Menstruação", dot: "bg-rose-500",    bar: "bg-rose-400",    textColor: "text-rose-500 dark:text-rose-400",    Icon: Droplets },
  folicular: { label: "Folicular",   dot: "bg-sky-400",     bar: "bg-sky-300",     textColor: "text-sky-500 dark:text-sky-400",      Icon: Wind     },
  ovulacao:  { label: "Ovulação",    dot: "bg-emerald-400", bar: "bg-emerald-400", textColor: "text-emerald-600 dark:text-emerald-400", Icon: Sun    },
  luteal:    { label: "Lútea",       dot: "bg-violet-400",  bar: "bg-violet-400",  textColor: "text-violet-500 dark:text-violet-400", Icon: Moon    },
  sem_dados: { label: "Sem dados",   dot: "bg-muted-foreground/30", bar: "bg-muted-foreground/20", textColor: "text-muted-foreground", Icon: Moon },
};

function getPhaseKey(engine: CycleEngineOutput): string {
  const p = engine.phase;
  if (p === "menstrual") return "menstrual";
  if (p === "folicular") return "folicular";
  if (p === "ovulacao")  return "ovulacao";
  if (p === "luteal")    return "luteal";
  return "sem_dados";
}

// ── Texto do próximo evento ───────────────────────────────────────────────────

function nextEventText(engine: CycleEngineOutput, isMale: boolean): string {
  const them = isMale ? "ela" : "tu";
  const theirs = isMale ? "dela" : "tua";

  if (engine.isInPeriod) {
    return `Menstruação · dia ${engine.cycleDay} do ciclo`;
  }
  if (engine.isInFertileWindow) {
    const end = new Date(engine.fertileEndStr + "T12:00:00");
    const endFmt = end.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
    return `Janela fértil até ${endFmt}`;
  }
  if (engine.isInPmsWindow) {
    const n = engine.daysUntilNextPeriod;
    return `Fase pré-menstrual · ${n > 0 ? `menstruação em ${n} dias` : "brevemente"}`;
  }
  // Fertile window upcoming (within 5 days)
  const daysToFertile = Math.round(
    (new Date(engine.fertileStartStr + "T12:00:00").getTime() - Date.now()) / 86400000
  );
  if (daysToFertile > 0 && daysToFertile <= 5) {
    return `Janela fértil em ${daysToFertile} dia${daysToFertile === 1 ? "" : "s"}`;
  }

  const n = engine.daysUntilNextPeriod;
  const nextDate = new Date(engine.nextPeriodStr + "T12:00:00")
    .toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  if (n <= 0) return `Menstruação prevista para ${nextDate}`;
  return `Próxima menstruação em ${n} dia${n === 1 ? "" : "s"} · ${nextDate}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

const CARD =
  "w-full overflow-hidden rounded-[1.4rem] bg-card text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_8px_22px_-14px_rgba(11,19,36,0.14)] active:scale-[0.99] transition-transform dark:border dark:border-border/60";

// Fases desenhadas à escala do ciclo: menstruação · folicular · fértil · lútea
function phaseSegments(engine: CycleEngineOutput) {
  const len = engine.cycleLength;
  const toLuteal = Math.round((engine.nextPeriod.getTime() - engine.ovulationDate.getTime()) / 86_400_000);
  const ovDay = Math.max(engine.periodLength + 2, len - toLuteal);
  const fertileFrom = Math.max(engine.periodLength + 1, ovDay - 5);
  const fertileTo = Math.min(len, ovDay + 1);
  return [
    { key: "menstrual", days: engine.periodLength },
    { key: "folicular", days: Math.max(0, fertileFrom - engine.periodLength - 1) },
    { key: "ovulacao", days: fertileTo - fertileFrom + 1 },
    { key: "luteal", days: Math.max(0, len - fertileTo) },
  ].filter((s) => s.days > 0);
}

export function CycleHomeCard({ partnerName }: { partnerName?: string | null }) {
  const navigate = useNavigate();
  const { profile, lastPeriod, isMale, loading } = useCycleData();

  if (loading) return null;

  // Sem ciclo configurado → convite discreto (diferente para ela e para ele)
  if (!profile) {
    return (
      <button type="button" onClick={() => navigate("/ciclo")} className={cn(CARD, "flex items-center gap-3 p-3 pl-3.5")}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
          <Droplets className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-foreground">
            {isMale ? "Ciclo da tua parceira" : "Acompanha o teu ciclo"}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {isMale ? "Quando ela o ativar, vês a fase dela aqui" : "Previsões e lembretes para os dois"}
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
      </button>
    );
  }

  const engine = runCycleEngineFromProfile(profile, lastPeriod);
  if (!engine) return null;

  const basePhase = getPhaseKey(engine);
  // Na janela fértil o motor ainda diz "folicular"; no cartão mostramos a janela.
  const fertile   = engine.isInFertileWindow && basePhase !== "menstrual";
  const phaseKey  = fertile ? "ovulacao" : basePhase;
  const meta      = fertile ? { ...PHASE_META.ovulacao, label: basePhase === "ovulacao" ? "Ovulação" : "Janela fértil" } : PHASE_META[phaseKey];
  const eventText = nextEventText(engine, isMale);
  const herName   = partnerName?.split(" ")[0];
  const label     = isMale ? (herName ? `Ciclo da ${herName}` : "Ciclo dela") : "O teu ciclo";
  const Icon      = meta.Icon;
  const segments  = phaseSegments(engine);
  const marker    = Math.max(1, Math.min(99, ((engine.cycleDay - 0.5) / engine.cycleLength) * 100));

  return (
    <button type="button" onClick={() => navigate("/ciclo")} className={cn(CARD, "p-3 pl-3.5")}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", meta.textColor, "bg-muted/70")}>
          <Icon className="h-3 w-3" strokeWidth={2} />
          {meta.label}
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[11.5px] text-muted-foreground">Dia</span>
        <span className="text-[26px] font-light leading-none tracking-[-0.04em] tabular-nums text-foreground">
          {engine.cycleDay}
        </span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">/ {engine.cycleLength}</span>
      </div>

      {/* Fases à escala, com marcador no dia de hoje */}
      <div className="relative mt-2.5">
        <div className="flex h-1.5 gap-[3px]" aria-hidden="true">
          {segments.map((seg) => (
            <span
              key={seg.key}
              className={cn("h-full rounded-full", PHASE_META[seg.key].bar, seg.key !== phaseKey && "opacity-35")}
              style={{ flexGrow: seg.days, flexBasis: 0 }}
            />
          ))}
        </div>
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow"
          style={{ left: `${marker}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-muted-foreground">{eventText}</p>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
    </button>
  );
}
