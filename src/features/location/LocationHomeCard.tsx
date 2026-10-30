import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useTierAccess } from "@/hooks/useTierAccess";
import { useProfile } from "@/hooks/useProfile";

type LocationRow = {
  user_id: string; address: string | null; sharing_enabled: boolean; updated_at: string;
  lat: number | null; lng: number | null; battery_level: number | null;
};

/**
 * Leitura simples das últimas posições, só para a Home. Ao contrário de
 * useLocationSharing, não liga o GPS nem abre um canal realtime — a Home fica
 * sempre montada e não deve seguir a localização em segundo plano.
 */
function useLocationSnapshot() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [rows, setRows] = useState<LocationRow[] | null>(null);

  const load = useCallback(async () => {
    if (!spaceId || !user?.id) return;
    const { data } = await (supabase as any)
      .from("member_locations")
      .select("user_id,address,sharing_enabled,updated_at,lat,lng,battery_level")
      .eq("couple_space_id", spaceId);
    setRows((data as LocationRow[]) ?? []);
  }, [spaceId, user?.id]);

  useEffect(() => {
    load();
    window.addEventListener("home-visible", load);
    return () => window.removeEventListener("home-visible", load);
  }, [load]);

  const mine = rows?.find((r) => r.user_id === user?.id) ?? null;
  const partner = rows?.find((r) => r.user_id !== user?.id) ?? null;
  return {
    loading: rows === null,
    myLocation: mine,
    partnerLocation: partner,
    mySharing: mine?.sharing_enabled ?? false,
    partnerSharing: partner?.sharing_enabled ?? false,
  };
}

function timeAgo(iso: string): string {
  try {
    // "há 1 hora" em vez de "há aproximadamente 1 hora": cabe numa linha.
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt }).replace(/(aproximadamente|cerca de|quase|mais de) /, "");
  } catch {
    return "";
  }
}

/** Distância em metros entre dois pontos (fórmula de haversine). */
function metersBetween(a: LocationRow, b: LocationRow) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat! - a.lat!) * rad, dLng = (b.lng! - a.lng!) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat! * rad) * Math.cos(b.lat! * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", ",")} km`);
/** Só a zona: a primeira parte da morada ("Polana", "Av. Salvador Allende"). */
const zoneOf = (address: string | null) => address?.split(",")[0]?.trim() || null;
const TOGETHER_M = 200;

const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";

// ── Mapa desenhado (não é um mapa real: ruas, parque e mar só para dar o ar) ──

const MAP = 100;
const road = (d: string, w: number) => (
  <>
    <path d={d} fill="none" stroke="#E6E0D8" strokeWidth={w + 2} strokeLinecap="round" />
    <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={w} strokeLinecap="round" />
  </>
);

type Tone = "par" | "me" | "off";
const TONE: Record<Tone, [string, string]> = { par: ["#7AA2FF", "#3B6FF5"], me: ["#FF9DB5", "#E8456B"], off: ["#C9CDD4", "#A3A8B0"] };

/** Pin de mapa com a inicial (ou a foto) de cada um. */
function Pin({ x, y, tone, initial, photo, id }: { x: number; y: number; tone: Tone; initial: string; photo?: string | null; id: string }) {
  const [a, b] = TONE[tone];
  return (
    <g transform={`translate(${x} ${y}) scale(.82)`}>
      <ellipse cx="0" cy="1" rx="6" ry="2" fill="#0B1324" opacity=".14" />
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        <clipPath id={`${id}-c`}><circle cx="0" cy="-24" r="11.5" /></clipPath>
      </defs>
      <path d="M0 0C-4-7-15-13-15-24a15 15 0 0 1 30 0C15-13 4-7 0 0Z" fill={`url(#${id}-g)`} stroke="#fff" strokeWidth="2.5" />
      {photo ? (
        <image href={photo} x="-11.5" y="-35.5" width="23" height="23" clipPath={`url(#${id}-c)`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <text x="0" y="-19.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">{initial}</text>
      )}
    </g>
  );
}

function MiniMap({ state, partnerInitial, partnerPhoto, myInitial }: {
  state: "longe" | "juntos" | "off"; partnerInitial: string; partnerPhoto?: string | null; myInitial: string;
}) {
  const w = MAP, h = MAP;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <g style={state === "off" ? { filter: "grayscale(1)", opacity: 0.75 } : undefined}>
        <rect width={w} height={h} fill="#F4F1EC" />
        <path d={`M${w * 0.62} ${h}C${w * 0.72} ${h * 0.72} ${w * 0.86} ${h * 0.78} ${w} ${h * 0.52}L${w} ${h}Z`} fill="#DDEBF6" />
        <rect x={w * 0.08} y={h * 0.58} width={w * 0.22} height={h * 0.3} rx="7" fill="#E4EEDC" />
        <circle cx={w * 0.8} cy={h * 0.18} r={h * 0.14} fill="#E4EEDC" />
        {road(`M-10 ${h * 0.38}C${w * 0.3} ${h * 0.32} ${w * 0.6} ${h * 0.5} ${w + 10} ${h * 0.36}`, 4.5)}
        {road(`M${w * 0.36} -10L${w * 0.46} ${h + 10}`, 3.5)}
        {road(`M${w * 0.7} -10C${w * 0.66} ${h * 0.4} ${w * 0.74} ${h * 0.6} ${w * 0.6} ${h + 10}`, 2.5)}
        {road(`M-10 ${h * 0.78}L${w * 0.55} ${h * 0.7}`, 2.5)}
        {road(`M${w * 0.14} -10L${w * 0.2} ${h * 0.5}`, 2)}
      </g>
      {state === "off" ? (
        <>
          <circle cx={w / 2} cy={h / 2} r="13" fill="#fff" stroke="#ECE8E3" />
          <text x={w / 2} y={h / 2 + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#7C828D">?</text>
        </>
      ) : state === "juntos" ? (
        <>
          <circle cx={w / 2} cy={h * 0.8} r="20" fill="#E8456B" opacity=".08" />
          <Pin x={w / 2 - 8} y={h * 0.8} tone="par" initial={partnerInitial} photo={partnerPhoto} id="lhc-par" />
          <Pin x={w / 2 + 8} y={h * 0.8} tone="me" initial={myInitial} id="lhc-me" />
          <path transform={`translate(${w / 2 - 7} ${h * 0.8 - 50}) scale(.58)`} d={HEART} fill="#E8456B" stroke="#fff" strokeWidth="3" />
        </>
      ) : (
        <>
          <path d={`M${w * 0.3} ${h * 0.52}Q${w * 0.52} ${h * 0.38} ${w * 0.74} ${h * 0.86}`} fill="none" stroke="#0B1324" strokeOpacity=".38" strokeWidth="1.8" strokeDasharray="1 4.5" strokeLinecap="round" />
          <Pin x={w * 0.3} y={h * 0.52} tone="par" initial={partnerInitial} photo={partnerPhoto} id="lhc-par" />
          <Pin x={w * 0.74} y={h * 0.86} tone="me" initial={myInitial} id="lhc-me" />
        </>
      )}
    </svg>
  );
}

const PinIcon = () => (
  <svg width="9" height="11" viewBox="0 0 10 12" className="shrink-0" aria-hidden="true">
    <path d="M5 12S0 7.4 0 4.6a5 5 0 0 1 10 0C10 7.4 5 12 5 12Zm0-5.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" fill="currentColor" />
  </svg>
);
const ClockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" className="shrink-0 text-muted-foreground" aria-hidden="true">
    <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 3.4V6l1.8 1.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const Battery = ({ level }: { level: number }) => (
  <svg width="16" height="9" viewBox="0 0 22 12" className="shrink-0 text-muted-foreground" aria-hidden="true">
    <rect x=".75" y=".75" width="18" height="10.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="20" y="4" width="1.6" height="4" rx=".8" fill="currentColor" />
    <rect x="2.5" y="2.5" width={Math.max(1.5, 14.5 * Math.min(1, level / 100))} height="7" rx="1.6" fill={level <= 20 ? "#E8456B" : "#23A15A"} />
  </svg>
);
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full bg-[#F4F1EC] px-[7px] text-[10.5px] font-semibold text-[#3A4150] dark:bg-muted dark:text-foreground/80">
    {children}
  </span>
);

/**
 * "Onde estamos" na Home: um mapa desenhado (não real) com os dois pins e, ao
 * lado, a distância, quem e onde, e há quanto tempo. Juntos (a menos de 200 m)
 * os pins encostam-se; sem partilha o mapa fica a cinzento com o convite para ativar.
 * Maqueta: https://claude.ai/artifact/LGJz4JFec34xyrgUU5KyY4
 */
export function LocationHomeCard() {
  const navigate = useNavigate();
  const { allowed, loading: tierLoading } = useTierAccess("location_sharing");
  const { myLocation, partnerLocation, partnerSharing, mySharing, loading } = useLocationSnapshot();
  const { partner } = usePartnerProfile();
  const { profile } = useProfile();

  if (tierLoading || loading) return null;

  const partnerName = partner?.display_name ?? "O teu par";
  const myInitial = (profile?.display_name ?? "Eu").charAt(0).toUpperCase();
  const partnerInitial = partnerName.charAt(0).toUpperCase();

  // Sem partilha (ou sem acesso no plano) o cartão continua a ser a entrada
  // para /localizacao, onde se ativa a partilha.
  const active = allowed && (mySharing || partnerSharing);
  const both = active && partnerSharing && mySharing && partnerLocation?.lat != null && myLocation?.lat != null;
  const distance = both ? metersBetween(partnerLocation!, myLocation!) : null;
  const together = distance !== null && distance < TOGETHER_M;
  const partnerZone = partnerSharing ? zoneOf(partnerLocation?.address ?? null) : null;
  const myZone = mySharing ? zoneOf(myLocation?.address ?? null) : null;
  const updatedAt = partnerSharing ? partnerLocation?.updated_at : myLocation?.updated_at;
  const battery = partnerSharing ? partnerLocation?.battery_level : null;

  // O que fica em grande, quem e onde.
  let big: React.ReactNode, who: string, where: string | null;
  if (together) {
    big = "Juntos"; who = `Tu e ${partnerName}`; where = myZone || partnerZone;
  } else if (distance !== null) {
    const [num, unit] = fmtDistance(distance).split(" ");
    big = <>{num}<small className="ml-0.5 text-[11.5px] font-semibold tracking-normal text-muted-foreground">{unit} de ti</small></>;
    who = partnerName; where = partnerZone;
  } else if (partnerSharing) {
    big = "Ao vivo"; who = partnerName; where = partnerZone;
  } else {
    big = "Só tu"; who = `${partnerName} não está a partilhar`; where = myZone;
  }

  return (
    <button
      type="button"
      onClick={() => navigate("/localizacao")}
      className="flex h-[118px] w-full gap-3 overflow-hidden rounded-[24px] border border-[#ECE8E3] bg-white p-2 text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] transition-transform active:scale-[0.99] dark:border-border dark:bg-card"
    >
      <div className="relative w-[100px] shrink-0 overflow-hidden rounded-[16px] shadow-[inset_0_0_0_1px_rgba(11,19,36,0.05)]">
        <MiniMap state={!active ? "off" : together ? "juntos" : "longe"} partnerInitial={partnerInitial} partnerPhoto={partner?.avatar_url} myInitial={myInitial} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 pr-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#3A4150] dark:text-foreground/80">Onde estamos</span>
          {active && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#23733F] dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#23A15A] shadow-[0_0_0_3px_rgba(35,161,90,0.16)]" />Ao vivo
            </span>
          )}
        </div>

        {active ? (
          <>
            <p className="text-[22px] font-extrabold leading-none tracking-[-0.035em] text-foreground">{big}</p>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-foreground">{who}</p>
              {where && (
                <p className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground"><PinIcon /><span className="truncate">{where}</span></p>
              )}
            </div>
            <div className="flex gap-1.5">
              {updatedAt && <Chip><ClockIcon />{timeAgo(updatedAt)}</Chip>}
              {battery != null && <Chip><Battery level={battery} />{Math.round(battery)}%</Chip>}
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground">Partilha desligada</p>
              <p className="text-[11.5px] leading-snug text-muted-foreground">
                {allowed ? "Saibam onde está o outro e quando estão juntos." : "Partilha de localização entre os dois."}
              </p>
            </div>
            <span className="inline-flex h-7 w-fit items-center rounded-[10px] bg-[#0B1324] px-3 text-[12px] font-semibold text-white dark:bg-foreground dark:text-background">
              Ativar
            </span>
          </>
        )}
      </div>
    </button>
  );
}
