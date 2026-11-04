import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Heart, Play, Plus, Share } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useToast } from "@/hooks/use-toast";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { BookChapters, ChapterMenu, Kicker } from "@/features/relationship-events/Timeline";
import { AddRelationshipEventSheet } from "@/features/relationship-events/AddRelationshipEventSheet";
import { ChapterPage } from "@/features/relationship-events/ChapterPage";
import { StoryFilm } from "@/features/relationship-events/StoryFilm";
import { ShareSheet } from "@/features/relationship-events/ShareSheet";
import { usePhotoUrl } from "@/features/relationship-events/usePhotoUrl";
import {
  buildTimeLabel,
  chapterNumbers,
  isSealedFor,
  parseDateOnly,
  sortChapters,
} from "@/features/relationship-events/story";
import type { RelationshipEvent } from "@/features/relationship-events/types";
import "@/features/relationship-events/story.css";

const breakout: React.CSSProperties = {
  width: "100vw",
  marginLeft: "calc(50% - 50vw)",
  marginTop: "calc(-1.5rem - env(safe-area-inset-top))",
};

const rise = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

// ── Capa: a última foto do casal, a dissolver-se no branco ───────────────────
function Cover({
  photoPath, timeLabel, startDate, chapters, photos, days, onFilm,
}: {
  photoPath: string | null;
  timeLabel: string;
  startDate: string | null;
  chapters: number;
  photos: number;
  days: number;
  onFilm: (() => void) | null;
}) {
  const url = usePhotoUrl(photoPath);

  return (
    <header style={breakout}>
      <div className="relative" style={photoPath ? { height: "min(62vh, 540px)", minHeight: 380 } : { height: "min(40vh, 320px)", minHeight: 240 }}>
        {photoPath ? (
          <>
            <div className="absolute inset-0 bg-muted" />
            {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700" />}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(180deg, #FFE6EC 0%, #FFF3F6 60%, hsl(var(--background)) 100%)" }}>
            <Heart className="w-9 h-9 text-[#FF4F7B]/70 -mt-6" strokeWidth={1.4} />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,.14) 0%, transparent 22%, transparent 55%, hsl(var(--background) / .85) 86%, hsl(var(--background)) 100%)" }}
        />
      </div>

      <div className="relative -mt-10 px-7 pb-2 text-center">
        <Kicker className="ns-rise">O livro da</Kicker>
        <h1 className="ns-rise font-serif font-bold text-[34px] leading-[1.1] tracking-[-0.015em] mt-2.5 text-foreground" style={rise(120)}>
          Nossa História
        </h1>
        {startDate && (
          <>
            <p className="ns-rise font-serif italic text-[16px] text-foreground/70 mt-3" style={rise(240)}>{timeLabel}</p>
            <p className="ns-rise text-[12px] text-muted-foreground mt-1" style={rise(300)}>
              juntos desde {format(parseDateOnly(startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
          </>
        )}
        <div className="ns-rise flex items-center justify-center gap-3 mt-[18px] text-[12px] text-muted-foreground" style={rise(380)}>
          <span><b className="text-foreground font-extrabold">{chapters}</b> {chapters === 1 ? "capítulo" : "capítulos"}</span>
          <i className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
          <span><b className="text-foreground font-extrabold">{photos}</b> {photos === 1 ? "foto" : "fotos"}</span>
          {startDate && (
            <>
              <i className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
              <span><b className="text-foreground font-extrabold">{days}</b> dias</span>
            </>
          )}
        </div>
        {onFilm && (
          <button
            type="button"
            onClick={onFilm}
            className="ns-rise mt-[22px] inline-flex items-center gap-2.5 h-11 pl-2 pr-5 rounded-full bg-muted/70 text-[13.5px] font-extrabold text-foreground active:scale-[0.97] transition-transform"
            style={rise(460)}
          >
            <span className="w-[30px] h-[30px] rounded-full bg-[#FF4F7B] text-white flex items-center justify-center">
              <Play className="w-3 h-3 ml-0.5" fill="currentColor" />
            </span>
            Ver o nosso filme
          </button>
        )}
      </div>
    </header>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { partner } = usePartnerProfile();
  const spaceId = useCoupleSpaceId();
  const time = useTimeTogether();
  const { events, createEvent, updateEvent, deleteEvent, openSurprise } = useRelationshipEvents(spaceId);
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RelationshipEvent | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menuEvent, setMenuEvent] = useState<RelationshipEvent | null>(null);
  const [share, setShare] = useState<{ chapterId: string | null } | null>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [solidBar, setSolidBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolidBar(window.scrollY > window.innerHeight * 0.42);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const myName = profile?.display_name?.trim() || "Eu";
  const partnerName = partner?.display_name?.trim() || partner?.real_name?.trim() || null;
  const nameOf = useCallback(
    (uid: string) => (uid === user?.id ? myName : partnerName ?? "O teu amor"),
    [user?.id, myName, partnerName],
  );
  const coupleNames = partner ? `${myName} & ${partner.real_name?.trim() || partnerName}` : myName;

  const numbers = useMemo(() => chapterNumbers(events), [events]);
  const visible = useMemo(() => sortChapters(events.filter((e) => !isSealedFor(e, user?.id))), [events, user?.id]);
  const timeLabel = buildTimeLabel(time.days);

  // A capa é sempre a foto mais recente (nunca a de uma surpresa por abrir).
  const coverPhotoPath = useMemo(
    () => [...visible].reverse().find((e) => !!e.image_path)?.image_path ?? null,
    [visible],
  );

  const openEvent = openId ? events.find((e) => e.id === openId) ?? null : null;
  const shareEvent = share?.chapterId ? events.find((e) => e.id === share.chapterId) ?? null : null;

  const startWriting = () => { setEditingEvent(null); setSheetOpen(true); };
  const startEditing = (event: RelationshipEvent) => { setEditingEvent(event); setSheetOpen(true); };

  const handleDelete = async (event: RelationshipEvent) => {
    if (!window.confirm(`Remover "${event.title}" da vossa história?`)) return;
    const { error } = await deleteEvent(event.id);
    if (error) toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    else if (openId === event.id) setOpenId(null);
  };

  const handleOpenSurprise = async (event: RelationshipEvent) => {
    setOpenId(event.id);
    const { error } = await openSurprise(event.id);
    if (error) console.warn("Não foi possível marcar a surpresa como aberta", error);
  };

  // Hook acima de qualquer return condicional — senão o nº de hooks muda
  // entre renders quando profileLoading termina e ativa este redirect.
  if (!profileLoading && profile?.usage_mode === "solo") return <Navigate to="/" replace />;

  const canFilm = visible.length > 0;
  const barBtn = cn(
    "w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-[transform,background-color]",
    solidBar ? "bg-muted text-foreground" : "bg-white/75 backdrop-blur-md text-[#1C1A1D]",
  );

  return (
    <div className="min-h-screen pb-28">
      {/* Barra de cima: transparente sobre a capa, branca nos capítulos */}
      <div className={cn("fixed top-0 inset-x-0 z-30 transition-colors duration-300", solidBar ? "bg-background/95 backdrop-blur-md border-b border-border/50" : "bg-transparent")}>
        <div className="max-w-md mx-auto flex items-center justify-between px-3.5 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar" className={barBtn}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className={cn("font-serif text-[14px] font-bold transition-opacity duration-300", solidBar ? "opacity-100" : "opacity-0")}>Nossa História</p>
          {solidBar && canFilm ? (
            <button type="button" onClick={() => setFilmOpen(true)} aria-label="Ver o nosso filme" className={barBtn}>
              <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
            </button>
          ) : (
            <button type="button" onClick={() => setShare({ chapterId: null })} aria-label="Partilhar a nossa história" className={barBtn}>
              <Share className="w-[17px] h-[17px]" strokeWidth={2.1} />
            </button>
          )}
        </div>
      </div>

      <Cover
        photoPath={coverPhotoPath}
        timeLabel={timeLabel}
        startDate={time.startDate}
        chapters={visible.length}
        photos={visible.filter((e) => !!e.image_path).length}
        days={time.days}
        onFilm={canFilm ? () => setFilmOpen(true) : null}
      />

      <div className="max-w-md mx-auto px-1.5 pt-7 relative">
        <BookChapters
          events={events}
          startDate={time.startDate}
          userId={user?.id}
          nameOf={nameOf}
          onOpen={(e) => setOpenId(e.id)}
          onOpenSurprise={handleOpenSurprise}
          onLongPress={setMenuEvent}
          onPlan={() => navigate("/plano?tab=agenda")}
        />

        {/* + dentro do fluxo: só aparece ao chegar aos capítulos */}
        <div className="sticky bottom-24 flex justify-end pt-6 pb-6 pointer-events-none">
          <button
            type="button"
            onClick={startWriting}
            className="pointer-events-auto h-14 w-14 rounded-full bg-[#FF4F7B] text-white flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(255,79,123,0.7)] active:scale-90 transition-transform"
            aria-label="Escrever mais um capítulo"
          >
            <Plus className="w-6 h-6" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {openEvent && (
        <ChapterPage
          event={openEvent}
          number={numbers.get(openEvent.id)}
          startDate={time.startDate}
          authorName={nameOf(openEvent.created_by)}
          onClose={() => setOpenId(null)}
          onShare={() => setShare({ chapterId: openEvent.id })}
          onEdit={() => startEditing(openEvent)}
          onMenu={() => setMenuEvent(openEvent)}
        />
      )}

      {filmOpen && (
        <StoryFilm
          chapters={visible.map((e) => ({ event: e, number: numbers.get(e.id) ?? 0 }))}
          names={coupleNames}
          timeLabel={timeLabel}
          onClose={() => setFilmOpen(false)}
          onShare={() => setShare({ chapterId: null })}
        />
      )}

      {share && (
        <ShareSheet
          chapter={shareEvent ? { event: shareEvent, number: numbers.get(shareEvent.id) } : null}
          timeLabel={timeLabel}
          startDate={time.startDate}
          names={coupleNames}
          onClose={() => setShare(null)}
        />
      )}

      {menuEvent && (
        <ChapterMenu
          event={menuEvent}
          onClose={() => setMenuEvent(null)}
          onEdit={() => { const e = menuEvent; setMenuEvent(null); startEditing(e); }}
          onDelete={() => { const e = menuEvent; setMenuEvent(null); handleDelete(e); }}
        />
      )}

      {spaceId && user && (
        <AddRelationshipEventSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          coupleSpaceId={spaceId}
          userId={user.id}
          editingEvent={editingEvent}
          onCreate={createEvent}
          onUpdate={updateEvent}
          chapterNumber={editingEvent ? numbers.get(editingEvent.id) : events.length + 1}
          relationshipStart={time.startDate}
          partnerName={partnerName}
        />
      )}
    </div>
  );
}
