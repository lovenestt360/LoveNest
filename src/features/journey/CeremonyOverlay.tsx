import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { X, Share2, Loader2, Flame, Sparkles, BookHeart, HeartHandshake, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CeremonyContent, CeremonyType } from "@/lib/ceremonies";

const ICON_BY_TYPE: Record<CeremonyType, React.ElementType> = {
  streak_milestone: Flame,
  level_up:         Sparkles,
  livro_concluido:  BookHeart,
  aniversario:      HeartHandshake,
  capsula:          Lock,
};

const THEME: Record<CeremonyType, {
  glow: string; accent: string; border: string;
  iconBg: string; ctaBg: string; cardBg: string;
}> = {
  capsula: {
    glow: "rgba(124,58,237,0.40)", accent: "rgba(167,139,250,0.92)",
    border: "rgba(167,139,250,0.18)", iconBg: "rgba(124,58,237,0.22)",
    ctaBg: "linear-gradient(135deg,#7c3aed 0%,#4c1d95 100%)",
    cardBg: "linear-gradient(160deg,#1a0830 0%,#0d0518 100%)",
  },
  level_up: {
    glow: "rgba(244,63,94,0.40)", accent: "rgba(251,113,133,0.92)",
    border: "rgba(251,113,133,0.18)", iconBg: "rgba(244,63,94,0.22)",
    ctaBg: "linear-gradient(135deg,#f43f5e 0%,#be123c 100%)",
    cardBg: "linear-gradient(160deg,#1e0510 0%,#0f0208 100%)",
  },
  streak_milestone: {
    glow: "rgba(244,63,94,0.40)", accent: "rgba(251,113,133,0.92)",
    border: "rgba(251,113,133,0.18)", iconBg: "rgba(244,63,94,0.22)",
    ctaBg: "linear-gradient(135deg,#f43f5e 0%,#be123c 100%)",
    cardBg: "linear-gradient(160deg,#1e0510 0%,#0f0208 100%)",
  },
  livro_concluido: {
    glow: "rgba(139,92,246,0.40)", accent: "rgba(196,181,253,0.92)",
    border: "rgba(167,139,250,0.18)", iconBg: "rgba(139,92,246,0.22)",
    ctaBg: "linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)",
    cardBg: "linear-gradient(160deg,#150a28 0%,#0a0516 100%)",
  },
  aniversario: {
    glow: "rgba(244,63,94,0.40)", accent: "rgba(251,113,133,0.92)",
    border: "rgba(251,113,133,0.18)", iconBg: "rgba(244,63,94,0.22)",
    ctaBg: "linear-gradient(135deg,#f43f5e 0%,#be123c 100%)",
    cardBg: "linear-gradient(160deg,#1e0510 0%,#0f0208 100%)",
  },
};

const CTA_LABEL: Record<CeremonyType, string> = {
  capsula:          "Ver as cápsulas",
  level_up:         "Continuar",
  streak_milestone: "Continuar",
  livro_concluido:  "Continuar",
  aniversario:      "Continuar",
};

const CTA_PATH: Partial<Record<CeremonyType, string>> = {
  capsula: "/capsula",
};

function useReducedMotion() {
  const [v, setV] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = (e: MediaQueryListEvent) => setV(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return v;
}

export function CeremonyOverlay() {
  const [content,   setContent]   = useState<CeremonyContent | null>(null);
  const [bgIn,      setBgIn]      = useState(false);
  const [cardIn,    setCardIn]    = useState(false);
  const [contentIn, setContentIn] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef  = useRef<HTMLDivElement>(null);
  const reduced  = useReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CeremonyContent>).detail;
      if (!detail) return;
      // Reset
      setBgIn(false); setCardIn(false); setContentIn(false);
      setContent(detail);
      // Stagger entrance
      const d = reduced ? 0 : 1;
      setTimeout(() => setBgIn(true),      20  * d);
      setTimeout(() => setCardIn(true),    80  * d);
      setTimeout(() => setContentIn(true), 520 * d);
    };
    window.addEventListener("lovenest-ceremony", handler);
    return () => window.removeEventListener("lovenest-ceremony", handler);
  }, [reduced]);

  useEffect(() => {
    if (!content) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [content]);

  const dismiss = () => {
    setBgIn(false); setCardIn(false);
    setTimeout(() => { setContent(null); setContentIn(false); }, 350);
  };

  const handleCta = () => {
    const path = content ? CTA_PATH[content.type] : undefined;
    dismiss();
    if (path) setTimeout(() => navigate(path), 360);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "lovenest-momento.png", { type: "image/png" });
      const nav  = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: content?.title });
      } else {
        const url = URL.createObjectURL(file);
        const a   = document.createElement("a");
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("[CeremonyOverlay] share:", err?.message);
    } finally {
      setExporting(false);
    }
  };

  if (!content) return null;

  const Icon   = ICON_BY_TYPE[content.type];
  const th     = THEME[content.type];
  const isCapsula = content.type === "capsula";

  const transition = (delay = 0) =>
    `opacity 480ms ${delay}ms ease, transform 480ms ${delay}ms cubic-bezier(0.16,1,0.3,1)`;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      background: bgIn ? "rgba(0,0,0,0.80)" : "rgba(0,0,0,0)",
      backdropFilter: bgIn ? "blur(22px)" : "blur(0px)",
      WebkitBackdropFilter: bgIn ? "blur(22px)" : "blur(0px)",
      transition: "background 500ms ease, backdrop-filter 500ms ease, -webkit-backdrop-filter 500ms ease",
    }}>

      {/* X */}
      <button
        onClick={dismiss}
        aria-label="Fechar"
        style={{
          position: "absolute", top: 18, right: 18, zIndex: 3,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.09)",
          border: "1px solid rgba(255,255,255,0.13)",
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          opacity: bgIn ? 1 : 0,
          transition: "opacity 400ms 200ms ease",
        }}
      >
        <X size={16} color="rgba(255,255,255,0.60)" strokeWidth={2} />
      </button>

      {/* Card */}
      <div
        ref={cardRef}
        style={{
          width: "100%", maxWidth: 330,
          borderRadius: 28,
          background: th.cardBg,
          border: `1px solid ${th.border}`,
          boxShadow: `0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 80px ${th.glow}`,
          overflow: "hidden",
          position: "relative",
          transform: cardIn ? "scale(1) translateY(0)" : "scale(0.84) translateY(56px)",
          opacity: cardIn ? 1 : 0,
          transition: "transform 700ms cubic-bezier(0.16,1,0.3,1), opacity 600ms ease",
        }}
      >
        {/* Ambient radial glow at top */}
        <div style={{
          position: "absolute", top: -60, left: "50%",
          transform: "translateX(-50%)",
          width: 280, height: 220, borderRadius: "50%",
          background: `radial-gradient(ellipse, ${th.glow} 0%, transparent 72%)`,
          pointerEvents: "none",
        }} />

        <div style={{
          padding: "56px 28px 40px",
          display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center",
        }}>

          {/* Icon */}
          <div style={{
            width: 84, height: 84, borderRadius: "50%",
            background: th.iconBg,
            border: `1px solid ${th.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 28,
            boxShadow: `0 0 48px ${th.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`,
            animation: !reduced
              ? "ceremony-icon-pop 900ms cubic-bezier(0.16,1,0.3,1) 180ms both"
              : undefined,
          }}>
            <Icon size={36} style={{ color: th.accent }} strokeWidth={1.5} />
          </div>

          {/* Eyebrow */}
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.20em",
            textTransform: "uppercase", color: th.accent,
            margin: "0 0 10px",
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateY(0)" : "translateY(12px)",
            transition: transition(0),
          }}>
            {content.eyebrow}
          </p>

          {/* Title */}
          <h2 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em",
            color: "rgba(255,255,255,0.95)", lineHeight: 1.25,
            margin: "0 0 12px",
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateY(0)" : "translateY(14px)",
            transition: transition(70),
          }}>
            {content.title}
          </h2>

          {/* Subtitle */}
          <p style={{
            fontSize: 13.5, color: "rgba(255,255,255,0.38)",
            lineHeight: 1.70, margin: "0 0 30px", maxWidth: 228,
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateY(0)" : "translateY(15px)",
            transition: transition(140),
          }}>
            {content.subtitle}
          </p>

          {/* CTA */}
          <button
            onClick={handleCta}
            style={{
              width: "100%", height: 52, borderRadius: 26,
              background: th.ctaBg,
              color: "white", fontWeight: 700, fontSize: 15,
              border: `1px solid ${th.border}`,
              boxShadow: `0 10px 32px ${th.glow}`,
              cursor: "pointer", outline: "none",
              letterSpacing: "-0.01em",
              marginBottom: isCapsula ? 0 : 10,
              opacity: contentIn ? 1 : 0,
              transform: contentIn ? "scale(1) translateY(0)" : "scale(0.96) translateY(15px)",
              transition: transition(210),
            }}
          >
            {CTA_LABEL[content.type]}
          </button>

          {/* Partilhar — só em cerimónias que não são cápsula */}
          {!isCapsula && (
            <button
              onClick={handleShare}
              disabled={exporting}
              style={{
                width: "100%", height: 46, borderRadius: 26,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.60)",
                fontWeight: 600, fontSize: 14,
                cursor: "pointer", outline: "none",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                opacity: contentIn ? (exporting ? 0.45 : 1) : 0,
                transform: contentIn ? "translateY(0)" : "translateY(15px)",
                transition: transition(270),
              }}
            >
              {exporting
                ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                : <Share2 size={16} strokeWidth={1.5} />
              }
              Partilhar momento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
