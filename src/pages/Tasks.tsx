import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";
import { useLoveStreak } from "@/hooks/useLoveStreak";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, Trash2, Pencil } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { TaskDialog, type TaskFormValues } from "@/features/tasks/TaskDialog";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: string;
  couple_space_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: number;
  status: string;
  done_at: string | null;
  created_at: string;
}

export default function Tasks() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { recordInteraction } = useLoveStreak();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  // Auto-open dialog from home CTA
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchTasks = useCallback(async () => {
    if (!spaceId) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("couple_space_id", spaceId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  }, [spaceId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("tasks-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `couple_space_id=eq.${spaceId}` }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, fetchTasks]);

  const handleSave = async (values: TaskFormValues) => {
    if (!spaceId || !user) return;
    const assignedTo = values.assigned === "me" ? user.id : values.assigned === "partner" ? null : null;
    const assignedIsPartner = values.assigned === "partner";

    if (editingTask) {
      // For partner assignment we need partner id
      let partnerAssign: string | null = null;
      if (assignedIsPartner) {
        const { data: members } = await supabase.from("members").select("user_id").eq("couple_space_id", spaceId);
        partnerAssign = members?.find((m) => m.user_id !== user.id)?.user_id ?? null;
      }
      await supabase.from("tasks").update({
        title: values.title,
        notes: values.notes || null,
        due_date: values.due_date || null,
        priority: values.priority,
        assigned_to: values.assigned === "me" ? user.id : values.assigned === "partner" ? partnerAssign : null,
      }).eq("id", editingTask.id);
    } else {
      let partnerAssign: string | null = null;
      if (assignedIsPartner) {
        const { data: members } = await supabase.from("members").select("user_id").eq("couple_space_id", spaceId);
        partnerAssign = members?.find((m) => m.user_id !== user.id)?.user_id ?? null;
      }
      await supabase.from("tasks").insert({
        couple_space_id: spaceId,
        created_by: user.id,
        assigned_to: values.assigned === "me" ? user.id : values.assigned === "partner" ? partnerAssign : null,
        title: values.title,
        notes: values.notes || null,
        due_date: values.due_date || null,
        priority: values.priority,
      });
    }
    // Push notification for new task assigned to partner
    if (!editingTask && spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "📋 Nova tarefa",
        body: values.title.length > 80 ? values.title.slice(0, 80) + "…" : values.title,
        url: "/tarefas",
        type: "tarefas",
      });
    }
    setEditingTask(null);
    setDialogOpen(false);
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "open" ? "done" : "open";
    await supabase.from("tasks").update({
      status: newStatus,
      done_at: newStatus === "done" ? new Date().toISOString() : null,
    }).eq("id", task.id);

    // Notify partner when task completed
    if (newStatus === "done" && spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "✅ Tarefa concluída",
        body: task.title.length > 80 ? task.title.slice(0, 80) + "…" : task.title,
        url: "/tarefas",
        type: "tarefas",
      });
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm("Tens a certeza que queres apagar esta tarefa?")) return;
    await supabase.from("tasks").delete().eq("id", id);
  };

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  const todayTasks = openTasks.filter((t) => t.due_date === todayStr);
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < todayStr);
  const upcomingTasks = openTasks.filter((t) => t.due_date && t.due_date > todayStr);
  const noDueTasks = openTasks.filter((t) => !t.due_date);

  const priorityLabel = (p: number) => p === 1 ? "Alta" : p === 3 ? "Baixa" : "Média";
  const priorityColor = (p: number) => p === 1 ? "destructive" : p === 3 ? "secondary" : "outline";

  const renderTask = (task: Task) => (
    <div key={task.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={() => toggleStatus(task)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <Badge variant={priorityColor(task.priority) as any} className="text-[10px]">{priorityLabel(task.priority)}</Badge>
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(task.due_date + "T00:00:00"), "d MMM", { locale: pt })}
            </span>
          )}
          {task.assigned_to && (
            <span className="text-[10px] text-muted-foreground">
              {task.assigned_to === user?.id ? "Eu" : "Par"}
            </span>
          )}
          {!task.assigned_to && <span className="text-[10px] text-muted-foreground">Ambos</span>}
        </div>
        {task.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{task.notes}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  const renderSection = (title: string, items: Task[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{title}</h3>
        {items.map(renderTask)}
      </div>
    );
  };

  return (
    <section className="space-y-4 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">{openTasks.length} pendente{openTasks.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setEditingTask(null); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Nova
        </Button>
      </header>

      <div className="space-y-4">
        {renderSection("Atrasadas", overdueTasks)}
        {renderSection("Hoje", todayTasks)}
        {renderSection("Próximas", upcomingTasks)}
        {renderSection("Sem prazo", noDueTasks)}

        {openTasks.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma tarefa pendente 🎉</p>
        )}

        {doneTasks.length > 0 && (
          <Collapsible open={doneOpen} onOpenChange={setDoneOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                Concluídas ({doneTasks.length})
                <ChevronDown className={`h-4 w-4 transition-transform ${doneOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {doneTasks.map(renderTask)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingTask(null); }}
        onSave={handleSave}
        task={editingTask}
        userId={user?.id ?? ""}
      />
    </section>
  );
}
