import { useState, useMemo } from "react";
import { format, isToday } from "date-fns";
import { pt } from "date-fns/locale";
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
import { useDailyPlan, type PlanItem, type PlanType } from "@/hooks/useDailyPlan";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";

export default function PlanoDoDia() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { items, loading, partnerInfo, toggleItem, addItem, deleteItem } = useDailyPlan(selectedDate);
  
  const [viewingPartner, setViewingPartner] = useState(false);
  const [isAdding, setIsAdding] = useState<PlanType | null>(null);
  const [formData, setFormData] = useState({ title: "", time: "", notes: "" });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const myItems = useMemo(() => items.filter(i => i.user_id === user?.id), [items, user?.id]);
  const partnerItems = useMemo(() => items.filter(i => i.user_id !== user?.id), [items, user?.id]);

  const handleAdd = async () => {
    if (!isAdding || !formData.title) return;
    
    await addItem(isAdding, formData);
    setIsAdding(null);
    setFormData({ title: "", time: "", notes: "" });
    toast.success("Adicionado com sucesso!");
  };

  const handleDelete = async (item: PlanItem) => {
    await deleteItem(item);
    toast.success("Removido com sucesso!");
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
              Adicionar {type === "routine" ? "Hábito" : type === "agenda" ? "Evento" : "Tarefa"}
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
                    ? "bg-muted/30 border-transparent opacity-60" 
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

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[15px] font-black tracking-tight",
                    item.completed && "line-through text-muted-foreground"
                  )}>
                    {item.title}
                  </p>
                  {(item.time || item.location || item.description) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.time && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" />
                          {item.time.slice(0, 5)}
                        </span>
                      )}
                      {item.description && (
                        <span className="text-[11px] text-muted-foreground truncate italic">
                          {item.description}
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
                {type === "routine" ? <Flame className="h-8 w-8" /> : type === "agenda" ? <CalendarDays className="h-8 w-8" /> : <ClipboardList className="h-8 w-8" />}
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

      <div className="px-6 py-4 pb-32 overflow-y-auto h-full">
        <Tabs defaultValue="routine" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/40 p-1 rounded-[1.25rem] h-14 border">
            <TabsTrigger value="routine" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
              <Flame className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-wider">Rotina</span>
            </TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
              <CalendarDays className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-wider">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="task" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
              <ClipboardList className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-wider">Tarefas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routine">{renderList(partnerItems, "routine", true)}</TabsContent>
          <TabsContent value="agenda">{renderList(partnerItems, "agenda", true)}</TabsContent>
          <TabsContent value="task">{renderList(partnerItems, "task", true)}</TabsContent>
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
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
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
            <TabsTrigger value="routine" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
              <Flame className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-wider">Rotina</span>
            </TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
              <CalendarDays className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-wider">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="task" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all">
              <ClipboardList className="h-4 w-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-wider">Tarefas</span>
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Sincronizando...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TabsContent value="routine">{renderList(myItems, "routine", false)}</TabsContent>
              <TabsContent value="agenda">{renderList(myItems, "agenda", false)}</TabsContent>
              <TabsContent value="task">{renderList(myItems, "task", false)}</TabsContent>
            </div>
          )}
        </Tabs>
      </main>

      {/* Creation Dialogs */}
      <Dialog open={!!isAdding} onOpenChange={(open) => !open && setIsAdding(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              Adicionar {isAdding === "routine" ? "Hábito" : isAdding === "agenda" ? "Evento" : "Tarefa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[11px] font-black uppercase tracking-widest ml-1">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Treinar, Reunião, Comprar leite..."
                className="h-12 rounded-xl"
              />
            </div>
            {isAdding === "agenda" && (
              <div className="space-y-2">
                <Label htmlFor="time" className="text-[11px] font-black uppercase tracking-widest ml-1">Horário (Opcional)</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
            )}
            {isAdding !== "routine" && (
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest ml-1">Notas (Opcional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes extras..."
                  className="h-12 rounded-xl"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest" 
              onClick={handleAdd}
              disabled={!formData.title}
            >
              Criar {isAdding === "routine" ? "Hábito" : isAdding === "agenda" ? "Evento" : "Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
