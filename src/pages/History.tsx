import { useState, useMemo, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Camera, BookOpen, Sparkles, Heart, ChevronRight } from "lucide-react";
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

// ── Capítulo em destaque ──────────────────────────────────────────────────────
function FeaturedMoment({ event }: { event: RelationshipEvent }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!event.image_path) return;
    supabase.storage
      .from("memories")
      .createSignedUrl(event.image_path, 3600)
      .then(({ data }) => { if (data) setImgUrl(data.signedUrl); });
  }, [event.image_path]);

  const config  = EVENT_TYPE_CONFIG[event.event_type];
  const colors  = EVENT_COLORS[event.event_type] ?? EVENT_COLORS.custom;
  const Icon    = config?.icon ?? Sparkles;
  const dateStr = format(parseDateOnly(event.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.22em] px-1">
        Capítulo mais recente
      </p>
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_18px_rgba(0,0,0,0.07)]">
        {imgUrl ? (
          <div className="relative">
            <img src={imgUrl} alt="" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-2">
                {config?.label}
              </p>
              <p className="font-serif text-[22px] font-bold text-white leading-tight">{event.title}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{dateStr}</p>
            </div>
          </div>
        ) : (
          <div className="bg-background p-5 border border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", colors.iconBg)}>
                <Icon className={cn("w-3.5 h-3.5", colors.iconText)} strokeWidth={1.5} />
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", colors.dateText)}>
                {config?.label}
              </span>
            </div>
            <p className="font-serif text-[19px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-tight">
              {event.title}
            </p>
            <p className={cn("text-[11px] font-medium mt-1", colors.dateText)}>{dateStr}</p>
            {event.description && (
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        )}
        {imgUrl && event.description && (
          <div className="px-5 py-3 bg-background border-t border-border/30">
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overlay de sucesso ────────────────────────────────────────────────────────
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
        <div className="relative w-[68px] h-[68px] mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-rose-100 dark:bg-rose-900/20 animate-ping opacity-25" />
          <div className="relative w-full h-full rounded-full bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-rose-400" strokeWidth={1.5} />
          </div>
        </div>
        <p className="text-[9px] font-bold text-rose-400 uppercase tracking-[0.22em] mb-2">
          Novo capítulo
        </p>
        <p className="font-serif text-[19px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-tight">
          Mais um momento guardado
        </p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
          A vossa história acabou de crescer.
        </p>
        <div className="mt-4 bg-rose-50/70 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3">
          <p className="font-serif text-[14px] font-semibold text-[#1A1A1A] dark:text-zinc-100 leading-snug">
            "{title}"
          </p>
        </div>
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-4">
          {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
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

  const entries   = buildTimelineEntries(events, time.startDate);
  const timeLabel = buildTimeLabel(time.days);

  const featuredEvent = useMemo<RelationshipEvent | null>(() => {
    if (!events.length) return null;
    return [...events].sort(
      (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    )[0];
  }, [events]);

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* Tinta quente no topo — cria atmosfera sem ser um cartão */}
      <div className="absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-rose-50/40 to-transparent dark:from-rose-950/8 dark:to-transparent pointer-events-none" />

      <header className="relative px-4 py-4 sticky top-0 bg-background/85 backdrop-blur-sm z-10 border-b border-border/40 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-[#1A1A1A] dark:text-zinc-100">
          Nossa História
        </h1>
      </header>

      <main className="relative max-w-md mx-auto">

        {/* ── Abertura: página de álbum sem caixa ── */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-300" strokeWidth={0} />
            <span className="text-[9px] font-bold text-rose-400/80 uppercase tracking-[0.28em]">
              A vossa história
            </span>
          </div>

          <p className="font-serif text-[32px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-none">
            {timeLabel}
          </p>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-2">
            de vida partilhada juntos
          </p>

          {time.startDate && (
            <>
              <div className="mt-4 mb-3 h-px bg-rose-100/60 dark:bg-rose-900/20" />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Desde {format(parseDateOnly(time.startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            </>
          )}
        </div>

        <div className="px-4 space-y-6 pb-4">

          {/* ── Link memórias — discreto mas presente ── */}
          <button
            onClick={() => navigate("/memorias")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-background text-left active:bg-muted/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/25 flex items-center justify-center shrink-0">
              <Camera className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} />
            </div>
            <span className="flex-1 text-[12px] font-medium text-gray-500 dark:text-gray-400">
              Ver as vossas memórias e fotos
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" strokeWidth={1.5} />
          </button>

          {/* ── Capítulo mais recente ── */}
          {featuredEvent && <FeaturedMoment event={featuredEvent} />}

          {/* ── Timeline ── */}
          <Timeline entries={entries} onEdit={handleEdit} onDelete={handleDelete} />

        </div>
      </main>

      {/* ── FAB: rose-400 (mais suave, mais LoveNest) ── */}
      <button
        onClick={() => { setEditingEvent(null); setSheetOpen(true); }}
        className="fixed bottom-[100px] right-5 z-40 h-14 w-14 rounded-full bg-rose-400 text-white flex items-center justify-center active:scale-90 transition-all shadow-[0_6px_24px_rgba(251,113,133,0.40),0_2px_8px_rgba(0,0,0,0.08)]"
        aria-label="Adicionar momento"
      >
        <span className="absolute inset-0 rounded-full bg-rose-300 animate-ping opacity-15 pointer-events-none" />
        <Plus className="w-6 h-6 relative z-10" strokeWidth={2.5} />
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
          onCreated={handleCreated}
        />
      )}

      {successTitle && (
        <SuccessOverlay title={successTitle} onDismiss={() => setSuccessTitle(null)} />
      )}

    </div>
  );
}
