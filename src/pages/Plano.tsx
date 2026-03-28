import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlano } from "@/hooks/usePlano";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { useRoutineStats } from "@/hooks/useRoutineStats";
import { useAuth } from "@/features/auth/AuthContext";
import { RoutineCalendar } from "@/components/routine/RoutineCalendar";
import { RoutineChecklist } from "@/components/routine/RoutineChecklist";
import { RoutineProgressCards } from "@/components/routine/RoutineProgressCards";
import { PartnerRoutinePanel } from "@/components/routine/PartnerRoutinePanel";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Loader2, 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  ClipboardList, 
  LayoutGrid,
  Settings2,
  Users,
  User,
  Activity
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const TABS = [
  { id: "rotina", label: "ROTINA", icon: Activity },
  { id: "agenda", label: "AGENDA", icon: CalendarIcon },
] as const;

export default function Plano() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "rotina";
  const [routineSubTab, setRoutineSubTab] = useState<"mine" | "partner">("mine");

  // Plano Data
  const { items, loading: planoLoading, addPlan, deletePlan, toggleComplete } = usePlano();
  
  // Routine Data
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { activeItems, loading: itemsLoading } = useRoutineItems();
  const { logs, loading: logsLoading, fetchMonth, upsertLog, getLogForDay } = useRoutineLogs();
  const stats = useRoutineStats(logs);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal State
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [forWhom, setForWhom] = useState<'ambos' | 'me' | 'partner'>('ambos');

  useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

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

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const plan_at = newTime ? `${selectedDate}T${newTime}:00` : selectedDate;
    await addPlan({ title: newTitle, description: newDesc, plan_at, for_whom: forWhom });
    setNewTitle(""); setNewTime(""); setNewDesc(""); setIsModalOpen(false);
  };

  const glassStyle = "bg-white/40 backdrop-blur-xl border border-white/20 shadow-sm";

  const agendaLogs = useMemo(() => {
    const daysWithPlans = new Set(items.map(i => i.plan_at?.slice(0, 10)).filter(Boolean));
    return Array.from(daysWithPlans).map(day => ({
      day: day as string,
      status: "completed" as const,
    }));
  }, [items]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-6 max-w-2xl mx-auto overflow-x-hidden">
      {/* Header Estilo iPhone */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">Plano do Dia</h1>
          <div className="p-2 rounded-2xl bg-white/60 backdrop-blur shadow-sm border border-white/40">
            <LayoutGrid className="h-6 w-6 text-slate-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium capitalize">
            {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-500">Hoje</span>
        </div>
      </header>

      {/* Tab Switcher - Apenas ROTINA e AGENDA (Full Text) */}
      <div className="flex p-1 rounded-3xl bg-slate-200/40 backdrop-blur-md border border-white/20">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.3rem] transition-all duration-500 font-black text-xs uppercase tracking-widest",
                isActive 
                  ? "bg-white shadow-lg text-slate-900 scale-[1.02]" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Renderização de Conteúdo */}
      <main className="space-y-6">
        {activeTab === "rotina" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button
                        onClick={() => setRoutineSubTab("mine")}
                        className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all", routineSubTab === "mine" ? "bg-white shadow text-slate-900" : "text-slate-400")}
                    >Minha</button>
                    <button
                        onClick={() => setRoutineSubTab("partner")}
                        className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all", routineSubTab === "partner" ? "bg-white shadow text-slate-900" : "text-slate-400")}
                    >Do Amor</button>
                </div>
                <Button variant="ghost" size="sm" className="rounded-full text-slate-400 font-bold text-xs" onClick={() => navigate("/rotina/gerir")}>
                    <Settings2 className="h-4 w-4 mr-1.5" /> GERIR
                </Button>
            </div>

            {routineSubTab === "mine" ? (
                itemsLoading || logsLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
                ) : (
                  <>
                    <RoutineProgressCards 
                        todayLog={todayLog} 
                        todayDone={todayDone} 
                        todayTotal={activeItems.length} 
                        streak={stats.streak} 
                        avgRate={stats.avgRate} 
                        completedDays={stats.completedDays}
                        hideStreak={true}
                    />

                    <div className={cn("rounded-[2.5rem] overflow-hidden bg-white/30", glassStyle)}>
                      <RoutineCalendar 
                        logs={logs} 
                        year={year} 
                        month={month} 
                        onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                        onSelectDay={(day) => navigate(`/rotina/dia/${day}`)}
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
                )
            ) : (
                <PartnerRoutinePanel />
            )}
          </div>
        )}

        {activeTab === "agenda" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            <div className={cn("rounded-[2.5rem] overflow-hidden p-6 text-center space-y-4", glassStyle)}>
               <h3 className="text-sm font-black tracking-widest uppercase text-slate-400">Calendário de Planos</h3>
               <RoutineCalendar 
                logs={agendaLogs as any}
                year={year} 
                month={month} 
                onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                onSelectDay={(day) => setSelectedDate(day)}
                selectedDay={selectedDate}
                hideLegendStatus={["partial", "failed"]}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {isSameDay(parseISO(selectedDate), new Date()) ? "Planos Hoje" : `Planos em ${format(parseISO(selectedDate), "d/MM")}`}
                </p>
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="h-10 px-6 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                    <Plus className="mr-1.5 h-4 w-4" /> NOVO
                </Button>
              </div>

              {planoLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
              ) : items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).length === 0 ? (
                <div className={cn("py-16 rounded-[2.5rem] text-center space-y-3 opacity-40 grayscale", glassStyle)}>
                  <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="font-bold text-slate-500">Nenhum plano marcado</p>
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
                        <p className={cn("font-bold text-[16px]", item.completed && "line-through text-slate-400 text-sm")}>{item.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] font-black uppercase tracking-widest">
                           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 text-white">
                             <Clock className="h-2.5 w-2.5" />
                             {format(parseISO(item.plan_at!), "HH:mm")}
                           </div>
                           <div className="text-slate-400">
                             {item.for_whom === 'ambos' ? "Para Ambos" : item.for_whom === 'me' ? "Só Eu" : "Só Amor"}
                           </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePlan(item.id)} className="text-slate-200 hover:text-red-500 rounded-full h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* NOVO MODAL - ESTILO NATIVO iOS / CLEAN */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[3.5rem] bg-white/95 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
          <div className="p-8 space-y-8">
            <header className="text-center space-y-1">
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Novo Plano</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">O que vamos planear para hoje?</p>
            </header>
            
            <div className="space-y-6">
              {/* Assignment Switcher */}
              <div className="flex p-1 bg-slate-100/50 rounded-2xl border border-slate-200/20">
                {(["ambos", "me", "partner"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setForWhom(v)}
                    className={cn(
                      "flex-1 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300",
                      forWhom === v ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-500"
                    )}
                  >
                    {v === 'ambos' ? "Ambos" : v === 'me' ? "Eu" : "Amor"}
                  </button>
                ))}
              </div>

              {/* Input Title */}
              <div className="space-y-4">
                <Input 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título do plano..."
                  className="h-16 rounded-3xl border-none bg-slate-50 text-center text-xl font-bold focus-visible:ring-2 focus-visible:ring-slate-100 placeholder:text-slate-200"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative group">
                    <Input 
                      type="time"
                      value={newTime} 
                      onChange={(e) => setNewTime(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-slate-50 text-center font-bold focus-visible:ring-2 focus-visible:ring-slate-100 pl-8"
                    />
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm">
                     <CalendarIcon className="h-4 w-4 text-slate-300" />
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Para Hoje</span>
                  </div>
                </div>

                <Textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mais detalhes..."
                  className="rounded-[2rem] border-none bg-slate-50 min-h-[100px] p-6 focus-visible:ring-2 focus-visible:ring-slate-100 font-medium placeholder:text-slate-300"
                />
              </div>
            </div>

            <Button 
              onClick={handleAdd} 
              disabled={!newTitle.trim()}
              className="w-full h-18 py-6 rounded-[2.5rem] bg-slate-900 text-white font-black text-lg transition-all active:scale-[0.98] shadow-2xl shadow-slate-200"
            >
              CRIAR PLANO ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
