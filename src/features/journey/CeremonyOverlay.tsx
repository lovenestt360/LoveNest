import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { X, Download, Share2, Loader2, Flame, Sparkles, BookHeart, HeartHandshake, Lock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CeremonyContent, CeremonyType } from "@/lib/ceremonies";

// Cerimónias — momento full-screen ao atingir um marco da Jornada.
// Mantida globalmente (montada uma vez em App.tsx) e acionada por
// eventos "lovenest-ceremony" despachados de qualquer página — ver
// docs/LOVENEST_PROGRESS_SYSTEM.md, secção 8.

const ICON_BY_TYPE: Record<CeremonyType, React.ElementType> = {
  streak_milestone: Flame,
  level_up: Sparkles,
  livro_concluido: BookHeart,
  aniversario: HeartHandshake,
  capsula: Lock,
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

export function CeremonyOverlay() {
  const [content, setContent] = useState<CeremonyContent | null>(null);
  const [phase, setPhase] = useState<"intro" | "card">("intro");
  const [exporting, setExporting] = useState<"save" | "share" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CeremonyContent>).detail;
      if (!detail) return;
      setContent(detail);
      setPhase(reduced ? "card" : "intro");
    };
    window.addEventListener("lovenest-ceremony", handler);
    return () => window.removeEventListener("lovenest-ceremony", handler);
  }, [reduced]);

  useEffect(() => {
    if (!content || phase !== "intro") return;
    const t = setTimeout(() => setPhase("card"), 1400);
    return () => clearTimeout(t);
  }, [content, phase]);

  useEffect(() => {
    if (!content) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [content]);

  const handleClose = () => {
    setContent(null);
    setPhase("intro");
  };

  const generateImage = async (): Promise<File | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], "lovenest-cerimonia.png", { type: "image/png" });
  };

  const handleSave = async () => {
    setExporting("save");
    try {
      const file = await generateImage();
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("[CeremonyOverlay] save error:", err?.message);
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    setExporting("share");
    try {
      const file = await generateImage();
      if (!file) return;
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: content?.title });
      } else {
        await handleSave();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("[CeremonyOverlay] share error:", err?.message);
    } finally {
      setExporting(null);
    }
  };

  if (!content) return null;
  const Icon = ICON_BY_TYPE[content.type];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-300 p-6">
      <button
        onClick={handleClose}
        aria-label="Fechar"
        className="absolute top-5 right-5 h-9 w-9 rounded-full bg-muted/80 flex items-center justify-center active:scale-90 transition-transform"
      >
        <X className="w-4 h-4 text-foreground" strokeWidth={1.5} />
      </button>

      {phase === "intro" ? (
        <div className="flex flex-col items-center gap-5 animate-in zoom-in-95 fade-in duration-500">
          <div className={cn(
            "h-24 w-24 rounded-full flex items-center justify-center",
            content.type === "capsula"
              ? "bg-gradient-to-br from-indigo-400/20 to-indigo-500/10 border border-indigo-200/40 dark:border-indigo-900/40"
              : "bg-gradient-to-br from-rose-400/20 to-rose-500/10 border border-rose-200/40 dark:border-rose-900/40",
            !reduced && (content.type === "capsula" ? "animate-lock-snap animate-lock-glow" : "animate-glow-pulse")
          )}>
            <Icon
              className={cn("w-10 h-10", content.type === "capsula" ? "text-indigo-400" : "text-rose-400")}
              strokeWidth={1.5}
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">
            {content.eyebrow}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div
            ref={cardRef}
            className="relative w-full aspect-[9/16] rounded-[2rem] overflow-hidden flex flex-col items-center justify-center px-6 text-center"
            style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,107,143,0.16) 0%, transparent 60%), hsl(var(--card))" }}
          >
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mb-6",
              content.type === "capsula"
                ? "bg-gradient-to-br from-indigo-400/20 to-indigo-500/10 border border-indigo-200/40 dark:border-indigo-900/40"
                : "bg-gradient-to-br from-rose-400/20 to-rose-500/10 border border-rose-200/40 dark:border-rose-900/40"
            )}>
              <Icon
                className={cn("w-7 h-7", content.type === "capsula" ? "text-indigo-400" : "text-rose-400")}
                strokeWidth={1.5}
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {content.eyebrow}
            </p>
            <h2 className="text-2xl font-bold text-foreground leading-snug mb-3">
              {content.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content.subtitle}
            </p>

            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5">
              <Heart className="w-3 h-3 fill-rose-400 text-rose-400" strokeWidth={0} />
              <span className="text-[11px] font-semibold text-muted-foreground/70 tracking-wide">LoveNest</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={handleSave}
              disabled={exporting !== null}
              className="flex-1 h-12 rounded-2xl border border-border bg-card text-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
            >
              {exporting === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={1.5} />}
              Guardar
            </button>
            <button
              onClick={handleShare}
              disabled={exporting !== null}
              className="flex-1 h-12 rounded-2xl bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
            >
              {exporting === "share" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" strokeWidth={1.5} />}
              Partilhar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
