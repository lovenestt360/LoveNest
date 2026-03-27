import { useState, useMemo } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  CalendarDays,
  User,
  Heart,
  Loader2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Flame,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useDailyPlan, type PlanItem, type PlanType, type DailyProgress } from "@/hooks/useDailyPlan";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";

export default function PlanoDoDia() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { items, history, partnerHistory, loading, partnerInfo, toggleItem, addItem, deleteItem } = useDailyPlan(selectedDate);
  
  const [viewingPartner, setViewingPartner] = useState(false);
  const [isAdding, setIsAdding] = useState<PlanType | null>(null);
  const [formData, setFormData] = useState({ title: "", time: "", notes: "", emoji: "✨" });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const myItems = useMemo(() => items.filter(i => i.user_id === user?.id), [items, user?.id]);
  const partnerItems = useMemo(() => items.filter(i => i.user_id !== user?.id), [items, user?.id]);

  const routineItems = useMemo(() => myItems.filter(i => i.type === "routine"), [myItems]);
  const partnerRoutineItems = useMemo(() => partnerItems.filter(i => i.type === "routine"), [partnerItems]);

  const progressPercent = useMemo(() => {
    if (routineItems.length === 0) return 0;
    const completed = routineItems.filter(i => i.completed).length;
    return Math.round((completed / routineItems.length) * 100);
  }, [routineItems]);

  const partnerProgressPercent = useMemo(() => {
    if (partnerRoutineItems.length === 0) return 0;
    const completed = partnerRoutineItems.filter(i => i.completed).length;
    return Math.round((completed / partnerRoutineItems.length) * 100);
  }, [partnerRoutineItems]);

  const getDayStatusColor = (date: Date, hist: DailyProgress[]) => {
    const dStr = format(date, "yyyy-MM-dd");
    const dayLog = hist.find(h => h.day === dStr);
    if (!dayLog || dayLog.completion_rate === 0) return "bg-muted";
    if (dayLog.completion_rate === 100) return "bg-green-500";
    if (dayLog.completion_rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return "text-green-500";
    if (percent >= 50) return "text-yellow-500";
    if (percent > 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
  }, []);

  const handleAdd = async () => {
    if (!isAdding || !formData.title) return;
    await addItem(isAdding, formData);
    setIsAdding(null);
    setFormData({ title: "", time: "", notes: "", emoji: "✨" });
    toast.success("Adicionado com sucesso!");
  };

  const handleDelete = async (item: PlanItem) => {
    await deleteItem(item);
    toast.success("Removido com sucesso!");
  };

  const renderRoutineContent = (
    itemList: PlanItem[], 
    hist: DailyProgress[], 
    percent: number, 
    isPartner: boolean
  ) => {
    const list = itemList.filter(i => i.type === "routine");

    return (
      <div className="space-y-6">
        {/* 1. Prominent Calendar */}
        <div className="flex justify-between items-center bg-card border rounded-3xl p-5 shadow-sm h-28">
          {last7Days.map((day) => {
            const isSel = format(day, "yyyy-MM-dd") === dateStr;
            const isTod = format(day, "yyyy-MM-dd") === todayStr;
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-2xl transition-all active:scale-95",
                  isSel ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                )}
              >
                <span className="text-[10px] font-black uppercase text-muted-foreground/60">
                  {format(day, "EEE", { locale: ptBR }).charAt(0)}
                </span>
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-black transition-all",
                  getDayStatusColor(day, hist),
                  isTod && "ring-2 ring-primary ring-offset-2 shadow-[0_0_15px_rgba(255,107,107,0.3)]",
                  isSel ? "text-white" : "text-muted-foreground"
                )}>
                  {format(day, "d")}
                </div>
              </button>
            );
          })}
        </div>

        {/* 2. Color Legend */}
        <div className="flex justify-center gap-6 px-2">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Parcial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Falhou</span>
          </div>
        </div>

        {/* 3. Smaller Progress Card */}
        <div className="bg-muted/30 border rounded-2xl p-4 flex items-center justify-between mx-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Status de Hoje</span>
            <div className="flex items-center gap-2">
              <Flame className={cn("h-4 w-4", percent > 0 ? getProgressColor(percent) : "text-muted-foreground/30")} />
              <span className={cn("text-xl font-black tabular-nums", getProgressColor(percent))}>
                {percent}%
              </span>
            </div>
          </div>
          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-1000", getProgressColor(percent).replace("text", "bg"))} 
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* 4. Habit List with new layout: [emoji] title [checkbox] */}
        <div className="space-y-3">
          {!isPartner && (
            <button
              onClick={() => setIsAdding("routine")}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border-2 border-dashed border-muted-foreground/10 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all active:scale-[0.98] bg-muted/5 group"
            >
              <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black uppercase tracking-widest">Novo Hábito</span>
            </button>
          )}

          <div className="space-y-2.5">
            {list.length > 0 ? (
              list.map((item) => (
                <div 
                  key={item.id}
                  className={cn(
                    "group relative flex items-center gap-4 p-4 rounded-[1.75rem] border transition-all duration-200",
                    item.completed 
                      ? "bg-muted/30 border-transparent opacity-60 shadow-none" 
                      : "bg-card border-border shadow-sm active:scale-[0.99]"
                  )}
                >
                  {/* Emoji Leading */}
                  <div className="h-11 w-11 rounded-2xl bg-secondary/60 flex items-center justify-center text-xl shrink-0 shadow-inner">
                    {item.itemData?.emoji || "✨"}
                  </div>

                  {/* Title Middle */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[16px] font-black tracking-tight",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </p>
                  </div>

                  {/* Checkbox Trailing */}
                  {!isPartner ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleItem(item)}
                        className={cn(
                          "h-11 w-11 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 active:scale-90",
                          item.completed 
                            ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30" 
                            : "bg-background border-muted-foreground/10 hover:border-primary/50"
                        )}
                      >
                        {item.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground/10" />}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-11 w-11 flex items-center justify-center">
                      {item.completed ? (
                        <CheckCircle2 className="h-7 w-7 text-primary/60" />
                      ) : (
                        <Circle className="h-7 w-7 text-muted-foreground/20" />
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-6 bg-muted/5 rounded-[2.5rem] border border-dashed">
                <Flame className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-xs font-black text-muted-foreground/40 uppercase tracking-widest">Nada planeado ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderList = (itemList: PlanItem[], type: PlanType, isPartnerView: boolean) => {
    const list = itemList.filter(i => i.type === type);
    
    return (
      <div className="space-y-4 pt-2">
        {!isPartnerView && (
          <button
            onClick={() => setIsAdding(type)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all active:scale-[0.98] bg-muted/5 group"
          >
            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-wider">
              Adicionar {type === "agenda" ? "Evento" : "Tarefa"}
            </span>
          </button>
        )}

        <div className="space-y-2">
          {list.length > 0 ? (
            list.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200",
                  item.completed 
                    ? "bg-muted/30 border-transparent opacity-60 shadow-none" 
                    : "bg-card border-border shadow-sm active:scale-[0.99]"
                )}
              >
                {!isPartnerView ? (
                  <Checkbox 
                    checked={item.completed} 
                    onCheckedChange={() => toggleItem(item)}
                    className="h-6 w-6 rounded-lg border-2"
                  />
                ) : (
                  item.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground/30 shrink-0" />
                  )
                )}

                <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center text-xl shrink-0">
                  {item.itemData?.emoji || (type === "agenda" ? "📅" : "✅")}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[15px] font-black tracking-tight",
                    item.completed && "line-through text-muted-foreground"
                  )}>
                    {item.title}
                  </p>
                  {(item.time || item.itemData?.notes || item.description) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.time && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" />
                          {item.time.slice(0, 5)}
                        </span>
                      )}
                      {(item.itemData?.notes || item.description) && (
                        <span className="text-[11px] text-muted-foreground truncate italic">
                          {item.itemData?.notes || item.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!isPartnerView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 px-6">
              <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                {type === "agenda" ? <CalendarDays className="h-8 w-8" /> : <ClipboardList className="h-8 w-8" />}
              </div>
              <p className="text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                {isPartnerView ? "Nada planeado ainda..." : "A tua lista está vazia"}
              </p>
            </div>
          )}
        </div>

        {!isPartnerView && partnerInfo && (
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary hover:bg-primary/5 transition-all mt-4 border border-dashed border-primary/20"
            onClick={() => setViewingPartner(true)}
          >
            Ver do {partnerInfo.name} <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const renderPartnerView = () => (
    <div className="fixed inset-0 z-[100] bg-background animate-in slide-in-from-right duration-300">
      <header className="px-6 pt-6 pb-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setViewingPartner(false)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h2 className="text-lg font-black tracking-tighter">Plano do {partnerInfo?.name}</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consulta Apenas</p>
          </div>
        </div>
        <Heart className="h-6 w-6 text-pink-500 fill-pink-500/10" />
      </header>

      <div className="px-6 py-4 pb-32 overflow-y-auto h-full space-y-6 bg-slate-50/30">
        <Tabs defaultValue="routine" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/40 p-1 rounded-[1.25rem] h-14 border">
            <TabsTrigger value="routine" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-wider">
              <Flame className="h-4 w-4 mr-2" /> Rotina
            </TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-wider">
              <CalendarDays className="h-4 w-4 mr-2" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="task" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-wider">
              <ClipboardList className="h-4 w-4 mr-2" /> Tarefas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routine" className="animate-in fade-in slide-in-from-bottom-4">
            {renderRoutineContent(partnerItems, partnerHistory, partnerProgressPercent, true)}
          </TabsContent>
          <TabsContent value="agenda" className="animate-in fade-in slide-in-from-bottom-4">
            {renderList(partnerItems, "agenda", true)}
          </TabsContent>
          <TabsContent value="task" className="animate-in fade-in slide-in-from-bottom-4">
            {renderList(partnerItems, "task", true)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      {viewingPartner && renderPartnerView()}

      <header className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Plano do Dia</h1>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground/80">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </span>
          {isToday(selectedDate) && (
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
              Hoje
            </span>
          )}
        </div>
      </header>

      <main className="px-6 flex-1">
        <Tabs defaultValue="routine" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/40 p-1 rounded-[1.25rem] h-14 border">
            <TabsTrigger value="routine" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-wider">
              <Flame className="h-4 w-4 mr-2" /> Rotina
            </TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-wider">
              <CalendarDays className="h-4 w-4 mr-2" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="task" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-black text-[10px] uppercase tracking-wider">
              <ClipboardList className="h-4 w-4 mr-2" /> Tarefas
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Sincronizando...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TabsContent value="routine">
                {renderRoutineContent(myItems, history, progressPercent, false)}
              </TabsContent>
              <TabsContent value="agenda">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {renderList(myItems, "agenda", false)}
                </div>
              </TabsContent>
              <TabsContent value="task">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {renderList(myItems, "task", false)}
                </div>
              </TabsContent>
            </div>
          )}
        </Tabs>
      </main>

      {/* Unified Creation Dialog */}
      <Dialog open={!!isAdding} onOpenChange={(open) => !open && setIsAdding(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">
              Adicionar {isAdding === "routine" ? "Hábito" : isAdding === "agenda" ? "Evento" : "Tarefa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            {isAdding === "routine" && (
              <div className="space-y-3">
                <Label htmlFor="emoji" className="text-[11px] font-black uppercase tracking-widest ml-1 opacity-70">Escolha um Emoji</Label>
                <Input
                  id="emoji"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="✨"
                  className="h-20 rounded-2xl border-2 text-center text-4xl font-bold bg-muted/20 focus:ring-4 focus:ring-primary/20 transition-all"
                  maxLength={2}
                />
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="title" className="text-[11px] font-black uppercase tracking-widest ml-1 opacity-70">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isAdding === "routine" ? "Ex: Beber água" : "Ex: Reunião, Comprar leite..."}
                className="h-14 rounded-2xl border-2 focus:ring-4 focus:ring-primary/20 transition-all font-bold text-lg"
              />
            </div>
            
            {isAdding === "agenda" && (
              <div className="space-y-3">
                <Label htmlFor="time" className="text-[11px] font-black uppercase tracking-widest ml-1 opacity-70">Horário</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-14 rounded-2xl border-2 font-bold text-lg"
                />
              </div>
            )}

            {isAdding !== "routine" && (
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest ml-1 opacity-70">Notas Adicionais</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Mais detalhes..."
                  className="h-14 rounded-2xl border-2 font-bold"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-15 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 py-6" 
              onClick={handleAdd}
              disabled={!formData.title}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
