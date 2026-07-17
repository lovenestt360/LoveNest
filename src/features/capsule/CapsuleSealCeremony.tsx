import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, X } from "lucide-react";

export function CapsuleSealCeremony({
  witnessMode = false,
  onDone,
}: {
  message: string;
  imageUrl: string | null;
  witnessMode?: boolean;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const [overlayIn, setOverlayIn] = useState(false);
  const [cardIn,    setCardIn]    = useState(false);
  const [contentIn, setContentIn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setOverlayIn(true),  30);
    const t2 = setTimeout(() => setCardIn(true),     100);
    const t3 = setTimeout(() => setContentIn(true),  550);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleCta = () => {
    onDone();
    navigate("/capsula");
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
        background: overlayIn ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0)",
        backdropFilter: overlayIn ? "blur(14px)" : "blur(0px)",
        WebkitBackdropFilter: overlayIn ? "blur(14px)" : "blur(0px)",
        transition: "background 600ms ease, backdrop-filter 600ms ease, -webkit-backdrop-filter 600ms ease",
      }}
    >
      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 340,
        borderRadius: 28,
        background: "linear-gradient(160deg, #1c0b38 0%, #0e061d 100%)",
        border: "1px solid rgba(167,139,250,0.16)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.035)",
        overflow: "hidden",
        position: "relative",
        transform: cardIn ? "scale(1) translateY(0)" : "scale(0.86) translateY(48px)",
        opacity: cardIn ? 1 : 0,
        transition: "transform 650ms cubic-bezier(0.16, 1, 0.3, 1), opacity 550ms ease",
      }}>

        {/* Ambient radial glow */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 240, height: 200, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* X close */}
        <button
          onClick={onDone}
          aria-label="Fechar"
          style={{
            position: "absolute", top: 14, right: 14,
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            zIndex: 2,
          }}
        >
          <X size={15} color="rgba(255,255,255,0.55)" strokeWidth={2} />
        </button>

        {/* Content */}
        <div style={{
          padding: "52px 28px 36px",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center",
        }}>

          {/* Lock icon with snap animation */}
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(76,29,149,0.32) 100%)",
            border: "1px solid rgba(167,139,250,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 26,
            boxShadow: "0 0 36px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
            animation: "capsule-lock-snap 800ms cubic-bezier(0.16,1,0.3,1) 250ms both",
          }}>
            <Lock size={32} color="rgba(167,139,250,0.92)" strokeWidth={1.5} />
          </div>

          {/* Eyebrow */}
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(167,139,250,0.75)",
            margin: "0 0 10px",
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 480ms ease, transform 480ms ease",
          }}>
            {witnessMode ? "Cápsula recebida" : "Cápsula selada"}
          </p>

          {/* Title */}
          <h2 style={{
            fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em",
            color: "rgba(255,255,255,0.94)", lineHeight: 1.3,
            margin: "0 0 12px", whiteSpace: "pre-line",
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateY(0)" : "translateY(13px)",
            transition: "opacity 480ms 60ms ease, transform 480ms 60ms ease",
          }}>
            {witnessMode
              ? "O teu par guardou\num momento para vós"
              : "Este momento\nestá protegido"
            }
          </h2>

          {/* Subtitle */}
          <p style={{
            fontSize: 13, color: "rgba(255,255,255,0.35)",
            lineHeight: 1.7, margin: "0 0 30px", maxWidth: 216,
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 480ms 120ms ease, transform 480ms 120ms ease",
          }}>
            {witnessMode
              ? "Será revelado no tempo certo. Até lá, está selado e protegido."
              : "Guardaste um pedaço da vossa história para ser reencontrado juntos."
            }
          </p>

          {/* CTA */}
          <button
            onClick={handleCta}
            style={{
              width: "100%", height: 52, borderRadius: 26,
              background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
              color: "white", fontWeight: 700, fontSize: 15,
              border: "1px solid rgba(167,139,250,0.22)",
              boxShadow: "0 8px 28px rgba(124,58,237,0.38)",
              cursor: "pointer", outline: "none",
              letterSpacing: "-0.01em",
              opacity: contentIn ? 1 : 0,
              transform: contentIn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.96)",
              transition: "opacity 480ms 180ms ease, transform 480ms 180ms ease",
            }}
          >
            Ver as cápsulas
          </button>
        </div>
      </div>
    </div>
  );
}
