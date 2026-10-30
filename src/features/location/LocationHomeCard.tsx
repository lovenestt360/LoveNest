import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useTierAccess } from "@/hooks/useTierAccess";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

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
const SPARK = "M6 0C6.6 5.4 6.6 5.4 12 6 6.6 6.6 6.6 6.6 6 12 5.4 6.6 5.4 6.6 0 6 5.4 5.4 5.4 5.4 6 0Z";

/** Linhas de relevo leves, como um mapa topográfico abstrato (sem ruas nem posições reais). */
function Topo() {
  return (
    <svg viewBox="0 0 358 138" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeOpacity=".06" strokeWidth="1.2">
        <path d="M-20 30c60-22 110 10 170-6s100-30 230-8" />
        <path d="M-20 58c70-20 120 14 180-2s110-32 220-6" />
        <path d="M-20 88c60-14 130 18 190 2s120-26 210 0" />
        <path d="M-20 118c80-18 130 12 200 0s110-20 200 4" />
        <circle cx="300" cy="22" r="18" /><circle cx="300" cy="22" r="32" />
        <circle cx="52" cy="122" r="22" /><circle cx="52" cy="122" r="38" />
      </g>
    </svg>
  );
}

function Face({ initial, photo, tone, live, off }: { initial: string; photo?: string | null; tone: "par" | "me"; live?: boolean; off?: boolean }) {
  return (
    <span className={cn(
      "relative grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border-2 border-white text-[13px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(11,19,36,0.55)] dark:border-card",
      tone === "par" ? "bg-gradient-to-b from-[#7AA2FF] to-[#3B6FF5]" : "bg-gradient-to-b from-[#FF9DB5] to-[#E8456B]",
      off && "opacity-55 grayscale",
    )}>
      {live && <span className="absolute -inset-[3px] rounded-full border-2 border-[#3B6FF5] motion-safe:animate-ring-pulse" aria-hidden="true" />}
      {photo ? <img src={photo} alt="" className="h-full w-full rounded-full object-cover" /> : initial}
    </span>
  );
}

const Place = ({ children }: { children: string }) => (
  <span className="inline-flex h-[18px] max-w-[140px] items-center truncate rounded-full bg-white/85 px-2 text-[10px] font-semibold text-[#3A4150] shadow-[0_2px_8px_-4px_rgba(11,19,36,0.25)] backdrop-blur-sm dark:bg-card/85 dark:text-foreground/80">
    <span className="truncate">{children}</span>
  </span>
);

/**
 * "Onde estamos" na Home: uma cena desenhada (não um mapa) com os dois, a
 * distância entre eles e a zona de cada um. Juntos (a menos de 200 m) os dois
 * encostam-se; sem partilha a cena fica a cinzento com o convite para ativar.
 * Maqueta: docs/mockups/localizacao-proposta.html.
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

  let line: React.ReactNode;
  if (together) line = <><b className="font-semibold text-foreground">Estão juntos</b> agora</>;
  else if (distance !== null) line = <><b className="font-semibold text-foreground">{partnerName}</b> está a {fmtDistance(distance)} de ti</>;
  else if (partnerSharing) line = <><b className="font-semibold text-foreground">{partnerName}</b>{partnerZone ? ` em ${partnerZone}` : " está a partilhar"}</>;
  else line = <><b className="font-semibold text-foreground">{partnerName}</b> não está a partilhar</>;

  return (
    <button
      type="button"
      onClick={() => navigate("/localizacao")}
      className="w-full overflow-hidden rounded-[24px] border border-[#ECE8E3] bg-white text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] transition-transform active:scale-[0.99] dark:border-border dark:bg-card"
    >
      <div className={cn(
        "relative h-[76px] overflow-hidden text-[#0B1324] dark:text-foreground",
        !active ? "bg-gradient-to-br from-[#F4F2EF] to-[#F7F5F2] dark:from-muted dark:to-muted"
          : together ? "bg-gradient-to-br from-[#FFF0F4] via-[#FDF4FF] to-[#FFEFE8] dark:from-rose-950/30 dark:via-violet-950/20 dark:to-rose-950/20"
          : "bg-gradient-to-br from-[#EAF1FF] via-[#F7F3FF] to-[#FFEFF3] dark:from-sky-950/30 dark:via-violet-950/20 dark:to-rose-950/20",
      )} aria-hidden="true">
        <Topo />

        {together ? (
          <>
            {[["left-[31%] top-[22%]", "#F2A91F", 12, "0s"], ["left-[66%] top-[38%]", "#E8456B", 10, ".8s"], ["left-[36%] top-[70%]", "#8B6CF0", 9, "1.4s"]].map(([pos, fill, s, delay]) => (
              <svg key={pos as string} className={cn("absolute motion-safe:animate-pulse", pos as string)} style={{ animationDelay: delay as string }} width={s as number} height={s as number} viewBox="0 0 12 12">
                <path d={SPARK} fill={fill as string} />
              </svg>
            ))}
            <div className="absolute left-1/2 top-[14px] flex -translate-x-1/2 flex-col items-center gap-1">
              <div className="relative flex">
                <svg className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 motion-safe:animate-pulse" width="16" height="16" viewBox="0 0 24 24">
                  <path d={HEART} fill="#E8456B" stroke="#fff" strokeWidth="2" />
                </svg>
                <Face initial={partnerInitial} photo={partner?.avatar_url} tone="par" />
                <span className="-ml-2.5"><Face initial={myInitial} tone="me" /></span>
              </div>
              {(myZone || partnerZone) && <Place>{(myZone || partnerZone)!}</Place>}
            </div>
          </>
        ) : (
          <>
            <svg viewBox="0 0 358 76" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <path d="M88 31 Q 179 -7 270 31" fill="none" stroke="currentColor" strokeOpacity={active ? 0.35 : 0.18} strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
            </svg>
            <span className={cn("absolute left-1/2 top-[10px] inline-flex h-[22px] -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 text-[11.5px] font-bold shadow-[0_6px_16px_-8px_rgba(11,19,36,0.45)] dark:bg-card",
              !active && "text-muted-foreground")}>
              {active && distance !== null ? (
                <>
                  <svg className="motion-safe:animate-pulse" width="11" height="11" viewBox="0 0 24 24"><path d={HEART} fill="#E8456B" /></svg>
                  {fmtDistance(distance)}
                </>
              ) : active ? (
                <svg width="13" height="13" viewBox="0 0 24 24"><path d={HEART} fill="#E8456B" /></svg>
              ) : "?"}
            </span>
            <div className="absolute left-[24.5%] top-[14px] flex -translate-x-1/2 flex-col items-center gap-[3px]">
              <Face initial={partnerInitial} photo={partner?.avatar_url} tone="par" live={active && partnerSharing} off={!active} />
              {partnerZone && <Place>{partnerZone}</Place>}
            </div>
            <div className="absolute left-[75.5%] top-[14px] flex -translate-x-1/2 flex-col items-center gap-[3px]">
              <Face initial={myInitial} tone="me" off={!active} />
              {myZone && <Place>{myZone}</Place>}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 px-3.5 pb-2.5 pt-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">
            Onde estamos
            {active && (
              <span className="inline-flex h-[18px] items-center gap-1.5 rounded-full bg-[#EEF8F1] px-1.5 text-[10px] font-bold text-[#23733F] dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#23A15A] shadow-[0_0_0_3px_rgba(35,161,90,0.18)]" />Ao vivo
              </span>
            )}
          </p>
          {active ? (
            <>
              <p className="truncate text-[12px] text-[#3A4150] dark:text-foreground/80">{line}</p>
              <p className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                {updatedAt && `Atualizado ${timeAgo(updatedAt)}`}
                {battery != null && (
                  <span className="inline-flex items-center gap-1">
                    {updatedAt && "·"}
                    <svg width="18" height="10" viewBox="0 0 22 12" aria-hidden="true">
                      <rect x=".75" y=".75" width="18" height="10.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <rect x="20" y="4" width="1.6" height="4" rx=".8" fill="currentColor" />
                      <rect x="2.5" y="2.5" width={Math.max(1.5, 14.5 * Math.min(1, battery / 100))} height="7" rx="1.6" fill={battery <= 20 ? "#E8456B" : "#23A15A"} />
                    </svg>
                    {Math.round(battery)}%
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-[13px] leading-snug text-[#3A4150] dark:text-foreground/80">
              {allowed ? "Saibam onde está o outro e quando estão juntos." : "Partilha de localização entre os dois."}
            </p>
          )}
        </div>
        {active ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F4F1EC] text-foreground dark:bg-muted">
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        ) : (
          <span className="inline-flex h-7 shrink-0 items-center rounded-[10px] bg-[#0B1324] px-3 text-[12px] font-semibold text-white dark:bg-foreground dark:text-background">
            Ativar
          </span>
        )}
      </div>
    </button>
  );
}
