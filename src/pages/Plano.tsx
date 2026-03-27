import { useState } from "react";
import { usePlano, type PlanoItem } from "@/hooks/usePlano";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock, Trash2, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Plano() {
  const { items, loading, addPlan, toggleComplete, deletePlan } = usePlano();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const ok = await addPlan(newTitle, newTime || undefined);
    if (ok) {
      setNewTitle("");
      setNewTime("");
      setIsModalOpen(false);
    }
  };

  const getTimeOnly = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "HH:mm");
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    // Sort by time if both have time
    if (a.plan_at && b.plan_at) return a.plan_at.localeCompare(b.plan_at);
    // Items with time come first
    if (a.plan_at && !b.plan_at) return -1;
    if (!a.plan_at && b.plan_at) return 1;
    
    return 0;
  });

  const pendingItems = sortedItems.filter(i => !i.completed);
  const doneItems = sortedItems.filter(i => i.completed);

  return (
    <section className="space-y-6 pb-24 max-w-2xl mx-auto px-1">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">O Plano de Hoje</h1>
          <p className="text-sm text-muted-foreground">{pendingItems.length} por fazer · {doneItems.length} concluídos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-full shadow-lg h-10 px-4">
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-60">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">Nada planeado ainda</p>
            <p className="text-sm">O que precisam de fazer hoje?</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "group flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300",
                item.completed ? "bg-muted/30 border-transparent opacity-60" : "bg-card shadow-sm hover:shadow-md"
              )}
            >
              <Checkbox 
                id={item.id}
                checked={item.completed}
                onCheckedChange={(checked) => toggleComplete(item.id, checked as boolean)}
                className="h-5 w-5 rounded-full border-2"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <label 
                    htmlFor={item.id}
                    className={cn(
                      "text-sm font-semibold leading-none cursor-pointer truncate",
                      item.completed && "line-through text-muted-foreground font-normal"
                    )}
                  >
                    {item.title}
                  </label>
                </div>
                {item.plan_at && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-primary/80 uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    {getTimeOnly(item.plan_at)}
                  </div>
                )}
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={() => deletePlan(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Plan Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">O que precisam fazer?</Label>
              <Input 
                id="title" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Ir ao ginásio, Compras..."
                className="rounded-xl h-12"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora (opcional)</Label>
              <Input 
                id="time" 
                type="time"
                value={newTime} 
                onChange={(e) => setNewTime(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAdd} 
              className="w-full rounded-xl h-12 text-md font-semibold"
              disabled={!newTitle.trim()}
            >
              Adicionar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
