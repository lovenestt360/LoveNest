import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CycleEngineOutput } from "./engine";
import { addDays, daysBetween } from "./engine";
import { MONTHS, PHASE_CHIP, asDate, fmtDay } from "./cycleUi";

// O que cada dia do anel é, com a cor, a etiqueta e uma frase curta.
type Kind = "period" | "follicular" | "fertile" | "ovulation" | "luteal" | "pms";
const KIND: Record<Kind, { fill?: string; glow: string; chip: { label: string; cls: string }; tip: string; legend?: string }> = {
  period:     { fill: "#E8456B", glow: "#E8456B", chip: PHASE_CHIP.menstrual, tip: "Dias de período", legend: "Período" },
  follicular: { glow: "#6DBDF0", chip: PHASE_CHIP.folicular, tip: "A energia costuma subir" },
  fertile:    { fill: "#6DBDF0", glow: "#6DBDF0", chip: { label: "Janela fértil", cls: PHASE_CHIP.folicular.cls }, tip: "Gravidez mais provável", legend: "Fértil" },
  ovulation:  { fill: "#F2A91F", glow: "#F2A91F", chip: PHASE_CHIP.ovulacao, tip: "O dia mais fértil", legend: "Ovulação" },
  luteal:     { glow: "#A890F5", chip: PHASE_CHIP.luteal, tip: "Energia mais calma" },
  pms:        { fill: "#A890F5", glow: "#A890F5", chip: { label: "TPM", cls: PHASE_CHIP.luteal.cls }, tip: "Pode haver mais sensibilidade", legend: "TPM" },
};
const LEGEND: Kind[] = ["period", "fertile", "ovulation", "pms"];
const C = 118;
const R = 104;
const SPRING = "transform .4s cubic-bezier(.34,1.56,.64,1), opacity .3s";
const DROP = "M0-22c5 7.5 13 14.7 13 23.7C13 9 7.2 14.7 0 14.7S-13 9-13 1.7C-13-7.3-5-14.5 0-22Z";
const MOON = "M40 8A24 24 0 1 0 56 41 19.5 19.5 0 0 1 40 8Z";
const STAR = "M0-6C1.1-1.1 1.1-1.1 6 0 1.1 1.1 1.1 1.1 0 6-1.1 1.1-1.1 1.1-6 0-1.1-1.1-1.1-1.1 0-6Z";
const buzz = () => { try { navigator.vibrate?.(5); } catch { /* sem vibração */ } };

/**
 * O ciclo inteiro num anel: uma cápsula por dia, na cor da fase, e o dia de
 * hoje em destaque. Tocar ou arrastar mostra qualquer dia (e o que ela
 * registou nesse dia); as etiquetas acendem cada fase. Volta sozinho a hoje.
 */
export function CycleRing({
  engine, lastPeriodDate, today, size = 236, periodDays, logs, below, children,
}: {
  engine: CycleEngineOutput;
  lastPeriodDate: string;
  today: string;
  size?: number;
  /** Dias de período a pintar (quando o período em curso dura mais do que o costume). */
  periodDays?: number;
  /** Sintomas registados por dia (ISO → nomes), para mostrar ao tocar num dia passado. */
  logs?: Record<string, string[]>;
  /** O que fica entre o anel e as etiquetas (a previsão). */
  below?: ReactNode;
  /** O centro para o dia de hoje. */
  children?: ReactNode;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const len = engine.cycleLength;
  const dayOf = (iso: string) => daysBetween(lastPeriodDate, iso) + 1;
  const pDays = periodDays ?? engine.periodLength;
  const fertileStart = dayOf(engine.fertileStartStr);
  const fertileEnd = dayOf(engine.fertileEndStr);
  const ovulation = dayOf(engine.ovulationDateStr);
  const pmsStart = dayOf(engine.pmsStartStr);
  const todayN = Math.min(engine.cycleDay, len);
  const kindOf = (d: number): Kind =>
    d <= pDays ? "period"
    : d === ovulation ? "ovulation"
    : d >= fertileStart && d <= fertileEnd ? "fertile"
    : d >= pmsStart ? "pms"
    : d < ovulation ? "follicular" : "luteal";
  const isoOf = (d: number) => addDays(lastPeriodDate, d - 1);

  const [sel, setSel] = useState<number | null>(null);
  const [focus, setFocus] = useState<Kind | null>(null);
  const [entered, setEntered] = useState(false);
  const selRef = useRef<number | null>(null);
  const timer = useRef<number>();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 22 * len + 600);
    return () => { window.clearTimeout(t); window.clearTimeout(timer.current); };
  }, [len]);

  const backSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { selRef.current = null; setSel(null); setFocus(null); }, 5000);
  };
  const pick = (d: number) => {
    const next = d === todayN ? null : d;
    if (next !== selRef.current) buzz();
    selRef.current = next;
    setSel(next);
    setFocus(null);
  };
  const toToday = () => { window.clearTimeout(timer.current); selRef.current = null; setSel(null); setFocus(null); };

  const dayAt = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    let a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) + Math.PI / 2 + Math.PI / len;
    if (a < 0) a += Math.PI * 2;
    return (Math.floor((a / (Math.PI * 2)) * len) % len) + 1;
  };
  const onDown = (e: React.PointerEvent<SVGCircleElement>) => {
    dragging.current = true;
    window.clearTimeout(timer.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    pick(dayAt(e));
  };
  const onMove = (e: React.PointerEvent) => { if (dragging.current) pick(dayAt(e)); };
  const onUp = () => { dragging.current = false; backSoon(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const from = selRef.current ?? todayN;
    pick(((from - 1 + (e.key === "ArrowRight" ? 1 : -1) + len) % len) + 1);
    backSoon();
  };
  const chooseFocus = (k: Kind) => {
    buzz();
    selRef.current = null;
    setSel(null);
    if (focus === k) { toToday(); return; }
    setFocus(k);
    backSoon();
  };

  const pos = (d: number, r = R) => {
    const a = ((d - 1) / len) * Math.PI * 2 - Math.PI / 2;
    return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
  };
  const shown: Kind = focus ?? kindOf(sel ?? todayN);

  // ── O centro ──
  let center: ReactNode = children;
  if (focus) {
    const days = Array.from({ length: len }, (_, i) => i + 1).filter((d) => kindOf(d) === focus);
    const a = asDate(isoOf(days[0])), b = asDate(isoOf(days[days.length - 1]));
    center = (
      <Center key={`f-${focus}`} top={days.length === 1 ? fmtDay(isoOf(days[0])) : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`}
        big={days.length === 1 ? `Dia ${days[0]}` : `${days.length} dias`} chip={KIND[focus].chip} tip={KIND[focus].tip} />
    );
  } else if (sel) {
    const iso = isoOf(sel), k = KIND[kindOf(sel)];
    const logged = iso < today ? logs?.[iso] : undefined;
    const tip = logged?.length ? `Registaste: ${logged.slice(0, 3).join(", ")}`
      : iso > today ? (kindOf(sel) === "period" ? "Período previsto" : `Previsão: ${k.tip.toLowerCase()}`) : k.tip;
    center = <Center key={`d-${sel}`} top={fmtDay(iso)} big={`Dia ${sel}`} chip={k.chip} tip={tip} />;
  }

  const [tx, ty] = pos(todayN);
  const [p0x, p0y] = pos(1, 88);
  const [p1x, p1y] = pos(todayN, 88);
  const mark = (d: number, node: ReactNode) => {
    if (d < 1 || d > len) return null;
    const [x, y] = pos(d, 122);
    return <g transform={`translate(${x} ${y})`} className="transition-opacity duration-300" opacity={focus ? 0.3 : 1}>{node}</g>;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative my-1.5 shrink-0 text-[#0B1324] dark:text-foreground" style={{ width: size, height: size }}
        tabIndex={0} onKeyDown={onKey} aria-label="Anel do ciclo. Usa as setas para ver outros dias.">
        <svg ref={svgRef} viewBox="0 0 236 236" width={size} height={size} className="absolute inset-0 overflow-visible" aria-hidden="true">
          <defs>
            <radialGradient id={`gl${uid}`}>
              <stop offset="0" style={{ stopColor: KIND[shown].glow, stopOpacity: 0.16, transition: "stop-color .5s" }} />
              <stop offset="1" style={{ stopColor: KIND[shown].glow, stopOpacity: 0, transition: "stop-color .5s" }} />
            </radialGradient>
            <filter id={`sh${uid}`} x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#0B1324" floodOpacity=".2" />
            </filter>
          </defs>
          <circle cx={C} cy={C} r={84} fill={`url(#gl${uid})`} />

          {/* trilho fino por dentro e o caminho feito até hoje */}
          <circle cx={C} cy={C} r={88} fill="none" stroke="currentColor" strokeOpacity={0.045} strokeWidth={2.5} />
          {todayN > 1 && (
            <path d={`M${p0x} ${p0y}A88 88 0 ${(todayN - 1) / len > 0.5 ? 1 : 0} 1 ${p1x} ${p1y}`}
              fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
          )}

          {Array.from({ length: len }, (_, i) => {
            const d = i + 1, k = kindOf(d), [x, y] = pos(d), big = d === ovulation;
            const near = sel ? Math.min(Math.abs(d - sel), len - Math.abs(d - sel)) : 99;
            const s = d === todayN || near === 0 ? 0 : near === 1 ? 1.35 : near === 2 ? 1.15 : 1;
            const o = focus ? (k === focus ? 1 : 0.15) : d < todayN ? 0.45 : 1;
            return (
              <rect key={d} x={big ? -5 : -4} y={big ? -8 : -7} width={big ? 10 : 8} height={big ? 16 : 14} rx={big ? 5 : 4}
                fill={KIND[k].fill} className={cn(!KIND[k].fill && "fill-[#E7E2DB] dark:fill-white/15", !entered && "motion-safe:animate-ring-dot-in")}
                style={{
                  transform: `translate(${x}px,${y}px) rotate(${((d - 1) / len) * 360}deg) scale(${s})`,
                  transformBox: "view-box", transformOrigin: "0 0", transition: SPRING, opacity: o,
                  ["--o" as string]: o, animationDelay: `${d * 22}ms`,
                }} />
            );
          })}

          {/* símbolos fora do anel: gota no período, estrela na ovulação, lua na TPM */}
          {mark((1 + pDays) / 2, <path d={DROP} transform="scale(.3)" fill="#E8456B" />)}
          {mark(ovulation, <path d={STAR} fill="#F2A91F" />)}
          {pmsStart <= len && mark((pmsStart + len) / 2, <path d={MOON} transform="translate(-6 -6) scale(.2)" fill="#A890F5" />)}

          {/* hoje */}
          <circle cx={tx} cy={ty} r={12.5} fill="none" stroke={KIND[kindOf(todayN)].glow} strokeWidth={2}
            className="motion-safe:animate-ring-pulse" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          <circle cx={tx} cy={ty} r={12.5} className="fill-white dark:fill-card" filter={`url(#sh${uid})`} />
          <circle cx={tx} cy={ty} r={12.5} fill="none" stroke="currentColor" strokeWidth={2.6} />
          <circle cx={tx} cy={ty} r={5.5} fill={KIND[kindOf(todayN)].glow} />

          {/* o dia tocado */}
          {sel && (() => {
            const [x, y] = pos(sel), k = KIND[kindOf(sel)];
            return (
              <g style={{ transform: `translate(${x}px,${y}px)`, transition: SPRING }}>
                <circle r={12} className="fill-white dark:fill-card" filter={`url(#sh${uid})`} />
                <circle r={7} fill={k.fill ?? "currentColor"} />
              </g>
            );
          })()}

          {/* zona de toque: só a faixa do anel, para o centro continuar a deixar a página deslizar */}
          <circle cx={C} cy={C} r={R} fill="none" stroke="transparent" strokeWidth={44} pointerEvents="stroke"
            className="cursor-pointer" style={{ touchAction: "none" }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>

        {/* Voltar a hoje: no canto, fora do caminho dos dias */}
        <button type="button" onClick={toToday} tabIndex={sel || focus ? 0 : -1} aria-hidden={!(sel || focus)}
          aria-label="Voltar a hoje" title="Voltar a hoje"
          className={cn("absolute -right-4 -top-1 grid h-9 w-9 place-items-center rounded-full bg-[#0B1324] text-white shadow-[0_6px_16px_-6px_rgba(11,19,36,0.5)] transition-[opacity,transform] duration-200 dark:bg-foreground dark:text-background",
            sel || focus ? "opacity-100" : "pointer-events-none scale-75 opacity-0")}>
          <RotateCcw className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      {below}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {LEGEND.map((k) => (
          <button key={k} type="button" onClick={() => chooseFocus(k)} aria-pressed={focus === k}
            className={cn("inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[#ECE8E3] bg-white px-3 text-[12px] font-semibold text-[#3A4150] transition-[border-color,box-shadow,transform] active:scale-95 dark:border-border dark:bg-card dark:text-foreground/80",
              focus === k && "border-[#0B1324] text-[#0B1324] shadow-[0_0_0_3px_rgba(11,19,36,0.07)] dark:border-foreground dark:text-foreground")}>
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: KIND[k].fill }} />{KIND[k].legend}
          </button>
        ))}
      </div>
    </div>
  );
}

/** O centro quando se toca num dia ou numa fase. */
function Center({ top, big, chip, tip }: { top: string; big: string; chip: { label: string; cls: string }; tip: string }) {
  return (
    <div className="flex animate-fade-in flex-col items-center">
      <span className="text-[12.5px] font-semibold text-muted-foreground">{top}</span>
      <span className="mt-1 whitespace-nowrap text-[42px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">{big}</span>
      <span className={cn("mt-2 rounded-full px-3 py-1 text-[12.5px] font-semibold", chip.cls)}>{chip.label}</span>
      <span className="mt-1.5 max-w-[140px] text-[11.5px] leading-snug text-muted-foreground">{tip}</span>
    </div>
  );
}
