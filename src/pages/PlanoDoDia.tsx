import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ClipboardList,
  Flame,
  Star,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDailyPlan, type PlanItem } from "@/hooks/useDailyPlan";
import { Loader2 } from "lucide-react";

export default function PlanoDoDia() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { items, loading, toggleItem } = useDailyPlan(selectedDate);

  // Week days for the horizontal calendar
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
  [weekStart]);

  const routineItems = items.filter(i => i.type === "routine");
  const agendaItems = items.filter(i => i.type === "agenda").sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const taskItems = items.filter(i => i.type === "task");

  const completedCount = items.filter(i => i.isCompleted).length;
  const totalCount = items.length;

  const renderSectionHeader = (title: string, icon: any, count?: number) => (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">{title}</h3>
      </div>
      {count !== undefined && (
        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] bg-muted/50">
          {count}
        </Badge>
      )}
    </div>
  );

  const renderItem = (item: PlanItem) => {
    const isCompleted = item.isCompleted;
    
    return (
      <div 
        key={item.id}
        onClick={() => toggleItem(item)}
        className={cn(
          "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 active:scale-[0.98]",
          isCompleted 
            ? "bg-muted/30 border-transparent opacity-70" 
            : "bg-card border-border shadow-sm hover:border-primary/30"
        )}
      >
        <div className="shrink-0">
          {isCompleted ? (
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground animate-in zoom-in duration-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-transparent group-hover:border-primary/50">
              <Circle className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-semibold truncate transition-all",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {item.title}
            </p>
            {item.type === "agenda" && item.time && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-200 bg-amber-50 text-amber-700">
                {item.time.slice(0, 5)}
              </Badge>
            )}
          </div>
          {(item.description || item.location) && (
            <div className="flex items-center gap-3 mt-1">
              {item.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {item.description}
                </p>
              )}
              {item.location && (
                <div className="flex items-center gap-1 text-[10px] text-primary/70">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{item.location}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {item.type === "routine" && (
          <div className="shrink-0 flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-600">Daily</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header & Calendar */}
      <div className="bg-card border-b pt-4 pb-2 px-4 sticky top-0 z-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Plano do Dia</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={() => setSelectedDate(d => addDays(d, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={() => setSelectedDate(d => addDays(d, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Horizontal Calendar */}
        <div className="flex justify-between items-center gap-1">
          {weekDays.map((date) => {
            const active = isSameDay(date, selectedDate);
            const current = isToday(date);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center flex-1 py-2.5 rounded-2xl transition-all duration-300",
                  active 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                    : "hover:bg-muted"
                )}
              >
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-tighter mb-1",
                  active ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {format(date, "EEE", { locale: pt })}
                </span>
                <span className={cn(
                  "text-sm font-black",
                  active ? "text-primary-foreground" : "text-foreground"
                )}>
                  {date.getDate()}
                </span>
                {current && !active && (
                    <div className="h-1 w-1 rounded-full bg-primary mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="px-4 py-6">
        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Quase lá! ✨</h2>
            <p className="text-sm text-muted-foreground font-medium">
              Concluíste {completedCount} de {totalCount} atividades hoje.
            </p>
          </div>
          <div className="relative h-14 w-14 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90">
                <circle
                    cx="28" cy="28" r="24"
                    fill="none" stroke="currentColor" strokeWidth="4"
                    className="text-primary/10"
                />
                <circle
                    cx="28" cy="28" r="24"
                    fill="none" stroke="currentColor" strokeWidth="4"
                    strokeDasharray={150}
                    strokeDashoffset={150 - (150 * (totalCount > 0 ? completedCount / totalCount : 0))}
                    className="text-primary transition-all duration-1000 ease-out"
                />
            </svg>
            <span className="absolute text-[10px] font-black">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 space-y-8 pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            <p className="text-sm text-muted-foreground font-medium">A sincronizar o teu plano...</p>
          </div>
        ) : (
          <>
            {/* ROUTINE SECTION */}
            <section>
              {renderSectionHeader("Rotina & Hábitos", <Flame className="h-4 w-4" />, routineItems.length)}
              <div className="space-y-3">
                {routineItems.length > 0 ? routineItems.map(renderItem) : (
                  <p className="text-xs text-muted-foreground italic px-1">Nenhum hábito configurado para este dia.</p>
                )}
              </div>
            </section>

            {/* AGENDA SECTION */}
            <section>
              {renderSectionHeader("Agenda & Compromissos", <Clock className="h-4 w-4" />, agendaItems.length)}
              <div className="space-y-3">
                {agendaItems.length > 0 ? agendaItems.map(renderItem) : (
                  <p className="text-xs text-muted-foreground italic px-1">Nenhum evento agendado.</p>
                )}
              </div>
            </section>

            {/* TASKS SECTION */}
            <section>
              {renderSectionHeader("Tarefas do Dia", <ClipboardList className="h-4 w-4" />, taskItems.length)}
              <div className="space-y-3">
                {taskItems.length > 0 ? taskItems.map(renderItem) : (
                  <p className="text-xs text-muted-foreground italic px-1">Sem tarefas pendentes.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Floating Action Button (Optional) */}
      <Button 
        size="icon" 
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/30 z-[60]"
        onClick={() => {
            // Logic to add new items
            // For now, simpler: redirect to manage or open dialog
            navigate("/agenda?new=true"); 
        }}
      >
        <Plus className="h-6 w-6 stroke-[3]" />
      </Button>
    </div>
  );
}
