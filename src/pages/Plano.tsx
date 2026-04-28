import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlano } from "@/hooks/usePlano";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { useRoutineStats } from "@/hooks/useRoutineStats";
import { useAuth } from "@/features/auth/AuthContext";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
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
  const { partner } = usePartnerProfile();
  const partnerFirstName = partner?.display_name?.split(" ")[0] ?? "Amor";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "rotina";
  const [routineSubTab, setRoutineSubTab] = useState<"mine" | "partner">("mine");

  // Plano Data
  const { items, loading: planoLoading, isReady: isPlanoReady, addPlan, deletePlan, toggleComplete } = usePlano();
  
  // Routine Data
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { activeItems, loading: itemsLoading } = useRoutineItems();
  const { logs, loading: logsLoading, isReady: isRoutineReady, canWrite: canWriteRoutine, fetchMonth, upsertLog, getLogForDay } = useRoutineLogs();
  
  const isReady = isPlanoReady;
  const stats = useRoutineStats(logs);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Modal State (Now Inline Form State)
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [forWhom, setForWhom] = useState<'ambos' | 'me' | 'partner'>('ambos');
  const [isAdding, setIsAdding] = useState(false);

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
    if (!newTitle.trim() || !isReady) return;
    await addPlan({ 
      title: newTitle, 
      description: newDesc, 
      date: selectedDate, 
      time: newTime,
      forWhom: forWhom 
    });
    setNewTitle(""); setNewTime(""); setNewDesc(""); setIsAdding(false);
  };

  const agendaLogs = useMemo(() => {
    const daysWithPlans = new Set(items.map(i => i.plan_at?.slice(0, 10)).filter(Boolean));
    return Array.from(daysWithPlans).map(day => ({
      day: day as string,
      status: "completed" as const,
    }));
  }, [items]);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-5 max-w-2xl mx-auto overflow-x-hidden">

      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Plano do Dia</h1>
          <button
            onClick={() => navigate("/rotina/gerir")}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors"
          >
            <Settings2 className="h-5 w-5 text-[#717171]" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-[#717171] capitalize">
            {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[10px] font-semibold text-[#717171]">Hoje</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-150",
                isActive ? "bg-white text-foreground shadow-sm" : "text-[#717171]"
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
            <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
              {([
                { id: "mine",    label: "Minha",         icon: User },
                { id: "partner", label: partnerFirstName, icon: Users },
              ] as const).map(sub => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setRoutineSubTab(sub.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
                      routineSubTab === sub.id ? "bg-white text-foreground shadow-sm" : "text-[#717171]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {sub.label}
                  </button>
                );
              })}
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

                    <RoutineCalendar
                      logs={logs}
                      year={year}
                      month={month}
                      onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                      onSelectDay={(day) => navigate(`/rotina/dia/${day}`)}
                    />

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">O Teu Checklist</p>
                        <span className="text-[11px] font-semibold text-[#717171]">{todayDone}/{activeItems.length}</span>
                      </div>
                      <RoutineChecklist 
                        items={activeItems} 
                        checkedIds={todayChecked} 
                        onToggle={(id) => canWriteRoutine && handleToggleRoutine(id)} 
                        readOnly={!canWriteRoutine}
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
            {/* ── Card de Input da Agenda ── */}
            <div className="glass-card overflow-hidden transition-all duration-200 ease-in-out flex flex-col">
              {/* Linha 1: Input principal + botão de ação */}
              <div className="flex items-center gap-2 p-3">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="O que vais fazer?"
                  className="flex-1 h-11 rounded-xl border-none bg-slate-50 font-bold text-sm focus-visible:ring-1 focus-visible:ring-slate-100 placeholder:text-slate-300"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      if (isAdding) handleAdd();
                      else setIsAdding(true);
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => {
                    if (isAdding) handleAdd();
                    else setIsAdding(true);
                  }}
                  disabled={isAdding && (!newTitle.trim() || !isReady)}
                  className={cn(
                    "h-11 rounded-xl shrink-0 active:scale-95 transition-all font-semibold text-sm text-white bg-rose-500 hover:bg-rose-600",
                    isAdding ? "w-24 px-3" : "w-11"
                  )}
                >
                  {isAdding ? "Guardar" : <Plus className="h-5 w-5" />}
                </Button>
              </div>

              {/* Linha 2 (colapsável): Para quem + Data + Hora */}
              <div
                className={cn(
                  "flex flex-col gap-2 px-3 transition-all duration-200 ease-in-out overflow-hidden",
                  isAdding ? "pb-3 max-h-[120px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                )}
              >
                {/* Selector de destinatário */}
                <div className="flex p-0.5 bg-slate-100 rounded-lg w-fit">
                  {(["ambos", "me", "partner"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setForWhom(v)}
                      className={cn(
                        "px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all",
                        forWhom === v ? "bg-white shadow-sm text-slate-900" : "text-slate-400"
                      )}
                    >
                      {v === "ambos" ? "Ambos" : v === "me" ? "Eu" : "Amor"}
                    </button>
                  ))}
                </div>

                {/* Data + Hora na mesma row */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-10 rounded-xl border-none bg-slate-50 font-bold text-xs pl-8 appearance-none focus-visible:ring-1 focus-visible:ring-slate-100"
                    />
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                  </div>
                  <div className="w-28 relative">
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="h-10 rounded-xl border-none bg-slate-50 font-bold text-xs pl-8 focus-visible:ring-1 focus-visible:ring-slate-100"
                    />
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <RoutineCalendar
                logs={agendaLogs as any}
                year={year} 
                month={month} 
                onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                onSelectDay={(day) => setSelectedDate(day)}
                selectedDay={selectedDate}
                hideLegendStatus={["partial", "failed"]}
              />

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
                  {isSameDay(parseISO(selectedDate), new Date()) ? "Planos Hoje" : `Planos em ${format(parseISO(selectedDate), "d/MM")}`}
                </p>
              </div>

              {planoLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
              ) : items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).length === 0 ? (
                <div className="glass-card py-14 text-center space-y-3 opacity-50">
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
                        disabled={!isReady}
                        onClick={() => isReady && toggleComplete(item.id, !item.completed)}
                        className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-lg border-2 transition-all shrink-0",
                            item.completed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-[#e5e5e5]",
                        )}
                      >
                        {item.completed && (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm", item.completed ? "line-through text-[#c4c4c4]" : "text-foreground")}>{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#717171]">
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
                      <Button variant="ghost" size="icon" onClick={() => isReady && deletePlan(item.id)} disabled={!isReady} className="text-slate-200 hover:text-red-500 rounded-full h-8 w-8">
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
