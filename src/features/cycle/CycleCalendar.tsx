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
// PREMIUM PINK DAY STYLES — minimal & cohesive
// ─────────────────────────────────────────────

const DAY_STYLES: Partial<Record<DayType, {
  bg: string;
  dot: string;
  text: string;
}>> = {
  period: {
    bg: "bg-gradient-to-b from-[#FADADD]/80 to-[#F8BBD0]/60 dark:from-rose-800/40 dark:to-rose-900/30",
    dot: "bg-gradient-to-br from-[#E94E77] to-[#F06292]",
    text: "text-[#E94E77] font-black",
  },
  ovulation: {
    bg: "bg-[#FADADD]/30 dark:from-emerald-800/40 dark:to-emerald-900/30",
    dot: "bg-[#F06292] ring-1 ring-[#F8BBD0]/40",
    text: "text-[#F06292] font-black",
  },
  fertile: {
    bg: "bg-[#FADADD]/10 dark:from-green-900/20 dark:to-emerald-900/10",
    dot: "bg-[#F8BBD0]",
    text: "text-[#777777]/80 font-bold",
  },
  pms: {
    bg: "bg-slate-50/50 dark:from-purple-900/30 dark:to-violet-900/20",
    dot: "bg-slate-300",
    text: "text-slate-500",
  },
};

const BADGE_LABELS: Partial<Record<DayType, { label: string; className: string }>> = {
  period: { label: "Menstruação", className: "bg-[#FADADD] text-[#E94E77] border-none" },
  ovulation: { label: "Ovulação", className: "bg-[#FADADD]/40 text-[#F06292] border-none" },
  fertile: { label: "Período fértil", className: "bg-[#F5F5F5] text-[#777777] border-none" },
  pms: { label: "TPM", className: "bg-slate-50 text-slate-500 border-none" },
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cólicas", headache: "Dor de cabeça", nausea: "Náusea", back_pain: "Dor lombar",
  leg_pain: "Pernas", fatigue: "Fadiga", dizziness: "Tontura", breast_tenderness: "Seios",
  mood_swings: "Humor", acne: "Acne", cravings: "Desejos", bloating: "Inchaço", weakness: "Fraqueza",
  irritability: "Irritabilidade", anxiety: "Ansiedade", sadness: "Tristeza",
  sensitivity: "Sensibilidade", crying: "Choro", diarrhea: "Diarreia",
  constipation: "Obstipação", gas: "Gases", increased_appetite: "Apetite+",
};

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
      <div className="rounded-[28px] border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-50">
          <Button variant="ghost" size="icon" onClick={prevMonth}
            className="rounded-xl h-8 w-8 hover:bg-rose-50 hover:text-[#E94E77] transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-black capitalize tracking-tight text-[#E94E77]">{monthName}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}
            className="rounded-xl h-8 w-8 hover:bg-rose-50 hover:text-[#E94E77] transition-colors">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 text-center mb-1.5">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
              <span key={i} className="text-[9px] font-black uppercase tracking-wider text-[#777777]/30 py-1">
                {d}
              </span>
            ))}
          </div>

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
                  onClick={() => setSelectedDay(dayStr === selectedDay ? null : dayStr)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-200",
                    style && !isSelected && style.bg,
                    isSelected && "bg-[#FADADD]/60 scale-105 shadow-md shadow-rose-100 ring-1 ring-[#F8BBD0]/50",
                    isToday && !isSelected && "ring-2 ring-[#E94E77]/30 ring-offset-1",
                    !isSelected && !isToday && !style && "hover:bg-slate-50",
                  )}
                >
                  <span className={cn(
                    "text-[13px] leading-none font-medium transition-all",
                    isToday ? "font-black text-[#E94E77]" : isSelected ? "text-[#E94E77]" : style ? style.text : "text-[#777777]",
                  )}>
                    {day}
                  </span>
                  <div className="h-1.5 mt-1 flex gap-0.5 items-center">
                    {style ? (
                      <span className={cn("h-1.5 w-1.5 rounded-full transition-all", style.dot)} />
                    ) : hasLog ? (
                      <span className="h-1 w-1 rounded-full bg-slate-200" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-50 px-1">
            {[
              { bg: "bg-gradient-to-br from-[#E94E77] to-[#F06292]", label: "Menstruação" },
              { bg: "bg-[#F8BBD0]", label: "Fértil" },
              { bg: "bg-[#F06292] ring-1 ring-[#F8BBD0]/40", label: "Ovulação" },
              { bg: "bg-slate-300", label: "Registo" },
            ].map(({ bg, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] text-[#777777]/50 font-black uppercase tracking-widest">
                <span className={cn("h-2 w-2 rounded-full shrink-0", bg)} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selectedDay && (
        <Card className="rounded-[24px] border-none shadow-xl overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-2">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-[#E94E77]">
              🌸 {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-5 px-5">
            {(() => {
              const dayType = getDayType(selectedDay, engine, periods, today);
              const badge = BADGE_LABELS[dayType];
              if (!badge) return null;
              return <Badge className={cn("text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1 shadow-sm", badge.className)}>{badge.label}</Badge>;
            })()}

            {daySymptoms ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Dor", value: daySymptoms.pain_level, show: daySymptoms.pain_level > 0 },
                    { label: "Energia", value: (daySymptoms as any).energy_level, show: true },
                    { label: "Stress", value: (daySymptoms as any).stress, show: (daySymptoms as any).stress > 0 },
                    { label: "Libido", value: daySymptoms.libido, show: true },
                  ].filter(m => m.show).map(m => (
                    <div key={m.label} className="rounded-xl bg-[#F5F5F5] p-3 transition-all hover:bg-[#FADADD]/20 border border-transparent hover:border-[#F8BBD0]/30">
                      <p className="text-[9px] text-[#777777]/60 font-black uppercase tracking-widest">{m.label}</p>
                      <p className="text-sm font-black text-[#E94E77]">{m.value}/10</p>
                    </div>
                  ))}
                </div>
                {Object.entries(SYMPTOM_LABELS).some(([k]) => (daySymptoms as any)[k]) && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SYMPTOM_LABELS).map(([k, v]) =>
                      (daySymptoms as any)[k] ? <span key={k} className="px-2.5 py-1 rounded-full bg-[#FADADD]/40 border border-[#F8BBD0]/50 text-[10px] font-black uppercase tracking-widest text-[#E94E77]">{v}</span> : null
                    )}
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-[#777777]/50 italic">Sem registos.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
