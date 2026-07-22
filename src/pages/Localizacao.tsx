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
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
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

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt });
  } catch {
    return '';
  }
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

// Map of place icon keys to Lucide components
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
  if (placeName) {
    const Icon = PLACE_ICON_MAP[Object.keys(PLACE_ICON_MAP)[0]] ?? MapPin; // fallback
    return { Icon: MapPin, label: placeName };
  }
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
  const label = isWifi ? 'Wi-Fi' : type.toUpperCase();
  const Icon = isWifi ? Wifi : Signal;
  return (
    <div className="flex items-center gap-1">
      <Icon className="w-3 h-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
      <span className="text-[10px] text-muted-foreground/50">{label}</span>
    </div>
  );
}

// ── Daily variety system ──────────────────────────────────────────────────────

const DAILY_TAGLINES = [
  'A pensar em ti.',
  'A sorrir por ti.',
  'Mais perto do que parece.',
  'O coração nunca se esquece.',
  'Sempre presente, mesmo longe.',
  'A cada momento, lembro-me de ti.',
  'O amor não conhece distâncias.',
  'Ligados pelo coração.',
  'Juntos, de alguma forma.',
  'O dia fica melhor ao teu lado.',
  'Com saudade tua.',
  'Perto no coração.',
  'Sempre na memória.',
  'A distância é apenas um número.',
];

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

// ── Diary entry type (shared between component and helpers) ───────────────────

type DiaryEntry =
  | { kind: 'meeting'; id: string; time: Date; placeName: string | null }
  | { kind: 'arrive'; id: string; time: Date; placeName: string }
  | { kind: 'leave'; id: string; time: Date; placeName: string };

// ── Contextual messages — special situations ──────────────────────────────────

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

// ── PresenceHero — círculo emocional de abertura ─────────────────────────────

function PresenceHero({
  partnerName,
  partnerAvatarUrl,
  partnerInitial,
  state,
  tagline,
  ringColor,
  stateFlash,
}: {
  partnerName: string;
  partnerAvatarUrl?: string | null;
  partnerInitial: string;
  state: string;
  tagline: string;
  ringColor: string;
  stateFlash: boolean;
}) {
  return (
    <div className="mx-4 mt-3 mb-2 rounded-3xl border border-rose-100/50 dark:border-rose-900/25 bg-gradient-to-b from-rose-50/70 to-transparent dark:from-rose-950/15 dark:to-transparent px-4 py-5 flex flex-col items-center text-center">
      <p className="text-[9px] font-bold text-rose-400/60 uppercase tracking-[0.18em] mb-3">
        Presença Atual
      </p>

      <div className="relative mb-4">
        {/* Soft glow — intensifica quando estado muda */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-700"
          style={{
            background: ringColor,
            filter: 'blur(14px)',
            transform: 'scale(1.35)',
            opacity: stateFlash ? 0.45 : 0.12,
          }}
        />
        {/* Avatar */}
        <div
          className="relative w-20 h-20 rounded-full overflow-hidden"
          style={{ boxShadow: `0 0 0 2.5px white, 0 0 0 4.5px ${ringColor}` }}
        >
          {partnerAvatarUrl ? (
            <img src={partnerAvatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#6B7280' }}>
              <span className="text-white font-bold text-2xl">{partnerInitial}</span>
            </div>
          )}
        </div>
        {/* Coração badge */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-card border-2 border-background flex items-center justify-center shadow-sm">
          <Heart className="w-3 h-3 text-rose-400" strokeWidth={2} fill="currentColor" />
        </div>
      </div>

      <p className="text-[18px] font-semibold text-foreground leading-tight">{partnerName}</p>
      {state && (
        <p className={`text-[13px] mt-1 transition-colors duration-500 ${stateFlash ? 'text-rose-400' : 'text-muted-foreground'}`}>
          {state}
        </p>
      )}
      <p className="text-[12px] text-rose-500/50 dark:text-rose-400/40 mt-2.5 italic leading-relaxed">
        {tagline}
      </p>
    </div>
  );
}

// ── MomentoEspecial — quando estão juntos (<100m) ────────────────────────────

function MomentoEspecial({
  onNavigate,
  onHistoria,
}: {
  onNavigate: (path: string) => void;
  onHistoria: () => void;
}) {
  return (
    <div className="mx-4 mb-3 rounded-2xl bg-rose-50/90 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-4 py-4">
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

// ── Avatar marker (used inside Mapbox Marker) ─────────────────────────────────

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
        boxShadow: `0 0 0 2.5px ${ring}, 0 6px 24px rgba(0,0,0,0.22)`,
        overflow: 'hidden',
        background: avatarUrl ? 'transparent' : ring,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt=""
        />
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

// ── Page ──────────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

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

  // Onboarding: mostrar na primeira visita
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('location-onboarding-seen') !== 'true';
  });
  const [tab, setTab] = useState<'presenca' | 'config'>('presenca');

  const handleOnboardingClose = () => {
    localStorage.setItem('location-onboarding-seen', 'true');
    setShowOnboarding(false);
  };

  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<Date | null>(null);
  // Stale-safe refs for callbacks
  const toggleRef = useRef(toggleSharing);
  toggleRef.current = toggleSharing;
  const mySharingRef = useRef(mySharing);
  mySharingRef.current = mySharing;

  // ── Derived state ──
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

  // Locais favoritos + encontros
  const { places, detectPlace } = useFavoritePlaces();
  const { todayMoments } = useMeetingMoments(
    myLocation, partnerLocation, mySharing, partnerSharing,
  );

  // Etapa 12 + 14: notificações inteligentes e timeline de atividade
  const myName = profile?.display_name ?? 'O teu par';
  const { prefs: notifPrefs, updatePref } = useLocationNotifPrefs();
  const { partnerTodayEvents } = useLocationEvents(
    myLocation, partnerLocation, myName, notifPrefs,
  );

  // Contexto do par: verificar primeiro se está num local favorito
  const partnerPlaceName =
    partnerReal && partnerLocation
      ? detectPlace(partnerLocation.lat, partnerLocation.lng)
      : null;
  const partnerCtx = detectStatus(
    partnerLocation?.speed_kmh ?? null,
    partnerLocation?.address ?? null,
    partnerPlaceName,
  );

  // Rota de hoje do parceiro
  const { partnerPath } = useLocationHistory(partnerLocation?.user_id ?? null);

  // Daily variety
  const todayTagline  = DAILY_TAGLINES[dailyIndex(DAILY_TAGLINES.length)];
  const todayRingColor = DAILY_RING_COLORS[dailyIndex(DAILY_RING_COLORS.length)];

  // My own place detection (for "both at home" logic)
  const myPlaceName = myReal && myLocation ? detectPlace(myLocation.lat, myLocation.lng) : null;

  // Partner state change flash animation
  const [stateFlash, setStateFlash] = useState(false);
  const prevPartnerStateRef = useRef('');
  useEffect(() => {
    const label = partnerCtx.label;
    if (!label) return;
    if (label !== prevPartnerStateRef.current) {
      if (prevPartnerStateRef.current) {
        setStateFlash(true);
        const t = setTimeout(() => setStateFlash(false), 700);
        return () => clearTimeout(t);
      }
      prevPartnerStateRef.current = label;
    }
  }, [partnerCtx.label]);

  // Unified diary: meetings + activity events in one chronological list
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

  // Contextual message (Boa noite, segurança)
  const contextualMsg = getContextualMsg(
    diary,
    partnerPlaceName,
    myPlaceName,
    partner?.display_name ?? 'O teu par',
  );

  // ── Smart camera — only re-fits when visible marker count changes ──
  const prevCountRef = useRef(0);
  useEffect(() => {
    const count = (myReal ? 1 : 0) + (partnerReal ? 1 : 0);
    if (!mapLoaded || !mapRef.current || count === 0) return;
    if (count === prevCountRef.current) return;
    prevCountRef.current = count;

    if (myReal && partnerReal && myLocation && partnerLocation) {
      const d = haversineMeters(myLocation, partnerLocation);
      if (d < 150) {
        // Very close — fly to midpoint at street level
        mapRef.current.flyTo({
          center: [
            (myLocation.lng + partnerLocation.lng) / 2,
            (myLocation.lat + partnerLocation.lat) / 2,
          ],
          zoom: 17,
          duration: 1400,
        });
      } else {
        mapRef.current.fitBounds(
          [
            [Math.min(myLocation.lng, partnerLocation.lng), Math.min(myLocation.lat, partnerLocation.lat)],
            [Math.max(myLocation.lng, partnerLocation.lng), Math.max(myLocation.lat, partnerLocation.lat)],
          ],
          { padding: 80, duration: 1500, maxZoom: 16 },
        );
      }
    } else if (myReal && myLocation) {
      mapRef.current.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 14, duration: 1200 });
    } else if (partnerReal && partnerLocation) {
      mapRef.current.flyTo({
        center: [partnerLocation.lng, partnerLocation.lat],
        zoom: 14,
        duration: 1200,
      });
    }
  }, [mapLoaded, myReal, partnerReal, myLocation, partnerLocation]);

  // ── Pause auto-resume ──
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
  const handlePause = (opt: (typeof PAUSE_OPTIONS)[number]) => {
    if (mySharingRef.current) toggleRef.current();
    setPauseUntil(opt.getUntil());
    setShowPauseMenu(false);
  };

  const handleResume = () => {
    setPauseUntil(null);
    if (!mySharingRef.current) toggleRef.current();
  };

  // ── Connecting line GeoJSON ──
  const lineData =
    myReal && partnerReal && myLocation && partnerLocation
      ? {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'LineString' as const,
                coordinates: [
                  [myLocation.lng, myLocation.lat],
                  [partnerLocation.lng, partnerLocation.lat],
                ],
              },
            },
          ],
        }
      : null;

  const mapStyle = 'mapbox://styles/mapbox/satellite-streets-v12';

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
        </button>

        <h1 className="text-base font-semibold text-foreground">Presença</h1>

        <button
          onClick={toggleSharing}
          className={`h-9 w-9 flex items-center justify-center rounded-full transition-all active:scale-95 ${
            mySharing && !isPaused
              ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-500'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {mySharing && !isPaused ? (
            <MapPin className="w-4 h-4" strokeWidth={2} />
          ) : (
            <MapPinOff className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-border/20 bg-background">
        {(['presenca', 'config'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 text-[12px] font-semibold transition-all relative',
              tab === t ? 'text-foreground' : 'text-muted-foreground/50',
            )}
          >
            {t === 'presenca' ? 'Presença' : 'Configurações'}
            {tab === t && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-rose-400" />
            )}
          </button>
        ))}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Aba: Presença ── */}
        {tab === 'presenca' && (
          <>
            {/* Permission denied */}
            {permissionDenied && (
              <div className="mx-4 mt-3 rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 space-y-2">
                <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                  Acesso à localização bloqueado
                </p>
                <p className="text-[11px] text-rose-500/70 dark:text-rose-400/60 leading-relaxed">
                  Em{' '}
                  <span className="font-mono font-medium">chrome://settings/content/location</span>{' '}
                  remove este site dos bloqueados.
                </p>
                {geoErrorMsg && (
                  <p className="text-[10px] font-mono text-rose-400/50 break-all">{geoErrorMsg}</p>
                )}
                <button
                  onClick={retryWatch}
                  className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 underline underline-offset-2 active:opacity-60"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* ── Presence Hero ── */}
            {loading ? (
              <div className="mx-4 mt-3 mb-2 rounded-3xl bg-muted/30 animate-pulse" style={{ height: 196 }} />
            ) : partnerSharing && partnerLocation ? (
              <PresenceHero
                partnerName={partner?.display_name ?? 'O teu par'}
                partnerAvatarUrl={partner?.avatar_url}
                partnerInitial={partnerInitial}
                state={partnerCtx.label}
                tagline={todayTagline}
                ringColor={todayRingColor}
                stateFlash={stateFlash}
              />
            ) : !loading ? (
              <div className="mx-4 mt-3 mb-2 rounded-3xl border border-border/30 glass-card p-4 flex items-center gap-4 opacity-70">
                <div className="w-14 h-14 rounded-full bg-muted shrink-0 flex items-center justify-center">
                  <span className="text-muted-foreground font-bold text-xl">{partnerInitial}</span>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{partner?.display_name ?? 'O teu par'}</p>
                  <p className="text-[12px] text-muted-foreground/60 mt-0.5">Não está presente de momento</p>
                </div>
              </div>
            ) : null}

            {/* ── Info strip (distância · tempo · bateria · rede) ── */}
            {partnerSharing && partnerLocation && (
              <div className="mx-4 mb-3">
                <div className="glass-card px-4 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Heart className="w-3 h-3 text-rose-300 shrink-0" strokeWidth={2} fill="currentColor" />
                      <span className="text-[12px] font-medium text-rose-400 whitespace-nowrap">
                        {distance !== null ? emotionalDistance(distance) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-semibold text-emerald-500 tracking-wider">AO VIVO</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="w-3 h-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                      <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                        {shortTimeAgo(partnerLocation.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <BatteryIcon level={partnerLocation.battery_level ?? null} charging={partnerLocation.is_charging ?? null} />
                      <NetworkIcon type={partnerLocation.network_type ?? null} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Momento Especial — estão juntos ── */}
            {distance !== null && distance < 100 && (
              <MomentoEspecial
                onNavigate={navigate}
                onHistoria={() => setShowHistoriaSheet(true)}
              />
            )}

            {/* ── Mensagem contextual (Boa noite / segurança) ── */}
            {contextualMsg && !(distance !== null && distance < 100) && (
              <div className="mx-4 mb-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100/60 dark:border-rose-900/30 px-4 py-3 flex items-center gap-3">
                <contextualMsg.Icon className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-300">{contextualMsg.headline}</p>
                  <p className="text-[11px] text-rose-500/60 dark:text-rose-400/50 mt-0.5">{contextualMsg.sub}</p>
                </div>
              </div>
            )}

            {/* ── Mapa ── */}
            <div
              className="mx-4 mt-1 rounded-3xl overflow-hidden shadow-md border border-border/20 relative"
              style={{ height: 'clamp(200px, 42vh, 340px)' }}
            >
              {!loading && (
                <Map
                  ref={mapRef}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  mapStyle={mapStyle}
                  initialViewState={{ longitude: -9.1399, latitude: 38.7169, zoom: 12 }}
                  style={{ width: '100%', height: '100%' }}
                  onLoad={() => setMapLoaded(true)}
                  attributionControl={false}
                  reuseMaps
                >
                  {partnerPath.length >= 2 && (
                    <Source
                      id="partner-route-src"
                      type="geojson"
                      data={{
                        type: 'FeatureCollection',
                        features: [{
                          type: 'Feature',
                          properties: {},
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

                  {lineData && (
                    <Source id="couple-line-src" type="geojson" data={lineData}>
                      <Layer
                        id="couple-line"
                        type="line"
                        paint={{ 'line-color': '#C4788C', 'line-opacity': 0.28, 'line-width': 2.5, 'line-dasharray': [4, 3] }}
                      />
                    </Source>
                  )}

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

                  {myReal && myLocation && (
                    <Marker
                      longitude={myLocation.lng}
                      latitude={myLocation.lat}
                      anchor="center"
                      offset={distance !== null && distance < 150 && partnerReal ? [-28, 0] : [0, 0]}
                    >
                      <AvatarMarker initial={myInitial} ring="#C4788C" size={44} />
                    </Marker>
                  )}

                  {partnerReal && partnerLocation && (
                    <Marker
                      longitude={partnerLocation.lng}
                      latitude={partnerLocation.lat}
                      anchor="center"
                      offset={distance !== null && distance < 150 && myReal ? [28, 0] : [0, 0]}
                    >
                      <AvatarMarker avatarUrl={partner?.avatar_url} initial={partnerInitial} ring="#6B7280" size={52} />
                    </Marker>
                  )}
                </Map>
              )}

              {loading && <div className="absolute inset-0 bg-muted/30 animate-pulse" />}

              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {myReal && !isPaused && (
                  <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-border/30">
                    <Heart className="w-2.5 h-2.5 text-rose-400 animate-pulse" strokeWidth={2} fill="currentColor" />
                    <span className="text-[10px] font-semibold text-rose-500">Presente</span>
                  </div>
                )}
                {isPaused && (
                  <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-border/30">
                    <Pause className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={2} />
                    <span className="text-[10px] font-semibold text-muted-foreground">Em pausa</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Histórico ── */}
            <div className="px-4 pt-3 pb-4">
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

            <div className="h-4" />
          </>
        )}

        {/* ── Aba: Configurações ── */}
        {tab === 'config' && (
          <>
            {/* ── Partilha de presença ── */}
            <div className="px-4 pt-4 pb-3 space-y-2">
              <div className="glass-card p-4 space-y-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mySharing && !isPaused ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-muted'}`}>
                      <Heart className={`w-4 h-4 ${mySharing && !isPaused ? 'text-rose-400' : 'text-muted-foreground/40'}`} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-medium text-foreground">Partilhar a minha presença</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {isPaused ? 'Presença em pausa' : mySharing ? 'O teu par sente que estás aqui' : 'O teu par não te consegue sentir'}
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

            {/* ── Locais Favoritos ── */}
            <FavoritePlacesSection
              myLat={myReal && myLocation ? myLocation.lat : null}
              myLng={myReal && myLocation ? myLocation.lng : null}
            />

            {/* ── Notificações inteligentes ── */}
            <LocationNotifSettings prefs={notifPrefs} onUpdate={updatePref} />

            <div className="h-6" />
          </>
        )}
      </div>

      {/* ── Nossa História sheet — aberto pelo Momento Especial ── */}
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

      {/* ── Onboarding (primeira visita) ── */}
      {showOnboarding && <LocationOnboarding onClose={handleOnboardingClose} />}
    </div>
  );
}
