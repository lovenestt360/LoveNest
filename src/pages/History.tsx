import { useState, useMemo, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, ChevronDown } from "lucide-react";
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

const breakout: React.CSSProperties = {
  width: "100vw",
  marginLeft: "calc(50% - 50vw)",
};

// ── Capa com motion — fase 1 (rosa) → fase 2 (foto) ──────────────────────────
function BookCover({
  timeLabel,
  startDate,
  photoPath,
}: {
  timeLabel: string;
  startDate: string | null;
  photoPath: string | null;
}) {
  const [entered, setEntered]               = useState(false);
  const [imgUrl, setImgUrl]                 = useState<string | null>(null);
  const [showPhoto, setShowPhoto]           = useState(false);

  // 1. Dispara animações de texto no frame seguinte ao mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 2. Carrega a foto
  useEffect(() => {
    if (!photoPath) return;
    supabase.storage
      .from("memories")
      .createSignedUrl(photoPath, 3600)
      .then(({ data }) => { if (data) setImgUrl(data.signedUrl); });
  }, [photoPath]);

  // 3. Após 2.6s inicia o crossfade rosa → foto (só se a foto já carregou)
  useEffect(() => {
    if (!imgUrl) return;
    const timer = setTimeout(() => setShowPhoto(true), 1200);
    return () => clearTimeout(timer);
  }, [imgUrl]);

  const spring = "cubic-bezier(0.16, 1, 0.3, 1)";

  // Helper: estilo de animação staggered para cada linha de texto
  const ta = (delay: number, dy = 16): React.CSSProperties => ({
    opacity:        entered ? 1 : 0,
    transform:      entered ? "translateY(0px)" : `translateY(${dy}px)`,
    transition:     `opacity 800ms ease, transform 900ms ${spring}`,
    transitionDelay: `${delay}ms`,
  });

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        ...breakout,
        height: "76vh",
        minHeight: "460px",
        marginTop: "-1.5rem",
      }}
    >
      {/* ── Fase 1: gradiente rosa ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(160deg, #1A0A12 0%, #3D1228 38%, #7A2A4A 65%, #C85070 85%, #E06880 100%)",
          opacity: showPhoto ? 0 : 1,
          transition: "opacity 1400ms ease-in-out",
        }}
      />

      {/* ── Fase 2: última foto ── */}
      {imgUrl && (
        <div
          className="absolute inset-0"
          style={{
            opacity: showPhoto ? 1 : 0,
            transition: "opacity 1400ms ease-in-out",
          }}
        >
          <img
            src={imgUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradiente — mais escuro no centro para o texto ser sempre legível */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/55" />
        </div>
      )}

      {/* Textura de papel — subtil em ambas as fases */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 3px)",
        }}
      />

      {/* ── Texto — aparece com motion staggered ── */}
      <div className="relative z-10 text-center px-6 w-full max-w-xs mx-auto">

        <p
          className="text-[8px] font-bold text-rose-300/65 uppercase tracking-[0.45em] mb-5"
          style={ta(0, 12)}
        >
          O Livro da
        </p>

        <h1
          className="font-serif font-bold text-white leading-none"
          style={{
            fontSize: "clamp(40px, 11vw, 56px)",
            textShadow: "0 2px 40px rgba(0,0,0,0.6)",
            opacity:    entered ? 1 : 0,
            transform:  entered ? "translateY(0px) scale(1)" : "translateY(24px) scale(0.96)",
            filter:     entered ? "blur(0px)" : "blur(5px)",
            transition: `opacity 900ms ease, transform 1000ms ${spring}, filter 800ms ease`,
            transitionDelay: "150ms",
          }}
        >
          Nossa História
        </h1>

        {/* Ornamento */}
        <div
          className="flex items-center justify-center gap-2.5 mt-6 mb-6"
          style={ta(480)}
        >
          <div className="h-px w-10 bg-white/15" />
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-rose-300/55" />
            <div className="w-1 h-1 rounded-full bg-rose-200/35" />
            <div className="w-1 h-1 rounded-full bg-rose-100/20" />
          </div>
          <div className="h-px w-10 bg-white/15" />
        </div>

        {/* Contador de tempo */}
        <p
          className="font-serif font-bold text-white/95 leading-tight"
          style={{
            fontSize: "clamp(26px, 7vw, 36px)",
            textShadow: "0 1px 20px rgba(0,0,0,0.45)",
            ...ta(640, 14),
          }}
        >
          {timeLabel}
        </p>

        <p
          className="text-[12px] text-white/45 mt-1.5 tracking-wide"
          style={ta(800, 10)}
        >
          de vida partilhada juntos
        </p>

        {startDate && (
          <p
            className="text-[10px] mt-3"
            style={{
              ...ta(960, 8),
              color: `rgba(255,255,255,${showPhoto ? 0.55 : 0.25})`,
              transition: `opacity 800ms ease, transform 900ms ${spring}, color 1200ms ease-in-out`,
              transitionDelay: "960ms",
            }}
          >
            Desde {format(parseDateOnly(startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        )}

        <p
          className="text-[11px] italic mt-5 leading-relaxed"
          style={{
            ...ta(1100, 8),
            color: `rgba(255,255,255,${showPhoto ? 0.60 : 0.30})`,
            transition: `opacity 800ms ease, transform 900ms ${spring}, color 1200ms ease-in-out`,
            transitionDelay: "1100ms",
          }}
        >
          O amor também se mede pelos momentos que decidiram guardar.
        </p>
      </div>

      {/* Indicador de scroll */}
      <div className="absolute bottom-6 left-0 right-0" style={ta(1280, 6)}>
        <div className="flex flex-col items-center gap-1 animate-bounce">
          <p className="text-[8px] text-white/20 uppercase tracking-[0.35em]">Virar a página</p>
          <ChevronDown className="w-3.5 h-3.5 text-white/20" strokeWidth={1.5} />
        </div>
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

  const handleEdit = (event: RelationshipEvent) => { setEditingEvent(event); setSheetOpen(true); };

  const handleDelete = async (event: RelationshipEvent) => {
    if (!window.confirm(`Remover "${event.title}" da vossa história?`)) return;
    const { error } = await deleteEvent(event.id);
    if (error) toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
  };

  if (!profileLoading && profile?.usage_mode === "solo") return <Navigate to="/" replace />;

  const entries   = buildTimelineEntries(events, time.startDate);
  const timeLabel = buildTimeLabel(time.days);

  // Foto mais recente com imagem — usada como fundo da fase 2 da capa
  const coverPhotoPath = useMemo<string | null>(() => {
    return [...events]
      .filter((e) => !!e.image_path)
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())[0]
      ?.image_path ?? null;
  }, [events]);

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* Botão de voltar sobre a capa */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-20 p-2.5 rounded-full bg-black/25 backdrop-blur-sm active:scale-95 transition-all text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Capa com motion */}
      <BookCover
        timeLabel={timeLabel}
        startDate={time.startDate}
        photoPath={coverPhotoPath}
      />

      {/* Capítulos + FAB inline (não fixo) */}
      <div className="max-w-md mx-auto relative">
        <BookChapters
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* FAB sticky dentro do fluxo — só aparece ao fazer scroll para os capítulos */}
        <div className="sticky bottom-24 flex justify-end px-5 pb-6 pointer-events-none">
          <button
            onClick={() => { setEditingEvent(null); setSheetOpen(true); }}
            className="pointer-events-auto relative h-14 w-14 rounded-full text-white flex items-center justify-center active:scale-90 transition-all"
            style={{
              background: "#C4788C",
              boxShadow: "0 6px 24px rgba(196,120,140,0.38), 0 2px 8px rgba(0,0,0,0.08)",
            }}
            aria-label="Escrever mais um capítulo"
          >
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-10 pointer-events-none"
              style={{ background: "#C4788C" }}
            />
            <Plus className="w-6 h-6 relative z-10" strokeWidth={2.5} />
          </button>
        </div>
      </div>

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
