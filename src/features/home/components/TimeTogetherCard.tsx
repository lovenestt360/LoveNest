import { cn } from "@/lib/utils";

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums text-foreground tracking-tight">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] text-[#717171] uppercase tracking-widest font-medium mt-0.5">
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
    <div className="glass-card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-4">
        Tempo juntos
      </p>
      <div className="flex items-center justify-center gap-4">
        <TimeUnit value={days}    label="dias" />
        <span className="text-2xl font-light text-[#d4d4d4] mb-4">:</span>
        <TimeUnit value={hours}   label="hrs" />
        <span className="text-2xl font-light text-[#d4d4d4] mb-4">:</span>
        <TimeUnit value={minutes} label="min" />
        <span className="text-2xl font-light text-[#d4d4d4] mb-4">:</span>
        <TimeUnit value={seconds} label="seg" />
      </div>
    </div>
  );
}
