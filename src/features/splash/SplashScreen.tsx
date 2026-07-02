import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Chave partilhada entre SplashScreen e saveSplashData ─────────────────────
// O splash LÊ desta chave. O app ESCREVE nela depois de autenticado.
export const SPLASH_DATA_KEY = "ln_splash_v2";

export interface SplashData {
  name1: string;
  name2: string;
  av1: string | null;
  av2: string | null;
}

function readSplashData(): SplashData | null {
  try {
    const raw = localStorage.getItem(SPLASH_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Chamado pelo app após autenticação para popular o cache do splash
export function saveSplashData(data: SplashData) {
  try { localStorage.setItem(SPLASH_DATA_KEY, JSON.stringify(data)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [stage, setStage]       = useState<0 | 1 | 2 | 3>(0);
  const [couple, setCouple]     = useState<SplashData | null>(() => readSplashData());
  const [av1Loaded, setAv1Loaded] = useState(false);
  const [av2Loaded, setAv2Loaded] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    // Tentativa de fetch como fallback (se cache vazio).
    // Só corre se não houver cache — não bloqueia nunca a animação.
    if (!couple) {
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user || !alive.current) return;

          const { data: member } = await supabase
            .from("members").select("couple_space_id")
            .eq("user_id", session.user.id).maybeSingle();
          if (!member?.couple_space_id || !alive.current) return;

          const { data: members } = await supabase
            .from("members").select("user_id")
            .eq("couple_space_id", member.couple_space_id).limit(2);
          if (!members?.length || !alive.current) return;

          const { data: profiles } = await supabase
            .from("profiles").select("id, display_name, avatar_url")
            .in("id", members.map((m) => m.user_id));
          if (!profiles?.length || !alive.current) return;

          const p1 = profiles[0];
          const p2 = profiles[1] ?? null;
          const fresh: SplashData = {
            name1: p1?.display_name ?? "",
            name2: p2?.display_name ?? "",
            av1:   p1?.avatar_url ?? null,
            av2:   p2?.avatar_url ?? null,
          };
          saveSplashData(fresh);
          if (alive.current) setCouple(fresh);
        } catch { /* fail silently */ }
      })();
    }

    const t1 = setTimeout(() => { if (alive.current) setStage(1); }, 500);
    const t2 = setTimeout(() => { if (alive.current) setStage(2); }, 900);
    const t3 = setTimeout(() => { if (alive.current) setStage(3); }, 2800);
    const t4 = setTimeout(onDone, 3400);

    return () => {
      alive.current = false;
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [onDone, couple]);

  const initial1 = couple?.name1?.[0]?.toUpperCase() ?? "";
  const initial2 = couple?.name2?.[0]?.toUpperCase() ?? "";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#000000",
      transition: "opacity 600ms ease-in-out",
      opacity: stage === 3 ? 0 : 1,
      pointerEvents: stage === 3 ? "none" : "auto",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <img src="/icon-512.png" alt="LoveNest" width={96} height={96}
          style={{ borderRadius: 22, display: "block" }} />

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
          }}>LoveNest</h1>
        </div>
      </div>

      {/* Fotos / iniciais do casal */}
      <div style={{
        position: "absolute", bottom: 52,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        transition: "opacity 700ms ease-out",
        opacity: stage >= 2 ? 1 : 0,
      }}>
        {couple && (couple.name1 || couple.name2) ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Avatar 1 */}
              <div style={{
                width: 60, height: 60, borderRadius: "50%", overflow: "hidden",
                border: "2px solid rgba(244,63,94,0.5)", background: "#1a1a1a",
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
              }}>
                <span style={{
                  position: "absolute", fontSize: 22, fontWeight: 700,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: av1Loaded ? 0 : 1, transition: "opacity 300ms",
                }}>{initial1}</span>
                {couple.av1 && (
                  <img src={couple.av1} alt={couple.name1} width={60} height={60}
                    decoding="async" onLoad={() => setAv1Loaded(true)}
                    style={{
                      position: "absolute", inset: 0, width: "100%", height: "100%",
                      objectFit: "cover", opacity: av1Loaded ? 1 : 0, transition: "opacity 400ms",
                    }} />
                )}
              </div>

              {/* Coração */}
              <svg width={16} height={16} viewBox="0 0 24 24" fill="rgba(244,63,94,0.8)">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
              </svg>

              {/* Avatar 2 */}
              <div style={{
                width: 60, height: 60, borderRadius: "50%", overflow: "hidden",
                border: "2px solid rgba(244,63,94,0.5)", background: "#1a1a1a",
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
              }}>
                <span style={{
                  position: "absolute", fontSize: 22, fontWeight: 700,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: av2Loaded ? 0 : 1, transition: "opacity 300ms",
                }}>{initial2}</span>
                {couple.av2 && (
                  <img src={couple.av2} alt={couple.name2} width={60} height={60}
                    decoding="async" onLoad={() => setAv2Loaded(true)}
                    style={{
                      position: "absolute", inset: 0, width: "100%", height: "100%",
                      objectFit: "cover", opacity: av2Loaded ? 1 : 0, transition: "opacity 400ms",
                    }} />
                )}
              </div>
            </div>

            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.5)", textTransform: "uppercase", margin: 0,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              {[couple.name1, couple.name2].filter(Boolean).join(" · ")}
            </p>
          </>
        ) : (
          <p style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.4em",
            color: "rgba(255,255,255,0.3)", textTransform: "uppercase", margin: 0,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>Para Casais Extraordinários</p>
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
