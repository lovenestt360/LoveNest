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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  // Modal State (Now Inline Form State)
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
            {/* NOVO: Formulário Inline Estilo Rotina (Simples) */}
            <div className={cn("rounded-2xl border bg-card p-4 space-y-4 shadow-sm", glassStyle)}>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                {(["ambos", "me", "partner"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setForWhom(v)}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                      forWhom === v ? "bg-white shadow-sm text-slate-900" : "text-slate-400"
                    )}
                  >
                    {v === 'ambos' ? "Ambos" : v === 'me' ? "Eu" : "Amor"}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Novo plano..."
                  className="flex-1 h-10 rounded-xl border-none bg-slate-50 font-medium text-sm"
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                />
                <Input 
                  type="time"
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-24 h-10 rounded-xl border-none bg-slate-50 font-bold text-xs"
                />
                <Button 
                  size="icon" 
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="h-10 w-10 rounded-xl bg-slate-900 text-white shrink-0 shadow-lg active:scale-95 transition-all"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className={cn("rounded-[2.5rem] overflow-hidden bg-white/30", glassStyle)}>
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
              </div>

              {planoLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
              ) : items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).length === 0 ? (
                <div className={cn("py-16 rounded-[2.5rem] text-center space-y-3 opacity-40 grayscale", glassStyle)}>
                  <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="font-bold text-slate-500">Nenhum plano marcado</p>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card divide-y overflow-hidden shadow-sm">
                  {items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).map(item => (
                    <div key={item.id} className="flex items-center gap-3 w-full px-4 py-4 transition-colors hover:bg-slate-50/50">
                      {/* Custom Checkbox as in RoutineChecklist */}
                      <button
                        type="button"
                        onClick={() => toggleComplete(item.id, !item.completed)}
                        className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-lg border-2 transition-all shrink-0",
                            item.completed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-slate-200",
                        )}
                      >
                        {item.completed && (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold text-sm", item.completed && "line-through text-slate-400")}>{item.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                           <div className="flex items-center gap-1 opacity-60">
                             <Clock className="h-2.5 w-2.5" />
                             {format(parseISO(item.plan_at!), "HH:mm")}
                           </div>
                           <span>•</span>
                           <div>
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
    </div>
  );
}
