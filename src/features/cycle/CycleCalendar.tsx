import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDayType, formatShortDate } from "./engine";
import type { DayType } from "./engine";
import type { DailySymptom, CycleData } from "./useCycleData";

// Dot color per day type — cells stay white, only dot changes
const DAY_DOTS: Partial<Record<DayType, string>> = {
  period:   "bg-rose-400",
  ovulation:"bg-emerald-500",
  fertile:  "bg-green-400",
  pms:      "bg-purple-400",
};

const BADGE_TEXT: Partial<Record<DayType, string>> = {
  period:   "Menstruação",
  ovulation:"Ovulação",
  fertile:  "Período fértil",
  pms:      "TPM",
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cólicas", headache: "Dor de cabeça", nausea: "Náusea", back_pain: "Dor lombar",
  leg_pain: "Pernas", fatigue: "Fadiga", dizziness: "Tontura", breast_tenderness: "Seios",
  mood_swings: "Humor", acne: "Acne", cravings: "Desejos", bloating: "Inchaço", weakness: "Fraqueza",
  irritability: "Irritabilidade", anxiety: "Ansiedade", sadness: "Tristeza",
  sensitivity: "Sensibilidade", crying: "Choro", diarrhea: "Diarreia",
  constipation: "Obstipação", gas: "Gases", increased_appetite: "Apetite+",
};

const LEGEND = [
  { dot: "bg-rose-400",    label: "Menstruação" },
  { dot: "bg-green-400",   label: "Fértil" },
  { dot: "bg-emerald-500", label: "Ovulação" },
  { dot: "bg-purple-400",  label: "TPM" },
  { dot: "bg-[#d4d4d4]",   label: "Registo" },
];

export function CycleCalendar({ data }: { data: CycleData }) {
  const { periods, user, engine } = data;
  const today = new Date().toISOString().slice(0, 10);

  const [year,  setYear]  = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [daySymptoms, setDaySymptoms] = useState<DailySymptom | null>(null);
  const [loggedDays,  setLoggedDays]  = useState<Set<string>>(new Set());

  const prevMonth = () => setMonth(m => m === 0  ? (setYear(y => y - 1), 11) : m - 1);
  const nextMonth = () => setMonth(m => m === 11 ? (setYear(y => y + 1), 0)  : m + 1);

  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  useEffect(() => {
    if (!data.targetUserId) return;
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to   = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    supabase.from("daily_symptoms").select("day_key")
      .eq("user_id", data.targetUserId).gte("day_key", from).lte("day_key", to)
      .then(({ data }) => setLoggedDays(new Set((data ?? []).map((d: any) => d.day_key))));
  }, [data.targetUserId, year, month, daysInMonth]);

  useEffect(() => {
    if (!selectedDay || !user) { setDaySymptoms(null); return; }
    supabase.from("daily_symptoms").select("*")
      .eq("user_id", user.id).eq("day_key", selectedDay).maybeSingle()
      .then(({ data }) => setDaySymptoms(data as DailySymptom | null));
  }, [selectedDay, user]);

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f5f5f5]">
          <button onClick={prevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors">
            <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          </button>
          <h2 className="text-sm font-semibold text-foreground capitalize">{monthName}</h2>
          <button onClick={nextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors">
            <ChevronRight className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4">
          {/* Week labels */}
          <div className="grid grid-cols-7 text-center mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <span key={i} className="text-[10px] font-medium text-[#717171] py-1">{d}</span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day    = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayType  = getDayType(dayStr, engine, periods, today);
              const dot      = DAY_DOTS[dayType];
              const isToday  = dayStr === today;
              const isSel    = dayStr === selectedDay;
              const hasLog   = loggedDays.has(dayStr);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(dayStr === selectedDay ? null : dayStr)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-150 active:scale-95",
                    isSel   ? "bg-foreground text-white"
                    : isToday ? "ring-1 ring-rose-400"
                    : "hover:bg-[#f5f5f5]"
                  )}
                >
                  <span className={cn(
                    "text-[13px] leading-none font-medium",
                    isSel    ? "text-white"
                    : isToday ? "text-rose-500 font-semibold"
                    : "text-foreground"
                  )}>
                    {day}
                  </span>
                  <div className="h-1.5 mt-1 flex items-center">
                    {dot && !isSel ? (
                      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                    ) : !dot && hasLog && !isSel ? (
                      <span className="h-1 w-1 rounded-full bg-[#d4d4d4]" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-[#f5f5f5]">
            {LEGEND.map(({ dot, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-[#717171] font-medium">
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div className="glass-card p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
            {(() => {
              const dayType = getDayType(selectedDay, engine, periods, today);
              const label   = BADGE_TEXT[dayType];
              if (!label) return null;
              return (
                <span className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-500 border border-rose-200/50">
                  {label}
                </span>
              );
            })()}
          </div>

          {daySymptoms ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Dor",    value: daySymptoms.pain_level,              show: daySymptoms.pain_level > 0 },
                  { label: "Energia",value: (daySymptoms as any).energy_level,   show: true },
                  { label: "Stress", value: (daySymptoms as any).stress,         show: (daySymptoms as any).stress > 0 },
                  { label: "Libido", value: daySymptoms.libido,                  show: true },
                ].filter(m => m.show).map(m => (
                  <div key={m.label} className="rounded-2xl border border-[#e5e5e5] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">{m.label}</p>
                    <p className="text-base font-semibold text-foreground mt-0.5">{m.value}/10</p>
                  </div>
                ))}
              </div>

              {Object.entries(SYMPTOM_LABELS).some(([k]) => (daySymptoms as any)[k]) && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(SYMPTOM_LABELS).map(([k, v]) =>
                    (daySymptoms as any)[k]
                      ? <span key={k} className="px-2.5 py-1 rounded-full border border-[#e5e5e5] text-[11px] font-medium text-foreground">{v}</span>
                      : null
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#717171]">Sem registos para este dia.</p>
          )}
        </div>
      )}
    </div>
  );
}
