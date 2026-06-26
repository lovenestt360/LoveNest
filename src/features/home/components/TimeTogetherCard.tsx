import { CalendarDays, Sparkles } from "lucide-react";

interface TimeTogetherCardProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  onSetDate?: () => void;
  hasDate: boolean;
  streak?: number;
  startDate?: string | null;
  nextSpecialDate?: { title: string; daysUntil: number } | null;
  onViewHistory?: () => void;
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function formatStartDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function TimeTogetherCard({ days, hours, minutes, seconds, onSetDate, hasDate, startDate, nextSpecialDate, onViewHistory }: TimeTogetherCardProps) {
  if (!hasDate) {
    return (
      <button
        onClick={onSetDate}
        className="glass-card w-full p-4 text-center active:scale-[0.98] transition-transform"
      >
        <p className="text-sm font-medium text-rose-500">
          Definir data do início do namoro
        </p>
      </button>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-1.5">

        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/65 mb-1">
          Tempo juntos
        </p>

        <div className="flex items-center justify-center gap-1.5">

          {/* Days — hero, rose accent */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold tabular-nums tracking-tight text-rose-500">
              {days}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-muted-foreground/65 mt-0.5">
              dias
            </span>
          </div>

          <span className="text-xs font-light text-muted-foreground/40 mb-2.5">:</span>

          {/* Hours */}
          <div className="flex flex-col items-center">
            <span className="text-base font-bold tabular-nums tracking-tight text-foreground">
              {String(hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-muted-foreground/65 mt-0.5">
              hrs
            </span>
          </div>

          <span className="text-xs font-light text-muted-foreground/40 mb-2.5">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <span className="text-base font-bold tabular-nums tracking-tight text-foreground">
              {String(minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-muted-foreground/65 mt-0.5">
              min
            </span>
          </div>

          <span className="text-xs font-light text-muted-foreground/40 mb-2.5">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <span className="text-base font-bold tabular-nums tracking-tight text-foreground/70">
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-muted-foreground/65 mt-0.5">
              seg
            </span>
          </div>

        </div>

        {/* Date micro detail */}
        {startDate && (
          <div className="flex items-center justify-center gap-1 mt-1.5">
            <CalendarDays className="w-2.5 h-2.5 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-[9px] text-muted-foreground/50 font-medium">
              Desde {formatStartDate(startDate)}
            </span>
          </div>
        )}

        {/* Next special date — tap-through to /historia */}
        {nextSpecialDate && (
          <button
            onClick={onViewHistory}
            className="flex items-center justify-center gap-1 mt-1 w-full active:opacity-60 transition-opacity"
          >
            <Sparkles className="w-2.5 h-2.5 text-rose-300" strokeWidth={1.5} />
            <span className="text-[9px] text-muted-foreground/50 font-medium">
              {nextSpecialDate.daysUntil === 0
                ? `Hoje é ${nextSpecialDate.title}`
                : `${nextSpecialDate.title} em ${nextSpecialDate.daysUntil} ${nextSpecialDate.daysUntil === 1 ? "dia" : "dias"}`}
            </span>
          </button>
        )}

      </div>
    </div>
  );
}
