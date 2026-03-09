import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: number;
  status: string;
  assigned_to: string | null;
}

export function TasksHomeCard() {
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!spaceId) return;
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status, assigned_to")
      .eq("couple_space_id", spaceId)
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: true })
      .limit(3)
      .then(({ data }) => { if (data) setTasks(data as Task[]); });
  }, [spaceId]);

  // Realtime for home card
  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase
      .channel("tasks-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `couple_space_id=eq.${spaceId}` }, () => {
        supabase
          .from("tasks")
          .select("id, title, due_date, priority, status, assigned_to")
          .eq("couple_space_id", spaceId)
          .eq("status", "open")
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: true })
          .limit(3)
          .then(({ data }) => { if (data) setTasks(data as Task[]); });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tarefas</CardTitle>
        <CardDescription>
          {tasks.length === 0 ? "Nenhuma tarefa pendente." : `${tasks.length}+ pendente${tasks.length !== 1 ? "s" : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">Tudo em dia 🎉</p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{t.title}</span>
            {t.due_date && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(t.due_date + "T00:00:00"), "d MMM", { locale: pt })}
              </span>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/tarefas")}>
            Ver todas
          </Button>
          <Button size="sm" className="flex-1" onClick={() => navigate("/tarefas?new=1")}>
            Nova tarefa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
