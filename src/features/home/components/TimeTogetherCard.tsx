import { Flame } from "lucide-react";
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
  streak?: number;
  onSetDate?: () => void;
  hasDate: boolean;
}

export function TimeTogetherCard({ days, hours, minutes, seconds, streak = 0, onSetDate, hasDate }: TimeTogetherCardProps) {
  if (!hasDate) {
    return (
      <button
        onClick={onSetDate}
        className="w-full bg-white border border-slate-100 rounded-[2rem] p-8 text-center active:scale-[0.98] transition-transform shadow-apple"
      >
        <p className="text-sm font-black text-primary uppercase tracking-widest">
          Definir data do início ✨
        </p>
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-50 rounded-apple p-8 space-y-6 shadow-apple flex flex-col items-center justify-center">
      <div className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
        <span>Tempo Juntos</span>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-orange-500 font-black bg-orange-50 px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-current" /> {streak} DIAS
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-center gap-6">
        <TimeUnit value={days} label="dias" />
        <div className="h-8 w-[1px] bg-slate-100 mt-2" />
        <TimeUnit value={hours} label="hrs" />
        <div className="h-8 w-[1px] bg-slate-100 mt-2" />
        <TimeUnit value={minutes} label="min" />
        <div className="h-8 w-[1px] bg-slate-100 mt-2" />
        <TimeUnit value={seconds} label="seg" />
      </div>

      <div className="h-1 w-24 bg-slate-50 rounded-full" />
    </div>
  );
}
