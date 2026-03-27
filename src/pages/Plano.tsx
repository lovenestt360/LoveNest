import { useState } from "react";
import { usePlano, type PlanoItem } from "@/hooks/usePlano";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Clock, Trash2, Loader2, Calendar, 
  Home, Briefcase, Heart, Stethoscope, Star, 
  ChevronDown, ChevronUp, AlertCircle, Bookmark
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "geral", label: "Geral", icon: Bookmark, color: "text-slate-500", bg: "bg-slate-100" },
  { id: "casa", label: "Casa", icon: Home, color: "text-blue-500", bg: "bg-blue-100" },
  { id: "trabalho", label: "Trabalho", icon: Briefcase, color: "text-amber-600", bg: "bg-amber-100" },
  { id: "lazer", label: "Lazer", icon: Heart, color: "text-rose-500", bg: "bg-rose-100" },
  { id: "saude", label: "Saúde", icon: Stethoscope, color: "text-emerald-500", bg: "bg-emerald-100" },
];

export default function Plano() {
  const { items, loading, addPlan, toggleComplete, updatePlan, deletePlan } = usePlano();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("geral");
  const [isImp, setIsImp] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const ok = await addPlan(newTitle, newTime || undefined, newDesc || undefined, newCat, isImp);
    if (ok) {
      setNewTitle("");
      setNewTime("");
      setNewDesc("");
      setNewCat("geral");
      setIsImp(false);
      setIsModalOpen(false);
    }
  };

  const getTimeOnly = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "HH:mm");
  };

  const pendingItems = items.filter(i => !i.completed);
  const doneItems = items.filter(i => i.completed);

  return (
    <section className="space-y-6 pb-24 max-w-2xl mx-auto px-1">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">O Plano do Dia</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {pendingItems.length} pendentes · {doneItems.length} feitos
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-full shadow-lg h-11 px-5 font-bold transition-transform active:scale-95">
          <Plus className="mr-1.5 h-5 w-5" /> Adicionar
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-70">
          <div className="h-20 w-20 rounded-[2rem] bg-muted/50 flex items-center justify-center shadow-inner">
            <Calendar className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-xl font-bold">Quadro em branco</p>
            <p className="text-sm text-muted-foreground">O que o casal tem planeado para hoje?</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
            const CatIcon = cat.icon;
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "group relative flex items-start gap-4 rounded-3xl border p-5 transition-all duration-300",
                  item.completed 
                    ? "bg-muted/20 border-transparent opacity-60" 
                    : item.is_important 
                      ? "bg-gradient-to-br from-card to-amber-50/30 border-amber-200/50 shadow-sm" 
                      : "bg-card shadow-sm hover:shadow-md"
                )}
              >
                <div className="mt-1">
                  <Checkbox 
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={(checked) => toggleComplete(item.id, checked as boolean)}
                    className="h-6 w-6 rounded-full border-2 transition-transform active:scale-90"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label 
                      htmlFor={item.id}
                      className={cn(
                        "text-[16px] font-bold tracking-tight cursor-pointer",
                        item.completed && "line-through text-muted-foreground font-medium"
                      )}
                    >
                      {item.title}
                    </label>
                    {item.is_important && !item.completed && (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400 animate-pulse" />
                    )}
                  </div>

                  {(item.description || item.plan_at || item.category !== 'geral') && (
                    <div className="mt-2 space-y-2">
                      {item.description && (
                        <p className={cn(
                          "text-[13px] leading-relaxed",
                          item.completed ? "text-muted-foreground/70" : "text-muted-foreground"
                        )}>
                          {item.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3">
                        {item.category !== 'geral' && (
                          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider", cat.bg, cat.color)}>
                            <CatIcon className="h-3 w-3" />
                            {cat.label}
                          </div>
                        )}
                        
                        {item.plan_at && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-primary transition-colors">
                            <Clock className="h-3 w-3" />
                            {getTimeOnly(item.plan_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 transition-colors",
                      item.is_important ? "text-amber-500 bg-amber-50" : "text-muted-foreground hover:text-amber-500"
                    )}
                    onClick={() => updatePlan(item.id, { is_important: !item.is_important })}
                  >
                    <Star className={cn("h-4 w-4", item.is_important && "fill-current")} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deletePlan(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Plan Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <DialogTitle className="text-2xl font-black tracking-tight">Novo Plano</DialogTitle>
            <p className="text-primary-foreground/70 text-sm font-medium">Organizem o vosso dia juntos ✨</p>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest text-muted-foreground">O que vão fazer?</Label>
              <Input 
                id="title" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Jantar fora, Compras, Ginásio..."
                className="rounded-2xl h-12 border-muted bg-muted/30 focus-visible:ring-primary font-semibold"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notas (opcional)</Label>
              <Textarea 
                id="desc" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detalhes, morada ou lista de itens..."
                className="rounded-2xl min-h-[80px] border-muted bg-muted/30 focus-visible:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hora</Label>
                <div className="relative">
                  <Input 
                    id="time" 
                    type="time"
                    value={newTime} 
                    onChange={(e) => setNewTime(e.target.value)}
                    className="rounded-2xl h-12 border-muted bg-muted/30 focus-visible:ring-primary pl-10 font-bold"
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Importante?</Label>
                <button 
                  type="button"
                  onClick={() => setIsImp(!isImp)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-2xl h-12 border font-bold transition-all",
                    isImp ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-muted/30 border-muted text-muted-foreground"
                  )}
                >
                  <Star className={cn("h-4 w-4", isImp && "fill-current")} />
                  {isImp ? "Sim" : "Não"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Categoria</Label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCat(cat.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1.5",
                        newCat === cat.id 
                          ? "border-primary bg-primary/10 text-primary glow-sm" 
                          : "border-muted bg-muted/10 text-muted-foreground hover:bg-muted/30"
                      )}
                      title={cat.label}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t border-muted/30">
            <Button 
              onClick={handleAdd} 
              className="w-full rounded-2xl h-14 text-md font-black shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              disabled={!newTitle.trim()}
            >
              Confirmar Plano ✨
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
