import { useEffect, useRef, useState } from "react";
import { Heart, Lock } from "lucide-react";

interface Particle {
  id: number;
  x: number; y: number;
  size: number;
  delay: number; duration: number;
  rotDir: string;
  color: string;
}

function mkParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, id) => ({
    id,
    x: 4 + Math.random() * 92,
    y: 8 + Math.random() * 82,
    size: 1.5 + Math.random() * 3,
    delay: Math.random() * 3500,
    duration: 4500 + Math.random() * 5500,
    rotDir: Math.random() > 0.5 ? "16deg" : "-16deg",
    color: [
      "rgba(139,92,246,0.80)",
      "rgba(167,139,250,0.60)",
      "rgba(244,63,94,0.70)",
      "rgba(196,181,253,0.50)",
      "rgba(255,255,255,0.40)",
      "rgba(221,160,255,0.55)",
    ][id % 6],
  }));
}

export function CapsuleSealCeremony({
  message,
  imageUrl,
  onDone,
}: {
  message: string;
  imageUrl: string | null;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const particles = useRef(mkParticles(34)).current;

  const hasImg = !!imageUrl;

  useEffect(() => {
    // Com foto: +700ms nos passos a partir de phase 5
    const x = hasImg ? 700 : 0;
    const ts = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 380),
      setTimeout(() => setPhase(3), 780),
      setTimeout(() => setPhase(4), 1500),
      setTimeout(() => setPhase(5), 1900 + x),   // foto OU texto
      setTimeout(() => setPhase(6), 2550 + x),   // texto dissolve
      setTimeout(() => setPhase(7), 3200 + x),   // tampa fecha
      setTimeout(() => setPhase(8), 4000 + x),   // cadeado desce
      setTimeout(() => setPhase(9), 4550 + x),   // cadeado fecha + haptic
      setTimeout(() => setPhase(10), 4950 + x),  // onda de selagem
      setTimeout(() => setPhase(11), 5800 + x),  // texto + botão
    ];
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 9) {
      try { navigator.vibrate?.([15, 50, 25]); } catch {}
    }
  }, [phase]);

  const BOX_W     = 148;
  const LID_H     = 44;
  const BODY_H    = 96;
  const LOCK_SIZE = 44;

  const lidTop    = phase >= 7 ? 0   : -60;
  const lockTop   = phase >= 8 ? 0   : -90;
  const lockLive  = phase >= 9;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 28%, rgba(55,14,110,0.60) 0%, rgba(3,0,11,0.97) 68%)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        opacity: phase >= 1 ? 1 : 0,
        transition: "opacity 700ms ease-in-out",
      }}
    >

      {/* ── Ambient glows ── */}
      {phase >= 2 && (
        <>
          <div style={{
            position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)",
            width: 340, height: 340, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.20) 0%, transparent 70%)",
            filter: "blur(56px)",
            animation: "capsule-ambient-glow 5s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "22%", left: "32%",
            width: 220, height: 220, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(244,63,94,0.10) 0%, transparent 70%)",
            filter: "blur(44px)",
            animation: "capsule-ambient-glow 8s ease-in-out infinite 3s",
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* ── Particles ── */}
      {phase >= 2 && particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            animation: `capsule-particle-rise ${p.duration}ms ease-out ${p.delay}ms infinite`,
            ["--rotate-dir" as string]: p.rotDir,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ── Main animation zone ── */}
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: -80,
      }}>

        {/* ── Heart (phase 3 → fades at 4) ── */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 30,
          opacity: phase >= 4 ? 0 : phase >= 3 ? 1 : 0,
          transition: phase >= 4
            ? "opacity 450ms ease-out"
            : "opacity 550ms ease-in",
          pointerEvents: "none",
        }}>
          <Heart
            style={{
              width: 48, height: 48,
              color: "rgba(244,63,94,0.95)",
              fill: "rgba(244,63,94,0.75)",
              filter: "drop-shadow(0 0 16px rgba(244,63,94,0.85))",
              animation: phase === 3
                ? "capsule-heart-pulse 1.0s ease-in-out infinite"
                : undefined,
            }}
          />
        </div>

        {/* ── Photo above box (phase 5, enters box at phase 7) ── */}
        {hasImg && phase >= 5 && (
          <div style={{
            width: 78, height: 78,
            borderRadius: 13,
            overflow: "hidden",
            border: "2px solid rgba(139,92,246,0.55)",
            boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 0 22px rgba(139,92,246,0.25)",
            marginBottom: 12,
            flexShrink: 0,
            opacity: phase >= 7 ? 0 : 1,
            transform: phase >= 7
              ? "translateY(55px) scale(0.18)"
              : "translateY(0) scale(1)",
            transition: phase >= 7
              ? "opacity 650ms ease-in, transform 650ms ease-in"
              : "opacity 550ms ease-out, transform 600ms cubic-bezier(0.34, 1.2, 0.64, 1)",
            animation: (phase === 5 || phase === 6)
              ? "capsule-photo-float 3.2s ease-in-out infinite"
              : undefined,
          }}>
            <img
              src={imageUrl!}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        {/* Space placeholder when no photo */}
        {!hasImg && phase >= 4 && <div style={{ height: 16 }} />}

        {/* ── Message text dissolves (phase 6) ── */}
        {phase >= 6 && phase <= 8 && (
          <div style={{
            position: "absolute",
            top: hasImg ? -(78 + 22) : -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 190,
            textAlign: "center",
            opacity: phase >= 7 ? 0 : 0.5,
            filter: phase >= 7 ? "blur(12px)" : "blur(0px)",
            transition: "opacity 1100ms ease-in-out, filter 1100ms ease-in-out",
            pointerEvents: "none",
          }}>
            <p style={{
              color: "rgba(216,180,254,0.85)",
              fontSize: 11.5,
              lineHeight: 1.55,
              fontStyle: "italic",
            }}>
              {message.slice(0, 58)}{message.length > 58 ? "…" : ""}
            </p>
          </div>
        )}

        {/* ── THE BOX (phase 4) ── */}
        {phase >= 4 && (
          <div style={{
            position: "relative",
            width: BOX_W,
            paddingTop: LID_H,
            opacity: 1,
            transform: phase >= 4
              ? "scale(1) translateY(0)"
              : "scale(0.15) translateY(30px)",
            transition: "transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>

            {/* ── Lid ── */}
            <div style={{
              position: "absolute",
              top: lidTop,
              left: 0, right: 0,
              height: LID_H,
              background: "linear-gradient(165deg, #3d0e96 0%, #1c0b4a 58%, #100730 100%)",
              border: "1px solid rgba(139,92,246,0.60)",
              borderRadius: "12px 12px 3px 3px",
              transition: "top 1000ms cubic-bezier(0.34, 1.06, 0.64, 1)",
              boxShadow: phase >= 7
                ? "0 6px 30px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "0 18px 52px rgba(0,0,0,0.65)",
              zIndex: 5,
              overflow: "hidden",
            }}>
              {/* Groove */}
              <div style={{
                position: "absolute",
                bottom: 0, left: 18, right: 18,
                height: 1,
                background: "rgba(139,92,246,0.28)",
              }} />
              {/* Emboss line */}
              <div style={{
                position: "absolute",
                top: "46%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 26, height: 2,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
              }} />
              {/* Shine sweep on close */}
              {phase === 7 && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.24) 50%, transparent 100%)",
                  animation: "capsule-shine-sweep 800ms ease-out forwards",
                }} />
              )}
            </div>

            {/* ── Box body ── */}
            <div style={{
              width: 144,
              marginLeft: 2,
              height: BODY_H,
              background: "linear-gradient(168deg, #190948 0%, #090420 52%, #110730 100%)",
              border: "1px solid rgba(109,40,217,0.40)",
              borderRadius: "3px 3px 14px 14px",
              position: "relative",
              overflow: "hidden",
              boxShadow: [
                "0 40px 90px rgba(0,0,0,0.85)",
                "0 0 0 1px rgba(0,0,0,0.55)",
                "0 0 64px rgba(109,40,217,0.07)",
                "inset 0 1px 0 rgba(255,255,255,0.03)",
                "inset 0 -2px 32px rgba(0,0,0,0.40)",
              ].join(", "),
            }}>
              {/* Heart emboss */}
              <Heart style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 40, height: 40,
                color: "rgba(109,40,217,0.07)",
                fill: "rgba(109,40,217,0.04)",
              }} />
              {/* Top edge line */}
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 1,
                background: "rgba(139,92,246,0.18)",
              }} />
              {/* Opening inner glow */}
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.38) 0%, transparent 58%)",
                opacity: phase >= 7 ? 0 : 1,
                transition: "opacity 700ms ease-in-out",
                animation: phase < 7
                  ? "capsule-ambient-glow 3.2s ease-in-out infinite"
                  : undefined,
              }} />
            </div>

            {/* ── Lock ── */}
            <div style={{
              position: "absolute",
              left: "50%",
              top: lockTop,
              transform: "translateX(-50%)",
              width: LOCK_SIZE,
              height: LOCK_SIZE,
              transition: "top 750ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              opacity: phase >= 8 ? 1 : 0,
              zIndex: 20,
            }}>
              <div style={{
                width: LOCK_SIZE, height: LOCK_SIZE,
                borderRadius: "50%",
                background: lockLive
                  ? "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)"
                  : "rgba(10,5,28,0.94)",
                border: lockLive
                  ? "1px solid rgba(167,139,250,0.58)"
                  : "1px solid rgba(109,40,217,0.48)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 350ms ease-out, border-color 350ms ease-out",
                animation: lockLive
                  ? "capsule-lock-snap 0.48s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, capsule-lock-glow 2.8s ease-in-out 0.48s infinite"
                  : undefined,
              }}>
                <Lock
                  style={{
                    width: 20, height: 20,
                    color: lockLive
                      ? "white"
                      : "rgba(167,139,250,0.72)",
                    transition: "color 350ms ease-out",
                    strokeWidth: 2,
                  }}
                />
              </div>
            </div>

            {/* ── Seal waves (from lock center) ── */}
            {phase >= 10 && [0, 1, 2].map(i => (
              <div key={i} style={{
                position: "absolute",
                top: LOCK_SIZE / 2,
                left: "50%",
                width: 8, height: 8,
                borderRadius: "50%",
                border: i === 0
                  ? "1.5px solid rgba(139,92,246,0.65)"
                  : i === 1
                  ? "1px solid rgba(244,63,94,0.38)"
                  : "1px solid rgba(255,255,255,0.22)",
                animation: `capsule-seal-wave 1200ms ease-out ${i * 220}ms forwards`,
                pointerEvents: "none",
                zIndex: 25,
              }} />
            ))}

          </div>
        )}
      </div>

      {/* ── Final text + CTA (phase 11) ── */}
      {phase >= 11 && (
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          padding: "0 32px",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 44px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          animation: "capsule-text-reveal 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(167,139,250,0.90)",
            margin: 0,
          }}>
            Cápsula selada
          </p>
          <h2 style={{
            fontSize: 22, fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "white",
            lineHeight: 1.2,
            margin: 0,
          }}>
            Este momento está protegido
          </h2>
          <p style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.40)",
            maxWidth: 235,
            lineHeight: 1.65,
            margin: 0,
          }}>
            Guardaste um pedaço da vossa história para ser reencontrado juntos.
          </p>
          <button
            onClick={onDone}
            style={{
              marginTop: 18,
              height: 52,
              paddingInline: 44,
              borderRadius: 28,
              background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
              color: "white",
              fontWeight: 700,
              fontSize: 15,
              border: "1px solid rgba(167,139,250,0.32)",
              boxShadow: "0 0 44px rgba(124,58,237,0.38), 0 18px 44px rgba(0,0,0,0.65)",
              cursor: "pointer",
              outline: "none",
              WebkitAppearance: "none",
              letterSpacing: "-0.01em",
            }}
          >
            Ver a vossa cápsula
          </button>
        </div>
      )}
    </div>
  );
}
