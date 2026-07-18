import { useState, useMemo, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Camera, BookOpen, Sparkles, ChevronRight } from "lucide-react";
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

// ── Momento em destaque (capítulo mais recente) ──────────────────────────────
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
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.22em] px-1">
        Capítulo mais recente
      </p>
      <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
        {imgUrl ? (
          <div className="relative">
            <img src={imgUrl} alt="" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/60 uppercase tracking-wider mb-2.5">
                <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
                {config?.label}
              </span>
              <p className="font-serif text-[22px] font-bold text-white leading-tight">{event.title}</p>
              <p className="text-[11px] text-white/50 mt-1">{dateStr}</p>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-background">
            <div className={cn("h-0.5 rounded-full mb-4", colors.topBar)} />
            <div className="flex items-start gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colors.iconBg)}>
                <Icon className={cn("w-4.5 h-4.5", colors.iconText)} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-serif text-[18px] font-bold text-foreground leading-tight">{event.title}</p>
                <p className={cn("text-[11px] font-semibold mt-0.5", colors.dateText)}>{dateStr}</p>
                {event.description && (
                  <p className="text-[12px] text-muted-foreground/70 mt-2 leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {imgUrl && event.description && (
          <div className="px-5 py-3 border-t border-border/30 bg-background">
            <p className="text-[12px] text-muted-foreground/70 leading-relaxed line-clamp-2">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overlay de sucesso ───────────────────────────────────────────────────────
function SuccessOverlay({ title, onDismiss }: { title: string; onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      <div
        className="mx-6 max-w-xs w-full bg-background rounded-3xl p-7 text-center shadow-2xl animate-in slide-in-from-bottom-8 duration-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon com ping */}
        <div className="relative w-[72px] h-[72px] mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-rose-100 dark:bg-rose-900/20 animate-ping opacity-25" />
          <div className="relative w-full h-full rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
          </div>
        </div>

        <p className="text-[9px] font-bold text-rose-400/80 uppercase tracking-[0.22em] mb-2">
          Novo capítulo
        </p>
        <p className="font-serif text-[20px] font-bold text-foreground leading-tight">
          Mais um momento guardado
        </p>
        <p className="text-[12px] text-muted-foreground/60 mt-1.5 leading-relaxed">
          A vossa história acabou de crescer.
        </p>

        <div className="mt-4 border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/15 rounded-xl px-4 py-3">
          <p className="font-serif text-[14px] font-semibold text-foreground leading-snug">"{title}"</p>
        </div>

        <p className="text-[10px] text-muted-foreground/35 mt-4">
          {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
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

  const handleEdit = (event: RelationshipEvent) => { setEditingEvent(event); setSheetOpen(true); };

  const handleDelete = async (event: RelationshipEvent) => {
    if (!window.confirm(`Remover "${event.title}" da vossa história?`)) return;
    const { error } = await deleteEvent(event.id);
    if (error) toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
  };

  const handleCreated = (title: string) => {
    setSuccessTitle(title);
    setTimeout(() => setSuccessTitle(null), 4000);
  };

  if (!profileLoading && profile?.usage_mode === "solo") return <Navigate to="/" replace />;

  const entries    = buildTimelineEntries(events, time.startDate);
  const timeLabel  = buildTimeLabel(time.days);

  const featuredEvent = useMemo<RelationshipEvent | null>(() => {
    if (!events.length) return null;
    return [...events].sort(
      (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    )[0];
  }, [events]);

  return (
    <div className="min-h-screen bg-background pb-28">

      <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border/50 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Nossa História</h1>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">

        {/* ── Abertura: hero como página de livro ── */}
        <div className="relative rounded-2xl border border-border/40 p-6 pl-8 overflow-hidden bg-gradient-to-br from-background via-background to-rose-50/15 dark:to-rose-950/5">
          {/* Marcador rose vertical */}
          <div className="absolute left-5 top-5 bottom-5 w-0.5 rounded-full bg-gradient-to-b from-rose-400 via-rose-300 to-rose-100/0 dark:from-rose-600 dark:via-rose-700 dark:to-transparent" />
          <p className="text-[9px] font-bold text-rose-400/70 uppercase tracking-[0.25em] mb-3">
            A vossa história
          </p>
          <p className="font-serif text-[30px] font-bold text-foreground leading-none">
            {timeLabel}
          </p>
          <p className="text-[12px] text-muted-foreground/60 mt-1.5">de vida partilhada juntos</p>
          {time.startDate && (
            <p className="text-[11px] text-muted-foreground/35 mt-4">
              Primeiro capítulo · {format(parseDateOnly(time.startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
          )}
        </div>

        {/* ── Link memórias (integrado, discreto) ── */}
        <button
          onClick={() => navigate("/memorias")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 text-left active:bg-muted/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
            <Camera className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-[12px] font-medium text-muted-foreground group-active:text-foreground transition-colors">
            Ver as vossas memórias e fotos
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
        </button>

        {/* ── Capítulo mais recente ── */}
        {featuredEvent && <FeaturedMoment event={featuredEvent} />}

        {/* ── Timeline ── */}
        <Timeline entries={entries} onEdit={handleEdit} onDelete={handleDelete} />

      </main>

      {/* ── FAB com glow pulsante ── */}
      <button
        onClick={() => { setEditingEvent(null); setSheetOpen(true); }}
        className="fixed bottom-[100px] right-5 z-40 h-14 w-14 rounded-full bg-rose-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-[0_8px_28px_rgba(244,63,94,0.35),0_2px_8px_rgba(0,0,0,0.10)]"
        aria-label="Adicionar momento"
      >
        <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-20 pointer-events-none" />
        <Plus className="w-6 h-6 relative z-10" strokeWidth={2} />
      </button>

      {/* ── Sheet de criação/edição ── */}
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

      {/* ── Overlay de sucesso ── */}
      {successTitle && (
        <SuccessOverlay title={successTitle} onDismiss={() => setSuccessTitle(null)} />
      )}

    </div>
  );
}
