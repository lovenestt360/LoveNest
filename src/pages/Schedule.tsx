import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, MapPin } from "lucide-react";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday as isTodayFn, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { BlockDialog, type BlockFormValues, type ScheduleBlock } from "@/features/schedule/BlockDialog";
import { EventDialog, type EventFormValues, type ScheduleEvent } from "@/features/schedule/EventDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CAT_COLORS: Record<string, string> = {
  escola: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  trabalho: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  igreja: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  estudo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  outro: "bg-muted text-muted-foreground",
};

export default function Schedule() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<ScheduleBlock | null>(null);
  const [editEvent, setEditEvent] = useState<ScheduleEvent | null>(null);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    if (!spaceId) return;
    const [b, e] = await Promise.all([
      supabase.from("schedule_blocks").select("*").eq("couple_space_id", spaceId).order("start_time"),
      supabase.from("events").select("*").eq("couple_space_id", spaceId).order("event_date").order("start_time"),
    ]);
    if (b.data) setBlocks(b.data as ScheduleBlock[]);
    if (e.data) setEvents(e.data as ScheduleEvent[]);
  }, [spaceId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase.channel("schedule-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks", filter: `couple_space_id=eq.${spaceId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `couple_space_id=eq.${spaceId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, fetchAll]);

  // Handlers
  const saveBlock = async (v: BlockFormValues) => {
    if (!spaceId || !user) return;
    const payload = {
      couple_space_id: spaceId,
      user_id: user.id,
      title: v.title,
      category: v.category,
      day_of_week: v.day_of_week,
      start_time: v.start_time,
      end_time: v.end_time,
      location: v.location || null,
      notes: v.notes || null,
    };
    if (editBlock) {
      await supabase.from("schedule_blocks").update(payload).eq("id", editBlock.id);
    } else {
      await supabase.from("schedule_blocks").insert(payload);
    }
    setEditBlock(null);
    setBlockDialogOpen(false);
    if (spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: editBlock ? "🗓️ Rotina atualizada" : "🗓️ Nova rotina",
        body: v.title,
        url: "/agenda",
        type: "agenda",
      });
    }
  };

  const saveEvent = async (v: EventFormValues) => {
    if (!spaceId || !user) return;
    const payload = {
      couple_space_id: spaceId,
      created_by: user.id,
      title: v.title,
      event_date: v.event_date,
      start_time: v.start_time || null,
      end_time: v.end_time || null,
      location: v.location || null,
      notes: v.notes || null,
    };
    if (editEvent) {
      await supabase.from("events").update(payload).eq("id", editEvent.id);
    } else {
      await supabase.from("events").insert(payload);
    }
    setEditEvent(null);
    setEventDialogOpen(false);
    if (spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: editEvent ? "📅 Evento atualizado" : "📅 Novo evento",
        body: v.title,
        url: "/agenda",
        type: "agenda",
      });
    }
  };

  const deleteBlock = async (id: string) => {
    if (!window.confirm("Apagar esta rotina?")) return;
    await supabase.from("schedule_blocks").delete().eq("id", id);
  };
  const deleteEvent = async (id: string) => {
    if (!window.confirm("Apagar este evento?")) return;
    await supabase.from("events").delete().eq("id", id);
  };

  const today = new Date();
  const todayDow = today.getDay();
  const todayStr = format(today, "yyyy-MM-dd");

  // Today view items
  const todayBlocks = blocks.filter(b => b.day_of_week === todayDow);
  const todayEvents = events.filter(e => e.event_date === todayStr);
  const todayItems = [
    ...todayBlocks.map(b => ({ type: "block" as const, time: b.start_time, item: b })),
    ...todayEvents.map(e => ({ type: "event" as const, time: e.start_time ?? "00:00", item: e })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Week
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Calendar
  const monthStart = startOfMonth(calDate);
  const monthEnd = endOfMonth(calDate);
  const calDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: addDays(endOfMonth(calDate), 6 - endOfMonth(calDate).getDay()) });

  const eventsOnDate = (d: Date) => {
    const ds = format(d, "yyyy-MM-dd");
    return events.filter(e => e.event_date === ds);
  };
  const blocksOnDow = (dow: number) => blocks.filter(b => b.day_of_week === dow);

  const renderTimelineItem = (entry: { type: "block" | "event"; time: string; item: ScheduleBlock | ScheduleEvent }) => {
    const isBlock = entry.type === "block";
    const item = entry.item;
    return (
      <div key={item.id} className="flex gap-3 items-start">
        <div className="w-12 text-xs text-muted-foreground pt-0.5 shrink-0">{entry.time.slice(0, 5)}</div>
        <div className="flex-1 rounded-lg border bg-card p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{(item as any).title}</span>
            {isBlock && <Badge className={`text-[10px] ${CAT_COLORS[(item as ScheduleBlock).category] || CAT_COLORS.outro}`}>{(item as ScheduleBlock).category}</Badge>}
            {!isBlock && <Badge variant="outline" className="text-[10px]">Evento</Badge>}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {isBlock ? ((item as ScheduleBlock).user_id === user?.id ? "Eu" : "Par") : "Casal"}
            </span>
          </div>
          {(item as any).location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{(item as any).location}</div>
          )}
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
              if (isBlock) { setEditBlock(item as ScheduleBlock); setBlockDialogOpen(true); }
              else { setEditEvent(item as ScheduleEvent); setEventDialogOpen(true); }
            }}><Pencil className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
              if (isBlock) deleteBlock(item.id); else deleteEvent(item.id);
            }}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">{blocks.length} rotinas · {events.length} eventos</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditBlock(null); setBlockDialogOpen(true); }}>Rotina semanal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditEvent(null); setEventDialogOpen(true); }}>Evento</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Tabs defaultValue="today">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Hoje</TabsTrigger>
          <TabsTrigger value="week" className="flex-1">Semana</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1">Calendário</TabsTrigger>
        </TabsList>

        {/* TODAY */}
        <TabsContent value="today" className="space-y-3 mt-3">
          {todayItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nada agendado para hoje 🎉</p>
          ) : todayItems.map(renderTimelineItem)}
        </TabsContent>

        {/* WEEK */}
        <TabsContent value="week" className="mt-3">
          <div className="space-y-3">
            {weekDays.map((d) => {
              const dow = d.getDay();
              const dayBlocks = blocksOnDow(dow);
              const dayEvents = eventsOnDate(d);
              const hasItems = dayBlocks.length > 0 || dayEvents.length > 0;
              return (
                <div key={dow} className="space-y-1">
                  <h4 className={`text-xs font-semibold uppercase tracking-wider ${isTodayFn(d) ? "text-primary" : "text-muted-foreground"}`}>
                    {format(d, "EEEE, d MMM", { locale: pt })} {isTodayFn(d) && "· Hoje"}
                  </h4>
                  {!hasItems && <p className="text-xs text-muted-foreground pl-2">—</p>}
                  <div className="flex flex-wrap gap-1.5 pl-2">
                    {dayBlocks.map(b => (
                      <button key={b.id} className={`rounded-md px-2 py-1 text-[11px] ${CAT_COLORS[b.category] || CAT_COLORS.outro}`}
                        onClick={() => { setEditBlock(b); setBlockDialogOpen(true); }}>
                        {b.start_time.slice(0, 5)} {b.title}
                      </button>
                    ))}
                    {dayEvents.map(e => (
                      <button key={e.id} className="rounded-md border px-2 py-1 text-[11px] bg-card"
                        onClick={() => { setEditEvent(e); setEventDialogOpen(true); }}>
                        {e.start_time?.slice(0, 5) ?? "—"} {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* CALENDAR */}
        <TabsContent value="calendar" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>←</Button>
            <span className="text-sm font-medium capitalize">{format(calDate, "MMMM yyyy", { locale: pt })}</span>
            <Button variant="ghost" size="sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>→</Button>
          </div>
          <div className="grid grid-cols-7 gap-px text-center text-[10px] text-muted-foreground">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {calDays.map((d) => {
              const inMonth = d.getMonth() === calDate.getMonth();
              const dayEvts = eventsOnDate(d);
              const dayBks = blocksOnDow(d.getDay());
              const hasDots = dayEvts.length > 0 || dayBks.length > 0;
              const isSelected = selectedDay && isSameDay(d, selectedDay);
              return (
                <button
                  key={d.toISOString()}
                  className={`relative flex flex-col items-center py-1.5 rounded text-xs
                    ${!inMonth ? "text-muted-foreground/40" : ""}
                    ${isTodayFn(d) ? "font-bold text-primary" : ""}
                    ${isSelected ? "bg-accent" : "hover:bg-accent/50"}
                  `}
                  onClick={() => setSelectedDay(d)}
                >
                  {d.getDate()}
                  {hasDots && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvts.length > 0 && <span className="h-1 w-1 rounded-full bg-primary" />}
                      {dayBks.length > 0 && <span className="h-1 w-1 rounded-full bg-muted-foreground" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-sm font-medium">{format(selectedDay, "EEEE, d MMMM", { locale: pt })}</h4>
              {[
                ...blocksOnDow(selectedDay.getDay()).map(b => ({ type: "block" as const, time: b.start_time, item: b })),
                ...eventsOnDate(selectedDay).map(e => ({ type: "event" as const, time: e.start_time ?? "00:00", item: e })),
              ].sort((a, b) => a.time.localeCompare(b.time)).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nada neste dia.</p>
              ) : [
                ...blocksOnDow(selectedDay.getDay()).map(b => ({ type: "block" as const, time: b.start_time, item: b })),
                ...eventsOnDate(selectedDay).map(e => ({ type: "event" as const, time: e.start_time ?? "00:00", item: e })),
              ].sort((a, b) => a.time.localeCompare(b.time)).map(renderTimelineItem)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BlockDialog open={blockDialogOpen} onOpenChange={(o) => { setBlockDialogOpen(o); if (!o) setEditBlock(null); }} onSave={saveBlock} block={editBlock} />
      <EventDialog open={eventDialogOpen} onOpenChange={(o) => { setEventDialogOpen(o); if (!o) setEditEvent(null); }} onSave={saveEvent} event={editEvent} />
    </section>
  );
}
