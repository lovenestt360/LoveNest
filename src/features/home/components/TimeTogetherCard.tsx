import { cn } from "@/lib/utils";

interface TimeTogetherCardProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  hasDate: boolean;
  startDate?: string | null;
  nextSpecialDate?: { title: string; daysUntil: number } | null;
  onSetDate?: () => void;
  onViewHistory?: () => void;
}

const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function formatStartDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Meses completos dentro do ano de relação em curso (0–11) — alimenta a
// barra segmentada, ao estilo dos cards de dados (um segmento por mês).
function monthsIntoYear(iso: string): number {
  const start = new Date(iso + "T00:00:00");
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months) % 12;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function TimeTogetherCard({
  days, hours, minutes, seconds, hasDate, startDate, nextSpecialDate, onSetDate, onViewHistory,
}: TimeTogetherCardProps) {
  if (!hasDate) {
    return (
      <button
        type="button"
        onClick={onSetDate}
        className="w-full rounded-[1.75rem] border border-dashed border-border bg-card px-5 py-6 text-left active:scale-[0.99] transition-transform"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tempo juntos</p>
        <p className="mt-2 text-[15px] font-semibold text-foreground">Desde quando estão juntos?</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Define a data e o contador começa a contar.</p>
      </button>
    );
  }

  const filled = startDate ? monthsIntoYear(startDate) : 0;
  const years = Math.floor(days / 365);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.10)]">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tempo juntos</p>
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
            Ao vivo
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[64px] font-light leading-[0.9] tracking-[-0.04em] tabular-nums text-foreground">
              {days.toLocaleString("pt-PT")}
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
              {days === 1 ? "dia" : "dias"}
            </span>
          </div>

          <div className="flex items-end gap-1.5 pb-1" aria-label={`${hours} horas, ${minutes} minutos e ${seconds} segundos`}>
            {[
              { v: hours, l: "h" },
              { v: minutes, l: "m" },
              { v: seconds, l: "s" },
            ].map(({ v, l }) => (
              <div key={l} className="flex flex-col items-center">
                <span className="min-w-[2.1rem] rounded-xl bg-muted px-1.5 py-1 text-center font-mono text-[15px] font-medium tabular-nums text-foreground">
                  {pad(v)}
                </span>
                <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground/70">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Um segmento por mês do ano de relação em curso */}
        <div className="mt-4 flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < filled ? "bg-foreground" : i === filled ? "bg-rose-500" : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {years > 0 ? `${years} ${years === 1 ? "ano" : "anos"} · ` : ""}
          Mês {filled + 1} de 12
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/70 border-t border-border/70">
        <div className="px-5 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">Desde</p>
          <p className="mt-0.5 font-mono text-[12px] font-medium text-foreground">
            {startDate ? formatStartDate(startDate) : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onViewHistory}
          disabled={!nextSpecialDate}
          className="px-5 py-3 text-left active:bg-muted/50 disabled:active:bg-transparent"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">Próximo</p>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-foreground">
            {nextSpecialDate
              ? nextSpecialDate.daysUntil === 0
                ? `Hoje · ${nextSpecialDate.title}`
                : `${nextSpecialDate.title} · ${nextSpecialDate.daysUntil}d`
              : "Sem datas marcadas"}
          </p>
        </button>
      </div>
    </section>
  );
}
