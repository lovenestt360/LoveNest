import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Droplets, Wind, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { runCycleEngineFromProfile } from "./engine";
import { useCycleTarget, type CycleProfile, type PeriodEntry } from "./useCycleData";
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
  const { targetUserId, isMale, loadingTarget } = useCycleTarget();

  const [profile, setProfile] = useState<CycleProfile | null>(null);
  const [lastPeriod, setLastPeriod] = useState<PeriodEntry | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    setLoaded(false);
    Promise.all([
      supabase.from("cycle_profiles").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("period_entries").select("*").eq("user_id", targetUserId)
        .order("start_date", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([pRes, peRes]) => {
      setProfile((pRes.data as CycleProfile | null) ?? null);
      setLastPeriod((peRes.data as PeriodEntry | null) ?? null);
      setLoaded(true);
    });
  }, [targetUserId]);

  if (loadingTarget || !loaded) return null;
  if (!profile) return null;

  const engine = runCycleEngineFromProfile(profile, lastPeriod);
  if (!engine) return null;

  const phaseKey  = getPhaseKey(engine);
  const meta      = PHASE_META[phaseKey];
  const progress  = Math.max(2, Math.min(98, engine.cycleProgress));
  const eventText = nextEventText(engine, isMale);
  const label     = isMale ? "Ciclo dela" : "O teu ciclo";
  const Icon      = meta.Icon;

  return (
    <button
      type="button"
      onClick={() => navigate("/ciclo")}
      className="glass-card glass-card-hover w-full text-left p-4 space-y-2.5 transition-all active:scale-[0.99]"
    >
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
      </div>

      {/* ── Fase + dia ── */}
      <div className="flex items-center gap-3">
        <div className={cn("flex items-center gap-1.5 text-sm font-semibold", meta.textColor)}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
          {meta.label}
        </div>
        <span className="text-xs text-muted-foreground/60 font-medium">
          Dia {engine.cycleDay}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 font-medium tabular-nums">
          {engine.cycleDay}/{engine.cycleLength} dias
        </span>
      </div>

      {/* ── Barra de progresso ── */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", meta.bar)}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Próximo evento ── */}
      <p className="text-[11px] text-muted-foreground leading-snug">
        {eventText}
      </p>
    </button>
  );
}
