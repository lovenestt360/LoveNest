import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Lock, X } from "lucide-react";

const PORTAL_BASE: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  zIndex: 9999, display: "flex", flexDirection: "column", overscrollBehavior: "none",
};

const PARTICLES = [
  { dx:  0, dy: -88 }, { dx: 62,  dy: -62 }, { dx:  88, dy:  0 },
  { dx:  62, dy:  62 }, { dx:  0, dy:  88 }, { dx: -62, dy:  62 },
  { dx: -88, dy:  0 }, { dx: -62, dy: -62 },
];

const SEAL_QUOTES = [
  "Este momento ficou protegido.\n\nDaqui a algum tempo, esta memória voltará até vocês exatamente como a viveram hoje.",
  "O tempo começou agora.\n\nHá memórias que merecem esperar pelo momento certo para serem revividas.",
  "Guardada com carinho.\n\nQuando este dia voltar, talvez tudo seja diferente. Mas esta memória continuará exatamente igual.",
  "Uma cápsula é uma promessa ao futuro.\n\nEste pedaço da vossa história ficará protegido até que seja hora de o descobrir.",
];

function pickQuote(quotes: string[], id: string) {
  const n = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return quotes[n % quotes.length];
}

export interface SealData {
  imageUrl: string | null;
  unlockDate: string;
  capsuleId: string;
}

export function CapsuleSealCeremony({ imageUrl, unlockDate, capsuleId, onClose }: SealData & { onClose: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 2200);
    const t2 = setTimeout(() => setStep(2), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const hasPhoto  = !!imageUrl && !/\.(mp4|webm|mov)(\?|$)/i.test(imageUrl);
  const dateObj   = new Date(unlockDate);
  const dateStr   = format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: pt });
  const daysUntil = Math.max(0, differenceInDays(dateObj, new Date()));
  const waitStr   = daysUntil === 0 ? "Hoje mesmo"
    : daysUntil === 1 ? "Daqui a 1 dia"
    : daysUntil < 30  ? `Daqui a ${daysUntil} dias`
    : daysUntil < 365 ? `Daqui a ${Math.floor(daysUntil / 30)} ${Math.floor(daysUntil / 30) === 1 ? "mês" : "meses"}`
    : `Daqui a ${Math.floor(daysUntil / 365)} ${Math.floor(daysUntil / 365) === 1 ? "ano" : "anos"}`;
  const quote = pickQuote(SEAL_QUOTES, capsuleId);

  return createPortal(
    <div style={{ ...PORTAL_BASE, background: "#08020e", overflow: "hidden" }}>

      {/* X — sempre visível */}
      <button onClick={onClose} style={{
        position: "absolute", top: 16, right: 16, zIndex: 20,
        width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
        background: "rgba(255,255,255,0.09)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <X size={18} color="rgba(255,255,255,0.70)" strokeWidth={1.5} />
      </button>

      {/* ═══════════ STEP 0: BURST SEAL ════════════ */}
      {step === 0 && (
        <div style={{ position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Foto mal visível por trás — cria atmosfera */}
          {hasPhoto && (
            <img src={imageUrl!} aria-hidden alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: 0.18,
              filter: "blur(32px) brightness(0.30)",
            }} />
          )}

          {/* Glow violeta ambiente */}
          <div style={{
            position: "absolute", width: 260, height: 260, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.32) 0%, transparent 70%)",
            filter: "blur(44px)", pointerEvents: "none",
          }} />

          {/* Burst rings — violeta */}
          <div style={{ position: "absolute", width: 88, height: 88, borderRadius: "50%",
            border: "2px solid rgba(124,58,237,0.72)",
            animation: "burst-ring 1100ms ease-out both" }} />
          <div style={{ position: "absolute", width: 88, height: 88, borderRadius: "50%",
            border: "1px solid rgba(139,92,246,0.48)",
            animation: "burst-ring 1100ms ease-out 220ms both" }} />

          {/* Partículas — violeta */}
          {PARTICLES.map((p, i) => (
            <div key={i} style={{
              position: "absolute", width: 5, height: 5, borderRadius: "50%",
              background: i % 2 === 0 ? "rgba(167,139,250,0.88)" : "rgba(124,58,237,0.65)",
              ["--dx" as any]: `${p.dx}px`, ["--dy" as any]: `${p.dy}px`,
              animation: `particle-out 900ms ${i * 60}ms ease-out both`,
            }} />
          ))}

          {/* Ícone cadeado a selar */}
          <div style={{ position: "relative", zIndex: 2,
            width: 88, height: 88, borderRadius: "50%",
            background: "rgba(124,58,237,0.18)", border: "1px solid rgba(139,92,246,0.34)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "burst-icon 800ms ease both",
            boxShadow: "0 0 80px rgba(124,58,237,0.52)" }}>
            <Lock size={38} color="rgba(196,181,253,1)" strokeWidth={1} />
          </div>

          {/* Label */}
          <p style={{
            position: "absolute", top: "calc(50% + 72px)",
            left: 0, right: 0, textAlign: "center",
            fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(167,139,250,0.50)", fontWeight: 600,
            animation: "capsule-fade-up 600ms 600ms both ease",
          }}>
            Cápsula selada
          </p>
        </div>
      )}

      {/* ═══════════ STEP 1+: FOTO + PAINEL ═══════════ */}
      {step >= 1 && (
        <div style={{ position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", background: "#000",
          animation: "capsule-fade-up 300ms ease both" }}>

          {hasPhoto ? (
            <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Ambient blur */}
              <img src={imageUrl!} aria-hidden
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", filter: "blur(28px) brightness(0.20)", transform: "scale(1.06)" }} />
              {/* Foto principal — animação leve photo-appear */}
              <img src={imageUrl!} alt="Memória guardada"
                style={{ position: "relative", zIndex: 1,
                  maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto",
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.40))",
                  animation: "photo-appear 1100ms ease both" }} />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%",
                background: "rgba(124,58,237,0.16)", border: "1px solid rgba(139,92,246,0.26)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 80px rgba(124,58,237,0.40)",
                animation: "burst-icon 700ms ease both" }}>
                <Lock size={44} color="rgba(196,181,253,0.92)" strokeWidth={1} />
              </div>
            </div>
          )}

          {/* Painel emocional — step 2 */}
          {step >= 2 && (
            <div className="bg-card rounded-t-[2rem] px-5 pt-5 shrink-0 overflow-y-auto"
              style={{
                maxHeight: hasPhoto ? "54svh" : "78svh",
                paddingBottom: "max(env(safe-area-inset-bottom,0px),1.5rem)",
                boxShadow: "0 -16px 48px rgba(0,0,0,0.32)",
                animation: "panel-slide-up 500ms ease both",
              }}>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400 mb-3"
                style={{ animation: "capsule-fade-up 400ms 100ms both ease" }}>
                Cápsula selada
              </p>

              <p className="text-[15px] font-medium text-foreground leading-relaxed whitespace-pre-line mb-5"
                style={{ animation: "capsule-fade-up 400ms 200ms both ease" }}>
                {quote}
              </p>

              <div className="flex items-center gap-3 py-3 border-t border-border/40 mb-4"
                style={{ animation: "capsule-fade-up 400ms 320ms both ease" }}>
                <div className="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold leading-none mb-0.5">
                    Será revelada
                  </p>
                  <p className="text-[13px] text-foreground capitalize leading-tight">
                    {dateStr} · <span className="text-violet-400 font-semibold">{waitStr}</span>
                  </p>
                </div>
              </div>

              <button onClick={onClose}
                className="w-full h-12 rounded-2xl text-white font-semibold text-sm active:scale-[0.98] transition-all"
                style={{
                  background: "linear-gradient(135deg,#7c3aed 0%,#4c1d95 100%)",
                  boxShadow: "0 8px 28px rgba(124,58,237,0.30)",
                  animation: "capsule-fade-up 400ms 440ms both ease",
                }}>
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

// Listener global — montado em App.tsx para cobrir toda a app
export function CapsuleSealListener() {
  const [sealData, setSealData] = useState<SealData | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SealData>).detail;
      if (detail?.capsuleId) setSealData(detail);
    };
    window.addEventListener("lovenest-capsule-sealed", handler);
    return () => window.removeEventListener("lovenest-capsule-sealed", handler);
  }, []);

  if (!sealData) return null;
  return (
    <CapsuleSealCeremony
      {...sealData}
      onClose={() => setSealData(null)}
    />
  );
}
