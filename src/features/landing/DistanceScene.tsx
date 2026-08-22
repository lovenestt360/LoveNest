import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
  useMotionTemplate,
} from "framer-motion";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const PINK      = "#E0637A";
const NAVY      = "#0B1324";
const TOKEN     = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

const DEMO = {
  a:         { lat: 38.7196, lng: -9.1462 }, // Príncipe Real
  b:         { lat: 38.6969, lng: -9.1840 }, // Ajuda
  center:    { lat: 38.7083, lng: -9.1651 },
  zoom:      12.5,
  zoomClose: 15.4,
};

const ROUTE_GEOJSON = {
  type: "Feature" as const,
  geometry: {
    type: "LineString" as const,
    coordinates: [
      [DEMO.a.lng, DEMO.a.lat],
      [-9.1530, 38.7130],
      [-9.1600, 38.7060],
      [-9.1700, 38.7000],
      [-9.1760, 38.6980],
      [DEMO.b.lng, DEMO.b.lat],
    ],
  },
  properties: {},
};

const DIST_VALS = [
  { threshold: 0.00, label: "4,2" },
  { threshold: 0.64, label: "2,8" },
  { threshold: 0.70, label: "1,1" },
  { threshold: 0.76, label: "0,4" },
  { threshold: 0.82, label: "0,1" },
];

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

// ── Phone UI ──────────────────────────────────────────────────────────────────

function PhoneScreenA() {
  return (
    <div style={{ background: "#0d1828", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 6px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>09:14</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ width: 3, height: 8, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
          <div style={{ width: 3, height: 10, background: "rgba(255,255,255,0.55)", borderRadius: 1 }} />
          <div style={{ width: 3, height: 13, background: "rgba(255,255,255,0.7)", borderRadius: 1 }} />
          <div style={{ width: 18, height: 9, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 2, position: "relative", marginLeft: 3 }}>
            <div style={{ position: "absolute", right: -3, top: "50%", transform: "translateY(-50%)", width: 2.5, height: 5, background: "rgba(255,255,255,0.35)", borderRadius: "0 1px 1px 0" }} />
            <div style={{ height: "100%", width: "65%", background: PINK, borderRadius: 1 }} />
          </div>
        </div>
      </div>
      {/* App header */}
      <div style={{ padding: "4px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${PINK}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: PINK }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>LoveNest</span>
        </div>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
        <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.07)", borderRadius: "12px 12px 12px 3px", padding: "7px 11px", maxWidth: "78%" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>Onde estás?</span>
        </div>
        <div style={{ alignSelf: "flex-end", background: `${PINK}30`, borderRadius: "12px 12px 3px 12px", padding: "7px 11px", maxWidth: "78%" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>Estou a caminho!</span>
        </div>
        <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.07)", borderRadius: "12px 12px 12px 3px", padding: "7px 11px", maxWidth: "78%" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>Tenho saudades.</span>
        </div>
        <div style={{ marginTop: 4, background: `${PINK}14`, border: `1px solid ${PINK}28`, borderRadius: 10, padding: "7px 10px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `${PINK}aa`, marginBottom: 2 }}>Localização</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.80)" }}>4,2 km de ti</div>
        </div>
      </div>
      {/* Nav bar */}
      <div style={{ padding: "8px 20px 14px", display: "flex", justifyContent: "space-around", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {[28, 18, 18, 18].map((w, i) => (
          <div key={i} style={{ width: w, height: w, borderRadius: 5, background: i === 0 ? `${PINK}28` : "rgba(255,255,255,0.10)" }} />
        ))}
      </div>
    </div>
  );
}

function PhoneScreenB() {
  return (
    <div style={{ background: "#0d1828", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 6px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>09:14</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ width: 3, height: 8, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
          <div style={{ width: 3, height: 10, background: "rgba(255,255,255,0.55)", borderRadius: 1 }} />
          <div style={{ width: 3, height: 13, background: "rgba(255,255,255,0.7)", borderRadius: 1 }} />
          <div style={{ width: 18, height: 9, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 2, position: "relative", marginLeft: 3 }}>
            <div style={{ position: "absolute", right: -3, top: "50%", transform: "translateY(-50%)", width: 2.5, height: 5, background: "rgba(255,255,255,0.35)", borderRadius: "0 1px 1px 0" }} />
            <div style={{ height: "100%", width: "80%", background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
          </div>
        </div>
      </div>
      {/* App header */}
      <div style={{ padding: "4px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${PINK}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: PINK }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>LoveNest</span>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: 4 }}>Localização partilhada</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>Em movimento</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: 4 }}>Chegada estimada</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>~7 min</div>
        </div>
        <div style={{ background: `${PINK}14`, border: `1px solid ${PINK}28`, borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `${PINK}aa`, marginBottom: 4 }}>A caminho</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: PINK }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: `${PINK}cc` }}>A aproximar...</span>
          </div>
        </div>
      </div>
      {/* Nav bar */}
      <div style={{ padding: "8px 20px 14px", display: "flex", justifyContent: "space-around", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {[28, 18, 18, 18].map((w, i) => (
          <div key={i} style={{ width: w, height: w, borderRadius: 5, background: i === 0 ? `${PINK}28` : "rgba(255,255,255,0.10)" }} />
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({ children, small }: { children: React.ReactNode; small?: boolean }) {
  const w = small ? 158 : 196;
  const h = small ? 322 : 400;
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: small ? 30 : 36,
      background: "#141414",
      padding: 3,
      boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.03)",
      flexShrink: 0,
      position: "relative",
    }}>
      <div style={{ width: "100%", height: "100%", borderRadius: small ? 28 : 34, overflow: "hidden" }}>
        {/* Notch */}
        <div aria-hidden style={{
          position: "absolute", top: 7, left: "50%", transform: "translateX(-50%)",
          width: small ? 70 : 84, height: small ? 16 : 20,
          background: "#141414", borderRadius: "0 0 12px 12px", zIndex: 10,
        }} />
        {children}
      </div>
    </div>
  );
}

function DotMarker({ isA }: { isA?: boolean }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%",
      background: isA ? PINK : "rgba(255,255,255,0.90)",
      boxShadow: `0 0 0 5px ${isA ? PINK + "28" : "rgba(255,255,255,0.14)"}, 0 2px 12px rgba(0,0,0,0.45)`,
    }} />
  );
}

// ── Reduced-motion fallback ───────────────────────────────────────────────────

function DistanceReduced() {
  const [mapReady, setMapReady] = useState(false);
  const [isNear, setIsNear] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsNear(true); obs.disconnect(); } },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ background: NAVY, padding: "72px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(24px, 7%, 80px)", display: "flex", flexDirection: "column", gap: 56 }}>
        {/* Label + headline */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}80`, margin: "0 0 14px" }}>
            Mesmo Longe
          </p>
          <h2 style={{ fontSize: "clamp(26px, 3.8vw, 50px)", fontWeight: 900, color: "white", lineHeight: 1.08, letterSpacing: "-0.025em", margin: 0 }}>
            Mesmo longe,<br />continuam ligados.
          </h2>
        </div>

        {/* Two phones + distance */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <PhoneFrame>
            <PhoneScreenA />
          </PhoneFrame>
          <div style={{ flex: 1, minWidth: 120, textAlign: "center" }}>
            <div style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>
              4,2 km
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginTop: 6 }}>
              de distância
            </div>
          </div>
          <PhoneFrame>
            <PhoneScreenB />
          </PhoneFrame>
        </div>

        {/* Map */}
        {isNear && (
          <div style={{ borderRadius: 20, overflow: "hidden", height: "clamp(220px, 35vh, 380px)", position: "relative" }}>
            <Map
              mapboxAccessToken={TOKEN}
              mapStyle={MAP_STYLE}
              initialViewState={{ longitude: DEMO.center.lng, latitude: DEMO.center.lat, zoom: 13.0 }}
              style={{ width: "100%", height: "100%" }}
              interactive={false}
              attributionControl={false}
              reuseMaps
              onLoad={() => setMapReady(true)}
            >
              {mapReady && (
                <>
                  <Source id="r-route" type="geojson" data={ROUTE_GEOJSON}>
                    <Layer id="r-line" type="line" paint={{ "line-color": PINK, "line-width": 1.5, "line-opacity": 0.70 } as any} />
                  </Source>
                  <Marker longitude={DEMO.a.lng} latitude={DEMO.a.lat} anchor="center"><DotMarker isA /></Marker>
                  <Marker longitude={DEMO.b.lng} latitude={DEMO.b.lat} anchor="center"><DotMarker /></Marker>
                </>
              )}
            </Map>
            <div aria-hidden style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `linear-gradient(to bottom, ${NAVY}55 0%, transparent 20%, transparent 80%, ${NAVY}55 100%)`,
            }} />
          </div>
        )}

        {/* Final quote */}
        <p style={{
          fontSize: "clamp(18px, 2.4vw, 30px)",
          fontWeight: 700, color: "rgba(255,255,255,0.72)",
          letterSpacing: "-0.02em", lineHeight: 1.3, margin: 0,
        }}>
          O melhor sítio do mundo<br />é ao lado do outro.
        </p>
      </div>
    </section>
  );
}

// ── Full animated component ───────────────────────────────────────────────────

function DistanceAnimated() {
  const outerRef    = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<MapRef>(null);
  const mapReadyRef = useRef(false);
  const isMob       = useMediaQuery("(max-width: 767px)");
  const [isNear,       setIsNear]       = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);
  const [distLabel,    setDistLabel]    = useState("4,2");

  // Lazy-load Mapbox
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsNear(true); obs.disconnect(); } },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { scrollYProgress: p } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // ── Transforms: all unconditional ──────────────────────────────────────────

  // Scene headline — top, early appearance, exits before map protagonist
  const hlOp = useTransform(p, [0.00, 0.08, 0.42, 0.50], [0, 1, 1, 0]);
  const hlY  = useTransform(p, [0.00, 0.10], [20, 0]);

  // Phone A — present from scene start, exits as map expands
  const phoneAOp = useTransform(p, [0.00, 0.08, 0.40, 0.52], [0, 1, 1, 0]);
  const D_phoneAX = useTransform(p, [0.00, 0.08], [-60, 0]);
  const M_phoneAY = useTransform(p, [0.00, 0.08], [-30, 0]);

  // Phone B — enters from right (desktop) or below (mobile)
  const phoneBOp  = useTransform(p, [0.14, 0.26, 0.40, 0.52], [0, 1, 1, 0]);
  const D_phoneBX = useTransform(p, [0.14, 0.26], [80, 0]);
  const M_phoneBY = useTransform(p, [0.14, 0.26], [70, 0]);

  // Distance label between phones — "4,2 km"
  const distBtwOp = useTransform(p, [0.26, 0.34, 0.40, 0.50], [0, 1, 1, 0]);
  const distBtwY  = useTransform(p, [0.26, 0.34], [12, 0]);

  // Map clip-path expansion: inset box → full viewport
  const D_clipT = useTransform(p, [0.44, 0.62], [14, 0]);
  const D_clipR = useTransform(p, [0.44, 0.62], [20, 0]);
  const D_clipB = useTransform(p, [0.44, 0.62], [14, 0]);
  const D_clipL = useTransform(p, [0.44, 0.62], [20, 0]);
  const M_clipT = useTransform(p, [0.44, 0.62], [6, 0]);
  const M_clipR = useTransform(p, [0.44, 0.62], [5, 0]);
  const M_clipB = useTransform(p, [0.44, 0.62], [6, 0]);
  const M_clipL = useTransform(p, [0.44, 0.62], [5, 0]);
  const clipRad  = useTransform(p, [0.44, 0.62], [24, 0]);
  const mapOp    = useTransform(p, [0.42, 0.58], [0, 1]);

  const D_mapClip = useMotionTemplate`inset(${D_clipT}% ${D_clipR}% ${D_clipB}% ${D_clipL}% round ${clipRad}px)`;
  const M_mapClip = useMotionTemplate`inset(${M_clipT}% ${M_clipR}% ${M_clipB}% ${M_clipL}% round ${clipRad}px)`;

  // Map distance badge (centered at bottom, large — visible during approximation)
  const mapBadgeOp = useTransform(p, [0.58, 0.66, 0.84, 0.90], [0, 1, 1, 0]);
  const mapBadgeY  = useTransform(p, [0.58, 0.66], [16, 0]);

  // Map dims as "Juntos" takes over
  const mapDim = useTransform(p, [0.82, 0.92], [1, 0.18]);

  // "Juntos agora." — large, center, standalone moment
  const juntosOp    = useTransform(p, [0.84, 0.92], [0, 1]);
  const juntosScale = useTransform(p, [0.84, 0.92], [0.92, 1]);

  // Final quote
  const quoteOp = useTransform(p, [0.92, 0.99], [0, 1]);
  const quoteY  = useTransform(p, [0.92, 0.99], [16, 0]);

  // Camera + route + distance counter
  useMotionValueEvent(p, "change", (v) => {
    // Route appears when map is protagonist
    setRouteVisible(v > 0.58);

    // Distance label stepping
    let label = "4,2";
    for (const step of DIST_VALS) {
      if (v >= step.threshold) label = step.label;
    }
    setDistLabel(label);

    // Camera zoom in during approach phase
    if (mapReadyRef.current && mapRef.current && v >= 0.58) {
      const phase = Math.max(0, Math.min(1, (v - 0.60) / (0.84 - 0.60)));
      const zoom  = DEMO.zoom + phase * (DEMO.zoomClose - DEMO.zoom);
      (mapRef.current as any).easeTo({ zoom, duration: 80, essential: true });
    }
  });

  const sceneHeight = isMob ? "340vh" : "420vh";
  const mapClip     = isMob ? M_mapClip : D_mapClip;

  return (
    <section
      ref={outerRef}
      style={{ height: sceneHeight, position: "relative" }}
      aria-label="Mesmo longe, continuam ligados"
    >
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden", background: NAVY }}>

        {/* ── MAP — full screen, clipped via clipPath that expands on scroll ── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", inset: 0, zIndex: 1,
            opacity: mapOp,
            clipPath: mapClip,
          }}
        >
          <motion.div style={{ width: "100%", height: "100%", opacity: mapDim }}>
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
                <Source id="distance-route" type="geojson" data={ROUTE_GEOJSON}>
                  <Layer
                    id="distance-line"
                    type="line"
                    paint={{
                      "line-color": PINK,
                      "line-width": 2,
                      "line-opacity": routeVisible ? 0.75 : 0,
                      "line-opacity-transition": { duration: 900 },
                    } as any}
                    layout={{ "line-cap": "round", "line-join": "round" } as any}
                  />
                </Source>
                <Marker longitude={DEMO.a.lng} latitude={DEMO.a.lat} anchor="center">
                  <DotMarker isA />
                </Marker>
                <Marker longitude={DEMO.b.lng} latitude={DEMO.b.lat} anchor="center">
                  <DotMarker />
                </Marker>
              </Map>
            )}
          </motion.div>
          {/* Subtle vignette — keeps corners dark, center clear */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 45%, ${NAVY}44 100%)`,
          }} />
        </motion.div>

        {/* ── Top/bottom fade — always, ensures headline legibility ────────── */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: `linear-gradient(to bottom, ${NAVY} 0%, ${NAVY}cc 7%, transparent 22%, transparent 76%, ${NAVY}cc 92%, ${NAVY} 100%)`,
        }} />

        {/* ── HEADLINE — top center ────────────────────────────────────────── */}
        <div style={{ position: "absolute", zIndex: 4, top: "clamp(44px, 7vh, 72px)", left: "7%", right: "7%", pointerEvents: "none" }}>
          <motion.div style={{ opacity: hlOp, y: hlY, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}80`, margin: "0 0 12px" }}>
              MESMO LONGE
            </p>
            <h2 style={{
              fontSize: "clamp(22px, 3.6vw, 48px)",
              fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.025em",
              color: "white", margin: 0,
              textShadow: "0 2px 30px rgba(0,0,0,0.55)",
            }}>
              Mesmo longe,<br />continuam ligados.
            </h2>
          </motion.div>
        </div>

        {/* ── PHONES layer ─────────────────────────────────────────────────── */}
        {/* Desktop: side by side, centered */}
        {!isMob && (
          <>
            {/* Phone A — enters from left */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "50%", transform: "translate(calc(-50% - 160px), -50%)" }}>
              <motion.div style={{ opacity: phoneAOp, x: D_phoneAX }}>
                <PhoneFrame><PhoneScreenA /></PhoneFrame>
              </motion.div>
            </div>

            {/* Phone B — enters from right */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "50%", transform: "translate(calc(-50% + 160px), -50%)" }}>
              <motion.div style={{ opacity: phoneBOp, x: D_phoneBX }}>
                <PhoneFrame><PhoneScreenB /></PhoneFrame>
              </motion.div>
            </div>

            {/* Distance between phones */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
              <motion.div style={{ opacity: distBtwOp, y: distBtwY, textAlign: "center", minWidth: 120 }}>
                <div style={{
                  fontSize: "clamp(30px, 3.6vw, 48px)",
                  fontWeight: 900, letterSpacing: "-0.04em",
                  color: "white", lineHeight: 1,
                  textShadow: "0 2px 30px rgba(0,0,0,0.70)",
                }}>
                  4,2 km
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginTop: 6 }}>
                  de distância
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* Mobile: vertical stack */}
        {isMob && (
          <>
            {/* Phone A — top third */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "18%", transform: "translateX(-50%)" }}>
              <motion.div style={{ opacity: phoneAOp, y: M_phoneAY }}>
                <PhoneFrame small><PhoneScreenA /></PhoneFrame>
              </motion.div>
            </div>

            {/* Distance — middle */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
              <motion.div style={{ opacity: distBtwOp, y: distBtwY, textAlign: "center" }}>
                <div style={{
                  fontSize: "clamp(36px, 10vw, 52px)",
                  fontWeight: 900, letterSpacing: "-0.04em",
                  color: "white", lineHeight: 1,
                  textShadow: "0 2px 30px rgba(0,0,0,0.70)",
                }}>
                  4,2 km
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginTop: 6 }}>
                  de distância
                </div>
              </motion.div>
            </div>

            {/* Phone B — lower third */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "63%", transform: "translateX(-50%)" }}>
              <motion.div style={{ opacity: phoneBOp, y: M_phoneBY }}>
                <PhoneFrame small><PhoneScreenB /></PhoneFrame>
              </motion.div>
            </div>
          </>
        )}

        {/* ── MAP DISTANCE BADGE — centered bottom, prominent ─────────────── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          bottom: isMob ? 40 : 52, left: "50%", transform: "translateX(-50%)",
        }}>
          <motion.div style={{ opacity: mapBadgeOp, y: mapBadgeY, textAlign: "center" }}>
            <div style={{
              background: "rgba(11,19,36,0.75)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: isMob ? "14px 28px" : "18px 40px",
            }}>
              <div style={{
                fontSize: isMob ? "clamp(36px, 10vw, 52px)" : "clamp(44px, 5.5vw, 72px)",
                fontWeight: 900, letterSpacing: "-0.04em",
                color: "white", lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}>
                {distLabel} km
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginTop: 6,
              }}>
                a aproximar
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── "JUNTOS AGORA." — standalone large moment ────────────────────── */}
        <div style={{
          position: "absolute", zIndex: 6, pointerEvents: "none",
          inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "0 7%",
        }}>
          <motion.div style={{ opacity: juntosOp, scale: juntosScale }}>
            <p style={{
              fontSize: isMob ? "clamp(40px, 12vw, 60px)" : "clamp(52px, 7vw, 96px)",
              fontWeight: 900, letterSpacing: "-0.04em",
              color: "white", lineHeight: 1, margin: 0,
              textShadow: "0 4px 60px rgba(0,0,0,0.65)",
            }}>
              Juntos agora.
            </p>
          </motion.div>
        </div>

        {/* ── FINAL QUOTE — bottom, after "Juntos" ──────────────────────────── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          bottom: "clamp(44px, 8vh, 72px)", left: "7%", right: "7%", textAlign: "center",
        }}>
          <motion.p style={{
            opacity: quoteOp, y: quoteY,
            fontSize: isMob ? "clamp(15px, 4.5vw, 18px)" : "clamp(16px, 1.6vw, 22px)",
            fontWeight: 700, color: "rgba(255,255,255,0.60)",
            letterSpacing: "-0.01em", lineHeight: 1.4, margin: 0,
            textShadow: "0 2px 20px rgba(0,0,0,0.55)",
          }}>
            O melhor sítio do mundo<br />é ao lado do outro.
          </motion.p>
        </div>

      </div>
    </section>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function DistanceScene() {
  const reduced = useReducedMotion();
  if (reduced) return <DistanceReduced />;
  return <DistanceAnimated />;
}
