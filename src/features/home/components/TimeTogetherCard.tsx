import { cn } from "@/lib/utils";

function TimeUnit({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn(
        "text-3xl font-bold tabular-nums tracking-tight transition-colors",
        accent ? "text-rose-500" : "text-foreground"
      )}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] text-[#aaa] uppercase tracking-widest font-medium mt-0.5">
        {label}
      </span>
    </div>
  );
}

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
    <div className="glass-card overflow-hidden">
      {/* Gradient header strip */}
      <div
        className="h-[2px] w-full"
        style={{ background: "linear-gradient(to right, rgba(255,107,143,0.3), rgba(77,124,254,0.2), transparent)" }}
      />
      <div className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#aaa] mb-4">
          Tempo juntos
        </p>
        <div className="flex items-center justify-center gap-3">
          <TimeUnit value={days}    label="dias" accent={days > 0} />
          <span className="text-xl font-light text-[#e0e0e0] mb-4">:</span>
          <TimeUnit value={hours}   label="hrs" />
          <span className="text-xl font-light text-[#e0e0e0] mb-4">:</span>
          <TimeUnit value={minutes} label="min" />
          <span className="text-xl font-light text-[#e0e0e0] mb-4">:</span>
          <TimeUnit value={seconds} label="seg" />
        </div>
      </div>
    </div>
  );
}
