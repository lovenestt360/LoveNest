import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Camera, Heart } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { Timeline, buildTimelineEntries } from "@/features/relationship-events/Timeline";
import { AddRelationshipEventSheet } from "@/features/relationship-events/AddRelationshipEventSheet";
import type { RelationshipEvent } from "@/features/relationship-events/types";
import { useToast } from "@/hooks/use-toast";

function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function buildTimeLabel(totalDays: number): string {
  const years  = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days   = totalDays % 30;
  const parts: string[] = [];
  if (years  > 0) parts.push(`${years} ${years  === 1 ? "ano"  : "anos"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês"  : "meses"}`);
  if (days   > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const spaceId = useCoupleSpaceId();
  const time = useTimeTogether();
  const { events, createEvent, updateEvent, deleteEvent } = useRelationshipEvents(spaceId);
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RelationshipEvent | null>(null);

  const handleEdit = (event: RelationshipEvent) => {
    setEditingEvent(event);
    setSheetOpen(true);
  };

  const handleDelete = async (event: RelationshipEvent) => {
    if (!window.confirm(`Remover "${event.title}" da vossa história?`)) return;
    const { error } = await deleteEvent(event.id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  if (!profileLoading && profile?.usage_mode === "solo") {
    return <Navigate to="/" replace />;
  }

  const entries = buildTimelineEntries(events, time.startDate);
  const timeLabel = buildTimeLabel(time.days);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Nossa História</h1>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto">

        {/* Hero — contador de tempo juntos */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-500 to-rose-600 p-5 text-white shadow-[0_8px_32px_rgba(244,63,94,0.22)]">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 fill-white text-white" strokeWidth={0} />
              </div>
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">A vossa jornada</span>
            </div>

            <p className="font-serif text-[26px] font-bold leading-tight">
              {timeLabel}
            </p>
            <p className="text-[13px] text-white/60 font-medium mt-0.5">juntos</p>

            {time.startDate && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-[11px] text-white/50">
                  Desde {format(parseDateOnly(time.startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
                <p className="text-[11px] text-white/40 font-mono">
                  {time.days.toLocaleString("pt")} dias
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acesso rápido a memórias */}
        <button
          onClick={() => navigate("/memorias")}
          className="w-full glass-card glass-card-hover p-4 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">Ver as vossas memórias</p>
            <p className="text-[11px] text-muted-foreground">Fotos e momentos guardados</p>
          </div>
        </button>

        <Timeline entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
      </main>

      <button
        onClick={() => { setEditingEvent(null); setSheetOpen(true); }}
        className="fixed bottom-[100px] right-5 z-40 h-14 w-14 rounded-full bg-rose-500 text-white shadow-[0_8px_32px_rgba(244,63,94,0.32),0_2px_8px_rgba(0,0,0,0.10)] flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Adicionar data"
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </button>

      {spaceId && user && (
        <AddRelationshipEventSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          coupleSpaceId={spaceId}
          userId={user.id}
          editingEvent={editingEvent}
          onCreate={createEvent}
          onUpdate={updateEvent}
        />
      )}
    </div>
  );
}
