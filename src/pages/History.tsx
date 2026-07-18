import { useState, useMemo, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, BookOpen, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { BookChapters, buildTimelineEntries } from "@/features/relationship-events/Timeline";
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
  if (years  > 0) parts.push(`${years} ${years  === 1 ? "ano"   : "anos"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês"   : "meses"}`);
  if (days   > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
}

// ── Capa do livro ─────────────────────────────────────────────────────────────
function BookCover({
  timeLabel,
  startDate,
  coverPhotoPath,
}: {
  timeLabel: string;
  startDate: string | null;
  coverPhotoPath: string | null;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coverPhotoPath) return;
    supabase.storage
      .from("memories")
      .createSignedUrl(coverPhotoPath, 3600)
      .then(({ data }) => { if (data) setImgUrl(data.signedUrl); });
  }, [coverPhotoPath]);

  return (
    <div className="relative h-[88vh] min-h-[540px] flex flex-col items-center justify-center overflow-hidden">

      {/* Fundo: foto desfocada OU gradiente escuro */}
      {imgUrl ? (
        <>
          <img
            src={imgUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: "blur(18px) brightness(0.45) saturate(0.7)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #1A0A12 0%, #4A1530 45%, #8B3058 72%, #E0607A 100%)",
          }}
        />
      )}

      {/* Textura sutil */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)",
        }}
      />

      {/* Conteúdo */}
      <div className="relative z-10 text-center px-8">
        <p className="text-[9px] font-bold text-rose-300/70 uppercase tracking-[0.42em] mb-6">
          O Livro da
        </p>

        <h1
          className="font-serif font-bold text-white leading-none"
          style={{ fontSize: "clamp(38px, 10vw, 52px)", textShadow: "0 2px 32px rgba(0,0,0,0.5)" }}
        >
          Nossa História
        </h1>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-white/20" />
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-rose-300/60" />
            <div className="w-1 h-1 rounded-full bg-rose-200/40" />
            <div className="w-1 h-1 rounded-full bg-rose-100/25" />
          </div>
          <div className="h-px w-12 bg-white/20" />
        </div>

        <p
          className="mt-8 font-serif font-bold text-white/90 leading-none"
          style={{ fontSize: "clamp(28px, 7vw, 38px)", textShadow: "0 1px 16px rgba(0,0,0,0.4)" }}
        >
          {timeLabel}
        </p>
        <p className="text-[13px] text-white/50 mt-2 tracking-wide">
          de vida partilhada juntos
        </p>

        {startDate && (
          <p className="text-[11px] text-white/30 mt-4">
            Desde {format(parseDateOnly(startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        )}
      </div>

      {/* Indicador de scroll */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1.5 animate-bounce">
        <p className="text-[9px] text-white/25 uppercase tracking-[0.3em]">Virar a página</p>
        <ChevronDown className="w-4 h-4 text-white/25" strokeWidth={1.5} />
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
  const { user }   = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const spaceId    = useCoupleSpaceId();
  const time       = useTimeTogether();
  const { events, createEvent, updateEvent, deleteEvent } = useRelationshipEvents(spaceId);
  const { toast }  = useToast();

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

  // Ordem cronológica ascendente para o livro
  const entries = buildTimelineEntries(events, time.startDate);
  const timeLabel = buildTimeLabel(time.days);

  // Foto da capa: o evento mais antigo com imagem (começo da história)
  const coverPhotoPath = useMemo<string | null>(() => {
    const withPhoto = [...events]
      .filter((e) => !!e.image_path)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    return withPhoto[0]?.image_path ?? null;
  }, [events]);

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* Botão de voltar flutuante sobre a capa */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-20 p-2.5 rounded-full bg-black/25 backdrop-blur-sm active:scale-95 transition-all text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* ── Capa ── */}
      <BookCover
        timeLabel={timeLabel}
        startDate={time.startDate}
        coverPhotoPath={coverPhotoPath}
      />

      {/* ── Capítulos ── */}
      <div className="max-w-md mx-auto">
        <BookChapters
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* ── FAB: rose suave ── */}
      <button
        onClick={() => { setEditingEvent(null); setSheetOpen(true); }}
        className="fixed bottom-[100px] right-5 z-40 h-14 w-14 rounded-full bg-rose-400 text-white flex items-center justify-center active:scale-90 transition-all shadow-[0_6px_24px_rgba(251,113,133,0.40),0_2px_8px_rgba(0,0,0,0.08)]"
        aria-label="Escrever mais um capítulo"
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
