import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { RelationshipEvent } from "./types";
import { parseDateOnly } from "./story";
import { downloadBlob, renderStoryCard, type CardMode } from "./shareCard";
import { useBackToClose, usePhotoUrl } from "./usePhotoUrl";

const MODES: { id: CardMode; label: string }[] = [
  { id: "chap", label: "Capítulo" },
  { id: "days", label: "O nosso tempo" },
  { id: "nodate", label: "Sem data" },
];

/** Cartão vertical para os Stories ou o WhatsApp, com o ar da Nossa História. */
export function ShareSheet({
  chapter,
  timeLabel,
  startDate,
  names,
  onClose,
}: {
  /** Sem capítulo, partilha "o nosso tempo". */
  chapter: { event: RelationshipEvent; number: number | undefined } | null;
  timeLabel: string;
  startDate: string | null;
  names: string;
  onClose: () => void;
}) {
  useBackToClose(true, onClose);
  const { toast } = useToast();
  const [mode, setMode] = useState<CardMode>(chapter ? "chap" : "days");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const imagePath = chapter?.event.image_path ?? null;
  const photoUrl = usePhotoUrl(imagePath);
  const photoReady = !imagePath || !!photoUrl;

  useEffect(() => {
    if (!photoReady) return;
    let alive = true;
    setBlob(null);
    const ev = chapter?.event;
    renderStoryCard({
      mode,
      chapterLabel: chapter?.number ? `Capítulo ${chapter.number}` : "Nossa História",
      title: ev?.title,
      date: ev ? format(parseDateOnly(ev.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt }) : undefined,
      photoUrl,
      timeLabel,
      since: startDate ? `juntos desde ${format(parseDateOnly(startDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}` : null,
      names,
    })
      .then((b) => { if (alive) setBlob(b); })
      .catch(() => { if (alive) toast({ title: "Não foi possível criar o cartão", variant: "destructive" }); });
    return () => { alive = false; };
  }, [mode, photoReady, photoUrl, chapter, timeLabel, startDate, names, toast]);

  useEffect(() => {
    if (!blob) { setPreview(null); return; }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const fileName = "nossa-historia.jpg";

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      setSharing(true);
      try {
        await navigator.share({ files: [file], title: "Nossa História" });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") toast({ title: "Não foi possível partilhar", description: "Usa \"Guardar na galeria\".", variant: "destructive" });
      } finally {
        setSharing(false);
      }
    } else {
      downloadBlob(blob, fileName);
      toast({ title: "Imagem guardada", description: "Agora é só publicá-la onde quiseres." });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-background flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between px-3.5 pt-[calc(env(safe-area-inset-top)+12px)] pb-1.5">
        <button type="button" onClick={onClose} aria-label="Fechar" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform">
          <X className="w-4 h-4" strokeWidth={2.2} />
        </button>
        <p className="font-serif text-[15px] font-bold">Partilhar</p>
        <span className="w-10" />
      </div>

      <div className="flex-1 min-h-0 w-full max-w-md mx-auto flex flex-col gap-5 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div
            className="relative h-full max-h-[460px] aspect-[9/16] rounded-[18px] overflow-hidden bg-muted shadow-[0_20px_40px_-22px_rgba(40,20,30,0.45)] ring-1 ring-border/60"
          >
            {preview ? (
              <img src={preview} alt="Pré-visualização do cartão" className="w-full h-full object-cover animate-in fade-in duration-300" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[#FF4F7B] animate-spin" />
              </div>
            )}
          </div>
        </div>

        {chapter && (
          <div className="flex p-1 rounded-[14px] bg-muted" role="group" aria-label="Tipo de cartão">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex-1 h-[34px] rounded-[10px] text-[12px] font-extrabold transition-colors",
                  mode === m.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button type="button" onClick={share} disabled={!blob || sharing} className="h-[50px] rounded-2xl bg-[#FF4F7B] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform">
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share className="w-4 h-4" strokeWidth={2.2} />} Partilhar
          </button>
          <button type="button" onClick={() => blob && downloadBlob(blob, fileName)} disabled={!blob} className="h-[50px] rounded-2xl bg-muted text-foreground text-[14px] font-extrabold disabled:opacity-50 active:scale-[0.98] transition-transform">
            Guardar na galeria
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
