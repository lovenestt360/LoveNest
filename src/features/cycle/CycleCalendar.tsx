import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Droplet, Sprout, Sparkles, Moon, HeartHandshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDayType } from "./engine";
import type { DayType } from "./engine";
import type { DailySymptom, CycleData } from "./useCycleData";

// Cell background per day type — cada fase com a sua própria intensidade,
// para se distinguirem à primeira vista (fértil e ovulação já não são a
// mesma cor; TPM ganha tom próprio em vez de cinzento neutro).
const DAY_BG: Partial<Record<DayType, string>> = {
  period:    "bg-rose-100/80 dark:bg-rose-950/40",
  fertile:   "bg-rose-50 dark:bg-rose-950/20",
  ovulation: "bg-rose-200/70 dark:bg-rose-900/40",
  pms:       "bg-orange-50 dark:bg-orange-950/20",
};

// Marker dot per day type (ovulation gets a Sparkles icon instead)
const DAY_DOT: Partial<Record<DayType, string>> = {
  period:  "bg-rose-500",
  fertile: "bg-rose-300",
  pms:     "bg-orange-400",
};

const DAY_ICONS: Partial<Record<DayType, LucideIcon>> = {
  period: Droplet, fertile: Sprout, ovulation: Sparkles, pms: Moon,
};

const DAY_BADGE_STYLE: Partial<Record<DayType, string>> = {
  period:    "bg-rose-50 dark:bg-rose-950/30 text-rose-500 border-rose-200/50 dark:border-rose-800/50",
  fertile:   "bg-rose-50 dark:bg-rose-950/30 text-rose-400 border-rose-200/50 dark:border-rose-800/50",
  ovulation: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 border-rose-300/50 dark:border-rose-700/50",
  pms:       "bg-orange-50 dark:bg-orange-950/30 text-orange-500 border-orange-200/50 dark:border-orange-800/50",
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

type LegendItem = { swatch?: string; markerDot?: string; markerIcon?: LucideIcon; iconColor?: string; label: string };

const LEGEND: LegendItem[] = [
  { swatch: "bg-rose-100 dark:bg-rose-950/40", markerDot: "bg-rose-500",   label: "Menstruação" },
  { swatch: "bg-rose-50 dark:bg-rose-950/20",  markerDot: "bg-rose-300",   label: "Fértil" },
  { swatch: "bg-rose-200 dark:bg-rose-900/40", markerIcon: Sparkles,       iconColor: "text-rose-600 dark:text-rose-300", label: "Ovulação" },
  { swatch: "bg-orange-50 dark:bg-orange-950/20", markerDot: "bg-orange-400", label: "TPM" },
  { markerDot: "bg-muted-foreground/50",       label: "Registo" },
  { markerIcon: HeartHandshake,                iconColor: "text-pink-400", label: "Intimidade" },
];

export function CycleCalendar({ data }: { data: CycleData }) {
  const { periods, engine, intimacyLogs, targetUserId } = data;
  const today = new Date().toISOString().slice(0, 10);
  const intimacyDays = new Set(intimacyLogs.map((l) => l.day_key));

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
    if (!selectedDay || !targetUserId) { setDaySymptoms(null); return; }
    supabase.from("daily_symptoms").select("*")
      .eq("user_id", targetUserId).eq("day_key", selectedDay).maybeSingle()
      .then(({ data }) => setDaySymptoms(data as DailySymptom | null));
  }, [selectedDay, targetUserId]);

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden">

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <button onClick={prevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          </button>
          <h2 className="text-sm font-semibold text-foreground capitalize">{monthName}</h2>
          <button onClick={nextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4">
          {/* Week labels */}
          <div className="grid grid-cols-7 text-center mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <span key={i} className="text-[10px] font-medium text-muted-foreground py-1">{d}</span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day    = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayType  = getDayType(dayStr, engine, periods, today);
              const bg        = DAY_BG[dayType];
              const isToday  = dayStr === today;
              const isSel    = dayStr === selectedDay;
              const hasLog   = loggedDays.has(dayStr);
              const hasIntimacy = intimacyDays.has(dayStr);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(dayStr === selectedDay ? null : dayStr)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-150 active:scale-95",
                    isSel ? "bg-foreground text-background" : bg ?? "hover:bg-muted",
                    isToday && !isSel && "ring-1 ring-rose-400"
                  )}
                >
                  {hasLog && !isSel && (
                    <span className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-muted-foreground/50" />
                  )}
                  {hasIntimacy && !isSel && (
                    <HeartHandshake className="absolute top-1 left-1 h-2.5 w-2.5 text-pink-400" strokeWidth={2} />
                  )}
                  <span className={cn(
                    "text-[13px] leading-none font-medium",
                    isSel    ? "text-background"
                    : isToday ? "text-rose-500 font-semibold"
                    : "text-foreground"
                  )}>
                    {day}
                  </span>
                  <div className="h-3 mt-1 flex items-center justify-center">
                    {isSel ? null
                      : dayType === "ovulation" ? <Sparkles className="h-3 w-3 text-rose-600 dark:text-rose-300" strokeWidth={2} />
                      : DAY_DOT[dayType] ? <span className={cn("h-1.5 w-1.5 rounded-full", DAY_DOT[dayType])} />
                      : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border">
            {LEGEND.map(({ swatch, markerDot, markerIcon: Icon, iconColor, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <span className={cn("h-4 w-4 rounded-md flex items-center justify-center shrink-0", swatch)}>
                  {Icon ? <Icon className={cn("h-2.5 w-2.5", iconColor ?? "text-rose-600 dark:text-rose-300")} strokeWidth={2} />
                   : markerDot ? <span className={cn("h-1.5 w-1.5 rounded-full", markerDot)} /> : null}
                </span>
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
              const Icon = DAY_ICONS[dayType];
              return (
                <span className={cn("inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", DAY_BADGE_STYLE[dayType])}>
                  {Icon && <Icon className="h-3 w-3" strokeWidth={1.5} />}
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
                  <div key={m.label} className="rounded-2xl border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                    <p className="text-base font-semibold text-foreground mt-0.5">{m.value}/10</p>
                  </div>
                ))}
              </div>

              {Object.entries(SYMPTOM_LABELS).some(([k]) => (daySymptoms as any)[k]) && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(SYMPTOM_LABELS).map(([k, v]) =>
                    (daySymptoms as any)[k]
                      ? <span key={k} className="px-2.5 py-1 rounded-full border border-border text-[11px] font-medium text-foreground">{v}</span>
                      : null
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem registos para este dia.</p>
          )}
        </div>
      )}
    </div>
  );
}
