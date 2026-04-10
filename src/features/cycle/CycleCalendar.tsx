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
// DOT COLOR MAP
// ─────────────────────────────────────────────

const DOT_COLORS: Partial<Record<DayType, string>> = {
  period: "bg-rose-500",
  ovulation: "bg-green-500 ring-1 ring-green-600",
  fertile: "bg-green-400",
  pms: "bg-purple-500",
};

const BADGE_LABELS: Partial<Record<DayType, { label: string; className: string }>> = {
  period: { label: "Menstruação", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  ovulation: { label: "Ovulação", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  fertile: { label: "Período fértil", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
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

  // Fetch logged days this month
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

  // Fetch symptoms for selected day
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
      {/* ── Calendar card ── */}
      <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-black capitalize">{monthName}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3">
          {/* Week header */}
          <div className="grid grid-cols-7 text-center mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <span key={i} className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/50 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayType = getDayType(dayStr, engine, periods, today);
              const dotColor = DOT_COLORS[dayType];
              const isToday = dayStr === today;
              const isSelected = dayStr === selectedDay;
              const hasLog = loggedDays.has(dayStr);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(dayStr === selectedDay ? null : dayStr)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-150",
                    isSelected && "bg-foreground/8 scale-110 shadow-sm ring-1 ring-foreground/15",
                    isToday && !isSelected && "ring-2 ring-primary ring-offset-1",
                    !isSelected && !isToday && "hover:bg-muted/40",
                  )}
                >
                  <span className={cn(
                    "text-[13px] leading-none font-medium",
                    isToday && "font-black text-primary",
                    isSelected && "font-black",
                  )}>
                    {day}
                  </span>

                  {/* Dot row */}
                  <div className="h-1.5 mt-0.5 flex gap-0.5 items-center">
                    {dotColor ? (
                      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                    ) : hasLog ? (
                      <span className="h-1 w-1 rounded-full bg-foreground/20" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-border/30 px-1">
            {[
              { color: "bg-rose-500", label: "Menstruação" },
              { color: "bg-green-400", label: "Fértil" },
              { color: "bg-green-500 ring-1 ring-green-600", label: "Ovulação" },
              { color: "bg-purple-500", label: "TPM" },
              { color: "bg-foreground/20", label: "Registo" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selected day detail ── */}
      {selectedDay && (
        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-black">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {/* Phase badge */}
            {(() => {
              const dayType = getDayType(selectedDay, engine, periods, today);
              const badge = BADGE_LABELS[dayType];
              if (!badge) return null;
              return <Badge className={cn("text-xs font-bold rounded-full px-3", badge.className)}>{badge.label}</Badge>;
            })()}

            {daySymptoms ? (
              <div className="space-y-3">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Dor", value: daySymptoms.pain_level, suffix: "/10", show: daySymptoms.pain_level > 0 },
                    { label: "Energia", value: (daySymptoms as any).energy_level, suffix: "/10", show: (daySymptoms as any).energy_level !== undefined },
                    { label: "Stress", value: (daySymptoms as any).stress, suffix: "/10", show: (daySymptoms as any).stress > 0 },
                    { label: "Libido", value: daySymptoms.libido, suffix: "/10", show: daySymptoms.libido !== 5 },
                  ].filter(m => m.show).map(m => (
                    <div key={m.label} className="rounded-xl bg-muted/40 p-2.5 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">{m.label}</p>
                      <p className="text-sm font-black">{m.value}{m.suffix}</p>
                    </div>
                  ))}
                </div>

                {/* Sleep */}
                {(daySymptoms as any).sleep_hours && (
                  <div className="rounded-xl bg-muted/40 p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Sono</p>
                    <p className="text-sm font-black">{(daySymptoms as any).sleep_hours}h · {(daySymptoms as any).sleep_quality}</p>
                  </div>
                )}

                {/* Symptom badges */}
                {Object.entries(SYMPTOM_LABELS).some(([k]) => (daySymptoms as any)[k]) && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SYMPTOM_LABELS).map(([k, v]) =>
                      (daySymptoms as any)[k]
                        ? <span key={k} className="px-2.5 py-1 rounded-full bg-muted text-xs font-bold">{v}</span>
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
              <p className="text-sm text-muted-foreground">Sem registo neste dia.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
