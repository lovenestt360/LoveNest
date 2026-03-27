import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ClipboardList,
  Flame,
  MapPin,
  CalendarDays,
  User,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDailyPlan, type PlanItem } from "@/hooks/useDailyPlan";
import { useAuth } from "@/features/auth/AuthContext";
import { Loader2 } from "lucide-react";

export default function PlanoDoDia() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { items, loading, partnerInfo, toggleItem } = useDailyPlan(selectedDate);

  // Week days for the horizontal calendar
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
  [weekStart]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const filterItems = (type: string, userId: string) => 
    items.filter(i => i.type === type && i.user_id === userId);

  const renderItemList = (type: string, userId: string, sectionTitle: string, emptyMessage: string) => {
    const list = filterItems(type, userId);
    const isPartner = userId !== user?.id;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          {isPartner ? <Heart className="h-3 w-3 text-pink-500 fill-pink-500" /> : <User className="h-3 w-3 text-primary" />}
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
            {isPartner ? `${partnerInfo?.name || "Parceiro"}` : "Eu"}
          </h3>
          <div className="h-[1px] flex-1 bg-border/50" />
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 opacity-50">
            {list.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {list.length > 0 ? list.map(item => (
            <div 
              key={item.id}
              onClick={() => !isPartner && toggleItem(item)}
              className={cn(
                "group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                item.completed 
                  ? "bg-muted/30 border-transparent opacity-60" 
                  : "bg-card border-border shadow-sm active:scale-[0.98]",
                !isPartner && !item.completed && "hover:border-primary/30 cursor-pointer"
              )}
            >
              <div className="shrink-0">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in duration-300" />
                ) : (
                  <Circle className={cn(
                    "h-5 w-5 text-muted-foreground/30",
                    !isPartner && "group-hover:text-primary/50"
                  )} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.title}
                </p>
                {item.time && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{item.time.slice(0, 5)}</span>
                    {item.location && (
                      <>
                        <span className="mx-1">•</span>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{item.location}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <p className="text-[10px] text-muted-foreground italic px-1 opacity-60">{emptyMessage}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header & Calendar */}
      <div className="bg-card border-b pt-4 pb-2 px-4 sticky top-0 z-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Plano do Dia</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedDate(d => addDays(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center gap-1">
          {weekDays.map((date) => {
            const active = isSameDay(date, selectedDate);
            const current = isToday(date);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center flex-1 py-2 rounded-xl transition-all duration-200",
                  active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : "hover:bg-muted"
                )}
              >
                <span className={cn("text-[9px] font-bold uppercase mb-0.5", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {format(date, "EEE", { locale: pt }).slice(0, 3)}
                </span>
                <span className={cn("text-sm font-black", active ? "text-primary-foreground" : "text-foreground")}>
                  {date.getDate()}
                </span>
                {current && !active && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Sincronizando...</p>
          </div>
        ) : (
          <Tabs defaultValue="routine" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl h-12">
              <TabsTrigger value="routine" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Rotina</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Agenda</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="task" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Tarefas</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="routine" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderItemList("routine", user?.id || "", "Eu", "Nenhum hábito para hoje.")}
              {partnerInfo && renderItemList("routine", partnerInfo.id, partnerInfo.name, "O teu amor ainda não tem hábitos.")}
            </TabsContent>

            <TabsContent value="agenda" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderItemList("agenda", user?.id || "", "Eu", "Sem eventos agendados.")}
              {partnerInfo && renderItemList("agenda", partnerInfo.id, partnerInfo.name, "Sem eventos para o teu amor.")}
            </TabsContent>

            <TabsContent value="task" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderItemList("task", user?.id || "", "Eu", "Tudo feito! Sem tarefas pendentes.")}
              {partnerInfo && renderItemList("task", partnerInfo.id, partnerInfo.name, "O teu amor está livre de tarefas.")}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Button 
        size="icon" 
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/30 z-[60] animate-in bounce-in duration-500"
        onClick={() => {
          // Open creation logic - can be a simple prompt or a new page
          window.location.href = "/agenda"; // Use the legacy route temporarily for creation or a future modal
        }}
      >
        <Plus className="h-6 w-6 stroke-[3]" />
      </Button>
    </div>
  );
}
