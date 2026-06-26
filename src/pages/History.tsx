import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Camera } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { Timeline, buildTimelineEntries } from "@/features/relationship-events/Timeline";
import { AddRelationshipEventSheet } from "@/features/relationship-events/AddRelationshipEventSheet";
import type { RelationshipEvent } from "@/features/relationship-events/types";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const spaceId = useCoupleSpaceId();
  const { startDate } = useTimeTogether();
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

  const entries = buildTimelineEntries(events, startDate);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Nossa História</h1>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto">
        <div className="glass-card p-4 flex items-center gap-3">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            As datas que marcam a vossa jornada, guardadas para sempre.
          </p>
        </div>

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
