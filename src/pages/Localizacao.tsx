import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, MapPin, MapPinOff, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useProfile } from "@/hooks/useProfile";

// ── Cria um marcador circular via DivIcon (evita bug de imagens do Leaflet no Vite)
function createDivIcon(color: string, initial: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${color};border:3px solid white;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 12px rgba(0,0,0,0.25);
      color:white;font-weight:700;font-size:15px;
      font-family:system-ui,sans-serif;
    ">${initial}</div>`,
    iconSize:   [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

// ── Ajusta a vista do mapa quando as posições mudam ────────────────────────
function ChangeView({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();
  const once = useRef(false);

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      if (!once.current) { map.setView(positions[0], 15); once.current = true; }
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [60, 60] });
    once.current = true;
  }, [positions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Formata "há X min/h" ─────────────────────────────────────────────────
function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt });
  } catch {
    return "";
  }
}

// ── Página principal ──────────────────────────────────────────────────────
export default function Localizacao() {
  const navigate = useNavigate();
  const {
    myLocation,
    partnerLocation,
    mySharing,
    partnerSharing,
    toggleSharing,
    retryWatch,
    loading,
    permissionDenied,
  } = useLocationSharing();
  const { partner } = usePartnerProfile();
  const { profile } = useProfile();

  const myInitial      = (profile?.display_name ?? "Eu").charAt(0).toUpperCase();
  const partnerInitial = (partner?.display_name ?? "Par").charAt(0).toUpperCase();

  const myIcon      = createDivIcon("#C4788C", myInitial);
  const partnerIcon = createDivIcon("#6B7280", partnerInitial);

  // Filtra coordenadas 0,0 — são placeholder de quando a posição ainda não chegou
  const hasRealPos = (loc: { lat: number; lng: number } | null) =>
    !!loc && (loc.lat !== 0 || loc.lng !== 0);

  const positions: [number, number][] = [];
  if (mySharing      && hasRealPos(myLocation))      positions.push([myLocation!.lat, myLocation!.lng]);
  if (partnerSharing && hasRealPos(partnerLocation)) positions.push([partnerLocation!.lat, partnerLocation!.lng]);

  const defaultCenter: [number, number] = [38.7169, -9.1399]; // Lisboa como fallback

  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-background border-b border-border z-10 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
        </button>

        <h1 className="text-base font-semibold text-foreground">Onde Estamos</h1>

        <button
          onClick={toggleSharing}
          className={`h-9 w-9 flex items-center justify-center rounded-full transition-all active:scale-95 ${
            mySharing
              ? "bg-rose-100 dark:bg-rose-950/30 text-rose-500"
              : "bg-muted text-muted-foreground"
          }`}
          title={mySharing ? "Parar de partilhar localização" : "Partilhar a minha localização"}
        >
          {mySharing
            ? <MapPin className="w-4.5 h-4.5" strokeWidth={2} />
            : <MapPinOff className="w-4.5 h-4.5" strokeWidth={2} />
          }
        </button>
      </div>

      {/* ── Aviso permissão negada ── */}
      {permissionDenied && (
        <div className="mx-4 mt-3 shrink-0 rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 space-y-2">
          <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400">Acesso à localização bloqueado</p>
          <p className="text-[11px] text-rose-500/70 dark:text-rose-400/60 leading-relaxed">
            Vai às definições do teu browser → Privacidade → Localização e permite o acesso a este site. Depois toca em "Tentar novamente".
          </p>
          <button
            onClick={retryWatch}
            className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 underline underline-offset-2 active:opacity-60"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Mapa ── */}
      <div className="flex-1 relative">
        {!loading && (
          <MapContainer
            center={positions[0] ?? defaultCenter}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            <ChangeView positions={positions} />

            {mySharing && hasRealPos(myLocation) && (
              <Marker position={[myLocation!.lat, myLocation!.lng]} icon={myIcon} />
            )}
            {partnerSharing && hasRealPos(partnerLocation) && (
              <Marker position={[partnerLocation!.lat, partnerLocation!.lng]} icon={partnerIcon} />
            )}
          </MapContainer>
        )}

        {/* Skeleton enquanto carrega */}
        {loading && (
          <div className="absolute inset-0 bg-muted/30 animate-pulse" />
        )}

        {/* Badge "A minha localização" — só com posição real */}
        {mySharing && hasRealPos(myLocation) && (
          <div className="absolute top-3 left-3 z-[500] bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-border/50">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-foreground">A partilhar</span>
          </div>
        )}
      </div>

      {/* ── Card inferior — info do par ── */}
      <div className="shrink-0 bg-background border-t border-border px-4 pt-4 pb-6 space-y-3">

        {/* Estado do par */}
        <div className="flex items-center gap-3">
          {/* Avatar do par */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{ background: partner ? "#6B7280" : "#D1D5DB" }}
          >
            {partnerInitial}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">
              {partner?.display_name ?? "O teu par"}
            </p>
            {partnerSharing && partnerLocation ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Navigation className="w-3 h-3 text-rose-400 shrink-0" strokeWidth={2} />
                <p className="text-[11px] text-muted-foreground truncate">
                  {partnerLocation.address
                    ? `${partnerLocation.address} · ${timeAgo(partnerLocation.updated_at)}`
                    : timeAgo(partnerLocation.updated_at)
                  }
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Não está a partilhar a localização
              </p>
            )}
          </div>

          {/* Indicador ao vivo */}
          {partnerSharing && (
            <div className="shrink-0 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-500">Ao vivo</span>
            </div>
          )}
        </div>

        {/* Instrução quando nenhum dos dois está a partilhar */}
        {!mySharing && !partnerSharing && !loading && (
          <p className="text-[11px] text-muted-foreground/60 text-center pb-1">
            Toca no ícone de localização no topo para partilhares onde estás.
          </p>
        )}
      </div>
    </div>
  );
}
