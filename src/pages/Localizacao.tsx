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
  Moon, Sparkles, ChevronRight,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function emotionalDistance(m: number): string {
  if (m < 100) return 'Mesmo sítio';
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  const min = Math.round((km / (km > 5 ? 60 : 40)) * 60);
  return `${km.toFixed(1)} km · ~${min} min`;
}

function BatteryIcon({ level, charging }: { level: number | null; charging: boolean | null }) {
  if (level === null) return null;
  const Icon = charging ? BatteryCharging : level <= 20 ? BatteryLow : Battery;
  const color = charging ? '#22c55e' : level <= 20 ? '#ef4444' : '#6b7280';
  return (
    <div className="flex items-center gap-1">
      <Icon className="w-3 h-3 shrink-0" style={{ color }} strokeWidth={1.5} />
      <span className="text-[10px]" style={{ color }}>{level}%</span>
    </div>
  );
}

function NetworkIcon({ type }: { type: string | null }) {
  if (!type) return null;
  const isWifi = type === 'wifi';
  const Icon = isWifi ? Wifi : Signal;
  return (
    <div className="flex items-center gap-1">
      <Icon className="w-3 h-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
      <span className="text-[10px] text-muted-foreground/50">{isWifi ? 'Wi-Fi' : type.toUpperCase()}</span>
    </div>
  );
}

// ── Daily variety ─────────────────────────────────────────────────────────────

const DAILY_RING_COLORS = [
  '#C4788C', '#B8607C', '#D08898', '#C07080',
  '#CC7888', '#B86070', '#D09090', '#C86888',
];

function dailyIndex(len: number): number {
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return (d.getFullYear() * 500 + dayOfYear) % len;
}

// ── Diary types ───────────────────────────────────────────────────────────────

type DiaryEntry =
  | { kind: 'meeting'; id: string; time: Date; placeName: string | null }
  | { kind: 'arrive'; id: string; time: Date; placeName: string }
  | { kind: 'leave'; id: string; time: Date; placeName: string };

// ── Contextual messages ───────────────────────────────────────────────────────

interface CtxMsg { Icon: LucideIcon; headline: string; sub: string }

function getContextualMsg(
  diary: DiaryEntry[],
  partnerPlaceName: string | null,
  myPlaceName: string | null,
  partnerName: string,
): CtxMsg | null {
  const hour = new Date().getHours();
  const atHome = (name: string | null) => name != null && /\bcasa\b|\bhome\b/i.test(name);

  if (atHome(partnerPlaceName) && atHome(myPlaceName) && hour >= 20)
    return { Icon: Moon, headline: 'Boa noite aos dois', sub: 'O dia terminou com os dois em casa' };

  const recentHome = diary.find(
    e => e.kind === 'arrive' && atHome(e.placeName) && Date.now() - e.time.getTime() < 30 * 60_000,
  );
  if (recentHome)
    return { Icon: Home, headline: 'O dia terminou em segurança', sub: `${partnerName} já está em casa` };

  return null;
}

// ── MomentoEspecial ───────────────────────────────────────────────────────────

function MomentoEspecial({
  onNavigate,
  onHistoria,
}: {
  onNavigate: (path: string) => void;
  onHistoria: () => void;
}) {
  return (
    <div className="mx-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-4 py-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-rose-400" strokeWidth={2} />
        </div>
        <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-300">Momento Especial</p>
      </div>
      <p className="text-[11px] text-rose-500/70 dark:text-rose-400/60 mb-3 leading-relaxed">
        Vocês estão juntos agora. Que tal aproveitar este momento?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onNavigate('/memorias')}
          className="flex-1 py-2 rounded-xl bg-white/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-[11px] font-medium text-rose-500 active:scale-95 transition-all"
        >
          Criar Memória
        </button>
        <button
          onClick={onHistoria}
          className="flex-1 py-2 rounded-xl bg-white/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-[11px] font-medium text-rose-500 active:scale-95 transition-all"
        >
          Nossa História
        </button>
      </div>
    </div>
  );
}

// ── Avatar marker ─────────────────────────────────────────────────────────────

function AvatarMarker({
  avatarUrl,
  initial,
  ring,
  size = 44,
}: {
  avatarUrl?: string | null;
  initial: string;
  ring: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: `0 0 0 2.5px ${ring}, 0 8px 28px rgba(0,0,0,0.28)`,
        overflow: 'hidden',
        background: avatarUrl ? 'transparent' : ring,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
      ) : (
        <span
          style={{
            color: 'white',
            fontWeight: 700,
            fontSize: Math.round(size * 0.36),
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

// ── Marker callout bubble ─────────────────────────────────────────────────────

function MarkerCallout({
  name,
  timeLabel,
  contextLabel,
  contextIcon: CtxIcon,
}: {
  name: string;
  timeLabel: string;
  contextLabel?: string;
  contextIcon?: LucideIcon;
}) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none select-none">
      <div
        className="rounded-2xl px-3 py-2 text-center shadow-xl border"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(0,0,0,0.07)',
          minWidth: 112,
          whiteSpace: 'nowrap',
        }}
      >
        <p className="text-[12px] font-bold leading-tight" style={{ color: '#1a1a1a' }}>{name}</p>
        {contextLabel && (
          <div className="flex items-center justify-center gap-1 mt-0.5">
            {CtxIcon && <CtxIcon className="w-2.5 h-2.5 text-rose-500" strokeWidth={1.5} />}
            <p className="text-[10px] text-rose-500">{contextLabel}</p>
          </div>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{timeLabel}</p>
      </div>
      {/* Seta */}
      <div className="flex justify-center mt-[-1px]">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '8px solid rgba(255,255,255,0.96)',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
          }}
        />
      </div>
    </div>
  );
}

// ── Pause options ─────────────────────────────────────────────────────────────

const PAUSE_OPTIONS = [
  { label: '1 hora', getUntil: () => new Date(Date.now() + 60 * 60 * 1000) },
  {
    label: 'Hoje',
    getUntil: () => {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d;
    },
  },
  {
    label: 'Até amanhã',
    getUntil: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 999);
      return d;
    },
  },
  { label: 'Indefinidamente', getUntil: () => new Date(9_999, 0, 1) },
];

// ── Bottom sheet snap points ──────────────────────────────────────────────────

const SNAP_PEEK = 84;
const SNAP_DEFAULT = 272;
function getSnapFull() {
  return typeof window !== 'undefined'
    ? Math.min(Math.round(window.innerHeight * 0.80), 700)
    : 640;
}
function getSheetMax() {
  return getSnapFull() + 32;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

export default function Localizacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const {
    myLocation,
    partnerLocation,
    mySharing,
    partnerSharing,
    toggleSharing,
    retryWatch,
    loading,
    permissionDenied,
    geoErrorMsg,
  } = useLocationSharing();
  const { partner } = usePartnerProfile();
  const { profile } = useProfile();
  const { createEvent } = useRelationshipEvents(spaceId);
  const [showHistoriaSheet, setShowHistoriaSheet] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('location-onboarding-seen') !== 'true';
  });

  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<Date | null>(null);

  // Bottom sheet
  const [sheetH, setSheetH] = useState(SNAP_DEFAULT);
  const [sheetDragging, setSheetDragging] = useState(false);
  const sheetDragRef = useRef<{ startY: number; startH: number } | null>(null);
  const SHEET_MAX = getSheetMax();

  // Marker callouts
  const [activeMarker, setActiveMarker] = useState<'me' | 'partner' | null>(null);

  const toggleRef = useRef(toggleSharing);
  toggleRef.current = toggleSharing;
  const mySharingRef = useRef(mySharing);
  mySharingRef.current = mySharing;

  // ── Derived ──
  const hasRealPos = (loc: { lat: number; lng: number } | null) =>
    !!loc && (loc.lat !== 0 || loc.lng !== 0);

  const isPaused = pauseUntil !== null;
  const myReal = mySharing && !isPaused && hasRealPos(myLocation);
  const partnerReal = partnerSharing && hasRealPos(partnerLocation);

  const distance =
    myReal && partnerReal && myLocation && partnerLocation
      ? haversineMeters(myLocation, partnerLocation)
      : null;

  const myInitial = (profile?.display_name ?? 'Eu').charAt(0).toUpperCase();
  const partnerInitial = (partner?.display_name ?? 'P').charAt(0).toUpperCase();

  const { places, detectPlace } = useFavoritePlaces();
  const { todayMoments } = useMeetingMoments(
    myLocation, partnerLocation, mySharing, partnerSharing,
  );

  const myName = profile?.display_name ?? 'O teu par';
  const { prefs: notifPrefs, updatePref } = useLocationNotifPrefs();
  const { partnerTodayEvents } = useLocationEvents(
    myLocation, partnerLocation, myName, notifPrefs,
  );

  const partnerPlaceName =
    partnerReal && partnerLocation
      ? detectPlace(partnerLocation.lat, partnerLocation.lng)
      : null;
  const partnerCtx = detectStatus(
    partnerLocation?.speed_kmh ?? null,
    partnerLocation?.address ?? null,
    partnerPlaceName,
  );

  const { partnerPath } = useLocationHistory(partnerLocation?.user_id ?? null);

  const todayRingColor = DAILY_RING_COLORS[dailyIndex(DAILY_RING_COLORS.length)];

  const myPlaceName = myReal && myLocation ? detectPlace(myLocation.lat, myLocation.lng) : null;

  const diary = useMemo<DiaryEntry[]>(() => {
    const entries: DiaryEntry[] = [
      ...todayMoments.map(m => ({
        kind: 'meeting' as const,
        id: m.id,
        time: new Date(m.met_at),
        placeName: m.place_name,
      })),
      ...partnerTodayEvents.map(e => ({
        kind: (e.event_type === 'enter' ? 'arrive' : 'leave') as 'arrive' | 'leave',
        id: e.id,
        time: new Date(e.occurred_at),
        placeName: e.place_name,
      })),
    ];
    return entries.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [todayMoments, partnerTodayEvents]);

  const contextualMsg = getContextualMsg(
    diary, partnerPlaceName, myPlaceName,
    partner?.display_name ?? 'O teu par',
  );

  // ── Linha de ligação do casal ──
  const lineData =
    myReal && partnerReal && myLocation && partnerLocation
      ? {
          type: 'FeatureCollection' as const,
          features: [{
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [myLocation.lng, myLocation.lat],
                [partnerLocation.lng, partnerLocation.lat],
              ],
            },
          }],
        }
      : null;

  // ── Smart camera (só re-ajusta quando muda número de marcadores) ──
  const prevCountRef = useRef(0);
  useEffect(() => {
    const count = (myReal ? 1 : 0) + (partnerReal ? 1 : 0);
    if (!mapLoaded || !mapRef.current || count === 0) return;
    if (count === prevCountRef.current) return;
    prevCountRef.current = count;

    const pad = { top: 80, right: 50, bottom: SNAP_DEFAULT + 50, left: 50 };

    if (myReal && partnerReal && myLocation && partnerLocation) {
      const d = haversineMeters(myLocation, partnerLocation);
      if (d < 150) {
        mapRef.current.flyTo({
          center: [(myLocation.lng + partnerLocation.lng) / 2, (myLocation.lat + partnerLocation.lat) / 2],
          zoom: 17, duration: 1400,
        });
      } else {
        mapRef.current.fitBounds(
          [
            [Math.min(myLocation.lng, partnerLocation.lng), Math.min(myLocation.lat, partnerLocation.lat)],
            [Math.max(myLocation.lng, partnerLocation.lng), Math.max(myLocation.lat, partnerLocation.lat)],
          ],
          { padding: pad, duration: 1500, maxZoom: 16 },
        );
      }
    } else if (myReal && myLocation) {
      mapRef.current.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 15, duration: 1200 });
    } else if (partnerReal && partnerLocation) {
      mapRef.current.flyTo({ center: [partnerLocation.lng, partnerLocation.lat], zoom: 15, duration: 1200 });
    }
  }, [mapLoaded, myReal, partnerReal]);

  // ── Pausa auto-resume ──
  useEffect(() => {
    if (!pauseUntil) return;
    const ms = pauseUntil.getTime() - Date.now();
    if (ms <= 0) { setPauseUntil(null); return; }
    const t = setTimeout(() => {
      setPauseUntil(null);
      if (!mySharingRef.current) toggleRef.current();
    }, ms);
    return () => clearTimeout(t);
  }, [pauseUntil]);

  // ── Handlers ──
  const handlePause = (opt: typeof PAUSE_OPTIONS[number]) => {
    if (mySharingRef.current) toggleRef.current();
    setPauseUntil(opt.getUntil());
    setShowPauseMenu(false);
  };

  const handleResume = () => {
    setPauseUntil(null);
    if (!mySharingRef.current) toggleRef.current();
  };

  // ── Bottom sheet drag ──
  function onDragStart(e: React.TouchEvent) {
    sheetDragRef.current = { startY: e.touches[0].clientY, startH: sheetH };
    setSheetDragging(true);
  }
  function onDragMove(e: React.TouchEvent) {
    if (!sheetDragRef.current) return;
    const sf = getSnapFull();
    const delta = sheetDragRef.current.startY - e.touches[0].clientY;
    setSheetH(Math.max(SNAP_PEEK, Math.min(sf, sheetDragRef.current.startH + delta)));
  }
  function onDragEnd() {
    setSheetDragging(false);
    if (!sheetDragRef.current) return;
    const sf = getSnapFull();
    const snaps = [SNAP_PEEK, SNAP_DEFAULT, sf];
    const nearest = snaps.reduce((a, b) => Math.abs(b - sheetH) < Math.abs(a - sheetH) ? b : a);
    setSheetH(nearest);
    sheetDragRef.current = null;
  }

  // ── Centrar câmara ──
  function centerCamera() {
    if (!mapLoaded || !mapRef.current) return;
    const pad = { top: 80, right: 50, bottom: sheetH + 50, left: 50 };
    if (myReal && partnerReal && myLocation && partnerLocation) {
      const d = haversineMeters(myLocation, partnerLocation);
      if (d < 150) {
        mapRef.current.flyTo({
          center: [(myLocation.lng + partnerLocation.lng) / 2, (myLocation.lat + partnerLocation.lat) / 2],
          zoom: 17, duration: 1200,
        });
      } else {
        mapRef.current.fitBounds(
          [
            [Math.min(myLocation.lng, partnerLocation.lng), Math.min(myLocation.lat, partnerLocation.lat)],
            [Math.max(myLocation.lng, partnerLocation.lng), Math.max(myLocation.lat, partnerLocation.lat)],
          ],
          { padding: pad, duration: 1200, maxZoom: 16 },
        );
      }
    } else if (myReal && myLocation) {
      mapRef.current.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 15, duration: 1200 });
    } else if (partnerReal && partnerLocation) {
      mapRef.current.flyTo({ center: [partnerLocation.lng, partnerLocation.lat], zoom: 15, duration: 1200 });
    }
  }

  const isFullSheet = sheetH >= getSnapFull() - 40;
  const isPeekSheet = sheetH <= SNAP_PEEK + 20;

  return (
    <div className="relative overflow-hidden bg-black" style={{ height: '100dvh' }}>

      {/* ── MAPA FULLSCREEN ── */}
      <div className="absolute inset-0">
        {!loading ? (
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAP_STYLE}
            initialViewState={{ longitude: -9.1399, latitude: 38.7169, zoom: 12 }}
            style={{ width: '100%', height: '100%' }}
            onLoad={() => setMapLoaded(true)}
            onClick={() => setActiveMarker(null)}
            attributionControl={false}
            reuseMaps
          >
            {/* Rota de hoje do parceiro */}
            {partnerPath.length >= 2 && (
              <Source
                id="partner-route-src"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: [{
                    type: 'Feature', properties: {},
                    geometry: { type: 'LineString', coordinates: partnerPath.map(p => [p.lng, p.lat]) },
                  }],
                }}
              >
                <Layer
                  id="partner-route"
                  type="line"
                  paint={{ 'line-color': '#9CA3AF', 'line-opacity': 0.35, 'line-width': 2 }}
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                />
              </Source>
            )}

            {/* Linha de ligação */}
            {lineData && (
              <Source id="couple-line-src" type="geojson" data={lineData}>
                <Layer
                  id="couple-line"
                  type="line"
                  paint={{ 'line-color': '#C4788C', 'line-opacity': 0.28, 'line-width': 2.5, 'line-dasharray': [4, 3] }}
                />
              </Source>
            )}

            {/* Locais favoritos */}
            {places.map(place => {
              const PlaceIc = PLACE_ICON_MAP[place.icon] ?? MapPin;
              return (
                <Marker key={place.id} longitude={place.lng} latitude={place.lat} anchor="bottom">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9,
                      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
                      border: '1.5px solid rgba(196,120,140,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                    }}>
                      <PlaceIc style={{ width: 13, height: 13, color: '#C4788C', strokeWidth: 1.5 }} />
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
                      borderRadius: 5, padding: '1px 5px', fontSize: 9, fontWeight: 700,
                      color: '#374151', whiteSpace: 'nowrap', maxWidth: 72,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    }}>
                      {place.name}
                    </div>
                  </div>
                </Marker>
              );
            })}

            {/* Marcador: eu */}
            {myReal && myLocation && (
              <Marker
                longitude={myLocation.lng}
                latitude={myLocation.lat}
                anchor="center"
                offset={distance !== null && distance < 150 && partnerReal ? [-28, 0] : [0, 0]}
              >
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveMarker(m => m === 'me' ? null : 'me'); }}
                >
                  {activeMarker === 'me' && (
                    <MarkerCallout
                      name={profile?.display_name ?? 'Eu'}
                      timeLabel="Agora"
                      contextLabel={myPlaceName ?? undefined}
                    />
                  )}
                  <AvatarMarker
                    initial={myInitial}
                    ring="#C4788C"
                    size={44}
                  />
                </div>
              </Marker>
            )}

            {/* Marcador: par */}
            {partnerReal && partnerLocation && (
              <Marker
                longitude={partnerLocation.lng}
                latitude={partnerLocation.lat}
                anchor="center"
                offset={distance !== null && distance < 150 && myReal ? [28, 0] : [0, 0]}
              >
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveMarker(m => m === 'partner' ? null : 'partner'); }}
                >
                  {activeMarker === 'partner' && (
                    <MarkerCallout
                      name={partner?.display_name ?? 'O teu par'}
                      timeLabel={shortTimeAgo(partnerLocation.updated_at)}
                      contextLabel={partnerCtx.label || undefined}
                      contextIcon={partnerCtx.Icon}
                    />
                  )}
                  <AvatarMarker
                    avatarUrl={partner?.avatar_url}
                    initial={partnerInitial}
                    ring={todayRingColor}
                    size={52}
                  />
                </div>
              </Marker>
            )}
          </Map>
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
      </div>

      {/* Degradê no topo para legibilidade dos botões */}
      <div
        className="absolute top-0 left-0 right-0 h-36 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, transparent 100%)' }}
      />

      {/* ── BOTÕES FLUTUANTES — TOPO ── */}
      <div
        className="absolute left-0 right-0 z-30 flex items-center gap-2 px-4"
        style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        {/* Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }}
        >
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.5} />
        </button>

        <div className="flex-1" />

        {/* Indicador de pausa */}
        {isPaused && (
          <button
            onClick={handleResume}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg active:scale-95 transition-transform"
            style={{ background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }}
          >
            <Pause className="w-3.5 h-3.5 text-white/70" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-white/70">Em pausa</span>
          </button>
        )}

        {/* Toggle de partilha */}
        <button
          onClick={() => {
            if (isPaused) handleResume();
            else if (mySharing) setShowPauseMenu(v => !v);
            else toggleSharing();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={
            mySharing && !isPaused
              ? { background: '#C4788C', border: '1px solid rgba(255,255,255,0.22)' }
              : { background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }
          }
        >
          {mySharing && !isPaused
            ? <MapPin className="w-4 h-4 text-white" strokeWidth={2} fill="currentColor" />
            : <MapPinOff className="w-4 h-4 text-white/75" strokeWidth={2} />
          }
        </button>
      </div>

      {/* Menu de pausa (flutuante) */}
      {showPauseMenu && mySharing && !isPaused && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowPauseMenu(false)} />
          <div
            className="absolute right-4 z-40 rounded-2xl shadow-2xl overflow-hidden w-48"
            style={{
              top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 52px)',
              background: 'rgba(12,12,12,0.90)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.11)',
            }}
          >
            {PAUSE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => handlePause(opt)}
                className={cn(
                  'w-full px-4 py-3.5 text-[13px] text-white/85 text-left hover:bg-white/10 active:bg-white/15 transition-colors',
                  i < PAUSE_OPTIONS.length - 1 && 'border-b border-white/[0.07]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Banner de permissão negada */}
      {permissionDenied && (
        <div
          className="absolute left-4 right-4 z-30 rounded-2xl px-4 py-3 shadow-lg"
          style={{
            top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 56px)',
            background: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(196,120,140,0.28)',
          }}
        >
          <p className="text-[12px] font-semibold text-rose-400">Acesso à localização bloqueado</p>
          {geoErrorMsg && (
            <p className="text-[10px] font-mono text-white/40 mt-0.5 break-all">{geoErrorMsg}</p>
          )}
          <button
            onClick={retryWatch}
            className="text-[11px] font-semibold text-rose-400 underline underline-offset-2 mt-1.5 active:opacity-60"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Botão centrar câmara */}
      <button
        onClick={centerCamera}
        className="absolute right-4 z-30 w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{
          bottom: sheetH + 16,
          background: 'rgba(0,0,0,0.44)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.14)',
          transition: sheetDragging ? 'none' : 'bottom 0.35s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <Navigation className="w-4 h-4 text-white/80" strokeWidth={1.5} />
      </button>

      {/* ── BOTTOM SHEET ── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20"
        style={{
          height: SHEET_MAX,
          transform: `translateY(${SHEET_MAX - sheetH}px)`,
          transition: sheetDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          borderRadius: '24px 24px 0 0',
          background: 'var(--background)',
          boxShadow: '0 -12px 56px rgba(0,0,0,0.22)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex flex-col items-center pt-3 pb-2 touch-none select-none cursor-grab active:cursor-grabbing"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Conteúdo */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{ height: SHEET_MAX - 36 }}
        >
          {/* Vista compacta (peek) */}
          {isPeekSheet && partnerSharing && partnerLocation && (
            <div className="px-4 flex items-center gap-3 h-12">
              <div
                className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                style={{ boxShadow: `0 0 0 2px ${todayRingColor}` }}
              >
                {partner?.avatar_url
                  ? <img src={partner.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center" style={{ background: todayRingColor }}>
                      <span className="text-white font-bold text-sm">{partnerInitial}</span>
                    </div>
                }
              </div>
              <p className="text-[13px] font-semibold text-foreground flex-1 truncate">
                {partner?.display_name}
              </p>
              {distance !== null && (
                <span className="text-[12px] font-semibold text-rose-500 shrink-0">
                  {emotionalDistance(distance)}
                </span>
              )}
            </div>
          )}

          {/* Conteúdo principal (DEFAULT + FULL) */}
          {!isPeekSheet && (
            <>
              {loading ? (
                <div className="px-4">
                  <div className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
                </div>
              ) : partnerSharing && partnerLocation ? (
                <>
                  {/* Card do parceiro */}
                  <div className="px-4 pb-1">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className="w-[58px] h-[58px] rounded-full overflow-hidden"
                          style={{ boxShadow: `0 0 0 2.5px white, 0 0 0 4.5px ${todayRingColor}` }}
                        >
                          {partner?.avatar_url
                            ? <img src={partner.avatar_url} className="w-full h-full object-cover" alt="" />
                            : <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ background: todayRingColor }}
                              >
                                <span className="text-white font-bold text-xl">{partnerInitial}</span>
                              </div>
                          }
                        </div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-bold text-foreground leading-tight">
                          {partner?.display_name ?? 'O teu par'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <partnerCtx.Icon className="w-3 h-3 text-rose-400 shrink-0" strokeWidth={1.5} />
                          <p className="text-[12px] text-muted-foreground truncate">
                            {partnerCtx.label || 'Localização ativa'}
                          </p>
                        </div>
                      </div>

                      {/* Bateria + rede + tempo */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <BatteryIcon
                          level={partnerLocation.battery_level ?? null}
                          charging={partnerLocation.is_charging ?? null}
                        />
                        <NetworkIcon type={partnerLocation.network_type ?? null} />
                        <span className="text-[10px] text-muted-foreground/50">
                          {shortTimeAgo(partnerLocation.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Faixa de distância */}
                  {distance !== null && (
                    <div className="mx-4 mt-3 px-4 py-2.5 rounded-2xl flex items-center justify-between bg-rose-50/80 dark:bg-rose-950/15 border border-rose-100/60 dark:border-rose-900/20">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" strokeWidth={2} />
                        <span className="text-[13px] font-semibold text-rose-500">{emotionalDistance(distance)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 tracking-wider">AO VIVO</span>
                      </div>
                    </div>
                  )}

                  {/* Momento Especial */}
                  {distance !== null && distance < 100 && (
                    <div className="mt-3">
                      <MomentoEspecial
                        onNavigate={navigate}
                        onHistoria={() => setShowHistoriaSheet(true)}
                      />
                    </div>
                  )}

                  {/* Mensagem contextual */}
                  {contextualMsg && !(distance !== null && distance < 100) && (
                    <div className="mx-4 mt-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100/60 dark:border-rose-900/30 px-4 py-3 flex items-center gap-3">
                      <contextualMsg.Icon className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-300">
                          {contextualMsg.headline}
                        </p>
                        <p className="text-[11px] text-rose-500/60 dark:text-rose-400/50 mt-0.5">
                          {contextualMsg.sub}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botão Histórico */}
                  <div className="px-4 mt-3">
                    <button
                      onClick={() => navigate('/localizacao/historico')}
                      className="w-full glass-card px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/25 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[13px] font-semibold text-foreground">Histórico de Presença</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {diary.length > 0
                            ? `${diary.length} ${diary.length === 1 ? 'evento' : 'eventos'} hoje`
                            : 'Encontros, chegadas e saídas'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              ) : (
                /* Par não partilha */
                <div className="px-4 py-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-muted-foreground font-bold text-xl">{partnerInitial}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">
                      {partner?.display_name ?? 'O teu par'}
                    </p>
                    <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                      Não está a partilhar localização
                    </p>
                  </div>
                </div>
              )}

              {/* ── Configurações (só no FULL) ── */}
              {isFullSheet && (
                <>
                  <div className="mx-4 my-4 h-px bg-border/30" />

                  <div className="px-4 pb-3 space-y-2">
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center',
                            mySharing && !isPaused ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-muted',
                          )}>
                            <Heart
                              className={cn('w-4 h-4', mySharing && !isPaused ? 'text-rose-400' : 'text-muted-foreground/40')}
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[13px] font-medium text-foreground">Partilhar a minha presença</p>
                            <p className="text-[11px] text-muted-foreground/60">
                              {isPaused
                                ? 'Presença em pausa'
                                : mySharing
                                ? 'O teu par sente que estás aqui'
                                : 'O teu par não te consegue sentir'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={mySharing && !isPaused}
                          onCheckedChange={() => { if (isPaused) handleResume(); else toggleSharing(); }}
                        />
                      </div>

                      {mySharing && !isPaused && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <button
                            onClick={() => setShowPauseMenu(v => !v)}
                            className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pause className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Pausar por...
                          </button>
                          {showPauseMenu && (
                            <div className="mt-2.5 grid grid-cols-2 gap-2">
                              {PAUSE_OPTIONS.map(opt => (
                                <button
                                  key={opt.label}
                                  onClick={() => handlePause(opt)}
                                  className="py-2.5 px-3 rounded-xl bg-muted/50 hover:bg-muted text-[12px] text-muted-foreground active:scale-95 transition-all text-left"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {isPaused && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <button
                            onClick={handleResume}
                            className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-[12px] font-semibold active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30"
                          >
                            Retomar presença
                          </button>
                        </div>
                      )}
                    </div>

                    {!partnerSharing && !loading && (
                      <p className="text-[11px] text-muted-foreground/50 text-center pt-0.5">
                        Quando o teu par ativar a presença, vais sentir onde está.
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

              {!isFullSheet && <div className="h-5" />}
            </>
          )}
        </div>
      </div>

      {/* ── Outros overlays ── */}
      <AddRelationshipEventSheet
        open={showHistoriaSheet}
        onOpenChange={setShowHistoriaSheet}
        coupleSpaceId={spaceId ?? ''}
        userId={user?.id ?? ''}
        editingEvent={null}
        onCreate={createEvent}
        onUpdate={async () => ({ error: null })}
        defaultTitle={
          todayMoments[0]?.place_name
            ? `Encontrámo-nos em ${todayMoments[0].place_name}`
            : 'Encontrámo-nos'
        }
        defaultDate={new Date().toISOString().split('T')[0]}
        onCreated={() => {
          setShowHistoriaSheet(false);
          navigate('/historia');
        }}
      />

      {showOnboarding && (
        <LocationOnboarding
          onClose={() => {
            localStorage.setItem('location-onboarding-seen', 'true');
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
