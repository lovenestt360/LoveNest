import type { ReactNode } from "react";
import type { CycleEngineOutput } from "./engine";
import { daysBetween } from "./engine";

// Cores das fases no anel (as mesmas da legenda do calendário).
const DOT = {
  period: "#E8456B",
  fertile: "#8CCCF2",
  ovulation: "#F2A91F",
  pms: "#B9A6F7",
  rest: "#EAE6E0",
};

/**
 * O ciclo inteiro num anel: um ponto por dia, na cor da fase, e o dia de hoje
 * em destaque. Os dias que já passaram ficam mais claros.
 */
export function CycleRing({
  engine, lastPeriodDate, size = 236, periodDays, children,
}: {
  engine: CycleEngineOutput;
  lastPeriodDate: string;
  size?: number;
  /** Dias de período a pintar (quando o período em curso dura mais do que o costume). */
  periodDays?: number;
  children?: ReactNode;
}) {
  const len = engine.cycleLength;
  const dayOf = (iso: string) => daysBetween(lastPeriodDate, iso) + 1;
  const fertileStart = dayOf(engine.fertileStartStr);
  const ovulation = dayOf(engine.ovulationDateStr);
  const pmsStart = dayOf(engine.pmsStartStr);
  const today = Math.min(engine.cycleDay, len);
  // Pontos maiores num anel pequeno, para continuarem legíveis.
  const m = size < 160 ? 1.7 : 1;
  const R = size < 160 ? 90 : 104;

  const dots = Array.from({ length: len }, (_, i) => {
    const d = i + 1;
    const a = (i / len) * Math.PI * 2 - Math.PI / 2;
    const x = 118 + R * Math.cos(a);
    const y = 118 + R * Math.sin(a);
    let fill = DOT.rest;
    if (d <= (periodDays ?? engine.periodLength)) fill = DOT.period;
    else if (d === ovulation) fill = DOT.ovulation;
    else if (d >= fertileStart && d < ovulation) fill = DOT.fertile;
    else if (d >= pmsStart) fill = DOT.pms;

    if (d === today) {
      return (
        <g key={d}>
          <circle cx={x} cy={y} r={13 * m} className="fill-white dark:fill-card" stroke="currentColor" strokeWidth={3 * m} />
          <circle cx={x} cy={y} r={6.5 * m} fill={fill === DOT.rest ? "currentColor" : fill} />
        </g>
      );
    }
    return <circle key={d} cx={x} cy={y} r={(d === ovulation ? 6.5 : 5.2) * m} fill={fill} opacity={d < today ? 0.45 : 1} />;
  });

  return (
    <div className="relative shrink-0 text-[#0B1324] dark:text-foreground" style={{ width: size, height: size }}>
      <svg viewBox="0 0 236 236" width={size} height={size} className="absolute inset-0" aria-hidden="true">{dots}</svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
