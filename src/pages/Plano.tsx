import { useState, useEffect, useCallback, useMemo } from "react";
import { todayLocal } from "@/lib/timezone";
import { usePlano } from "@/hooks/usePlano";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { useRoutineStats } from "@/hooks/useRoutineStats";
import { useAuth } from "@/features/auth/AuthContext";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useProfile } from "@/hooks/useProfile";
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
import { ScreenHeader, ROUND_BUTTON } from "@/components/ScreenHeader";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TABS = [
  { id: "rotina", label: "Rotina", icon: Activity },
  { id: "agenda", label: "Agenda", icon: CalendarIcon },
] as const;

export default function Plano() {
  const { user } = useAuth();
  const { partner } = usePartnerProfile();
  const { profile } = useProfile();
  const isSolo = profile?.usage_mode === "solo";
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

  const [selectedDate, setSelectedDate] = useState(todayLocal());

  // Modal State (Now Inline Form State)
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [forWhom, setForWhom] = useState<'ambos' | 'me' | 'partner'>('ambos');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

  const today = todayLocal();
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
      forWhom: isSolo ? 'me' : forWhom
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
    <div className="space-y-5 overflow-x-hidden animate-fade-in">

      <ScreenHeader
        title="Agenda"
        subtitle={`Hoje · ${format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}`}
        action={
          <button type="button" aria-label="Gerir rotina" onClick={() => navigate("/rotina/gerir")} className={ROUND_BUTTON}>
            <Settings2 className="h-[18px] w-[18px] text-[#3A4150] dark:text-muted-foreground" strokeWidth={1.8} />
          </button>
        }
      />

      <SegmentedTabs tabs={TABS} value={activeTab as (typeof TABS)[number]["id"]} onChange={id => setSearchParams({ tab: id })} />

      {/* Renderização de Conteúdo */}
      <main className="space-y-6">
        {activeTab === "rotina" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            <SegmentedTabs<"mine" | "partner">
              size="sm"
              tabs={([
                { id: "mine",    label: "Minha",         icon: User },
                { id: "partner", label: partnerFirstName, icon: Users },
              ] as const).filter(sub => !isSolo || sub.id !== "partner")}
              value={routineSubTab}
              onChange={setRoutineSubTab}
            />

            {routineSubTab === "mine" ? (
                itemsLoading || logsLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" /></div>
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
                        <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">O teu checklist</p>
                        <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{todayDone}/{activeItems.length}</span>
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
                  className="flex-1 h-11 rounded-xl border-none bg-muted font-bold text-sm focus-visible:ring-1 focus-visible:ring-border placeholder:text-muted-foreground/50"
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
                    "h-11 rounded-[14px] shrink-0 active:scale-95 transition-all font-semibold text-sm text-white [background:#0B1324] hover:[background:#0B1324] hover:opacity-90 dark:[background:hsl(var(--foreground))] dark:text-background",
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
                {/* Selector de destinatário — não faz sentido sem parceiro */}
                {!isSolo && (
                <div className="flex p-0.5 bg-muted rounded-lg w-fit">
                  {(["ambos", "me", "partner"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setForWhom(v)}
                      className={cn(
                        "px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all",
                        forWhom === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {v === "ambos" ? "Ambos" : v === "me" ? "Eu" : "Amor"}
                    </button>
                  ))}
                </div>
                )}

                {/* Data + Hora na mesma row */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-10 rounded-xl border-none bg-muted font-bold text-xs pl-8 appearance-none focus-visible:ring-1 focus-visible:ring-border"
                    />
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                  </div>
                  <div className="w-28 relative">
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="h-10 rounded-xl border-none bg-muted font-bold text-xs pl-8 focus-visible:ring-1 focus-visible:ring-border"
                    />
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
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
                <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                  {isSameDay(parseISO(selectedDate), new Date()) ? "Planos de hoje" : `Planos em ${format(parseISO(selectedDate), "d/MM")}`}
                </p>
              </div>

              {planoLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" /></div>
              ) : items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).length === 0 ? (
                <div className="glass-card py-12 text-center space-y-2">
                  <CalendarIcon className="mx-auto h-9 w-9 text-[#C9C4BD]" strokeWidth={1.6} />
                  <p className="text-[15px] font-semibold text-foreground">Nenhum plano marcado</p>
                  <p className="text-[13px] text-muted-foreground">Escreve em cima o que querem fazer.</p>
                </div>
              ) : (
                <div className="glass-card divide-y divide-[#ECE8E3] overflow-hidden dark:divide-border">
                  {items.filter(i => i.plan_at && i.plan_at.startsWith(selectedDate)).map(item => (
                    <div key={item.id} className="flex items-center gap-3 w-full px-4 py-3.5 transition-colors hover:bg-[#F7F5F2] dark:hover:bg-muted/50">
                      {/* Custom Checkbox as in RoutineChecklist */}
                      <button
                        type="button"
                        disabled={!isReady}
                        onClick={() => isReady && toggleComplete(item.id, !item.completed)}
                        className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-lg border-2 transition-all shrink-0",
                            item.completed
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-[#D5D1CB] dark:border-border",
                        )}
                      >
                        {item.completed && (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold text-[14px]", item.completed ? "line-through text-muted-foreground/50" : "text-foreground")}>{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
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
                      <Button variant="ghost" size="icon" onClick={() => isReady && deletePlan(item.id)} disabled={!isReady} className="text-muted-foreground/50 hover:text-red-500 rounded-full h-8 w-8">
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
