import { Heart } from "lucide-react";

interface TimeTogetherCardProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  hasDate: boolean;
  startDate?: string | null;
  onSetDate?: () => void;
}

// Próximo aniversário de namoro (mesmo dia/mês da data de início) —
// devolve quantos anos se completam e quantos dias faltam.
function nextAnniversary(iso: string): { years: number; daysLeft: number; pct: number } {
  const start = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let years = today.getFullYear() - start.getFullYear();
  let next = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  if (next <= today) {
    years += 1;
    next = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  }
  const prev = new Date(start.getFullYear() + years - 1, start.getMonth(), start.getDate());
  const daysLeft = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  const span = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
  return { years: Math.max(1, years), daysLeft, pct: Math.min(100, Math.round(((span - daysLeft) / span) * 100)) };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function TimeTogetherCard({ days, hours, minutes, seconds, hasDate, startDate, onSetDate }: TimeTogetherCardProps) {
  if (!hasDate) {
    return (
      <button
        type="button"
        onClick={onSetDate}
        className="flex w-full items-center gap-3 rounded-[1.6rem] border border-dashed border-rose-200 bg-card px-4 py-4 text-left active:scale-[0.99] transition-transform dark:border-rose-900/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/40">
          <Heart className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span>
          <span className="block text-[14px] font-semibold text-foreground">Desde quando estão juntos?</span>
          <span className="block text-[12px] text-muted-foreground">Define a data e o contador começa a contar.</span>
        </span>
      </button>
    );
  }

  const anniversary = startDate ? nextAnniversary(startDate) : null;

  return (
    <section className="rounded-[1.25rem] bg-card px-3.5 py-2.5 shadow-[0_1px_2px_rgba(11,19,36,0.04),0_8px_22px_-14px_rgba(11,19,36,0.14)] dark:border dark:border-border/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <Heart className="h-3 w-3 shrink-0 self-center fill-rose-500 text-rose-500" strokeWidth={0} />
          <span className="text-[24px] font-light leading-none tracking-[-0.04em] tabular-nums text-rose-500">
            {days.toLocaleString("pt-PT")}
          </span>
          <span className="truncate text-[11.5px] text-muted-foreground">{days === 1 ? "dia juntos" : "dias juntos"}</span>
        </div>

        <div
          className="flex shrink-0 items-baseline gap-0.5 text-[13px] tabular-nums text-foreground/80"
          aria-label={`${hours} horas, ${minutes} minutos e ${seconds} segundos`}
        >
          <span>{pad(hours)}</span>
          <span className="text-[9.5px] text-muted-foreground">h</span>
          <span className="ml-1">{pad(minutes)}</span>
          <span className="text-[9.5px] text-muted-foreground">m</span>
          <span className="ml-1 text-muted-foreground/60">{pad(seconds)}</span>
          <span className="text-[9.5px] text-muted-foreground">s</span>
        </div>
      </div>

      {anniversary && (
        <div className="mt-2 flex items-center gap-2.5 text-[10.5px] text-muted-foreground">
          <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950/50">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-[width] duration-700"
              style={{ width: `${anniversary.pct}%` }}
            />
          </span>
          <span className="shrink-0">
            {anniversary.daysLeft === 0 ? (
              <b className="font-semibold text-rose-500">Hoje fazem {anniversary.years} {anniversary.years === 1 ? "ano" : "anos"}</b>
            ) : (
              <>
                {anniversary.years} {anniversary.years === 1 ? "ano" : "anos"} em{" "}
                <b className="font-semibold text-foreground/80">{anniversary.daysLeft}</b> {anniversary.daysLeft === 1 ? "dia" : "dias"}
              </>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
