import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDayType, formatShortDate } from "./engine";
import type { DayType } from "./engine";
import type { DailySymptom, CycleData } from "./useCycleData";

// ─────────────────────────────────────────────
// PREMIUM DAY STYLES — soft gradients per phase
// ─────────────────────────────────────────────

const DAY_STYLES: Partial<Record<DayType, {
  bg: string;
  dot: string;
  text: string;
}>> = {
  period: {
    bg: "bg-gradient-to-b from-rose-200/80 to-pink-200/60 dark:from-rose-800/40 dark:to-rose-900/30",
    dot: "bg-gradient-to-br from-rose-400 to-pink-400",
    text: "text-rose-700 dark:text-rose-300",
  },
  ovulation: {
    bg: "bg-gradient-to-b from-emerald-200/80 to-green-200/60 dark:from-emerald-800/40 dark:to-emerald-900/30",
    dot: "bg-gradient-to-br from-emerald-400 to-teal-400 ring-1 ring-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  fertile: {
    bg: "bg-gradient-to-b from-green-100/80 to-emerald-100/50 dark:from-green-900/20 dark:to-emerald-900/10",
    dot: "bg-gradient-to-br from-green-300 to-emerald-300",
    text: "text-green-700 dark:text-green-300",
  },
  pms: {
    bg: "bg-gradient-to-b from-purple-200/70 to-violet-200/50 dark:from-purple-900/30 dark:to-violet-900/20",
    dot: "bg-gradient-to-br from-purple-400 to-violet-400",
    text: "text-purple-700 dark:text-purple-300",
  },
};

const BADGE_LABELS: Partial<Record<DayType, { label: string; className: string }>> = {
  period: { label: "Menstruação", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  ovulation: { label: "Ovulação", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  fertile: { label: "Período fértil", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  pms: { label: "TPM", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cólicas", headache: "Dor de cabeça", nausea: "Náusea", back_pain: "Dor lombar",
  leg_pain: "Pernas", fatigue: "Fadiga", dizziness: "Tontura", breast_tenderness: "Seios",
  mood_swings: "Humor", acne: "Acne", cravings: "Desejos", bloating: "Inchaço", weakness: "Fraqueza",
  irritability: "Irritabilidade", anxiety: "Ansiedade", sadness: "Tristeza",
  sensitivity: "Sensibilidade", crying: "Choro", diarrhea: "Diarreia",
  constipation: "Obstipação", gas: "Gases", increased_appetite: "Apetite+",
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function CycleCalendar({ data }: { data: CycleData }) {
  const { periods, user, engine } = data;
  const today = new Date().toISOString().slice(0, 10);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [daySymptoms, setDaySymptoms] = useState<DailySymptom | null>(null);
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());

  const prevMonth = () => {
    setMonth((m) => { if (m === 0) { setYear((y) => y - 1); return 11; } return m - 1; });
  };
  const nextMonth = () => {
    setMonth((m) => { if (m === 11) { setYear((y) => y + 1); return 0; } return m + 1; });
  };

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  useEffect(() => {
    if (!data.targetUserId) return;
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to   = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    supabase
      .from("daily_symptoms")
      .select("day_key")
      .eq("user_id", data.targetUserId)
      .gte("day_key", from).lte("day_key", to)
      .then(({ data }) => setLoggedDays(new Set((data ?? []).map((d: any) => d.day_key))));
  }, [data.targetUserId, year, month, daysInMonth]);

  useEffect(() => {
    if (!selectedDay || !user) { setDaySymptoms(null); return; }
    supabase
      .from("daily_symptoms").select("*")
      .eq("user_id", user.id).eq("day_key", selectedDay).maybeSingle()
      .then(({ data }) => setDaySymptoms(data as DailySymptom | null));
  }, [selectedDay, user]);

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", {
    month: "long", year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* ── Calendar card — premium ── */}
      <div className="rounded-[28px] border border-border/25 bg-white/70 dark:bg-card backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/20">
          <Button variant="ghost" size="icon" onClick={prevMonth}
            className="rounded-xl h-8 w-8 hover:bg-rose-50 hover:text-rose-500 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-black capitalize tracking-tight">{monthName}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}
            className="rounded-xl h-8 w-8 hover:bg-rose-50 hover:text-rose-500 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3">
          {/* Week header */}
          <div className="grid grid-cols-7 text-center mb-1.5">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <span key={i} className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayType = getDayType(dayStr, engine, periods, today);
              const style = DAY_STYLES[dayType];
              const isToday = dayStr === today;
              const isSelected = dayStr === selectedDay;
              const hasLog = loggedDays.has(dayStr);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(dayStr === selectedDay ? null : dayStr)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-200",
                    // Phase gradient bg (when not selected)
                    style && !isSelected && style.bg,
                    // Selected: soft highlight + scale
                    isSelected && "bg-gradient-to-b from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/20 scale-105 shadow-md shadow-rose-100/60 dark:shadow-rose-900/20 ring-1 ring-rose-300/50",
                    // Today: ring
                    isToday && !isSelected && "ring-2 ring-rose-400/50 ring-offset-1 ring-offset-white dark:ring-offset-card",
                    !isSelected && !isToday && !style && "hover:bg-muted/20",
                  )}
                >
                  <span className={cn(
                    "text-[13px] leading-none font-medium transition-all",
                    isToday ? "font-black text-rose-500 dark:text-rose-400" : style ? style.text : "text-foreground/70",
                    isSelected && "font-black text-rose-600",
                  )}>
                    {day}
                  </span>

                  {/* Dot indicator */}
                  <div className="h-1.5 mt-1 flex gap-0.5 items-center">
                    {style ? (
                      <span className={cn("h-1.5 w-1.5 rounded-full transition-all", style.dot)} />
                    ) : hasLog ? (
                      <span className="h-1 w-1 rounded-full bg-foreground/15" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend — soft, premium */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-border/15 px-1">
            {[
              { bg: "bg-gradient-to-br from-rose-300 to-pink-400", label: "Menstruação" },
              { bg: "bg-gradient-to-br from-green-200 to-emerald-300", label: "Fértil" },
              { bg: "bg-gradient-to-br from-emerald-400 to-teal-400", label: "Ovulação" },
              { bg: "bg-gradient-to-br from-purple-300 to-violet-400", label: "TPM" },
              { bg: "bg-foreground/15", label: "Registo" },
            ].map(({ bg, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-medium">
                <span className={cn("h-2 w-2 rounded-full shrink-0", bg)} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selected day detail — premium card ── */}
      {selectedDay && (
        <Card className="rounded-[24px] border border-rose-100/40 shadow-sm overflow-hidden bg-white/70 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-rose-700 dark:text-rose-300">
              🌸 {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-5 px-5">
            {(() => {
              const dayType = getDayType(selectedDay, engine, periods, today);
              const badge = BADGE_LABELS[dayType];
              if (!badge) return null;
              return (
                <Badge className={cn("text-xs font-bold rounded-full px-3 py-1", badge.className)}>
                  {badge.label}
                </Badge>
              );
            })()}

            {daySymptoms ? (
              <div className="space-y-3">
                {/* Key metrics — soft cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Dor", value: daySymptoms.pain_level, suffix: "/10", show: daySymptoms.pain_level > 0 },
                    { label: "Energia", value: (daySymptoms as any).energy_level, suffix: "/10", show: (daySymptoms as any).energy_level !== undefined },
                    { label: "Stress", value: (daySymptoms as any).stress, suffix: "/10", show: (daySymptoms as any).stress > 0 },
                    { label: "Libido", value: daySymptoms.libido, suffix: "/10", show: daySymptoms.libido !== 5 },
                  ].filter(m => m.show).map(m => (
                    <div key={m.label} className="rounded-xl bg-gradient-to-br from-rose-50/60 to-pink-50/40 border border-rose-100/30 p-3 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase">{m.label}</p>
                      <p className="text-sm font-black text-rose-600">{m.value}{m.suffix}</p>
                    </div>
                  ))}
                </div>

                {/* Sleep */}
                {(daySymptoms as any).sleep_hours && (
                  <div className="rounded-xl bg-gradient-to-br from-slate-50/60 to-blue-50/30 border border-slate-100/30 p-3 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase">Sono</p>
                    <p className="text-sm font-black">{(daySymptoms as any).sleep_hours}h · {(daySymptoms as any).sleep_quality}</p>
                  </div>
                )}

                {/* Symptom badges */}
                {Object.entries(SYMPTOM_LABELS).some(([k]) => (daySymptoms as any)[k]) && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SYMPTOM_LABELS).map(([k, v]) =>
                      (daySymptoms as any)[k]
                        ? <span key={k} className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100/50 text-xs font-bold text-rose-600">{v}</span>
                        : null
                    )}
                  </div>
                )}

                {/* Discharge */}
                {(daySymptoms as any).discharge_type && (daySymptoms as any).discharge_type !== "seco" && (
                  <p className="text-xs text-muted-foreground">Corrimento: {(daySymptoms as any).discharge_type.replace("_", " ")}</p>
                )}

                {daySymptoms.notes && (
                  <p className="text-sm text-muted-foreground italic leading-relaxed">"{daySymptoms.notes}"</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">Sem registo neste dia.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
