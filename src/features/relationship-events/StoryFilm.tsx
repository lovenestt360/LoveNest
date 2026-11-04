import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { RotateCcw, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RelationshipEvent } from "./types";
import { parseDateOnly } from "./story";
import { useBackToClose, usePhotoUrl } from "./usePhotoUrl";

const SLIDE_MS = 4200;
const MAX_CHAPTERS = 24;

type Slide =
  | { kind: "intro" }
  | { kind: "chapter"; event: RelationshipEvent; number: number }
  | { kind: "end" };

function ChapterSlide({ event, number, on }: { event: RelationshipEvent; number: number; on: boolean }) {
  const url = usePhotoUrl(event.image_path);
  const date = format(parseDateOnly(event.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt });
  const photo = !!event.image_path;
  return (
    <div className={cn("absolute inset-0 transition-opacity duration-1000 ease-in-out", on ? "opacity-100" : "opacity-0")}>
      {photo && (
        <>
          <div className="absolute inset-0 overflow-hidden bg-[#2A2228]">
            {url && <img src={url} alt="" className={cn("w-full h-full object-cover", on && "ns-kb")} />}
          </div>
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,.62), transparent 52%)" }} />
        </>
      )}
      <div
        key={on ? "on" : "off"}
        className={cn(
          "absolute inset-0 flex flex-col px-8",
          photo ? "justify-end pb-[calc(env(safe-area-inset-bottom)+72px)] text-white" : "justify-center text-center text-foreground",
        )}
      >
        <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.3em]", on && "ns-rise", photo ? "text-white/85" : "text-[#E8336A] dark:text-[#FF7A9B]")}>
          Capítulo {number}
        </p>
        <h2 className={cn("font-serif text-[28px] font-bold leading-tight mt-2.5 text-balance", on && "ns-rise")} style={{ animationDelay: "150ms" }}>
          {event.title}
        </h2>
        <p className={cn("text-[12px] mt-2", on && "ns-rise", photo ? "text-white/75" : "text-muted-foreground")} style={{ animationDelay: "300ms" }}>
          {date}
        </p>
      </div>
    </div>
  );
}

/** "O nosso filme": os capítulos passam sozinhos, foto a foto. */
export function StoryFilm({
  chapters,
  names,
  timeLabel,
  onClose,
  onShare,
}: {
  /** Já por ordem, sem surpresas por abrir. */
  chapters: { event: RelationshipEvent; number: number }[];
  names: string;
  timeLabel: string;
  onClose: () => void;
  onShare: () => void;
}) {
  useBackToClose(true, onClose);

  const slides = useMemo<Slide[]>(() => {
    // Com muitos capítulos, ficam os mais recentes.
    const picked = chapters.slice(-MAX_CHAPTERS);
    return [{ kind: "intro" }, ...picked.map((c) => ({ kind: "chapter" as const, ...c })), { kind: "end" }];
  }, [chapters]);

  const [idx, setIdx] = useState(0);
  const last = slides.length - 1;

  useEffect(() => {
    if (idx >= last) return;
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, last)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, last]);

  const onTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const left = e.clientX < window.innerWidth / 3;
    setIdx((i) => (left ? Math.max(0, i - 1) : Math.min(last, i + 1)));
  }, [last]);

  return createPortal(
    <div className="fixed inset-0 z-[9995] bg-background select-none animate-in fade-in duration-300" onClick={onTap}>
      {slides.map((s, i) => {
        const on = i === idx;
        if (s.kind === "chapter") return <ChapterSlide key={s.event.id} event={s.event} number={s.number} on={on} />;
        return (
          <div
            key={s.kind}
            className={cn("absolute inset-0 flex flex-col items-center justify-center text-center px-8 transition-opacity duration-1000", on ? "opacity-100" : "opacity-0 pointer-events-none")}
          >
            {s.kind === "intro" ? (
              <div key={on ? "on" : "off"}>
                <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#E8336A] dark:text-[#FF7A9B]", on && "ns-rise")}>O livro da</p>
                <h2 className={cn("font-serif text-[34px] font-bold leading-tight mt-2.5", on && "ns-rise")} style={{ animationDelay: "150ms" }}>Nossa História</h2>
                <p className={cn("text-[13px] text-muted-foreground mt-2.5", on && "ns-rise")} style={{ animationDelay: "300ms" }}>{names}</p>
              </div>
            ) : (
              <div key={on ? "on" : "off"}>
                <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#E8336A] dark:text-[#FF7A9B]", on && "ns-rise")}>Até hoje</p>
                <h2 className={cn("font-serif text-[28px] font-bold leading-tight mt-2.5 text-balance", on && "ns-rise")} style={{ animationDelay: "150ms" }}>{timeLabel}</h2>
                <p className={cn("text-[13px] text-muted-foreground mt-2.5", on && "ns-rise")} style={{ animationDelay: "300ms" }}>E a história continua.</p>
                <div className={cn("flex flex-col items-center gap-3 mt-7", on && "ns-rise")} style={{ animationDelay: "450ms" }}>
                  <button type="button" onClick={onShare} className="h-[46px] px-6 rounded-full bg-[#FF4F7B] text-white text-[13.5px] font-extrabold inline-flex items-center gap-2 active:scale-[0.97] transition-transform">
                    <Share className="w-4 h-4" strokeWidth={2.2} /> Partilhar
                  </button>
                  <button type="button" onClick={() => setIdx(0)} className="h-10 px-4 text-[12.5px] font-bold text-muted-foreground inline-flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Ver outra vez
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Barras */}
      <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] flex gap-1 z-10" aria-hidden="true">
        {slides.map((_, i) => (
          <span key={i} className="flex-1 h-[3px] rounded-full bg-[rgba(150,140,148,0.3)] overflow-hidden">
            {i < idx && <i className="block h-full w-full bg-[#FF4F7B]" />}
            {i === idx && (
              <i
                key={idx}
                className={cn("block h-full bg-[#FF4F7B]", idx < last ? "ns-fill" : "w-full")}
                style={idx < last ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
              />
            )}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar o filme"
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+24px)] z-10 w-10 h-10 rounded-full bg-white/70 backdrop-blur-md text-[#1C1A1D] flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>
    </div>,
    document.body,
  );
}
