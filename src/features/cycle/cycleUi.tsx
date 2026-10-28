// Peças partilhadas pelos ecrãs do Ciclo (maqueta docs/mockups/ciclo-proposta.html).
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GlyphKind } from "@/features/home/FeatureIcon";
import { cn } from "@/lib/utils";
import { daysBetween, type CyclePhase } from "./engine";
import { CycleIcon } from "./CycleIcon";
import type { CycleIconKind } from "./cycleIconsSvg";
import { picked } from "./CycleSheet";

// ── Datas em português de Portugal ──────────────────────────────────────────
export const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const asDate = (iso: string) => new Date(iso + "T12:00:00");
/** "sexta, 6 nov" */
export const fmtDay = (iso: string) => { const d = asDate(iso); return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
/** "hoje", "amanhã", "sexta" ou "sexta, 6 nov" */
export const relDay = (iso: string, today: string) => {
  const n = daysBetween(today, iso);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n === -1) return "ontem";
  return n > 0 && n < 7 ? WEEKDAYS[asDate(iso).getDay()] : fmtDay(iso);
};

// ── Fases ────────────────────────────────────────────────────────────────────
export const PHASE_GLYPH: Record<CyclePhase, GlyphKind> = {
  menstrual: "menstrual", folicular: "folicular", ovulacao: "ovulacao", luteal: "lutea", sem_dados: "lutea",
};
export const PHASE_CHIP: Record<CyclePhase, { label: string; cls: string }> = {
  menstrual: { label: "Período", cls: "bg-[#FDECEF] text-[#C92D52] dark:bg-rose-950/40 dark:text-rose-300" },
  folicular: { label: "Fase folicular", cls: "bg-[#E9F5FC] text-[#176796] dark:bg-sky-950/40 dark:text-sky-300" },
  ovulacao:  { label: "Ovulação", cls: "bg-[#FFF4DA] text-[#8A5A06] dark:bg-amber-950/40 dark:text-amber-300" },
  luteal:    { label: "Fase lútea", cls: "bg-[#F1EDFE] text-[#6B4FD8] dark:bg-violet-950/40 dark:text-violet-300" },
  sem_dados: { label: "Sem dados", cls: "bg-muted text-muted-foreground" },
};
export const PMS_CHIP = { label: "Dias de TPM", cls: PHASE_CHIP.luteal.cls };

/** Cores dos dias no calendário e nos próximos dias. */
export const DAY_CLS: Record<string, string> = {
  period: "bg-[#E8456B] text-white font-semibold",
  predicted: "border-[1.6px] border-dashed border-[#E8456B] text-[#C92D52]",
  fertile: "bg-[#E9F5FC] text-[#176796] dark:bg-sky-950/40 dark:text-sky-300",
  ovulation: "bg-[#FFF4DA] text-[#8A5A06] shadow-[inset_0_0_0_1.6px_#F2A91F]",
  pms: "bg-[#F1EDFE] text-[#6B4FD8] dark:bg-violet-950/40 dark:text-violet-300",
};

// ── Superfícies ──────────────────────────────────────────────────────────────
export const CARD = "rounded-[24px] border border-[#ECE8E3] bg-white p-4 dark:border-border dark:bg-card";
export const CARD_TITLE = "text-[15px] font-semibold tracking-[-0.01em] text-foreground";
export const ROUND = "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ECE8E3] bg-white text-foreground transition-colors hover:bg-[#F7F5F2] active:scale-95 dark:border-border dark:bg-card dark:hover:bg-muted";
const TILE = "grid h-[52px] w-[52px] place-items-center rounded-[17px] border border-[#ECE8E3] bg-white transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-border dark:bg-card";

/** Cabeçalho dos ecrãs interiores: voltar, título ao centro, ação à direita. */
export function SubHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-2">
      <button type="button" onClick={onBack} aria-label="Voltar" className={ROUND}>
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
      {right ?? <span className="w-10" aria-hidden="true" />}
    </header>
  );
}

/** Um sintoma: o desenho num quadrado branco e o nome por baixo. Sem `onClick` é só leitura. */
export function SymptomTile({ icon, label, on, onClick, dashed }: { icon: CycleIconKind; label: string; on?: boolean; onClick?: () => void; dashed?: boolean }) {
  const inner = (
    <>
      <span className={cn(TILE, dashed && "border-dashed", on && cn(picked, "-translate-y-0.5"), onClick && "group-active:scale-[0.93]")}>
        <CycleIcon kind={icon} size={dashed ? 26 : 34} />
      </span>
      <span className={cn(on && "font-semibold text-[#0B1324] dark:text-foreground")}>{label}</span>
    </>
  );
  const cls = "group flex flex-col items-center gap-1.5 text-[11.5px] font-medium text-[#3A4150] dark:text-foreground/75";
  return onClick
    ? <button type="button" onClick={onClick} aria-pressed={on} className={cls}>{inner}</button>
    : <div className={cls}>{inner}</div>;
}

const WD_INITIAL = ["S", "T", "Q", "Q", "S", "S", "D"];
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Calendário para escolher um dia dentro de uma folha. Desenhado na página
 * (o seletor de data do sistema não abre em todos os telemóveis).
 * Dias fora de [min, max] ficam desligados.
 */
export function MiniCalendar({ value, onChange, max, min }: { value: string; onChange: (iso: string) => void; max: string; min?: string }) {
  const [month, setMonth] = useState(() => { const d = asDate(value); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const lead = (month.getDay() + 6) % 7;
  const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: n }, (_, i) => isoOf(new Date(month.getFullYear(), month.getMonth(), i + 1)));
  const firstOf = isoOf(month);
  const lastOf = days[days.length - 1];
  const canPrev = !min || firstOf > min;
  const canNext = lastOf < max;
  const move = (k: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + k, 1));

  return (
    <div className="rounded-[20px] border border-[#ECE8E3] p-3 dark:border-border">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" disabled={!canPrev} onClick={() => move(-1)} className={cn(ROUND, "h-9 w-9 disabled:opacity-30")}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {MONTHS_LONG[month.getMonth()].charAt(0).toUpperCase() + MONTHS_LONG[month.getMonth()].slice(1)} {month.getFullYear()}
        </p>
        <button type="button" aria-label="Mês seguinte" disabled={!canNext} onClick={() => move(1)} className={cn(ROUND, "h-9 w-9 disabled:opacity-30")}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WD_INITIAL.map((w, i) => <span key={i} className="pb-1 text-[11px] font-semibold text-muted-foreground">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {days.map((day) => {
          const off = day > max || (!!min && day < min);
          const on = day === value;
          return (
            <button key={day} type="button" disabled={off} onClick={() => onChange(day)} aria-pressed={on}
              className="flex h-10 items-center justify-center disabled:cursor-default">
              <span className={cn(
                "grid h-9 w-9 place-items-center rounded-full text-[14px] tabular-nums text-[#3A4150] transition-colors dark:text-foreground/80",
                off ? "text-[#CFCAC3] dark:text-muted-foreground/40" : "hover:bg-[#F7F5F2] dark:hover:bg-muted",
                on && "bg-[#0B1324] font-semibold text-white hover:bg-[#0B1324] dark:bg-foreground dark:text-background",
                day === max && !on && "font-semibold underline underline-offset-4",
              )}>
                {asDate(day).getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
