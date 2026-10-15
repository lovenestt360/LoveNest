import { useNavigate } from "react-router-dom";
import { Droplets, Wind, Sun, Moon } from "lucide-react";
import { WIDGET, MonoLabel, BigNumber, SegmentBar, WidgetFoot, FootStat, Unit } from "@/components/Widget";
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

export function CycleHomeCard() {
  const navigate = useNavigate();
  const { profile, lastPeriod, isMale, loading } = useCycleData();

  // Na Home o cartão só aparece com o ciclo configurado; a descoberta e a
  // configuração vivem no separador Ciclo.
  if (loading || !profile) return null;

  const engine = runCycleEngineFromProfile(profile, lastPeriod);
  if (!engine) return null;

  const phaseKey  = getPhaseKey(engine);
  const meta      = PHASE_META[phaseKey];
  const eventText = nextEventText(engine, isMale);
  const label     = isMale ? "Ciclo dela" : "O teu ciclo";
  const Icon      = meta.Icon;

  // Um segmento por fase do ciclo; os dias já vividos ficam com a cor da fase.
  const len = engine.cycleLength;
  const ovulationDay = Math.max(engine.periodLength + 1, len - (profile.luteal_length ?? 14));
  const phaseOf = (day: number): "rose" | "blue" | "green" | "violet" =>
    day <= engine.periodLength ? "rose" : day < ovulationDay - 4 ? "blue" : day <= ovulationDay ? "green" : "violet";
  const segments: { weight: number; tone: "rose" | "blue" | "green" | "violet" | "idle" }[] = [];
  for (let day = 1; day <= len; day++) {
    const tone = day <= engine.cycleDay ? phaseOf(day) : "idle";
    const last = segments[segments.length - 1];
    if (last && last.tone === tone) last.weight += 1;
    else segments.push({ weight: 1, tone });
  }
  const daysToPeriod = Math.max(0, engine.daysUntilNextPeriod);

  return (
    <button
      type="button"
      onClick={() => navigate("/ciclo")}
      className={cn(WIDGET, "w-full text-left transition-transform active:scale-[0.99]")}
    >
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <MonoLabel className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
            {label}
          </MonoLabel>
          <span className={cn("flex items-center gap-1.5 text-[13px] font-semibold", meta.textColor)}>
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {meta.label}
          </span>
        </div>
        <BigNumber className="mt-3" size="md" value={engine.cycleDay} unit={`de ${engine.cycleLength} dias`} />
        <SegmentBar className="mt-3.5" segments={segments} />
        <p className="mt-2.5 text-[12.5px] leading-snug text-[#3A4150] dark:text-muted-foreground">{eventText}</p>
      </div>
      <WidgetFoot>
        <FootStat label="Menstruação">
          {daysToPeriod}
          <Unit>{daysToPeriod === 1 ? "dia" : "dias"}</Unit>
        </FootStat>
        <FootStat label="Ciclo">
          {engine.cycleLength}
          <Unit>dias</Unit>
        </FootStat>
      </WidgetFoot>
    </button>
  );
}
