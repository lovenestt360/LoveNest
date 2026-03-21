import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { computeCycleInfo, type DailySymptom } from "./useCycleData";
import type { useCycleData } from "./useCycleData";

type CycleData = ReturnType<typeof useCycleData>;

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cólicas", headache: "Dor de cabeça", nausea: "Náusea", back_pain: "Dor lombar",
  leg_pain: "Pernas", fatigue: "Fadiga", dizziness: "Tontura", breast_tenderness: "Seios",
  mood_swings: "Humor", acne: "Acne", cravings: "Desejos", bloating: "Inchaço", weakness: "Fraqueza",
  irritability: "Irritabilidade", anxiety: "Ansiedade", sadness: "Tristeza",
  sensitivity: "Sensibilidade", crying: "Choro",
  diarrhea: "Diarreia", constipation: "Obstipação", gas: "Gases",
  increased_appetite: "Apetite+",
};

export function CycleCalendar({ data }: { data: CycleData }) {
  const { profile, periods, user } = data;
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [daySymptoms, setDaySymptoms] = useState<DailySymptom | null>(null);
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch which days have symptom logs this month
  useEffect(() => {
    if (!data.targetUserId) return;
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    supabase
      .from("daily_symptoms")
      .select("day_key")
      .eq("user_id", data.targetUserId)
      .gte("day_key", from)
      .lte("day_key", to)
      .then(({ data }) => {
        setLoggedDays(new Set((data ?? []).map((d: any) => d.day_key)));
      });
  }, [data.targetUserId, year, month, daysInMonth]);

  const getDayClass = (dayStr: string) => {
    if (!profile || periods.length === 0) return "";
    for (const p of periods) {
      const end = p.end_date ?? p.start_date;
      if (dayStr >= p.start_date && dayStr <= end) return "period";
    }
    const lastP = periods[0];
    if (!lastP) return "";
    const info = computeCycleInfo(profile, lastP);
    if (info.fertileStart && info.fertileEnd && dayStr >= info.fertileStart && dayStr <= info.fertileEnd) return "fertile";
    if (info.pmsStart && info.nextPeriod && dayStr >= info.pmsStart && dayStr < info.nextPeriod) return "pms";
    return "";
  };

  // Load symptoms for selected day
  useEffect(() => {
    if (!selectedDay || !user) { setDaySymptoms(null); return; }
    supabase
      .from("daily_symptoms")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_key", selectedDay)
      .maybeSingle()
      .then(({ data }) => setDaySymptoms(data as DailySymptom | null));
  }, [selectedDay, user]);

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-base capitalize">{monthName}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={i} className="text-muted-foreground font-medium py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const cls = getDayClass(dayStr);
              const isToday = dayStr === today;
              const isSelected = dayStr === selectedDay;
              const hasLog = loggedDays.has(dayStr);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(dayStr === selectedDay ? null : dayStr)}
                  className={cn(
                    "relative aspect-square flex items-center justify-center rounded-md text-sm transition-colors",
                    isToday && "ring-2 ring-primary",
                    isSelected && "ring-2 ring-foreground",
                    cls === "period" && "bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200",
                    cls === "fertile" && "bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-200",
                    cls === "pms" && "bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200",
                    !cls && "hover:bg-accent",
                  )}
                >
                  {day}
                  {hasLog && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-foreground/50" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-300 dark:bg-red-800" /> Menstruação</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-800" /> Fértil</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-purple-300 dark:bg-purple-800" /> TPM</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-foreground/50" /> Registo</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selectedDay && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const cls = getDayClass(selectedDay);
              if (cls) {
                return <Badge className={cn("text-xs", cls === "period" ? "bg-red-100 text-red-700" : cls === "fertile" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700")}>
                  {cls === "period" ? "Menstruação" : cls === "fertile" ? "Período fértil" : "TPM"}
                </Badge>;
              }
              return null;
            })()}
            {daySymptoms ? (
              <div className="space-y-2">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {daySymptoms.pain_level > 0 && <span>Dor: {daySymptoms.pain_level}/10</span>}
                  {(daySymptoms as any).energy_level !== undefined && <span>Energia: {(daySymptoms as any).energy_level}/10</span>}
                  {(daySymptoms as any).stress > 0 && <span>Stress: {(daySymptoms as any).stress}/10</span>}
                  {daySymptoms.libido !== 5 && <span>Libido: {daySymptoms.libido}/10</span>}
                </div>
                {/* Sleep */}
                {(daySymptoms as any).sleep_hours && (
                  <p className="text-sm text-muted-foreground">
                    Sono: {(daySymptoms as any).sleep_hours}h ({(daySymptoms as any).sleep_quality})
                  </p>
                )}
                {/* Symptom badges */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(SYMPTOM_LABELS).map(([k, v]) =>
                    (daySymptoms as any)[k] ? <Badge key={k} variant="secondary" className="text-xs">{v}</Badge> : null
                  )}
                </div>
                {/* Discharge */}
                {(daySymptoms as any).discharge_type && (daySymptoms as any).discharge_type !== "seco" && (
                  <p className="text-xs text-muted-foreground">Corrimento: {(daySymptoms as any).discharge_type.replace("_", " ")}</p>
                )}
                {daySymptoms.notes && <p className="text-sm text-muted-foreground italic">{daySymptoms.notes}</p>}
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
