import { useState, useEffect, useCallback } from "react";
import { usePlano, type PlanoItem } from "@/hooks/usePlano";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { useRoutineStats } from "@/hooks/useRoutineStats";
import { RoutineCalendar } from "@/components/routine/RoutineCalendar";
import { RoutineChecklist } from "@/components/routine/RoutineChecklist";
import { RoutineProgressCards } from "@/components/routine/RoutineProgressCards";
import { PartnerRoutinePanel } from "@/components/routine/PartnerRoutinePanel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Clock, Trash2, Loader2, Calendar, 
  Flame, Calendar as CalendarIcon, ClipboardList,
  Star, User, Users, ChevronRight, Settings2
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";

type ActiveTab = "rotina" | "agenda" | "tarefas";

export default function Plano() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as ActiveTab) || "rotina";
  const navigate = useNavigate();

  // Shared Plano Data
  const { items, loading: planoLoading, addPlan, toggleComplete, updatePlan, deletePlan } = usePlano();
  
  // Routine Data (Integrated)
  const { activeItems, loading: itemsLoading } = useRoutineItems();
  const { logs, loading: logsLoading, fetchMonth, upsertLog, getLogForDay } = useRoutineLogs();
  const stats = useRoutineStats(logs);
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => { 
    if (activeTab === "rotina" || activeTab === "agenda") fetchMonth(year, month); 
  }, [year, month, fetchMonth, activeTab]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [forWhom, setForWhom] = useState<"ambos" | "me" | "partner">("ambos");

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const ok = await addPlan(newTitle, newTime || undefined, newDesc || undefined, "geral", false, forWhom);
    if (ok) {
      setNewTitle(""); setNewTime(""); setNewDesc(""); setForWhom("ambos");
      setIsModalOpen(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayLog = getLogForDay(today);
  const todayChecked = (todayLog?.checked_item_ids ?? []) as string[];

  const handleToggleRoutine = useCallback((itemId: string) => {
    const newChecked = todayChecked.includes(itemId)
      ? todayChecked.filter(id => id !== itemId)
      : [...todayChecked, itemId];
    upsertLog(today, newChecked, activeItems.length);
  }, [todayChecked, today, activeItems, upsertLog]);

  const todayDone = todayChecked.filter(id => activeItems.some(i => i.id === id)).length;
  
  const TABS = [
    { id: "rotina", label: "ROTINA", icon: Flame },
    { id: "agenda", label: "AGENDA", icon: CalendarIcon },
    { id: "tarefas", label: "TAREFAS", icon: ClipboardList },
  ];

  const glassStyle = "bg-white/40 backdrop-blur-xl border border-white/20 shadow-sm";

  // Map plans to day status for the Agenda calendar
  const agendaLogs = useMemo(() => {
    const daysWithPlans = new Set(items.map(i => i.plan_at?.slice(0, 10)).filter(Boolean));
    return Array.from(daysWithPlans).map(day => ({
      day: day as string,
      status: "completed" as const, // We'll use "completed" color to highlight days with plans
    }));
  }, [items]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-6 max-w-2xl mx-auto overflow-x-hidden">
      {/* Header Estilo iPhone */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">Plano do Dia</h1>
          <div className="p-2 rounded-2xl bg-white/60 backdrop-blur shadow-sm border border-white/40">
            <ClipboardList className="h-6 w-6 text-slate-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium capitalize">
            {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-500">Hoje</span>
        </div>
      </header>

      {/* Tab Switcher Segmented Control */}
      <div className="flex p-1 rounded-3xl bg-slate-200/40 backdrop-blur-md border border-white/20">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.3rem] transition-all duration-500 font-bold text-[11px] uppercase tracking-wider",
                isActive 
                  ? "bg-white shadow-lg text-slate-900 scale-[1.02] translate-z-10" 
                  : "text-slate-400 hover:text-slate-600 active:scale-95"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-slate-900" : "text-slate-400")} />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="inline sm:hidden">{t.label.charAt(0)}</span>
            </button>
          );
        })}
      </div>

      {/* Renderização de Conteúdo baseada em Tabs */}
      <main className="space-y-6">
        {activeTab === "rotina" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            <Button 
              variant="outline" 
              className="w-full h-16 rounded-[2rem] border-dashed bg-white/40 hover:bg-white/60 text-slate-500 font-bold border-slate-200 transition-all active:scale-[0.98]"
              onClick={() => navigate("/rotina/gerir")}
            >
              <Plus className="mr-2 h-5 w-5" /> ADICIONAR HÁBITO
            </Button>

            {itemsLoading || logsLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-6 rounded-[2.5rem]", glassStyle)}>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hoje</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{todayDone}</span>
                      <span className="text-slate-400 font-bold text-xl">/{activeItems.length}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 transition-all duration-1000" 
                        style={{ width: `${(todayDone / (activeItems.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                  <div className={cn("p-6 rounded-[2.5rem]", glassStyle)}>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Streak</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-900">{stats.streak}</span>
                      <Flame className="h-6 w-6 text-amber-500 fill-amber-500" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Dias seguidos</p>
                  </div>
                </div>

                <div className={cn("rounded-[2.5rem] overflow-hidden bg-white/30", glassStyle)}>
                  <RoutineCalendar 
                    logs={logs} 
                    year={year} 
                    month={month} 
                    onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                    onSelectDay={(day) => setSelectedDate(day)}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-2 flex items-center justify-between">
                    O Teu Checklist <span>{todayDone}/{activeItems.length}</span>
                  </p>
                  <RoutineChecklist 
                    items={activeItems} 
                    checkedIds={todayChecked} 
                    onToggle={handleToggleRoutine} 
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "agenda" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            <div className={cn("rounded-[2.5rem] overflow-hidden p-6 text-center space-y-4", glassStyle)}>
               <h3 className="text-sm font-black tracking-widest uppercase text-slate-400">Agenda de Planos</h3>
               <RoutineCalendar 
                logs={agendaLogs as any}
                year={year} 
                month={month} 
                onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                onSelectDay={(day) => setSelectedDate(day)}
                selectedDay={selectedDate}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {isSameDay(parseISO(selectedDate), new Date()) ? "Planos Hoje" : `Em ${format(parseISO(selectedDate), "d 'de' MMMM", { locale: ptBR })}`}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)} className="h-8 rounded-full text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-white/50">
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              </div>

              {planoLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
              ) : items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).length === 0 ? (
                <div className={cn("py-16 rounded-[2.5rem] text-center space-y-3 opacity-40 grayscale", glassStyle)}>
                  <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="font-bold text-slate-500">Nenhum compromisso marcado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).map(item => (
                    <div key={item.id} className={cn("flex items-center gap-4 p-5 rounded-[2.2rem] shadow-sm", glassStyle)}>
                      <Checkbox 
                        checked={item.completed} 
                        onCheckedChange={(val) => toggleComplete(item.id, val as boolean)} 
                        className="h-6 w-6 rounded-full border-2 border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold text-[16px]", item.completed && "line-through text-slate-400")}>{item.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-black uppercase tracking-widest">
                           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 text-white">
                             <Clock className="h-3 w-3" />
                             {format(parseISO(item.plan_at!), "HH:mm")}
                           </div>
                           <div className={cn("px-2 py-0.5 rounded-lg border", item.for_whom === 'ambos' ? "border-slate-400 text-slate-600 bg-white/50" : "border-transparent text-slate-400 font-bold")}>
                             {item.for_whom === 'ambos' ? "Para Ambos" : item.for_whom === 'me' ? "Só Eu" : "Só Amor"}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tarefas" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
             <Button 
                onClick={() => setIsModalOpen(true)}
                className="w-full h-16 rounded-[2rem] bg-slate-900 text-white font-black text-lg transition-all active:scale-[0.98] shadow-2xl shadow-slate-300"
              >
                <Plus className="mr-2 h-7 w-7" /> ADICIONAR TAREFA
              </Button>

              <div className="space-y-4">
                {planoLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <ClipboardList className="h-20 w-20 mb-4" />
                    <p className="font-black tracking-widest leading-none">LISTA VAZIA</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {items.map(item => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "relative group flex items-start gap-4 p-6 rounded-[2.5rem] transition-all",
                          item.completed ? "opacity-50" : "hover:shadow-xl hover:bg-white/60",
                          glassStyle
                        )}
                      >
                        <Checkbox 
                          checked={item.completed} 
                          onCheckedChange={(val) => toggleComplete(item.id, val as boolean)} 
                          className="h-8 w-8 mt-0.5 rounded-full border-2 border-slate-200" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={cn("text-xl font-black tracking-tighter leading-tight", item.completed && "line-through text-slate-400")}>
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                              {item.for_whom === 'ambos' ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                              {item.for_whom === 'ambos' ? "Ambos" : "Só um"}
                            </div>
                          </div>
                          {item.description && <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{item.description}</p>}
                          {item.plan_at && (
                            <div className="mt-4 flex items-center gap-4">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-widest">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {format(parseISO(item.plan_at), "HH:mm")}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deletePlan(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 rounded-full h-10 w-10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        )}
      </main>

      {/* Modal Estilo iPhone - Totalmente Branco/Translúcido */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[3.5rem] bg-white/80 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
          <div className="p-10 space-y-8">
            <header className="text-center space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-slate-900">Novo Plano</h2>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">O que vamos fazer?</p>
            </header>
            
            <div className="space-y-3">
              <div className="flex p-1.5 bg-slate-200/40 rounded-[1.5rem] border border-white/40">
                {(["ambos", "me", "partner"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setForWhom(v)}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                      forWhom === v ? "bg-white shadow-lg text-slate-900 scale-[1.05]" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {v === 'ambos' ? "Ambos" : v === 'me' ? "Para Mim" : "Para Amor"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Input 
                id="title" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Exemplo: Ver um filme..."
                className="h-20 rounded-[2rem] border-none bg-slate-100/50 text-center text-2xl font-black focus-visible:ring-0 placeholder:text-slate-200"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input 
                  id="time" 
                  type="time"
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-14 rounded-2xl border-none bg-slate-100/50 text-center font-black focus-visible:ring-0 pl-8"
                />
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
              </div>
              <div className="flex items-center justify-center h-14 rounded-2xl bg-white border border-slate-200/50 shadow-inner">
                 <CalendarIcon className="h-5 w-5 text-slate-300 mr-2" />
                 <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Hoje</span>
              </div>
            </div>

            <div className="space-y-2">
              <Textarea 
                id="desc" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Adicione algumas notas ou detalhes importantes aqui..."
                className="rounded-[2rem] border-none bg-slate-100/50 min-h-[100px] p-6 focus-visible:ring-0 font-medium placeholder:text-slate-300"
              />
            </div>

            <Button 
              onClick={handleAdd} 
              disabled={!newTitle.trim()}
              className="w-full h-20 rounded-[2.5rem] bg-slate-900 text-white font-black text-xl shadow-2xl shadow-slate-300 transition-all active:scale-[0.98] hover:scale-[1.02]"
            >
              Criar Plano ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
