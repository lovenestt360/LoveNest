import { cn } from "@/lib/utils";

interface TimeUnitProps {
  value: number;
  label: string;
}

function TimeUnit({ value, label }: TimeUnitProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl md:text-3xl font-black tabular-nums text-foreground tracking-tighter transition-all">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[8px] md:text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{label}</span>
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
        className="glass-card w-full rounded-[2rem] p-6 text-center active:scale-[0.98] transition-transform"
      >
        <p className="text-sm font-bold text-primary underline underline-offset-4">
          Definir data do início do namoro 💕
        </p>
      </button>
    );
  }

  return (
    <div className="glass-card rounded-[2rem] p-4 space-y-2 shadow-xl border-white/20">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
        <span>Tempo juntos</span>
      </div>
      
      <div className="flex items-center justify-center gap-3 md:gap-4">
        <TimeUnit value={days} label="dias" />
        <span className="text-xl md:text-2xl font-black text-muted-foreground/20 mt-1">:</span>
        <TimeUnit value={hours} label="hrs" />
        <span className="text-xl md:text-2xl font-black text-muted-foreground/20 mt-1">:</span>
        <TimeUnit value={minutes} label="min" />
        <span className="text-xl md:text-2xl font-black text-muted-foreground/20 mt-1">:</span>
        <TimeUnit value={seconds} label="seg" />
      </div>
    </div>
  );
}

