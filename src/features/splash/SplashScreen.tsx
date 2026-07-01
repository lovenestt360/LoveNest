import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── SplashOverlay ─────────────────────────────────────────────────────────────
//
// Performance rules (iPhone 7 / low-end Safari):
//   - Apenas transitions de opacity + transform (compositor-only, zero repaints)
//   - Sem blur, sem animate-ping, sem SVG complexo
//   - Avatares cachados em localStorage (TTL 24h) → abertura instantânea
//   - Fetch de dados corre em paralelo com a animação — nunca a bloqueia
//   - Fallback para círculo com iniciais se foto não carregar
//
// Timing:
//   0ms   → logo fade in
//   500ms → wordmark aparece
//   900ms → fotos/iniciais aparecem
//   2800ms → começa fade out
//   3400ms → onDone (app monta)

const CACHE_KEY = "lovenest_splash_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface SplashCache {
  initials: string;
  avatar1: string | null; // URL ou null
  avatar2: string | null;
  name1: string;
  name2: string;
  ts: number;
}

function readCache(): SplashCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: SplashCache = JSON.parse(raw);
    if (Date.now() - c.ts > CACHE_TTL) return null;
    return c;
  } catch { return null; }
}

function writeCache(c: SplashCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

// Círculo com foto ou inicial
function Avatar({ url, name, size = 64 }: { url: string | null; name: string; size?: number }) {
  const [loaded, setLoaded] = useState(false);
  const initial = name ? name[0].toUpperCase() : "?";

  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      overflow: "hidden",
      border: "2.5px solid rgba(244,63,94,0.55)",
      background: "#1a1a1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Inicial como fallback sempre presente */}
      <span style={{
        position: "absolute",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "rgba(255,255,255,0.7)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        opacity: loaded ? 0 : 1,
        transition: "opacity 400ms ease",
        userSelect: "none",
      }}>
        {initial}
      </span>
      {url && (
        <img
          src={url}
          alt={name}
          width={size}
          height={size}
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 400ms ease",
          }}
        />
      )}
    </div>
  );
}

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [coupleData, setCoupleData] = useState<SplashCache | null>(() => readCache());

  useEffect(() => {
    let mounted = true;

    async function fetchCouple() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) return;

        // Membros do espaço do casal
        const { data: member } = await supabase
          .from("members")
          .select("couple_space_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!member?.couple_space_id || !mounted) return;

        const { data: members } = await supabase
          .from("members")
          .select("user_id")
          .eq("couple_space_id", member.couple_space_id)
          .limit(2);

        if (!members?.length || !mounted) return;

        // Perfis dos dois membros (avatar + nome)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", members.map(m => m.user_id));

        if (!profiles?.length || !mounted) return;

        const p1 = profiles[0];
        const p2 = profiles[1] ?? null;
        const name1 = p1?.display_name ?? "?";
        const name2 = p2?.display_name ?? "?";

        const cache: SplashCache = {
          initials: `${name1[0] ?? "?"}${name2[0] ?? "?"}`,
          avatar1: p1?.avatar_url ?? null,
          avatar2: p2?.avatar_url ?? null,
          name1, name2,
          ts: Date.now(),
        };

        writeCache(cache);
        if (mounted) setCoupleData(cache);
      } catch {
        // Falha silenciosa — splash nunca quebra por causa de dados
      }
    }

    fetchCouple();

    const t1 = setTimeout(() => mounted && setStage(1), 500);
    const t2 = setTimeout(() => mounted && setStage(2), 900);
    const t3 = setTimeout(() => mounted && setStage(3), 2800);
    const t4 = setTimeout(onDone, 3400);

    return () => {
      mounted = false;
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        willChange: "opacity",
        transition: "opacity 600ms ease-in-out",
        opacity: stage === 3 ? 0 : 1,
        pointerEvents: stage === 3 ? "none" : "auto",
      }}
    >
      {/* Logo + wordmark */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
          opacity: stage >= 0 ? 1 : 0,
          transform: stage >= 0 ? "scale(1)" : "scale(0.88)",
        }}>
          <img
            src="/icon-512.png"
            alt="LoveNest"
            width={96}
            height={96}
            style={{ borderRadius: 22, display: "block" }}
          />
        </div>

        <div style={{
          textAlign: "center",
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "translateY(0)" : "translateY(8px)",
        }}>
          <h1 style={{
            fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em",
            color: "#ffffff", margin: 0, lineHeight: 1,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            LoveNest
          </h1>
        </div>
      </div>

      {/* Fotos do casal */}
      <div style={{
        position: "absolute",
        bottom: 56,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        transition: "opacity 700ms ease-out",
        opacity: stage >= 2 ? 1 : 0,
      }}>
        {coupleData ? (
          <>
            {/* Dois avatares com coração entre eles */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar url={coupleData.avatar1} name={coupleData.name1} size={62} />
              <svg width={18} height={18} viewBox="0 0 24 24" fill="rgba(244,63,94,0.85)">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
              </svg>
              <Avatar url={coupleData.avatar2} name={coupleData.name2} size={62} />
            </div>
            {/* Nomes */}
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
              margin: 0,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              {coupleData.name1} · {coupleData.name2}
            </p>
          </>
        ) : (
          <p style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.4em",
            color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
            margin: 0,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            Para Casais Extraordinários
          </p>
        )}
      </div>
    </div>
  );
}

// ── SplashGate ────────────────────────────────────────────────────────────────

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem("splash_done"); } catch { return true; }
  });

  const hide = useCallback(() => {
    try { sessionStorage.setItem("splash_done", "1"); } catch {}
    setShow(false);
  }, []);

  return (
    <>
      {show && <SplashOverlay onDone={hide} />}
      {children}
    </>
  );
}
