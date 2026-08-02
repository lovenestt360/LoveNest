import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl';
import {
  ArrowLeft, Heart, Navigation, Pause,
  Clock, MapPin, MapPinOff, GraduationCap,
  Plane, Coffee, Car, Footprints,
  Home, Briefcase, ShoppingBag, Dumbbell, Church,
  Battery, BatteryLow, BatteryCharging, Wifi, Signal,
  Moon, Camera, ChevronRight, Users, Layers, LogOut,
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
const DEFAULT_H = 200;
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
  const [mapStyleIdx, setMapStyleIdx] = useState(0);

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
  const { partnerPath } = useLocationHistory(partnerLocation?.user_id ?? null);

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

  // ── Estatísticas de casa do par (hoje) ──
  const homeStats = useMemo(() => {
    const isHome = (name: string | null) => !!name && /\bcasa\b|\bhome\b/i.test(name);
    const leaves = diary.filter(e => e.kind === 'leave' && isHome(e.placeName as string));
    const arrivals = diary.filter(e => e.kind === 'arrive' && isHome(e.placeName as string));
    let totalAwayMs = 0;
    for (const lv of leaves) {
      const nextArrival = arrivals
        .filter(a => a.time > lv.time)
        .sort((a, b) => a.time.getTime() - b.time.getTime())[0];
      totalAwayMs += nextArrival
        ? nextArrival.time.getTime() - lv.time.getTime()
        : Date.now() - lv.time.getTime();
    }
    return { timesLeft: leaves.length, totalAwayMs };
  }, [diary]);

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

  // Subtext shown below partner name
  const partnerSubtext = together
    ? 'Juntos agora'
    : partnerCtx.label || (partnerLocation ? shortTimeAgo(partnerLocation.updated_at) : '');

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
            {/* Rota do parceiro */}
            {partnerPath.length >= 2 && (
              <Source id="prt-route" type="geojson" data={{
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: partnerPath.map(p => [p.lng, p.lat]) } }],
              }}>
                <Layer id="prt-route-l" type="line" paint={{ 'line-color': '#9CA3AF', 'line-opacity': 0.3, 'line-width': 2 }} layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
              </Source>
            )}

            {/* Linha de ligação */}
            {lineData && (
              <Source id="couple-line" type="geojson" data={lineData}>
                <Layer id="couple-line-l" type="line" paint={{ 'line-color': '#C4788C', 'line-opacity': 0.25, 'line-width': 2, 'line-dasharray': [4, 3] }} />
              </Source>
            )}

            {/* Locais favoritos */}
            {places.map(place => {
              const PlaceIc = PLACE_ICON_MAP[place.icon] ?? MapPin;
              return (
                <Marker key={place.id} longitude={place.lng} latitude={place.lat} anchor="bottom">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(196,120,140,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      <PlaceIc style={{ width: 12, height: 12, color: '#C4788C', strokeWidth: 1.5 }} />
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
                  <AvatarMarker initial={myInitial} ring="#C4788C" size={44} />
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
                  <AvatarMarker avatarUrl={partner?.avatar_url} initial={partnerInitial} ring={ring} size={52} />
                </div>
              </Marker>
            )}
          </Map>
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
      </div>

      {/* Scrim no topo */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: 100, background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 100%)' }}
      />

      {/* ── BOTÕES FLUTUANTES — TOPO ── */}
      <div
        className="absolute left-0 right-0 z-30 flex items-center gap-2 px-4"
        style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
        >
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.5} />
        </button>

        <div className="flex-1" />

        {isPaused && (
          <button
            onClick={handleResume}
            className="flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-transform"
            style={{ background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }}
          >
            <Pause className="w-3.5 h-3.5 text-white/70" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-white/70">Em pausa</span>
          </button>
        )}

        <button
          onClick={() => {
            if (isPaused) handleResume();
            else if (mySharing) setShowPauseMenu(v => !v);
            else toggleSharing();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={
            mySharing && !isPaused
              ? { background: '#C4788C', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 12px rgba(196,120,140,0.5)' }
              : { background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }
          }
        >
          {mySharing && !isPaused
            ? <MapPin className="w-4 h-4 text-white" strokeWidth={2} fill="currentColor" />
            : <MapPinOff className="w-4 h-4 text-white/75" strokeWidth={2} />
          }
        </button>
      </div>

      {/* Menu de pausa */}
      {showPauseMenu && mySharing && !isPaused && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowPauseMenu(false)} />
          <div
            className="absolute right-4 z-40 rounded-2xl overflow-hidden w-44"
            style={{
              top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 52px)',
              background: 'rgba(12,12,12,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {PAUSE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => handlePause(opt)}
                className={cn('w-full px-4 py-3.5 text-[13px] text-white/85 text-left hover:bg-white/10 active:bg-white/15 transition-colors', i < PAUSE_OPTIONS.length - 1 && 'border-b border-white/[0.07]')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Banner: permissão negada */}
      {permissionDenied && (
        <div
          className="absolute left-4 right-4 z-30 rounded-2xl px-4 py-3"
          style={{
            top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 56px)',
            background: 'rgba(0,0,0,0.80)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(196,120,140,0.25)',
          }}
        >
          <p className="text-[12px] font-semibold text-rose-400">Acesso à localização bloqueado</p>
          {geoErrorMsg && <p className="text-[10px] font-mono text-white/35 mt-0.5 break-all">{geoErrorMsg}</p>}
          <button onClick={retryWatch} className="text-[11px] font-semibold text-rose-400 underline underline-offset-2 mt-1.5 active:opacity-60">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Botões flutuantes acima da sheet */}
      <div
        className="absolute right-4 z-30 flex flex-col gap-2"
        style={{
          bottom: sheetH + 12,
          transition: dragging ? 'none' : 'bottom 0.35s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Ciclar estilo do mapa */}
        <button
          onClick={() => setMapStyleIdx(i => (i + 1) % MAP_STYLES.length)}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          title={MAP_STYLES[(mapStyleIdx + 1) % MAP_STYLES.length].label}
        >
          <Layers className="w-4 h-4 text-white/80" strokeWidth={1.5} />
        </button>

        {/* Centrar câmara */}
        <button
          onClick={centerCamera}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
        >
          <Navigation className="w-4 h-4 text-white/80" strokeWidth={1.5} />
        </button>
      </div>

      {/* ── BOTTOM SHEET ── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20 bg-card"
        style={{
          height: SHEET_MAX,
          transform: `translateY(${SHEET_MAX - sheetH}px)`,
          transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
        }}
      >
        {/* Handle — drag zone */}
        <div
          className="touch-none select-none cursor-grab active:cursor-grabbing flex flex-col items-center pt-2.5 pb-2"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-9 h-[3px] rounded-full bg-muted-foreground/25" />
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto overscroll-contain" style={{ height: SHEET_MAX - 34 }}>

          {/* ── Estado compacto (peek) ── */}
          {isPeekSheet && (
            <div className="px-4 h-10 flex items-center gap-3">
              {partnerSharing && partnerLocation ? (
                <>
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0" style={{ boxShadow: `0 0 0 2px ${ring}` }}>
                    {partner?.avatar_url
                      ? <img src={partner.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: ring }}>{partnerInitial}</div>
                    }
                  </div>
                  <p className="text-[13px] font-semibold text-foreground flex-1 truncate">{partner?.display_name}</p>
                  {distance !== null && <span className="text-[12px] font-semibold shrink-0" style={{ color: together ? '#C4788C' : '#6b7280' }}>{distanceLabel(distance)}</span>}
                </>
              ) : (
                <p className="text-[12px] text-muted-foreground/60">{partner?.display_name ?? 'O teu par'} — localização inativa</p>
              )}
            </div>
          )}

          {/* ── Conteúdo principal (DEFAULT + FULL) ── */}
          {!isPeekSheet && (
            <>
              {loading ? (
                <div className="px-4 space-y-3">
                  <div className="h-16 bg-muted/30 rounded-2xl animate-pulse" />
                </div>
              ) : partnerSharing && partnerLocation ? (
                <>
                  {/* Linha principal do parceiro */}
                  <div className="px-4">
                    <div className="flex items-center gap-3.5">

                      {/* Avatar + ponto online */}
                      <div className="relative shrink-0">
                        <div className="w-[52px] h-[52px] rounded-full overflow-hidden" style={{ boxShadow: `0 0 0 2.5px white, 0 0 0 4px ${ring}` }}>
                          {partner?.avatar_url
                            ? <img src={partner.avatar_url} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ background: ring }}>{partnerInitial}</div>
                          }
                        </div>
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background" />
                      </div>

                      {/* Nome + status */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-bold text-foreground leading-tight truncate">
                            {partner?.display_name ?? 'O teu par'}
                          </p>
                          {together && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#C4788C' }}>
                              Juntos
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground/70 mt-0.5 truncate">
                          {partnerSubtext}
                        </p>
                      </div>

                      {/* Bateria + rede + tempo */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <BatteryIcon level={partnerLocation.battery_level ?? null} charging={partnerLocation.is_charging ?? null} />
                        {networkLabel(partnerLocation.network_type) && (
                          <div className="flex items-center gap-0.5">
                            {isWifi(partnerLocation.network_type)
                              ? <Wifi className="w-2.5 h-2.5 text-muted-foreground/50" strokeWidth={1.5} />
                              : <Signal className="w-2.5 h-2.5 text-muted-foreground/50" strokeWidth={1.5} />
                            }
                            <span className="text-[10px] text-muted-foreground/45">
                              {networkLabel(partnerLocation.network_type)}
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground/40">{shortTimeAgo(partnerLocation.updated_at)}</span>
                      </div>
                    </div>

                    {/* Chips: saídas de casa + tempo fora */}
                    {(homeStats.timesLeft > 0 || homeStats.totalAwayMs > 60_000) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {homeStats.timesLeft > 0 && (
                          <div className="flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5">
                            <LogOut className="w-2.5 h-2.5 text-muted-foreground/60" strokeWidth={1.5} />
                            <span className="text-[10px] text-muted-foreground/70">
                              Saiu {homeStats.timesLeft === 1 ? '1 vez' : `${homeStats.timesLeft}×`} hoje
                            </span>
                          </div>
                        )}
                        {homeStats.totalAwayMs > 60_000 && (
                          <div className="flex items-center gap-1 bg-muted/60 rounded-full px-2 py-0.5">
                            <Clock className="w-2.5 h-2.5 text-muted-foreground/60" strokeWidth={1.5} />
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatDuration(homeStats.totalAwayMs)} fora de casa
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Linha de distância — só se não estiverem juntos */}
                    {distance !== null && !together && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Heart className="w-3 h-3 text-rose-400 shrink-0" fill="currentColor" strokeWidth={2} />
                        <span className="text-[12px] font-medium text-rose-500">{distanceLabel(distance)}</span>
                        <div className="ml-auto flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-500 tracking-wider">AO VIVO</span>
                        </div>
                      </div>
                    )}

                    {/* Quando estão juntos: acções compactas */}
                    {together && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowActions(v => !v)}
                          className="w-full flex items-center gap-2 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 active:scale-[0.98] transition-all"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" strokeWidth={2} />
                          <span className="text-[12px] font-semibold text-rose-600 dark:text-rose-300 flex-1 text-left">Estão juntos agora</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-500 tracking-wider">AO VIVO</span>
                          </div>
                        </button>
                        {showActions && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => navigate('/memorias')}
                              className="flex-1 py-2.5 rounded-xl bg-muted/50 text-[12px] font-medium text-foreground active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Camera className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
                              Criar Memória
                            </button>
                            <button
                              onClick={() => setShowHistoriaSheet(true)}
                              className="flex-1 py-2.5 rounded-xl bg-muted/50 text-[12px] font-medium text-foreground active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Users className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
                              Nossa História
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="mx-4 mt-3 h-px bg-border/30" />

                  {/* Histórico */}
                  <div className="px-4 mt-2.5">
                    <button
                      onClick={() => navigate('/localizacao/historico')}
                      className="w-full flex items-center gap-3 py-2.5 active:opacity-60 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground/70" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[13px] font-semibold text-foreground">Histórico</p>
                        <p className="text-[11px] text-muted-foreground/55 mt-0.5">
                          {diary.length > 0 ? `${diary.length} ${diary.length === 1 ? 'evento' : 'eventos'} hoje` : 'Encontros, chegadas e saídas'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              ) : (
                /* Par não partilha */
                <div className="px-4 pb-4 flex items-center gap-3.5">
                  <div className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-muted-foreground font-bold text-lg">{partnerInitial}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-foreground">{partner?.display_name ?? 'O teu par'}</p>
                    <p className="text-[12px] text-muted-foreground/55 mt-0.5">Localização inativa</p>
                  </div>
                </div>
              )}

              {/* ── CONFIGURAÇÕES (só no estado FULL) ── */}
              {isFullSheet && (
                <>
                  <div className="mx-4 mt-4 mb-3 h-px bg-border/30" />

                  {/* Partilha */}
                  <div className="px-4 space-y-2 pb-2">
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">Partilhar a minha localização</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {isPaused ? 'Em pausa' : mySharing ? 'O teu par vê onde estás' : 'O teu par não te consegue ver'}
                        </p>
                      </div>
                      <Switch
                        checked={mySharing && !isPaused}
                        onCheckedChange={() => { if (isPaused) handleResume(); else toggleSharing(); }}
                      />
                    </div>

                    {mySharing && !isPaused && (
                      <div>
                        <button
                          onClick={() => setShowPauseMenu(v => !v)}
                          className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pause className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Pausar por...
                        </button>
                        {showPauseMenu && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {PAUSE_OPTIONS.map(opt => (
                              <button
                                key={opt.label}
                                onClick={() => handlePause(opt)}
                                className="py-2.5 px-3 rounded-xl bg-muted/50 text-[12px] text-muted-foreground active:scale-95 transition-all text-left"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {isPaused && (
                      <button
                        onClick={handleResume}
                        className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-[12px] font-semibold active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30"
                      >
                        Retomar
                      </button>
                    )}

                    {!partnerSharing && !loading && (
                      <p className="text-[11px] text-muted-foreground/45 pt-0.5">
                        Quando o teu par ativar, vais ver onde está.
                      </p>
                    )}
                  </div>

                  <FavoritePlacesSection
                    myLat={myReal && myLocation ? myLocation.lat : null}
                    myLng={myReal && myLocation ? myLocation.lng : null}
                  />
                  <LocationNotifSettings prefs={notifPrefs} onUpdate={updatePref} />
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
