import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { todayLocal } from "@/lib/timezone";
import { useCycleData } from "./useCycleData";
import { daysBetween, type CycleEngineOutput } from "./engine";
import { MONTHS, asDate } from "./cycleUi";

// ── Cada fase: cores do cartão, desenho e frases (para ela e para ele) ───────

type PhaseKey = "menstrual" | "folicular" | "fertil" | "ovulacao" | "lutea" | "tpm";

type PhaseLook = {
  name: string;
  c: string; deep: string; shadow: string;
  art: keyof typeof ART;
  her: string; him: string;
};

const PHASES: Record<PhaseKey, PhaseLook> = {
  menstrual: { name: "Menstruação", c: "#E8456B", deep: "#B8264C", shadow: "rgba(232,69,107,.35)", art: "drop",
    her: "Dia de abrandar e mimar-te um pouco.", him: "Ela pode precisar de mais mimo hoje." },
  folicular: { name: "Folicular", c: "#3E9BD8", deep: "#1F74AD", shadow: "rgba(62,155,216,.35)", art: "leaf",
    her: "A tua energia está a voltar.", him: "A energia dela está a voltar." },
  fertil: { name: "Janela fértil", c: "#2C9BE0", deep: "#16699E", shadow: "rgba(44,155,224,.35)", art: "heart",
    her: "Gravidez mais provável nestes dias.", him: "Gravidez mais provável nestes dias." },
  ovulacao: { name: "Ovulação", c: "#E89B0C", deep: "#A86A00", shadow: "rgba(232,155,12,.38)", art: "sun",
    her: "Hoje é o teu dia mais fértil.", him: "Hoje é o dia mais fértil dela." },
  lutea: { name: "Lútea", c: "#8B6FF0", deep: "#5B3FC4", shadow: "rgba(139,111,240,.35)", art: "moon",
    her: "Energia mais calma, vai ao teu ritmo.", him: "Ela pode estar mais calma, acompanha-a." },
  tpm: { name: "TPM", c: "#8B6FF0", deep: "#5B3FC4", shadow: "rgba(139,111,240,.35)", art: "moon",
    her: "Sê gentil contigo, o período vem aí.", him: "Paciência e carinho fazem diferença." },
};

const GRAD = "url(#cycle-art-grad)";
const ART = {
  drop: (
    <>
      <path d="M50 6C50 6 18 44 18 64a32 32 0 0 0 64 0C82 44 50 6 50 6Z" fill={GRAD} />
      <path d="M34 62a16 16 0 0 0 10 16" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
    </>
  ),
  leaf: (
    <>
      <path d="M50 92V48" stroke={GRAD} strokeWidth="6" strokeLinecap="round" />
      <path d="M50 56C50 30 70 14 92 12 92 38 76 56 50 56Z" fill={GRAD} />
      <path d="M50 66C50 46 34 32 12 30 12 52 28 66 50 66Z" fill={GRAD} opacity=".8" />
    </>
  ),
  heart: (
    <>
      <path d="M50 88S10 62 10 36a20 20 0 0 1 40-6 20 20 0 0 1 40 6C90 62 50 88 50 88Z" fill={GRAD} />
      <path d="M28 34a9 9 0 0 1 10-8" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
    </>
  ),
  sun: (
    <>
      <circle cx="50" cy="50" r="22" fill={GRAD} />
      {Array.from({ length: 8 }, (_, k) => (
        <rect key={k} x="47" y="6" width="6" height="16" rx="3" fill={GRAD} transform={`rotate(${k * 45} 50 50)`} />
      ))}
    </>
  ),
  moon: (
    <>
      <path d="M64 8A42 42 0 1 0 92 66 34 34 0 0 1 64 8Z" fill={GRAD} />
      <circle cx="74" cy="26" r="3" fill="#fff" opacity=".8" />
    </>
  ),
} satisfies Record<string, ReactNode>;

// Cores dos dias no anel — as mesmas do anel da página do Ciclo.
const DAY_COLOR = { period: "#E8456B", fertile: "#6DBDF0", ovulation: "#F2A91F", pms: "#A890F5" } as const;

function phaseOf(e: CycleEngineOutput): PhaseKey {
  if (e.isInPeriod || e.phase === "menstrual") return "menstrual";
  if (e.phase === "ovulacao") return "ovulacao";
  if (e.isInFertileWindow) return "fertil";
  if (e.isInPmsWindow) return "tpm";
  if (e.phase === "luteal") return "lutea";
  return "folicular";
}

const fmt = (iso: string) => { const d = asDate(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

// O próximo marco do ciclo, numa etiqueta curta.
function nextMark(e: CycleEngineOutput, key: PhaseKey, today: string): string {
  if ((key === "menstrual" || key === "folicular") && e.fertileStartStr > today) return `Fértil a partir de ${fmt(e.fertileStartStr)}`;
  if (key === "fertil" && e.ovulationDateStr > today) return `Ovulação · ${fmt(e.ovulationDateStr)}`;
  const n = e.daysUntilNextPeriod;
  if (n <= 0) return "Período previsto para hoje";
  if (n <= 7) return `Período em ${n} ${n === 1 ? "dia" : "dias"}`;
  return `Período · ${fmt(e.nextPeriodStr)}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CycleHomeCard() {
  const navigate = useNavigate();
  const { profile, engine, isMale, loading, lastPeriod, openPeriod } = useCycleData();

  // Na Home o cartão só aparece com o ciclo configurado; a descoberta e a
  // configuração vivem no separador Ciclo.
  if (loading || !profile || !engine || !lastPeriod) return null;

  const e = engine;
  const key = phaseOf(e);
  const look = PHASES[key];
  const today = todayLocal();

  // O anel: um traço por dia, colorido como na página do Ciclo.
  const len = e.cycleLength;
  const dayOf = (iso: string) => daysBetween(lastPeriod.start_date, iso) + 1;
  const pDays = openPeriod ? Math.max(e.cycleDay, e.periodLength) : e.periodLength;
  const fStart = dayOf(e.fertileStartStr), fEnd = dayOf(e.fertileEndStr);
  const ovu = dayOf(e.ovulationDateStr), pms = dayOf(e.pmsStartStr);
  const todayN = Math.min(e.cycleDay, len);
  const colorOf = (d: number) =>
    d <= pDays ? DAY_COLOR.period
    : d === ovu ? DAY_COLOR.ovulation
    : d >= fStart && d <= fEnd ? DAY_COLOR.fertile
    : d >= pms ? DAY_COLOR.pms
    : null;
  const at = (d: number) => {
    const a = ((d - 1) / len) * Math.PI * 2 - Math.PI / 2;
    return [48 + 40 * Math.cos(a), 48 + 40 * Math.sin(a)] as const;
  };
  const [tx, ty] = at(todayN);

  const vars = {
    "--c": look.c, "--deep": look.deep, "--shadow": look.shadow,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={() => navigate("/ciclo")}
      style={vars}
      aria-label={`${isMale ? "Ciclo dela" : "O teu ciclo"}: ${look.name}, dia ${e.cycleDay}`}
      className="relative isolate flex w-full items-center gap-3 overflow-hidden rounded-[24px] border border-[#ECE8E3] bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] transition-transform active:scale-[0.99] dark:border-border dark:bg-card"
    >
      {/* ── Desenho da fase, com um brilho suave à volta, e estrelinhas ── */}
      <span className="absolute -right-9 -top-10 -z-10 h-32 w-32 rounded-full" style={{ background: `radial-gradient(circle, ${look.c}26, transparent 66%)` }} aria-hidden="true" />
      <svg className="cycle-art absolute -right-2 -top-2 -z-10 h-[58px] w-[58px]" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="cycle-art-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".55" stopColor={look.c} stopOpacity=".55" />
            <stop offset="1" stopColor={look.c} stopOpacity=".9" />
          </linearGradient>
        </defs>
        {ART[look.art]}
      </svg>
      {[[62, 70, 0], [78, 80, 1.6], [70, 60, 3.2], [88, 55, 2.4]].map(([l, t, d]) => (
        <svg key={l} className="cycle-spark absolute -z-10 h-2 w-2 text-[var(--c)]" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s` }} viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 0L6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" fill="currentColor" />
        </svg>
      ))}

      {/* ── Anel com o dia ── */}
      <div className="relative h-16 w-16 shrink-0">
        <svg className="h-16 w-16 overflow-visible" viewBox="0 0 96 96" aria-hidden="true">
          {Array.from({ length: len }, (_, i) => {
            const d = i + 1, [x, y] = at(d), col = colorOf(d);
            return (
              <rect key={d} x={x - 2} y={y - 5} width="4" height="10" rx="2" transform={`rotate(${(i / len) * 360} ${x} ${y})`}
                fill={col ?? "#E7E2DB"} opacity={d < todayN ? 0.45 : 1} className={col ? undefined : "dark:fill-white/15"} />
            );
          })}
          <circle className="cycle-today-pulse" cx={tx} cy={ty} r="6" fill={look.c} />
          <circle cx={tx} cy={ty} r="7" fill="#fff" stroke={look.c} strokeWidth="2.5" />
          <circle cx={tx} cy={ty} r="2.6" fill={look.c} />
        </svg>
        <div className="absolute inset-[14px] grid place-content-center rounded-full bg-white text-center shadow-[0_6px_16px_-6px_var(--shadow)] dark:bg-card">
          <b className="text-[16px] font-extrabold leading-none tracking-[-0.04em] text-[#0B1324] tabular-nums dark:text-foreground">{e.cycleDay}</b>
          <span className="text-[7.5px] font-bold tracking-[0.08em] text-[var(--c)]">DIA</span>
        </div>
      </div>

      {/* ── Fase, frase e próximo marco ── */}
      <div className="min-w-0 flex-1 pr-8">
        <span className="inline-flex h-5 items-center gap-1 rounded-full pl-1.5 pr-2 text-[10.5px] font-bold text-[var(--deep)] dark:text-[var(--c)]" style={{ background: `${look.c}14` }}>
          <svg className="h-3 w-2.5" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0C5 0 0 5.6 0 8a5 4.6 0 0 0 10 0C10 5.6 5 0 5 0Z" fill="currentColor" /></svg>
          {isMale ? "Ciclo dela" : "O teu ciclo"}
        </span>
        <p className="mt-1 text-balance text-[16px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#0B1324] dark:text-foreground">{look.name}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[#4A5060] dark:text-foreground/70">{isMale ? look.him : look.her}</p>
        <span className="mt-1.5 inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[#F4F1EC] px-2 text-[11px] font-semibold text-[#3A4150] dark:bg-muted dark:text-foreground/80">
          <i className="h-1.5 w-1.5 rounded-full bg-[var(--c)]" />
          {nextMark(e, key, today)}
        </span>
      </div>

    </button>
  );
}
