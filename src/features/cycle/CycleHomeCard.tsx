import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { FeatureGlyph, type GlyphKind } from "@/features/home/FeatureIcon";
import { cn } from "@/lib/utils";
import { useCycleData } from "./useCycleData";
import type { CycleEngineOutput } from "./engine";

// ── Metadados por fase ────────────────────────────────────────────────────────

type PhaseMeta = { label: string; bar: string; glyph: GlyphKind };

const PHASE_META: Record<string, PhaseMeta> = {
  menstrual: { label: "Menstruação", bar: "bg-rose-400",    glyph: "menstrual" },
  folicular: { label: "Folicular",   bar: "bg-sky-300",     glyph: "folicular" },
  ovulacao:  { label: "Ovulação",    bar: "bg-amber-400",   glyph: "ovulacao" },
  luteal:    { label: "Lútea",       bar: "bg-violet-400",  glyph: "lutea" },
  sem_dados: { label: "Sem dados",   bar: "bg-muted-foreground/20", glyph: "lutea" },
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
  const { profile, engine, isMale, loading } = useCycleData();

  // Na Home o cartão só aparece com o ciclo configurado; a descoberta e a
  // configuração vivem no separador Ciclo. O motor já vem com as médias
  // aprendidas, igual ao ecrã do Ciclo.
  if (loading || !profile || !engine) return null;

  const phaseKey  = getPhaseKey(engine);
  const meta      = PHASE_META[phaseKey];
  const progress  = Math.max(2, Math.min(98, engine.cycleProgress));
  const eventText = nextEventText(engine, isMale);
  const label     = isMale ? "Ciclo dela" : "O teu ciclo";

  return (
    <button
      type="button"
      onClick={() => navigate("/ciclo")}
      className="w-full rounded-[20px] border border-[#ECE8E3] bg-white px-3.5 pb-2.5 pt-[11px] text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] transition-transform active:scale-[0.99] dark:border-border dark:bg-card"
    >
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[7px] text-[13px] font-semibold text-[#3A4150] dark:text-foreground/80">
          <FeatureGlyph kind={meta.glyph} size={16} dim={phaseKey === "sem_dados"} />
          {label}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60" strokeWidth={2} />
      </div>

      {/* ── Fase + dia ── */}
      <div className="mt-2 flex items-center gap-2.5">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {meta.label}
        </span>
        <span className="text-[12.5px] text-muted-foreground">Dia {engine.cycleDay}</span>
        <span className="ml-auto text-[11.5px] tabular-nums text-muted-foreground/70">
          {engine.cycleDay}/{engine.cycleLength} dias
        </span>
      </div>

      {/* ── Barra de progresso ── */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#F1EEEA] dark:bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", meta.bar)} style={{ width: `${progress}%` }} />
      </div>

      {/* ── Próximo evento ── */}
      <p className="mt-[7px] text-[12px] leading-snug text-muted-foreground">{eventText}</p>
    </button>
  );
}
