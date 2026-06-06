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
        className="glass-card w-full p-5 text-center active:scale-[0.98] transition-transform"
      >
        <p className="text-sm font-medium text-rose-500">
          Definir data do início do namoro
        </p>
      </button>
    );
  }

  return (
    <div
      className="glass-card overflow-hidden"
      style={{
        boxShadow: "0 2px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
        background: "linear-gradient(148deg, rgba(251,246,241,0.80) 0%, rgba(255,255,255,0) 52%), white",
      }}
    >
      <div className="p-5">

        {/* Label */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#c8bfb8" }}>
          Tempo juntos
        </p>

        {/* Days — dominant presence */}
        <div className="mb-4">
          <span
            className="text-[52px] font-extrabold tabular-nums tracking-tight leading-none text-rose-500"
          >
            {days}
          </span>
          <p className="text-[11px] font-medium mt-1.5 tracking-wide" style={{ color: "#c0b4ac" }}>
            dias de história partilhada
          </p>
        </div>

        {/* Time — secondary, receded */}
        <div
          className="flex items-center gap-3 pt-3"
          style={{ borderTop: "1px solid rgba(240,232,224,0.8)" }}
        >
          {/* Hours */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-semibold tabular-nums" style={{ color: "#a8a8a8" }}>
              {String(hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "#ccc" }}>
              hrs
            </span>
          </div>

          <span className="text-base font-light mb-3" style={{ color: "#e0d8d0" }}>:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-semibold tabular-nums" style={{ color: "#b0b0b0" }}>
              {String(minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "#ccc" }}>
              min
            </span>
          </div>

          <span className="text-base font-light mb-3" style={{ color: "#e0d8d0" }}>:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-semibold tabular-nums" style={{ color: "#b8b8b8" }}>
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "#ccc" }}>
              seg
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
