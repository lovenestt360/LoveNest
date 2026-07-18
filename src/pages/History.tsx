import { useState, useMemo, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Camera, Heart, BookOpen, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { Timeline, buildTimelineEntries } from "@/features/relationship-events/Timeline";
import { AddRelationshipEventSheet } from "@/features/relationship-events/AddRelationshipEventSheet";
import { EVENT_TYPE_CONFIG, EVENT_COLORS } from "@/features/relationship-events/types";
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
  if (years  > 0) parts.push(`${years} ${years  === 1 ? "ano"   : "anos"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês"   : "meses"}`);
  if (days   > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
}

// ── Etapa 2: Momento em destaque ──────────────────────────────────────────────
function FeaturedMoment({ event }: { event: RelationshipEvent }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!event.image_path) return;
    supabase.storage
      .from("memories")
      .createSignedUrl(event.image_path, 3600)
      .then(({ data }) => { if (data) setImgUrl(data.signedUrl); });
  }, [event.image_path]);

  const config = EVENT_TYPE_CONFIG[event.event_type];
  const colors = EVENT_COLORS[event.event_type] ?? EVENT_COLORS.custom;
  const Icon   = config?.icon ?? Sparkles;
  const dateStr = format(parseDateOnly(event.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={1.5} />
        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
          Capítulo mais recente
        </span>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-md">
        {imgUrl ? (
          /* With photo — full bleed image + gradient overlay */
          <div className="relative">
            <img src={imgUrl} alt="" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 bg-white/20 backdrop-blur-sm"
                  )}
                >
                  <Icon className="w-3 h-3 text-white" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold text-white/90">{config?.label}</span>
                </span>
              </div>
              <p className="font-serif text-[22px] font-bold text-white leading-tight">{event.title}</p>
              <p className="text-[11px] text-white/60 mt-1">{dateStr}</p>
              {event.description && (
                <p className="text-[12px] text-white/70 mt-1.5 leading-relaxed line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Without photo — gradient card with event type color */
          <div className={cn("relative p-5 bg-gradient-to-br", colors.gradient)}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  {config?.label}
                </span>
              </div>
              <p className="font-serif text-[22px] font-bold text-white leading-tight">{event.title}</p>
              <p className="text-[11px] text-white/60 mt-1.5">{dateStr}</p>
              {event.description && (
                <p className="text-[12px] text-white/70 mt-2 leading-relaxed line-clamp-3">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Etapa 11: Overlay de sucesso após criar um momento ───────────────────────
function SuccessOverlay({
  title,
  onDismiss,
}: {
  title: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      <div
        className="mx-6 max-w-xs w-full bg-background rounded-3xl p-7 text-center shadow-2xl animate-in slide-in-from-bottom-6 duration-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rings + icon */}
        <div className="relative w-18 h-18 mx-auto mb-5">
          <div className="absolute inset-0 w-[72px] h-[72px] rounded-full bg-rose-100 dark:bg-rose-900/20 animate-ping opacity-30" />
          <div className="relative w-[72px] h-[72px] rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
          </div>
        </div>

        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">
          Novo capítulo
        </p>
        <p className="font-serif text-[20px] font-bold text-foreground leading-tight">
          Mais um momento guardado
        </p>
        <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
          A vossa história acabou de crescer.
        </p>

        {/* Event title */}
        <div className="mt-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3">
          <p className="font-serif text-[14px] font-semibold text-foreground leading-snug">
            "{title}"
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground/40 mt-4">
          {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const spaceId = useCoupleSpaceId();
  const time    = useTimeTogether();
  const { events, createEvent, updateEvent, deleteEvent } = useRelationshipEvents(spaceId);
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editingEvent, setEditingEvent] = useState<RelationshipEvent | null>(null);
  const [successTitle, setSuccessTitle] = useState<string | null>(null);

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

  const handleCreated = (title: string) => {
    setSuccessTitle(title);
    setTimeout(() => setSuccessTitle(null), 4000);
  };

  if (!profileLoading && profile?.usage_mode === "solo") {
    return <Navigate to="/" replace />;
  }

  const entries = buildTimelineEntries(events, time.startDate);
  const timeLabel = buildTimeLabel(time.days);

  // Most recent user-created event (for featured spot)
  const featuredEvent = useMemo<RelationshipEvent | null>(() => {
    if (!events.length) return null;
    return [...events].sort(
      (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    )[0];
  }, [events]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Nossa História</h1>
      </header>

      <main className="p-4 space-y-5 max-w-md mx-auto">

        {/* Etapa 2 — Hero: contador de tempo juntos */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-500 to-rose-600 p-5 text-white shadow-[0_8px_32px_rgba(244,63,94,0.22)]">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 fill-white text-white" strokeWidth={0} />
              </div>
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                A vossa jornada
              </span>
            </div>
            <p className="font-serif text-[28px] font-bold leading-tight">{timeLabel}</p>
            <p className="text-[13px] text-white/60 font-medium mt-0.5">juntos</p>
            {time.startDate && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-[11px] text-white/50">
                  Desde {format(parseDateOnly(time.startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
                <p className="text-[11px] text-white/30 font-mono tabular-nums">
                  {time.days.toLocaleString("pt")} dias
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acesso às memórias */}
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

        {/* Etapa 2 — Momento em destaque */}
        {featuredEvent && <FeaturedMoment event={featuredEvent} />}

        {/* Timeline */}
        <Timeline entries={entries} onEdit={handleEdit} onDelete={handleDelete} />

      </main>

      {/* Etapa 5 — FAB com glow + anel pulsante */}
      <button
        onClick={() => { setEditingEvent(null); setSheetOpen(true); }}
        className="fixed bottom-[100px] right-5 z-40 h-14 w-14 rounded-full bg-rose-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-[0_8px_32px_rgba(244,63,94,0.35),0_2px_8px_rgba(0,0,0,0.12)]"
        aria-label="Adicionar momento"
      >
        <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-20 pointer-events-none" />
        <Plus className="w-6 h-6 relative z-10" strokeWidth={2} />
      </button>

      {/* Sheet de criação/edição */}
      {spaceId && user && (
        <AddRelationshipEventSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          coupleSpaceId={spaceId}
          userId={user.id}
          editingEvent={editingEvent}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onCreated={handleCreated}
        />
      )}

      {/* Etapa 11 — Overlay de sucesso */}
      {successTitle && (
        <SuccessOverlay title={successTitle} onDismiss={() => setSuccessTitle(null)} />
      )}
    </div>
  );
}
