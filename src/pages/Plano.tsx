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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  GlassModal, 
  GlassModalContent, 
  GlassModalHeader, 
  GlassModalTitle, 
  GlassModalDescription 
} from "@/components/ui/GlassModal";



const TABS = [
  { id: "rotina", label: "Rotina" },
  { id: "agenda", label: "Agenda" }
];

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

  const agendaLogs = useMemo(() => {
    const daysWithPlans = new Set(items.map(i => i.plan_at?.slice(0, 10)).filter(Boolean));
    return Array.from(daysWithPlans).map(day => ({
      day: day as string,
      status: "completed" as const,
    }));
  }, [items]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-8 max-w-2xl mx-auto overflow-x-hidden animate-fade-in">
      {/* Header Estilo iPhone */}
      <header className="space-y-4 pt-4 px-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">O Plano</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-400 capitalize">
                {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
              </span>
              <div className="h-1 w-1 rounded-full bg-slate-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Hoje</span>
            </div>
          </div>
          <button 
            onClick={() => navigate("/rotina/gerir")}
            className="h-12 w-12 rounded-[1.25rem] bg-white shadow-apple flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-slate-50"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Tab Switcher - iOS Inspired */}
      <div className="p-1 rounded-[1.4rem] bg-slate-100 flex items-center border border-slate-200/20">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1.1rem] transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em]",
                isActive 
                  ? "bg-white shadow-lg text-slate-900 scale-[1.01]" 
                  : "text-slate-400 hover:text-slate-500"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Renderização de Conteúdo */}
      <main className="space-y-8">
        {activeTab === "rotina" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-8">
            <div className="flex items-center justify-center">
                <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/20">
                    <button
                        onClick={() => setRoutineSubTab("mine")}
                        className={cn(
                          "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", 
                          routineSubTab === "mine" ? "bg-white shadow-lg text-slate-900" : "text-slate-400 hover:text-slate-500"
                        )}
                    >A Minha</button>
                    <button
                        onClick={() => setRoutineSubTab("partner")}
                        className={cn(
                          "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", 
                          routineSubTab === "partner" ? "bg-white shadow-lg text-slate-900" : "text-slate-400 hover:text-slate-500"
                        )}
                    >Do Amor</button>
                </div>
            </div>

            {routineSubTab === "mine" ? (
                itemsLoading || logsLoading ? (
                  <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-slate-200" /></div>
                ) : (
                  <div className="space-y-8">
                    <RoutineProgressCards 
                        todayLog={todayLog} 
                        todayDone={todayDone} 
                        todayTotal={activeItems.length} 
                        streak={stats.streak} 
                        avgRate={stats.avgRate} 
                        completedDays={stats.completedDays}
                        hideStreak={true}
                    />

                    <div className="bg-white rounded-[2rem] border border-slate-50 shadow-apple-soft overflow-hidden p-1">
                      <RoutineCalendar 
                        logs={logs} 
                        year={year} 
                        month={month} 
                        onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                        onSelectDay={(day) => navigate(`/rotina/dia/${day}`)}
                      />
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] px-4 flex items-center justify-between">
                         O TEU CHECKLIST 
                         <span className="text-slate-400">{todayDone}/{activeItems.length}</span>
                      </h2>
                      <RoutineChecklist 
                        items={activeItems} 
                        checkedIds={todayChecked} 
                        onToggle={handleToggleRoutine} 
                      />
                    </div>
                  </div>
                )
            ) : (
                <div className="animate-in fade-in duration-500">
                  <PartnerRoutinePanel />
                </div>
            )}
          </div>
        )}

        {activeTab === "agenda" && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-8">
            <div className="bg-white rounded-[2rem] p-4 shadow-apple-soft border border-slate-50 space-y-4">
               <h3 className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-300 text-center">Calendário de Planos</h3>
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

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                  {isSameDay(parseISO(selectedDate), new Date()) ? "PLANOS HOJE" : `PLANOS EM ${format(parseISO(selectedDate), "d/MM")}`}
                </h2>
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    variant="apple"
                    size="sm"
                    className="h-9 px-5 rounded-full text-[9px] shadow-apple-soft"
                >
                    <Plus className="mr-1 h-3 w-3" /> NOVO
                </Button>
              </div>

              {planoLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-slate-200" /></div>
              ) : items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).length === 0 ? (
                <div className="py-24 rounded-[3rem] bg-slate-50/50 border border-slate-100 text-center space-y-3 grayscale opacity-40">
                  <div className="h-16 w-16 rounded-full bg-white mx-auto flex items-center justify-center shadow-sm">
                    <CalendarIcon className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-black text-[12px] text-slate-400 uppercase tracking-widest">Nenhum plano marcado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).map(item => (
                    <div key={item.id} className="group flex items-center gap-4 p-5 rounded-[1.8rem] bg-white border border-slate-50 shadow-apple-soft transition-all hover:bg-slate-50/50">
                      <Checkbox 
                        checked={item.completed} 
                        onCheckedChange={(val) => toggleComplete(item.id, val as boolean)} 
                        className="h-7 w-7 rounded-full border-2 border-slate-100 bg-slate-50 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-base font-black tracking-tight transition-all", 
                          item.completed ? "line-through text-slate-300" : "text-slate-900"
                        )}>{item.title}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                           <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/5 text-primary shadow-sm border border-primary/10">
                             <Clock className="h-2.5 w-2.5" />
                             <span className="text-[9px] font-black tabular-nums">{format(parseISO(item.plan_at!), "HH:mm")}</span>
                           </div>
                           <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
                             {item.for_whom === 'ambos' ? "Para Ambos" : item.for_whom === 'me' ? "Só Eu" : "Só Amor"}
                           </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deletePlan(item.id)} 
                        className="opacity-0 group-hover:opacity-100 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full h-10 w-10 transition-all"
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

      <GlassModal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <GlassModalContent className="p-8 space-y-8">
          <GlassModalHeader>
            <GlassModalTitle>Novo Plano</GlassModalTitle>
            <GlassModalDescription>O que vamos planear juntos hoje? ✨</GlassModalDescription>
          </GlassModalHeader>
          
          <div className="space-y-8">
            <div className="flex p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/20">
              {(["ambos", "me", "partner"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setForWhom(v)}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300",
                    forWhom === v ? "bg-white shadow-xl text-slate-900 scale-[1.05]" : "text-slate-400"
                  )}
                >
                  {v === 'ambos' ? "Ambos" : v === 'me' ? "Eu" : "Amor"}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <Input 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Exemplo: Jantar fora..."
                className="h-20 rounded-[2.5rem] border-none bg-slate-50 text-center text-2xl font-black tracking-tight focus-visible:ring-0 placeholder:text-slate-200"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input 
                    type="time"
                    value={newTime} 
                    onChange={(e) => setNewTime(e.target.value)}
                    className="h-16 rounded-2xl border-none bg-slate-50 text-center font-black text-lg focus-visible:ring-0 pl-10"
                  />
                  <Clock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                </div>
                <div className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm">
                   <CalendarIcon className="h-5 w-5 text-slate-300" />
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Planear Hoje</span>
                </div>
              </div>

              <Textarea 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Notas extra..."
                className="rounded-[2.5rem] border-none bg-slate-50 min-h-[120px] p-8 focus-visible:ring-0 font-bold text-slate-700 placeholder:text-slate-200"
              />
            </div>
          </div>

          <Button 
            onClick={handleAdd} 
            disabled={!newTitle.trim()}
            variant="apple"
            className="w-full h-16 rounded-2xl font-black text-lg shadow-apple-soft"
          >
            CRIAR PLANO 🚀
          </Button>
        </GlassModalContent>
      </GlassModal>
    </div>
  );
}
