import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeUnitProps {
  value: number;
  label: string;
}

function TimeUnit({ value, label }: TimeUnitProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-4xl md:text-5xl font-black tabular-nums text-foreground tracking-tight">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-black">{label}</span>
    </div>
  );
}

interface TimeTogetherCardProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  streak?: number;
  onSetDate?: () => void;
  hasDate: boolean;
}

export function TimeTogetherCard({ days, hours, minutes, seconds, streak = 0, onSetDate, hasDate }: TimeTogetherCardProps) {
  if (!hasDate) {
    return (
      <button
        onClick={onSetDate}
        className="glass-card w-full rounded-[2.5rem] p-6 text-center active:scale-[0.98] transition-transform"
      >
        <p className="text-sm font-bold text-primary underline underline-offset-4">
          Definir data do início do namoro 💕
        </p>
      </button>
    );
  }

  return (
    <div className="glass-card glass-card-hover rounded-[2.5rem] p-6 space-y-6 shadow-sm border-white/5">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 px-2">
        <span>Tempo juntos</span>
        {streak > 0 && (
          <span className="flex items-center gap-1.5 text-orange-500/80 font-black bg-orange-500/5 px-2 py-0.5 rounded-full border border-orange-500/10">
            <Flame className="w-3 h-3 fill-current" /> {streak} D{streak !== 1 ? "IAS" : "IA"}
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-center gap-4 md:gap-8 py-2">
        <TimeUnit value={days} label="dias" />
        <TimeUnit value={hours} label="hrs" />
        <TimeUnit value={minutes} label="min" />
        <TimeUnit value={seconds} label="seg" />
      </div>
    </div>
  );
}
