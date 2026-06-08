interface TimeTogetherCardProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  onSetDate?: () => void;
  hasDate: boolean;
  streak?: number;
}

export function TimeTogetherCard({ days, hours, minutes, seconds, onSetDate, hasDate }: TimeTogetherCardProps) {
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

        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#aaa] mb-1">
          Tempo juntos
        </p>

        <div className="flex items-center justify-center gap-1.5">

          {/* Days — hero, rose accent */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold tabular-nums tracking-tight text-rose-500">
              {days}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-[#aaa] mt-0.5">
              dias
            </span>
          </div>

          <span className="text-xs font-light text-[#ddd] mb-2.5">:</span>

          {/* Hours */}
          <div className="flex flex-col items-center">
            <span className="text-base font-bold tabular-nums tracking-tight text-[#171717]">
              {String(hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-[#aaa] mt-0.5">
              hrs
            </span>
          </div>

          <span className="text-xs font-light text-[#ddd] mb-2.5">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <span className="text-base font-bold tabular-nums tracking-tight text-[#171717]">
              {String(minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-[#aaa] mt-0.5">
              min
            </span>
          </div>

          <span className="text-xs font-light text-[#ddd] mb-2.5">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <span className="text-base font-bold tabular-nums tracking-tight text-[#333]">
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium text-[#aaa] mt-0.5">
              seg
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
