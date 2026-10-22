import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl';
import {
  ArrowUpRight, BookOpen, ChevronLeft, Heart, Navigation, Pause,
  Clock, MapPin, MapPinOff, GraduationCap,
  Plane, Coffee, Car, Footprints,
  Home, Briefcase, ShoppingBag, Dumbbell, Church,
  Battery, BatteryLow, BatteryCharging, Wifi, Signal,
  Moon, Camera, ChevronRight, Layers,
  type LucideIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLocationSharing } from '@/hooks/useLocationSharing';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { useProfile } from '@/hooks/useProfile';
import { useMeetingMoments } from '@/hooks/useMeetingMoments';
import { useFavoritePlaces } from '@/hooks/useFavoritePlaces';
import { useLocationEvents } from '@/hooks/useLocationEvents';
import { useLocationNotifPrefs } from '@/hooks/useLocationNotifPrefs';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { FavoritePlacesSection } from '@/features/location/FavoritePlacesSection';
import { LocationNotifSettings } from '@/features/location/LocationNotifSettings';
import { LocationOnboarding } from '@/features/location/LocationOnboarding';
import { AddRelationshipEventSheet } from '@/features/relationship-events/AddRelationshipEventSheet';
import { useRelationshipEvents } from '@/features/relationship-events/useRelationshipEvents';
import { useAuth } from '@/features/auth/AuthContext';
import { useCoupleSpaceId } from '@/hooks/useCoupleSpaceId';
import { cn } from '@/lib/utils';
import guardiaoThumb from '@/assets/flame/flame_04_guardiao_thumb.png';

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function shortTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs}h`;
    return `há ${Math.floor(hrs / 24)}d`;
  } catch {
    return '';
  }
}

function networkLabel(type: string | null): string | null {
  if (!type) return null;
  if (type === 'wifi')         return 'Wi-Fi';
  if (type === 'cellular')     return 'Dados';
  if (type === 'ethernet')     return 'Ethernet';
  if (type === '4g')           return '4G';
  if (type === '3g')           return '3G';
  if (type === '2g' || type === 'slow-2g') return '2G';
  return type.toUpperCase();
}

function isWifi(type: string | null): boolean {
  return type === 'wifi';
}

function distanceLabel(m: number): string {
  if (m < 100) return 'Juntos';
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  const min = Math.round((km / (km > 5 ? 60 : 40)) * 60);
  return `${km.toFixed(1)} km · ~${min} min`;
}

const PLACE_ICON_MAP: Record<string, LucideIcon> = {
  Home, Briefcase, GraduationCap, Coffee, Heart,
  ShoppingBag, Dumbbell, Church, MapPin,
};

function detectContext(address: string | null): { Icon: LucideIcon; label: string } {
  if (!address) return { Icon: MapPin, label: '' };
  const a = address.toLowerCase();
  if (a.includes('aeroporto') || a.includes('airport')) return { Icon: Plane, label: 'No aeroporto' };
  if (a.includes('universidade') || a.includes('faculdade') || a.includes('escola'))
    return { Icon: GraduationCap, label: 'Na universidade' };
  if (a.includes('café') || a.includes('restaurante') || a.includes('coffee'))
    return { Icon: Coffee, label: 'Num café' };
  return { Icon: Navigation, label: address.split(',')[0].trim() };
}

function detectStatus(
  speedKmh: number | null,
  address: string | null,
  placeName: string | null,
): { Icon: LucideIcon; label: string } {
  if (placeName) return { Icon: MapPin, label: placeName };
  if (speedKmh !== null) {
    if (speedKmh > 25) return { Icon: Car, label: 'Em movimento' };
    if (speedKmh > 4) return { Icon: Footprints, label: 'A caminhar' };
  }
  return detectContext(address);
}

function BatteryIcon({ level, charging }: { level: number | null; charging: boolean | null }) {
  if (level === null) return null;
  const Icon = charging ? BatteryCharging : level <= 20 ? BatteryLow : Battery;
  const color = charging ? '#22c55e' : level <= 20 ? '#ef4444' : '#9ca3af';
  return (
    <div className="flex items-center gap-0.5">
      <Icon className="w-3 h-3 shrink-0" style={{ color }} strokeWidth={1.5} />
      <span className="text-[10px]" style={{ color }}>{level}%</span>
    </div>
  );
}


function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ── Daily ring colour ─────────────────────────────────────────────────────────

const RING_COLORS = ['#C4788C', '#B8607C', '#D08898', '#C07080', '#CC7888', '#B86070'];

function dailyRing() {
  const d = new Date();
  const n = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  return RING_COLORS[(d.getFullYear() * 500 + n) % RING_COLORS.length];
}

// ── Diary types ───────────────────────────────────────────────────────────────

type DiaryEntry =
  | { kind: 'meeting'; id: string; time: Date; placeName: string | null }
  | { kind: 'arrive' | 'leave'; id: string; time: Date; placeName: string };

// ── Avatar marker ─────────────────────────────────────────────────────────────

function AvatarMarker({
  avatarUrl, initial, ring, size = 44,
}: {
  avatarUrl?: string | null; initial: string; ring: string; size?: number;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid white',
      boxShadow: `0 0 0 2.5px ${ring}, 0 8px 24px rgba(0,0,0,0.30)`,
      overflow: 'hidden', background: avatarUrl ? 'transparent' : ring,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : <span style={{ color: 'white', fontWeight: 700, fontSize: Math.round(size * 0.38), fontFamily: 'system-ui, sans-serif' }}>{initial}</span>
      }
    </div>
  );
}

// ── Callout acima do marcador ─────────────────────────────────────────────────

function MarkerCallout({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 pointer-events-none select-none" style={{ minWidth: 100 }}>
      <div
        className="rounded-xl px-2.5 py-1.5 text-center"
        style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <p className="text-[11px] font-bold leading-tight" style={{ color: '#111' }}>{name}</p>
        <p className="text-[9px] mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>
      </div>
      <div className="flex justify-center">
        <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '7px solid rgba(255,255,255,0.97)' }} />
      </div>
    </div>
  );
}

// ── Pause options ─────────────────────────────────────────────────────────────

const PAUSE_OPTIONS = [
  { label: '1 hora', getUntil: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'Hoje', getUntil: () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; } },
  { label: 'Até amanhã', getUntil: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23, 59, 59, 999); return d; } },
  { label: 'Indefinidamente', getUntil: () => new Date(9_999, 0, 1) },
];

// ── Sheet snap points ─────────────────────────────────────────────────────────

const PEEK = 72;
const DEFAULT_H = 290;

// Botão redondo branco por cima do mapa.
const MAP_BTN = 'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[#ECE8E3] bg-white text-[#0B1324] shadow-[0_8px_18px_-10px_rgba(11,19,36,0.45)] transition-transform active:scale-95 dark:border-border dark:bg-card dark:text-foreground';
const ROSE = '#E5466D';
const BLUE = '#4D7CFE';

function shortDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}
function bigDistance(m: number): { value: string; unit: string } {
  if (m < 1000) return { value: String(Math.round(m)), unit: 'm de ti' };
  const km = m / 1000;
  const min = Math.round((km / (km > 5 ? 60 : 40)) * 60);
  return { value: km.toFixed(1).replace('.', ','), unit: `km de ti · ~${min} min` };
}
function fullH() { return typeof window !== 'undefined' ? Math.min(Math.round(window.innerHeight * 0.78), 680) : 600; }
function maxH() { return fullH() + 24; }

// ── Constantes de mapa ────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const MAP_STYLES = [
  { id: 'satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satélite' },
  { id: 'streets',   url: 'mapbox://styles/mapbox/streets-v12',           label: 'Mapa'     },
  { id: 'dark',      url: 'mapbox://styles/mapbox/dark-v11',              label: 'Escuro'   },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Localizacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const {
    myLocation, partnerLocation,
    mySharing, partnerSharing,
    toggleSharing, retryWatch,
    loading, permissionDenied, geoErrorMsg,
  } = useLocationSharing();
  const { partner } = usePartnerProfile();
  const { profile } = useProfile();
  const { createEvent } = useRelationshipEvents(spaceId);

  const [showHistoriaSheet, setShowHistoriaSheet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('location-onboarding-seen') !== 'true',
  );

  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<Date | null>(null);
  const [sheetH, setSheetH] = useState(DEFAULT_H);
  const [dragging, setDragging] = useState(false);
  const [activeMarker, setActiveMarker] = useState<'me' | 'partner' | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [mapStyleIdx, setMapStyleIdx] = useState(1);

  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const toggleRef = useRef(toggleSharing);
  toggleRef.current = toggleSharing;
  const mySharingRef = useRef(mySharing);
  mySharingRef.current = mySharing;

  // ── Derived ──
  const hasPos = (loc: { lat: number; lng: number } | null) => !!loc && (loc.lat !== 0 || loc.lng !== 0);
  const isPaused = pauseUntil !== null;
  const myReal = mySharing && !isPaused && hasPos(myLocation);
  const partnerReal = partnerSharing && hasPos(partnerLocation);
  const distance = myReal && partnerReal && myLocation && partnerLocation
    ? haversineMeters(myLocation, partnerLocation) : null;
  const together = distance !== null && distance < 100;

  const myInitial = (profile?.display_name ?? 'Eu').charAt(0).toUpperCase();
  const partnerInitial = (partner?.display_name ?? 'P').charAt(0).toUpperCase();

  const { places, detectPlace } = useFavoritePlaces();
  const { todayMoments } = useMeetingMoments(myLocation, partnerLocation, mySharing, partnerSharing);
  const myName = profile?.display_name ?? 'O teu par';
  const { prefs: notifPrefs, updatePref } = useLocationNotifPrefs();
  const { partnerTodayEvents } = useLocationEvents(myLocation, partnerLocation, myName, notifPrefs);
  const { path: partnerPath } = useLocationHistory(partnerLocation?.user_id ?? null);
  const { path: myPath }      = useLocationHistory(user?.id ?? null);

  const partnerPlaceName = partnerReal && partnerLocation
    ? detectPlace(partnerLocation.lat, partnerLocation.lng) : null;
  const partnerCtx = detectStatus(
    partnerLocation?.speed_kmh ?? null,
    partnerLocation?.address ?? null,
    partnerPlaceName,
  );

  const ring = dailyRing();

  const diary = useMemo<DiaryEntry[]>(() => {
    return [
      ...todayMoments.map(m => ({ kind: 'meeting' as const, id: m.id, time: new Date(m.met_at), placeName: m.place_name })),
      ...partnerTodayEvents.map(e => ({
        kind: (e.event_type === 'enter' ? 'arrive' : 'leave') as 'arrive' | 'leave',
        id: e.id, time: new Date(e.occurred_at), placeName: e.place_name,
      })),
    ].sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [todayMoments, partnerTodayEvents]);

  // ── Estatísticas de casa do par — calculadas a partir do histórico GPS (mais fiável que geofence events) ──
  const homeStats = useMemo(() => {
    const homePlace = places.find(p => /\bcasa\b|\bhome\b/i.test(p.name) || p.icon === 'Home');
    if (!homePlace) return { timesLeft: 0, totalAwayMs: 0 };

    // Inclui posição atual do par como último ponto
    const fullPath = [
      ...partnerPath,
      ...(partnerReal && partnerLocation
        ? [{ lat: partnerLocation.lat, lng: partnerLocation.lng, recorded_at: partnerLocation.updated_at, speed_kmh: null }]
        : []),
    ];
    if (fullPath.length < 2) return { timesLeft: 0, totalAwayMs: 0 };

    const THRESHOLD = homePlace.radius_m ?? 150;
    let timesLeft = 0;
    let totalAwayMs = 0;
    let wasAtHome: boolean | null = null;
    let leaveTime: number | null = null;

    for (const pt of fullPath) {
      const dist = haversineMeters({ lat: pt.lat, lng: pt.lng }, { lat: homePlace.lat, lng: homePlace.lng });
      const atHome = dist <= THRESHOLD;
      if (wasAtHome === null) { wasAtHome = atHome; continue; }
      if (wasAtHome && !atHome) {
        timesLeft++;
        leaveTime = new Date(pt.recorded_at).getTime();
        wasAtHome = false;
      } else if (!wasAtHome && atHome) {
        if (leaveTime !== null) totalAwayMs += new Date(pt.recorded_at).getTime() - leaveTime;
        leaveTime = null;
        wasAtHome = true;
      }
    }
    // Ainda fora de casa agora
    if (wasAtHome === false && leaveTime !== null) totalAwayMs += Date.now() - leaveTime;
    return { timesLeft, totalAwayMs };
  }, [partnerPath, places, partnerReal, partnerLocation]);

  // Line connecting the two
  const lineData = myReal && partnerReal && myLocation && partnerLocation
    ? {
        type: 'FeatureCollection' as const,
        features: [{ type: 'Feature' as const, properties: {}, geometry: {
          type: 'LineString' as const,
          coordinates: [[myLocation.lng, myLocation.lat], [partnerLocation.lng, partnerLocation.lat]],
        }}],
      }
    : null;

  // ── Camera ──
  const prevCountRef = useRef(0);
  useEffect(() => {
    const count = (myReal ? 1 : 0) + (partnerReal ? 1 : 0);
    if (!mapLoaded || !mapRef.current || count === 0 || count === prevCountRef.current) return;
    prevCountRef.current = count;
    const pad = { top: 80, right: 50, bottom: DEFAULT_H + 50, left: 50 };
    if (myReal && partnerReal && myLocation && partnerLocation) {
      const d = haversineMeters(myLocation, partnerLocation);
      if (d < 150) {
        mapRef.current.flyTo({ center: [(myLocation.lng + partnerLocation.lng) / 2, (myLocation.lat + partnerLocation.lat) / 2], zoom: 17, duration: 1400 });
      } else {
        mapRef.current.fitBounds(
          [[Math.min(myLocation.lng, partnerLocation.lng), Math.min(myLocation.lat, partnerLocation.lat)],
           [Math.max(myLocation.lng, partnerLocation.lng), Math.max(myLocation.lat, partnerLocation.lat)]],
          { padding: pad, duration: 1500, maxZoom: 16 },
        );
      }
    } else if (myReal && myLocation) {
      mapRef.current.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 15, duration: 1200 });
    } else if (partnerReal && partnerLocation) {
      mapRef.current.flyTo({ center: [partnerLocation.lng, partnerLocation.lat], zoom: 15, duration: 1200 });
    }
  }, [mapLoaded, myReal, partnerReal]);

  // ── Pause auto-resume ──
  useEffect(() => {
    if (!pauseUntil) return;
    const ms = pauseUntil.getTime() - Date.now();
    if (ms <= 0) { setPauseUntil(null); return; }
    const t = setTimeout(() => { setPauseUntil(null); if (!mySharingRef.current) toggleRef.current(); }, ms);
    return () => clearTimeout(t);
  }, [pauseUntil]);

  const handlePause = (opt: typeof PAUSE_OPTIONS[number]) => {
    if (mySharingRef.current) toggleRef.current();
    setPauseUntil(opt.getUntil());
    setShowPauseMenu(false);
  };
  const handleResume = () => {
    setPauseUntil(null);
    if (!mySharingRef.current) toggleRef.current();
  };

  // ── Sheet drag ──
  function onTouchStart(e: React.TouchEvent) {
    dragRef.current = { startY: e.touches[0].clientY, startH: sheetH };
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const fh = fullH();
    const delta = dragRef.current.startY - e.touches[0].clientY;
    setSheetH(Math.max(PEEK, Math.min(fh, dragRef.current.startH + delta)));
  }
  function onTouchEnd() {
    setDragging(false);
    if (!dragRef.current) return;
    const fh = fullH();
    const snaps = [PEEK, DEFAULT_H, fh];
    setSheetH(snaps.reduce((a, b) => Math.abs(b - sheetH) < Math.abs(a - sheetH) ? b : a));
    dragRef.current = null;
  }

  function centerCamera() {
    if (!mapLoaded || !mapRef.current) return;
    const pad = { top: 80, right: 50, bottom: sheetH + 50, left: 50 };
    if (myReal && partnerReal && myLocation && partnerLocation) {
      const d = haversineMeters(myLocation, partnerLocation);
      if (d < 150) {
        mapRef.current.flyTo({ center: [(myLocation.lng + partnerLocation.lng) / 2, (myLocation.lat + partnerLocation.lat) / 2], zoom: 17, duration: 1200 });
      } else {
        mapRef.current.fitBounds(
          [[Math.min(myLocation.lng, partnerLocation.lng), Math.min(myLocation.lat, partnerLocation.lat)],
           [Math.max(myLocation.lng, partnerLocation.lng), Math.max(myLocation.lat, partnerLocation.lat)]],
          { padding: pad, duration: 1200, maxZoom: 16 },
        );
      }
    } else if (myReal && myLocation) {
      mapRef.current.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 15, duration: 1200 });
    } else if (partnerReal && partnerLocation) {
      mapRef.current.flyTo({ center: [partnerLocation.lng, partnerLocation.lat], zoom: 15, duration: 1200 });
    }
  }

  const SHEET_MAX = maxH();
  const isFullSheet = sheetH >= fullH() - 40;
  const isPeekSheet = sheetH <= PEEK + 20;

  const partnerName = partner?.display_name ?? 'O teu par';
  const pauseLabel = !pauseUntil ? '' : pauseUntil.getFullYear() > 9000 ? 'indefinidamente'
    : `até ${pauseUntil.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  const pill = permissionDenied
    ? { tone: 'off' as const, tag: 'SEM ACESSO', text: 'Toca para tentar de novo' }
    : isPaused
    ? { tone: 'paused' as const, tag: 'EM PAUSA', text: `${pauseLabel} · toca para retomar` }
    : together
    ? { tone: 'together' as const, tag: 'JUNTOS', text: 'Estão juntos agora' }
    : partnerReal
    ? { tone: 'live' as const, tag: 'AO VIVO', text: `${partnerName} · ${partnerCtx.label || 'agora'}` }
    : { tone: 'off' as const, tag: 'OFFLINE', text: `${partnerName} não está a partilhar` };

  // Subtext shown below partner name
  const partnerSubtext = together
    ? 'Juntos agora'
    : [partnerCtx.label, partnerLocation ? shortTimeAgo(partnerLocation.updated_at) : ''].filter(Boolean).join(' · ');

  return (
    <div className="relative bg-black" style={{ width: '100%', height: '100dvh', overflow: 'hidden' }}>

      {/* ── MAPA FULLSCREEN ── */}
      <div className="absolute inset-0">
        {!loading ? (
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAP_STYLES[mapStyleIdx].url}
            initialViewState={{ longitude: -9.1399, latitude: 38.7169, zoom: 12 }}
            style={{ width: '100%', height: '100%' }}
            onLoad={() => setMapLoaded(true)}
            onClick={() => { setActiveMarker(null); setShowPauseMenu(false); }}
            attributionControl={false}
            reuseMaps
          >
            {/* Rasto do par (graphite) */}
            {partnerPath.length >= 2 && (
              <Source id="prt-route" type="geojson" data={{
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: partnerPath.map(p => [p.lng, p.lat]) } }],
              }}>
                <Layer id="prt-route-l" type="line" paint={{ 'line-color': '#9CA3AF', 'line-opacity': 0.65, 'line-width': 3 }} layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
              </Source>
            )}
            {/* Rasto próprio (rose) */}
            {myPath.length >= 2 && (
              <Source id="my-route" type="geojson" data={{
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: myPath.map(p => [p.lng, p.lat]) } }],
              }}>
                <Layer id="my-route-l" type="line" paint={{ 'line-color': '#E5466D', 'line-opacity': 0.55, 'line-width': 3 }} layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
              </Source>
            )}

            {/* Linha de ligação */}
            {lineData && (
              <Source id="couple-line" type="geojson" data={lineData}>
                <Layer id="couple-line-l" type="line" paint={{ 'line-color': '#0B1324', 'line-opacity': 0.7, 'line-width': 2.5, 'line-dasharray': [0.6, 2.4] }} layout={{ 'line-cap': 'round' }} />
              </Source>
            )}

            {/* Distância entre os dois */}
            {myReal && partnerReal && myLocation && partnerLocation && distance !== null && distance >= 250 && (
              <Marker longitude={(myLocation.lng + partnerLocation.lng) / 2} latitude={(myLocation.lat + partnerLocation.lat) / 2} anchor="center">
                <span className="pointer-events-none rounded-full bg-[#0B1324] px-2.5 py-1 text-[12px] font-bold tabular-nums text-white shadow-[0_10px_20px_-10px_rgba(11,19,36,0.7)]">
                  {shortDistance(distance)}
                </span>
              </Marker>
            )}

            {/* Locais favoritos */}
            {places.map(place => {
              const PlaceIc = PLACE_ICON_MAP[place.icon] ?? MapPin;
              return (
                <Marker key={place.id} longitude={place.lng} latitude={place.lat} anchor="bottom">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', border: '1px solid #ECE8E3', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      <PlaceIc style={{ width: 13, height: 13, color: '#0B1324', strokeWidth: 1.9 }} />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.94)', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                      {place.name}
                    </div>
                  </div>
                </Marker>
              );
            })}

            {/* Marcador: eu */}
            {myReal && myLocation && (
              <Marker longitude={myLocation.lng} latitude={myLocation.lat} anchor="center" offset={together && partnerReal ? [-24, 0] : [0, 0]}>
                <div className="relative cursor-pointer" onClick={e => { e.stopPropagation(); setActiveMarker(m => m === 'me' ? null : 'me'); }}>
                  {activeMarker === 'me' && (
                    <MarkerCallout name={profile?.display_name ?? 'Eu'} sub="Agora" />
                  )}
                  <AvatarMarker initial={myInitial} ring={ROSE} size={46} />
                </div>
              </Marker>
            )}

            {/* Marcador: par */}
            {partnerReal && partnerLocation && (
              <Marker longitude={partnerLocation.lng} latitude={partnerLocation.lat} anchor="center" offset={together && myReal ? [24, 0] : [0, 0]}>
                <div className="relative cursor-pointer" onClick={e => { e.stopPropagation(); setActiveMarker(m => m === 'partner' ? null : 'partner'); }}>
                  {activeMarker === 'partner' && (
                    <MarkerCallout
                      name={partner?.display_name ?? 'O teu par'}
                      sub={partnerCtx.label ? `${partnerCtx.label} · ${shortTimeAgo(partnerLocation.updated_at)}` : shortTimeAgo(partnerLocation.updated_at)}
                    />
                  )}
                  <span className="pointer-events-none absolute inset-[-6px] rounded-full border-2 border-[#4D7CFE] animate-[map-ping_2.2s_ease-out_infinite]" />
                  <span className="pointer-events-none absolute inset-[-6px] rounded-full border-2 border-[#4D7CFE] animate-[map-ping_2.2s_ease-out_infinite_1.1s]" />
                  {!together && <img src={guardiaoThumb} alt="" className="pointer-events-none absolute bottom-[44px] left-1/2 w-[40px] -translate-x-1/2 animate-[map-ride_1.4s_ease-in-out_infinite]" />}
                  <AvatarMarker avatarUrl={partner?.avatar_url} initial={partnerInitial} ring={BLUE} size={54} />
                </div>
              </Marker>
            )}
          </Map>
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
      </div>

      {/* ── TOPO: voltar · estado ao vivo · partilha ── */}
      <div
        className="absolute left-0 right-0 z-30 flex items-center gap-2 px-4"
        style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <button onClick={() => navigate(-1)} className={MAP_BTN} aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => { if (isPaused) handleResume(); else if (permissionDenied) retryWatch(); }}
          className={cn(
            'flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold shadow-[0_12px_24px_-12px_rgba(11,19,36,0.7)] transition-colors',
            pill.tone === 'live' && 'bg-[#0B1324] text-white',
            pill.tone === 'together' && 'bg-[#E5466D] text-white',
            (pill.tone === 'paused' || pill.tone === 'off') && 'border border-[#ECE8E3] bg-white text-[#0B1324]',
          )}
        >
          <span className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            pill.tone === 'live' && 'bg-emerald-500 animate-[live-dot_1.6s_ease-out_infinite]',
            pill.tone === 'together' && 'bg-white',
            pill.tone === 'paused' && 'bg-amber-500',
            pill.tone === 'off' && 'bg-[#D5D1CB]',
          )} />
          <b className={cn(
            'shrink-0 text-[11px] font-extrabold tracking-[0.08em]',
            pill.tone === 'live' && 'text-emerald-300',
            pill.tone === 'paused' && 'text-amber-700',
            pill.tone === 'off' && 'text-[#7A7F8C]',
          )}>{pill.tag}</b>
          <span className="truncate">{pill.text}</span>
        </button>

        <button
          onClick={() => {
            if (isPaused) handleResume();
            else if (mySharing) setShowPauseMenu(v => !v);
            else toggleSharing();
          }}
          className={cn(MAP_BTN, mySharing && !isPaused && 'border-[#0B1324] bg-[#0B1324] text-white')}
          aria-label={mySharing && !isPaused ? 'A partilhar a tua localização' : 'Partilha desligada'}
        >
          {isPaused ? <Pause className="h-4 w-4" strokeWidth={2} />
            : mySharing ? <MapPin className="h-[18px] w-[18px]" strokeWidth={2} />
            : <MapPinOff className="h-[18px] w-[18px]" strokeWidth={2} />}
        </button>
      </div>

      {/* Menu de pausa */}
      {showPauseMenu && mySharing && !isPaused && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowPauseMenu(false)} />
          <div
            className="absolute right-4 z-40 w-48 overflow-hidden rounded-[18px] border border-[#ECE8E3] bg-white shadow-[0_18px_36px_-18px_rgba(11,19,36,0.45)] dark:border-border dark:bg-card"
            style={{ top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 52px)' }}
          >
            <p className="px-3.5 pb-1 pt-2.5 text-[11px] font-semibold text-muted-foreground">Pausar a partilha</p>
            {PAUSE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => handlePause(opt)}
                className={cn('w-full px-3.5 py-3 text-left text-[13.5px] text-foreground active:bg-[#F7F5F2] dark:active:bg-muted', i > 0 && 'border-t border-[#ECE8E3] dark:border-border')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Aviso: permissão negada */}
      {permissionDenied && (
        <div
          className="absolute left-4 right-4 z-30 rounded-[18px] border border-red-200 bg-white px-4 py-3 shadow-[0_14px_28px_-16px_rgba(11,19,36,0.4)] dark:bg-card"
          style={{ top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 56px)' }}
        >
          <p className="text-[13px] font-semibold text-red-700 dark:text-red-400">Acesso à localização bloqueado</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Permite a localização nas definições do telemóvel.</p>
          {geoErrorMsg && <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground/60">{geoErrorMsg}</p>}
          <button onClick={retryWatch} className="mt-2 h-[34px] rounded-xl bg-[#0B1324] px-3.5 text-[12.5px] font-bold text-white active:opacity-80">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Botões ao lado da folha */}
      <div
        className="absolute right-4 z-30 flex flex-col gap-2"
        style={{ bottom: sheetH + 12, transition: dragging ? 'none' : 'bottom 0.35s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <button
          onClick={() => setMapStyleIdx(i => (i + 1) % MAP_STYLES.length)}
          className={MAP_BTN}
          aria-label={`Mudar para ${MAP_STYLES[(mapStyleIdx + 1) % MAP_STYLES.length].label}`}
        >
          <Layers className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        <button onClick={centerCamera} className={MAP_BTN} aria-label="Centrar o mapa">
          <Navigation className="h-[17px] w-[17px]" strokeWidth={1.9} />
        </button>
      </div>

      {/* ── FOLHA DE BAIXO ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-card"
        style={{
          height: SHEET_MAX,
          transform: `translateY(${SHEET_MAX - sheetH}px)`,
          transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          borderRadius: '26px 26px 0 0',
          boxShadow: '0 -16px 40px -18px rgba(11,19,36,0.35)',
        }}
      >
        <div
          className="flex cursor-grab touch-none select-none flex-col items-center pb-2 pt-2.5 active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => setSheetH(isPeekSheet ? DEFAULT_H : isFullSheet ? PEEK : fullH())}
        >
          <div className="h-1 w-[38px] rounded-full bg-[#DDD8D1] dark:bg-muted-foreground/30" />
        </div>

        <div className="overflow-y-auto overscroll-contain px-4" style={{ height: SHEET_MAX - 34 }}>

          {/* Fechada */}
          {isPeekSheet && (
            <div className="flex h-10 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4D7CFE] text-[11px] font-bold text-white" style={{ boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #4D7CFE' }}>
                {partner?.avatar_url ? <img src={partner.avatar_url} className="h-full w-full object-cover" alt="" /> : partnerInitial}
              </span>
              <p className="flex-1 truncate text-[13.5px] font-semibold text-foreground">{partnerName}</p>
              <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-foreground">
                {!partnerReal ? 'inativa' : together ? 'Juntos' : distance !== null ? shortDistance(distance) : ''}
              </span>
            </div>
          )}

          {!isPeekSheet && (
            <>
              {loading ? (
                <div className="h-16 animate-pulse rounded-2xl bg-[#F7F5F2] dark:bg-muted" />
              ) : partnerSharing && partnerLocation ? (
                <>
                  {/* O par */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-[#4D7CFE] text-[19px] font-extrabold text-white" style={{ boxShadow: '0 0 0 3px #fff, 0 0 0 5px #4D7CFE' }}>
                        {partner?.avatar_url ? <img src={partner.avatar_url} className="h-full w-full object-cover" alt="" /> : partnerInitial}
                      </div>
                      <span className="absolute -bottom-px -right-px h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-card" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[16px] font-bold leading-tight text-foreground">{partnerName}</p>
                        {together && <span className="shrink-0 rounded-full bg-[#E5466D] px-2 py-0.5 text-[10.5px] font-bold text-white">Juntos</span>}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted-foreground">
                        <partnerCtx.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                        {partnerSubtext}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] text-muted-foreground">
                      <BatteryIcon level={partnerLocation.battery_level ?? null} charging={partnerLocation.is_charging ?? null} />
                      {networkLabel(partnerLocation.network_type) && (
                        <span className="flex items-center gap-1">
                          {isWifi(partnerLocation.network_type) ? <Wifi className="h-3 w-3" strokeWidth={1.9} /> : <Signal className="h-3 w-3" strokeWidth={1.9} />}
                          {networkLabel(partnerLocation.network_type)}
                        </span>
                      )}
                      <span>{shortTimeAgo(partnerLocation.updated_at)}</span>
                    </div>
                  </div>

                  {/* Saídas de casa e tempo fora */}
                  {(homeStats.timesLeft > 0 || homeStats.totalAwayMs > 60_000) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {homeStats.timesLeft > 0 && (
                        <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#F7F5F2] px-3 text-[12px] font-semibold text-foreground dark:bg-muted">
                          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                          Saiu {homeStats.timesLeft === 1 ? '1 vez' : `${homeStats.timesLeft}×`} hoje
                        </span>
                      )}
                      {homeStats.totalAwayMs > 60_000 && (
                        <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#F7F5F2] px-3 text-[12px] font-semibold text-foreground dark:bg-muted">
                          <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                          {formatDuration(homeStats.totalAwayMs)} fora de casa
                        </span>
                      )}
                    </div>
                  )}

                  {/* Distância ao vivo */}
                  {distance !== null && !together && (
                    <div className="mt-3.5 flex items-baseline gap-1.5">
                      <b className="text-[48px] font-black leading-[0.9] tracking-[-0.05em] tabular-nums text-foreground">{bigDistance(distance).value}</b>
                      <span className="text-[14px] font-semibold text-muted-foreground">{bigDistance(distance).unit}</span>
                      <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.1em] text-emerald-600">
                        <span className="h-[7px] w-[7px] rounded-full bg-emerald-500 animate-[live-dot_1.6s_ease-out_infinite]" />
                        AO VIVO
                      </span>
                    </div>
                  )}

                  {/* Juntos */}
                  {together && (
                    <div className="mt-3 rounded-[18px] bg-[#FFF0F4] p-3 dark:bg-rose-950/20">
                      <p className="flex items-center gap-2 text-[13.5px] font-bold text-[#9F1239] dark:text-rose-300">
                        <Heart className="h-4 w-4" fill="currentColor" strokeWidth={2} />
                        Estão juntos agora
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button onClick={() => navigate('/memorias')} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#FBCFDA] bg-white text-[12.5px] font-bold text-foreground active:scale-95 dark:border-rose-900/40 dark:bg-card">
                          <Camera className="h-[15px] w-[15px]" strokeWidth={1.9} /> Criar memória
                        </button>
                        <button onClick={() => setShowHistoriaSheet(true)} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[#FBCFDA] bg-white text-[12.5px] font-bold text-foreground active:scale-95 dark:border-rose-900/40 dark:bg-card">
                          <BookOpen className="h-[15px] w-[15px]" strokeWidth={1.9} /> Nossa História
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* O par não partilha */
                <div className="flex items-center gap-3 pb-1">
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#ECE8E3] text-lg font-bold text-[#7A7F8C] dark:bg-muted">{partnerInitial}</div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-foreground">{partnerName}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">Localização inativa · quando ativar, vais ver onde está</p>
                  </div>
                </div>
              )}

              {/* Histórico */}
              <button
                onClick={() => navigate('/localizacao/historico')}
                className="mt-3.5 flex w-full items-center gap-3 border-t border-[#ECE8E3] py-3 text-left active:opacity-60 dark:border-border"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F2] text-foreground dark:bg-muted">
                  <Clock className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-foreground">Histórico</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {diary.length > 0 ? `${diary.length} ${diary.length === 1 ? 'evento' : 'eventos'} hoje · encontros, chegadas e saídas` : 'Encontros, chegadas e saídas'}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#C9C4BC]" strokeWidth={2} />
              </button>

              {/* ── DEFINIÇÕES (folha aberta) ── */}
              {isFullSheet && (
                <>
                  <div className="mt-1 border-t border-[#ECE8E3] pt-3.5 dark:border-border">
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">A tua partilha</p>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground">Partilhar a minha localização</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {isPaused ? `Em pausa ${pauseLabel}` : mySharing ? 'O teu par vê onde estás' : 'O teu par não te consegue ver'}
                        </p>
                      </div>
                      <Switch
                        className="data-[state=checked]:bg-[#0B1324]"
                        checked={mySharing && !isPaused}
                        onCheckedChange={() => { if (isPaused) handleResume(); else toggleSharing(); }}
                      />
                    </div>
                    {mySharing && !isPaused && (
                      <>
                        <p className="mt-1 text-[12px] text-muted-foreground">Pausar por…</p>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          {PAUSE_OPTIONS.map(opt => (
                            <button key={opt.label} onClick={() => handlePause(opt)} className="h-[38px] rounded-xl bg-[#F7F5F2] text-[12.5px] font-semibold text-foreground active:scale-95 dark:bg-muted">
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {isPaused && (
                      <button onClick={handleResume} className="mt-2 h-10 w-full rounded-xl bg-[#0B1324] text-[13px] font-bold text-white active:scale-[0.98]">
                        Retomar a partilha
                      </button>
                    )}
                    {!partnerSharing && !loading && (
                      <p className="pt-2 text-[11.5px] text-muted-foreground">Quando o teu par ativar, vais ver onde está.</p>
                    )}
                  </div>

                  {/* Estes blocos trazem a sua própria margem lateral */}
                  <div className="-mx-4">
                    <FavoritePlacesSection
                      myLat={myReal && myLocation ? myLocation.lat : null}
                      myLng={myReal && myLocation ? myLocation.lng : null}
                    />
                    <LocationNotifSettings prefs={notifPrefs} onUpdate={updatePref} />
                  </div>
                  <div className="h-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }} />
                </>
              )}

              {!isFullSheet && <div className="h-4" />}
            </>
          )}
        </div>
      </div>

      {/* ── Sheets / overlays ── */}
      <AddRelationshipEventSheet
        open={showHistoriaSheet}
        onOpenChange={setShowHistoriaSheet}
        coupleSpaceId={spaceId ?? ''}
        userId={user?.id ?? ''}
        editingEvent={null}
        onCreate={createEvent}
        onUpdate={async () => ({ error: null })}
        defaultTitle={todayMoments[0]?.place_name ? `Encontrámo-nos em ${todayMoments[0].place_name}` : 'Encontrámo-nos'}
        defaultDate={new Date().toISOString().split('T')[0]}
        onCreated={() => { setShowHistoriaSheet(false); navigate('/historia'); }}
      />

      {showOnboarding && (
        <LocationOnboarding
          onClose={() => { localStorage.setItem('location-onboarding-seen', 'true'); setShowOnboarding(false); }}
        />
      )}
    </div>
  );
}
