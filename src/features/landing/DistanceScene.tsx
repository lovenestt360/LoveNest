import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { MapPin } from "lucide-react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const PINK     = "#E0637A";
const NAVY     = "#0B1324";
const CREAM    = "#FAF9F7";
const TOKEN    = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

// Demo data — replace with real partner data when available
const DEMO = {
  a:         { lat: 38.7196, lng: -9.1462 }, // Príncipe Real, Lisboa
  b:         { lat: 38.6969, lng: -9.1840 }, // Ajuda, Lisboa
  center:    { lat: 38.7083, lng: -9.1651 }, // midpoint
  zoom:      12.8,
  zoomClose: 15.0,
};

// Distance steps for the approach animation
const DIST_STEPS = [4.2, 2.8, 1.1, 0.4, 0.1];
function getDistStep(v: number): number {
  if (v < 0.20) return DIST_STEPS[0];
  if (v < 0.40) return DIST_STEPS[1];
  if (v < 0.65) return DIST_STEPS[2];
  if (v < 0.85) return DIST_STEPS[3];
  return DIST_STEPS[4];
}

function useMediaQuery(query: string): boolean {
  const [m, setM] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
}

// ── Phone screens ─────────────────────────────────────────────────────────────

function PhoneScreenA() {
  return (
    <div style={{ background: CREAM, padding: "44px 14px 14px", position: "relative", minHeight: 210 }}>
      <div aria-hidden style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 68, height: 18, background: "#000", borderRadius: 10 }} />
      <p style={{ fontSize: 9, color: "#aaa", margin: "0 0 2px" }}>Ana</p>
      <p style={{ fontSize: 14, fontWeight: 900, color: NAVY, margin: "0 0 14px", letterSpacing: "-0.02em" }}>Onde estás?</p>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <div style={{ padding: "6px 10px", borderRadius: "12px 12px 3px 12px", background: PINK, color: "white", fontSize: 10, lineHeight: 1.5, maxWidth: "85%" }}>
          Estou a caminho!
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <div style={{ padding: "6px 10px", borderRadius: "12px 12px 12px 3px", background: "white", color: NAVY, fontSize: 10, lineHeight: 1.5, maxWidth: "85%", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          Já sinto a tua falta.
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 5, background: `${PINK}12`, borderRadius: 8, padding: "5px 9px" }}>
        <MapPin style={{ width: 10, height: 10, color: PINK, flexShrink: 0 }} strokeWidth={2} />
        <span style={{ fontSize: 9, color: PINK, fontWeight: 700 }}>4,2 km de ti</span>
      </div>
    </div>
  );
}

function PhoneScreenB() {
  return (
    <div style={{ background: CREAM, padding: "44px 14px 14px", position: "relative", minHeight: 210 }}>
      <div aria-hidden style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 68, height: 18, background: "#000", borderRadius: 10 }} />
      <p style={{ fontSize: 9, color: "#aaa", margin: "0 0 2px" }}>Bruno</p>
      <p style={{ fontSize: 14, fontWeight: 900, color: NAVY, margin: "0 0 14px", letterSpacing: "-0.02em" }}>A chegar</p>
      <div style={{ background: "white", borderRadius: 12, padding: "9px 11px", marginBottom: 7, boxShadow: "0 1px 5px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `${PINK}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MapPin style={{ width: 11, height: 11, color: PINK }} strokeWidth={1.5} />
          </div>
          <div>
            <p style={{ fontSize: 8, color: "#aaa", margin: 0 }}>Localização partilhada</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: NAVY, margin: 0 }}>Em movimento</p>
          </div>
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 12, padding: "9px 11px", boxShadow: "0 1px 5px rgba(0,0,0,0.07)" }}>
        <p style={{ fontSize: 8, color: "#aaa", margin: "0 0 3px" }}>Chegada estimada</p>
        <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>~7 min</p>
      </div>
    </div>
  );
}

function DistancePhone({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{
      width: wide ? "min(72vw, 240px)" : "clamp(148px, 16vw, 208px)",
      borderRadius: 34,
      background: NAVY,
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(11,19,36,0.55), 0 0 0 1px rgba(255,255,255,0.07)",
      flexShrink: 0,
    }}>
      {children}
      <div style={{ display: "flex", justifyContent: "center", padding: "6px 0", background: CREAM }}>
        <div aria-hidden style={{ width: 72, height: 3, borderRadius: 2, background: "#ddd" }} />
      </div>
    </div>
  );
}

// Minimal circle marker for the map
function DistanceMarker({ isA }: { isA?: boolean }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: "50%",
      background: isA ? PINK : "rgba(255,255,255,0.88)",
      boxShadow: `0 0 0 5px ${isA ? PINK + "28" : "rgba(255,255,255,0.10)"}, 0 4px 16px rgba(0,0,0,0.35)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "default",
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: isA ? "white" : NAVY, letterSpacing: "0.02em" }}>
        {isA ? "A" : "B"}
      </span>
    </div>
  );
}

// Animated distance readout — steps through approach values
function DistanceCounter({ progress }: { progress: MotionValue<number> }) {
  const [dist, setDist] = useState(DIST_STEPS[0]);
  useMotionValueEvent(progress, "change", (v) => setDist(getDistStep(v)));
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {dist.toFixed(1).replace(".", ",")} km
    </span>
  );
}

// ── Reduced-motion static fallback ───────────────────────────────────────────

function DistanceReduced() {
  return (
    <section style={{ background: NAVY, overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px clamp(24px, 7%, 80px)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}80`, marginBottom: 20, marginTop: 0 }}>
          Mesmo Longe
        </p>
        <h2 style={{ fontSize: "clamp(26px, 3.8vw, 50px)", fontWeight: 900, color: "white", lineHeight: 1.06, letterSpacing: "-0.025em", marginTop: 0, marginBottom: 48 }}>
          Mesmo longe,<br />continuam ligados.
        </h2>
        <div style={{ borderRadius: 20, overflow: "hidden", height: 280, position: "relative" }}>
          <Map
            mapboxAccessToken={TOKEN}
            mapStyle={MAP_STYLE}
            initialViewState={{ longitude: DEMO.center.lng, latitude: DEMO.center.lat, zoom: DEMO.zoom }}
            style={{ width: "100%", height: "100%" }}
            interactive={false}
            attributionControl={false}
            reuseMaps
          >
            <Source id="r-route" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: [[DEMO.a.lng, DEMO.a.lat], [DEMO.b.lng, DEMO.b.lat]] } } as any}>
              <Layer id="r-line" type="line" paint={{ "line-color": PINK, "line-width": 1.5, "line-opacity": 0.65 } as any} />
            </Source>
            <Marker longitude={DEMO.a.lng} latitude={DEMO.a.lat} anchor="center"><DistanceMarker isA /></Marker>
            <Marker longitude={DEMO.b.lng} latitude={DEMO.b.lat} anchor="center"><DistanceMarker /></Marker>
          </Map>
        </div>
        <p style={{ fontSize: "clamp(13px, 1.3vw, 16px)", color: "rgba(255,255,255,0.42)", marginTop: 36, marginBottom: 0, fontStyle: "italic" }}>
          O melhor sítio do mundo é ao lado do outro.
        </p>
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DistanceScene() {
  const reduced      = useReducedMotion();
  const isMob        = useMediaQuery("(max-width: 767px)");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MapRef>(null);
  const mapReadyRef  = useRef(false);
  const [isNear, setIsNear]             = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);

  // Lazy-load: mount Mapbox only when 400px from viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsNear(true); obs.disconnect(); } },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { scrollYProgress: p } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── All transforms (unconditional, D_ = desktop, M_ = mobile) ───────────────

  // Phone A: present from start (from Cena 02), fades when map takes over
  const phoneAOp = useTransform(p, [0.40, 0.54, 0.84, 0.90], [1, 0, 0, 0]);

  // Phone B: enters during first phase
  const phoneBOp = useTransform(p, [0.04, 0.20, 0.40, 0.54], [0, 1, 1, 0]);
  const D_phoneBX = useTransform(p, [0.04, 0.22],            [80, 0]);   // desktop: from right
  const M_phoneBY = useTransform(p, [0.04, 0.22],            [70, 0]);   // mobile: from below

  // Headline: fades in early, stays, exits before "Juntos"
  const hlOp = useTransform(p, [0.02, 0.14, 0.84, 0.90], [0, 1, 1, 0]);
  const hlY  = useTransform(p, [0.02, 0.16],              [18, 0]);

  // Distance label (phase 2, between phones)
  const distLabelOp = useTransform(p, [0.20, 0.30, 0.44, 0.54], [0, 1, 1, 0]);
  const distLabelY  = useTransform(p, [0.20, 0.30],              [12, 0]);

  // Map reveal (phase 3)
  const mapOp = useTransform(p, [0.38, 0.56], [0, 1]);

  // Approach badge (phase 5, on map)
  const approachBadgeOp = useTransform(p, [0.70, 0.78, 0.88, 0.93], [0, 1, 1, 0]);
  const approachProg    = useTransform(p, [0.72, 0.88],              [0, 1]);

  // Together (phase 6)
  const togetherOp = useTransform(p, [0.88, 0.95], [0, 1]);
  const togetherY  = useTransform(p, [0.88, 0.96], [16, 0]);
  const quoteOp    = useTransform(p, [0.92, 0.99], [0, 1]);

  // Map camera + route driven by scroll progress (no React state for camera)
  useEffect(() => {
    return p.on("change", (latest) => {
      // Route visibility
      setRouteVisible(latest > 0.56);
      // Camera: zoom in gradually as approach phase progresses
      if (mapReadyRef.current && mapRef.current) {
        const phase = Math.max(0, Math.min(1, (latest - 0.56) / 0.32)); // 0.56 → 0.88
        const zoom  = DEMO.zoom + phase * (DEMO.zoomClose - DEMO.zoom);
        (mapRef.current as any).easeTo({ zoom, duration: 80, essential: true });
      }
    });
  }, [p]);

  if (reduced) return <DistanceReduced />;

  return (
    <section
      ref={containerRef}
      style={{ height: isMob ? "240vh" : "320vh", position: "relative" }}
      aria-label="Mesmo longe, continuam ligados"
    >
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden", background: NAVY }}>

        {/* ── MAP — lazy loaded, fades in at phase 3 ───────────────────────── */}
        <motion.div
          aria-hidden
          style={{ position: "absolute", inset: 0, opacity: mapOp, zIndex: 1 }}
        >
          {isNear && (
            <Map
              ref={mapRef}
              mapboxAccessToken={TOKEN}
              mapStyle={MAP_STYLE}
              initialViewState={{ longitude: DEMO.center.lng, latitude: DEMO.center.lat, zoom: DEMO.zoom }}
              style={{ width: "100%", height: "100%" }}
              interactive={false}
              attributionControl={false}
              reuseMaps
              onLoad={() => { mapReadyRef.current = true; }}
            >
              {/* Narrative route between A and B */}
              <Source
                id="distance-route"
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [[DEMO.a.lng, DEMO.a.lat], [DEMO.b.lng, DEMO.b.lat]],
                  },
                } as any}
              >
                <Layer
                  id="distance-line"
                  type="line"
                  paint={{
                    "line-color": PINK,
                    "line-width": 1.5,
                    "line-opacity": routeVisible ? 0.65 : 0,
                    "line-opacity-transition": { duration: 900 },
                  } as any}
                />
              </Source>
              <Marker longitude={DEMO.a.lng} latitude={DEMO.a.lat} anchor="center">
                <DistanceMarker isA />
              </Marker>
              <Marker longitude={DEMO.b.lng} latitude={DEMO.b.lat} anchor="center">
                <DistanceMarker />
              </Marker>
            </Map>
          )}
          {/* Top/bottom vignette to blend map into NAVY */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `linear-gradient(to bottom, ${NAVY}99 0%, transparent 28%, transparent 68%, ${NAVY}99 100%)`,
          }} />
        </motion.div>

        {/* ── PHONE A — already present (Cena 02 continuation) ─────────────── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 3, opacity: phoneAOp,
            ...(isMob
              ? { left: "50%", top: "20%", transform: "translateX(-50%)" }
              : { left: "50%", top: "50%", transform: "translate(calc(-50% - 128px), -50%)" }
            ),
          }}
        >
          <DistancePhone wide={isMob}><PhoneScreenA /></DistancePhone>
        </motion.div>

        {/* ── PHONE B — enters from right (desktop) or below (mobile) ──────── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 3, opacity: phoneBOp,
            x: isMob ? 0 : D_phoneBX,
            y: isMob ? M_phoneBY : 0,
            ...(isMob
              ? { left: "50%", top: "57%", transform: "translateX(-50%)" }
              : { left: "50%", top: "50%", transform: "translate(calc(-50% + 128px), -50%)" }
            ),
          }}
        >
          <DistancePhone wide={isMob}><PhoneScreenB /></DistancePhone>
        </motion.div>

        {/* ── HEADLINE ─────────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute", zIndex: 4, pointerEvents: "none",
          ...(isMob
            ? { left: "clamp(24px, 7%, 56px)", top: "7%" }
            : { left: "clamp(40px, 7%, 88px)", bottom: "clamp(80px, 17%, 140px)" }
          ),
        }}>
          <motion.h2 style={{
            opacity: hlOp, y: hlY,
            fontSize: isMob ? "clamp(24px, 7.5vw, 36px)" : "clamp(30px, 3.5vw, 52px)",
            fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.025em",
            color: "white", margin: 0, maxWidth: "18ch",
            textShadow: "0 2px 28px rgba(0,0,0,0.60)",
          }}>
            Mesmo longe,<br />continuam ligados.
          </motion.h2>
        </div>

        {/* ── DISTANCE LABEL — static "4,2 km" between phones (phase 2) ────── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          ...(isMob
            ? { left: "50%", top: "43%", transform: "translateX(-50%)", textAlign: "center" as const }
            : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", textAlign: "center" as const }
          ),
        }}>
          <motion.div style={{ opacity: distLabelOp, y: distLabelY }}>
            <p style={{
              fontSize: isMob ? "clamp(30px, 9vw, 44px)" : "clamp(36px, 4.5vw, 56px)",
              fontWeight: 900, letterSpacing: "-0.04em", color: "white",
              margin: "0 0 5px", textShadow: "0 2px 28px rgba(0,0,0,0.60)",
            }}>
              4,2 km
            </p>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: 0 }}>
              ~7 min
            </p>
          </motion.div>
        </div>

        {/* ── APPROACH BADGE — glass badge on map (phase 5) ────────────────── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          ...(isMob
            ? { right: "clamp(24px, 7%, 56px)", bottom: "30%" }
            : { right: "clamp(40px, 7%, 88px)", top: "14%" }
          ),
        }}>
          <motion.div style={{ opacity: approachBadgeOp }}>
            <div style={{
              background: "rgba(11,19,36,0.68)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 14, padding: "10px 16px",
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: `${PINK}99`, margin: "0 0 3px" }}>
                A aproximar
              </p>
              <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", color: "white", margin: 0 }}>
                <DistanceCounter progress={approachProg} />
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── TOGETHER — final emotional beat (phase 6) ────────────────────── */}
        <div style={{
          position: "absolute", zIndex: 6, pointerEvents: "none",
          left: "50%", bottom: "clamp(72px, 15%, 120px)",
          transform: "translateX(-50%)", textAlign: "center",
          width: "90%", maxWidth: 600,
        }}>
          <motion.div style={{ opacity: togetherOp, y: togetherY }}>
            <p style={{
              fontSize: isMob ? "clamp(26px, 8.5vw, 40px)" : "clamp(34px, 4vw, 56px)",
              fontWeight: 900, letterSpacing: "-0.03em", color: "white",
              textShadow: "0 2px 36px rgba(0,0,0,0.70)",
              margin: "0 0 12px",
            }}>
              Juntos agora.
            </p>
            <motion.p style={{
              opacity: quoteOp,
              fontSize: isMob ? "clamp(13px, 4vw, 15px)" : "clamp(14px, 1.3vw, 17px)",
              fontWeight: 600, color: "rgba(255,255,255,0.48)",
              margin: 0, textShadow: "0 1px 16px rgba(0,0,0,0.55)",
              letterSpacing: "0.01em", fontStyle: "italic",
            }}>
              O melhor sítio do mundo é ao lado do outro.
            </motion.p>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
