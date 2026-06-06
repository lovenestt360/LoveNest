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
    <div
      className="glass-card overflow-hidden"
      style={{
        boxShadow: "0 2px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
        background: "linear-gradient(148deg, rgba(251,246,241,0.60) 0%, rgba(255,255,255,0) 48%), white",
      }}
    >
      <div className="p-4">
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#c8bfb8" }}>
          Tempo juntos
        </p>

        <div className="flex items-center justify-center gap-2.5">

          {/* Days — dominant */}
          <div className="flex flex-col items-center">
            <span className="tabular-nums tracking-tight text-rose-500"
              style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1 }}>
              {days}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "#c0b8b0" }}>
              dias
            </span>
          </div>

          <span className="text-base font-light mb-3" style={{ color: "#e4dfd9" }}>:</span>

          {/* Hours */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold tabular-nums tracking-tight" style={{ color: "#a8a8a8" }}>
              {String(hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "#ccc" }}>
              hrs
            </span>
          </div>

          <span className="text-base font-light mb-3" style={{ color: "#e4dfd9" }}>:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold tabular-nums tracking-tight" style={{ color: "#b0b0b0" }}>
              {String(minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-medium mt-0.5" style={{ color: "#ccc" }}>
              min
            </span>
          </div>

          <span className="text-base font-light mb-3" style={{ color: "#e4dfd9" }}>:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold tabular-nums tracking-tight" style={{ color: "#b8b8b8" }}>
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
