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
    <section className="rounded-[1.6rem] bg-card px-4 pt-3.5 pb-3 shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border dark:border-border/60">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/80">
        <Heart className="h-[15px] w-[15px] text-rose-500" strokeWidth={2.2} />
        Tempo juntos
      </p>

      <div className="mt-1.5 flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[52px] font-light leading-[0.95] tracking-[-0.045em] tabular-nums text-rose-500">
            {days.toLocaleString("pt-PT")}
          </span>
          <span className="text-[14px] font-medium text-foreground/70">{days === 1 ? "dia" : "dias"}</span>
        </div>

        <div className="flex gap-3 pb-0.5" aria-label={`${hours} horas, ${minutes} minutos e ${seconds} segundos`}>
          {[
            { v: hours, k: "horas" },
            { v: minutes, k: "min" },
            { v: seconds, k: "seg", faint: true },
          ].map(({ v, k, faint }) => (
            <div key={k} className="min-w-[30px] text-center">
              <span className={`block text-[22px] font-normal leading-none tracking-[-0.02em] tabular-nums ${faint ? "text-muted-foreground/60" : "text-foreground"}`}>
                {pad(v)}
              </span>
              <span className="mt-1 block text-[10.5px] text-muted-foreground">{k}</span>
            </div>
          ))}
        </div>
      </div>

      {anniversary && (
        <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-2.5 text-[12.5px] text-foreground/75">
          <span className="shrink-0">
            {anniversary.daysLeft === 0 ? (
              <b className="font-semibold text-rose-500">Hoje fazem {anniversary.years} {anniversary.years === 1 ? "ano" : "anos"}!</b>
            ) : (
              <>
                {anniversary.years} {anniversary.years === 1 ? "ano" : "anos"} juntos em{" "}
                <b className="font-semibold text-foreground">{anniversary.daysLeft}</b> {anniversary.daysLeft === 1 ? "dia" : "dias"}
              </>
            )}
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950/50">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-[width] duration-700"
              style={{ width: `${anniversary.pct}%` }}
            />
          </span>
        </div>
      )}
    </section>
  );
}
