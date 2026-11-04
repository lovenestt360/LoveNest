import { createPortal } from "react-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, MoreHorizontal, Pencil, Share } from "lucide-react";
import type { RelationshipEvent } from "./types";
import { dayNumber, parseDateOnly } from "./story";
import { chapterMeta, Kicker } from "./Timeline";
import { useBackToClose, usePhotoUrl } from "./usePhotoUrl";

/** Um capítulo aberto, como uma página limpa do livro. */
export function ChapterPage({
  event,
  number,
  startDate,
  authorName,
  onClose,
  onShare,
  onEdit,
  onMenu,
}: {
  event: RelationshipEvent;
  number: number | undefined;
  startDate: string | null;
  authorName: string;
  onClose: () => void;
  onShare: () => void;
  onEdit: () => void;
  onMenu: () => void;
}) {
  useBackToClose(true, onClose);
  const url = usePhotoUrl(event.image_path);
  const meta = chapterMeta(event, number);
  const dayN = dayNumber(startDate, event.event_date);
  const hasPhoto = !!event.image_path;

  return createPortal(
    <div className="fixed inset-0 z-[9990] bg-background overflow-y-auto overscroll-contain animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="fixed top-0 inset-x-0 z-10 flex justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pointer-events-none">
        <button type="button" onClick={onClose} aria-label="Voltar" className="pointer-events-auto w-10 h-10 rounded-full bg-white/75 backdrop-blur-md text-[#1C1A1D] flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button type="button" onClick={onMenu} aria-label="Mais opções" className="pointer-events-auto w-10 h-10 rounded-full bg-white/75 backdrop-blur-md text-[#1C1A1D] flex items-center justify-center active:scale-95 transition-transform">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-md mx-auto">
        {hasPhoto ? (
          <div className="relative bg-muted" style={{ height: "min(56vh, 460px)" }}>
            {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-500" />}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,.12), transparent 25%, transparent 68%, hsl(var(--background)))" }}
            />
          </div>
        ) : (
          <div className="h-[calc(env(safe-area-inset-top)+96px)]" />
        )}

        <div className="relative px-7 pt-1 pb-[calc(env(safe-area-inset-bottom)+32px)]">
          <Kicker>
            {meta.n ? `Capítulo ${meta.n}` : "Capítulo"}
            {meta.type ? ` · ${meta.type}` : ""}
          </Kicker>
          <h1 className="font-serif text-[25px] font-bold leading-tight tracking-[-0.01em] mt-2.5 text-balance">{event.title}</h1>
          <p className="text-[12px] text-muted-foreground mt-2">
            {format(parseDateOnly(event.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            {dayN && <> · <b className="font-extrabold text-[#E8336A] dark:text-[#FF7A9B]">dia {dayN} juntos</b></>}
          </p>

          {event.description && (
            <p className="font-serif text-[14.5px] leading-[1.85] text-foreground/75 mt-5 whitespace-pre-line">{event.description}</p>
          )}
          <p className="font-serif italic text-[13px] text-muted-foreground mt-3">— {authorName}</p>

          <div className="flex gap-2.5 mt-7">
            <button type="button" onClick={onShare} className="flex-1 h-[50px] rounded-2xl bg-[#FF4F7B] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Share className="w-4 h-4" strokeWidth={2.2} /> Partilhar
            </button>
            <button type="button" onClick={onEdit} aria-label="Editar capítulo" className="w-[50px] h-[50px] rounded-2xl bg-muted text-foreground flex items-center justify-center active:scale-95 transition-transform">
              <Pencil className="w-[17px] h-[17px]" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
