import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { pt } from "date-fns/locale";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useTierAccess } from "@/hooks/useTierAccess";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: pt });
  } catch {
    return "";
  }
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDistance(km: number): { value: string; unit: string } {
  if (km < 1) return { value: String(Math.max(10, Math.round((km * 1000) / 10) * 10)), unit: "m" };
  if (km < 10) return { value: km.toFixed(1).replace(".", ","), unit: "km" };
  return { value: Math.round(km).toLocaleString("pt-PT"), unit: "km" };
}

export function LocationHomeCard() {
  const navigate = useNavigate();
  const { allowed, loading: tierLoading } = useTierAccess("location_sharing");
  const { myLocation, partnerLocation, partnerSharing, mySharing, loading } = useLocationSharing();
  const { partner } = usePartnerProfile();

  if (tierLoading || !allowed) return null;

  const partnerName = partner?.display_name?.split(" ")[0] ?? "O teu par";
  const partnerInitial = partnerName.charAt(0).toUpperCase();
  const live = partnerSharing && !!partnerLocation;
  const distance =
    live && myLocation && mySharing ? formatDistance(distanceKm(myLocation, partnerLocation!)) : null;
  const battery = live ? partnerLocation!.battery_level : null;
  const batteryBars = battery !== null ? Math.ceil(battery / 20) : 0;
  const place = partnerLocation?.address?.split(",").pop()?.trim() || partnerLocation?.address;

  return (
    <button
      type="button"
      onClick={() => navigate("/localizacao")}
      className="w-full overflow-hidden rounded-[1.4rem] bg-card text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_8px_22px_-14px_rgba(11,19,36,0.14)] active:scale-[0.99] transition-transform ln-card"
    >
      <div className="flex items-stretch gap-3 p-3 pl-3.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Onde estamos</p>
            <span
              className={cn(
                "flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.14em]",
                live ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
              {live ? "Ativo" : "Pausado"}
            </span>
          </div>

          {loading ? (
            <div className="mt-2 h-6 w-20 animate-pulse rounded-lg bg-muted" />
          ) : distance ? (
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-[26px] font-light leading-none tracking-[-0.04em] tabular-nums text-foreground">
                {distance.value}
              </span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{distance.unit}</span>
            </div>
          ) : (
            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-foreground">
              {live ? place ?? partnerName : `${partnerName} não está a partilhar`}
            </p>
          )}
          <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            {distance ? `entre vocês · ${place ?? partnerName}` : live ? "Toca para ver no mapa" : "Pede-lhe para ativar a partilha"}
          </p>
        </div>

        {/* Mini-mapa — grelha pontilhada com o par no centro */}
        <div
          className="relative w-[84px] shrink-0 overflow-hidden rounded-xl bg-muted/70"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.22) 1px, transparent 1px)",
            backgroundSize: "9px 9px",
          }}
          aria-hidden="true"
        >
          <svg className="absolute inset-0 h-full w-full text-border" viewBox="0 0 112 96" preserveAspectRatio="none">
            <path d="M-4 70 C 30 58, 46 82, 116 40" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <path d="M38 -4 C 44 30, 70 50, 64 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {live && <span className="absolute h-9 w-9 animate-ping rounded-full bg-[#4D7CFE]/25" />}
            <span
              className={cn(
                "relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-card text-[11px] font-bold shadow-md",
                live ? "bg-gradient-to-br from-[#7D9DFF] to-[#3F68E6] text-white" : "bg-muted-foreground/30 text-background",
              )}
            >
              {partner?.avatar_url ? (
                <img src={partner.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                partnerInitial
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-center divide-x divide-border/70 border-t border-border/70">
        <div className="px-3.5 py-1.5">
          <p className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-muted-foreground/70">Atualizado</p>
          <p className="truncate font-mono text-[10px] text-foreground">
            {live ? timeAgo(partnerLocation!.updated_at) : "—"}
          </p>
        </div>
        <div className="px-3 py-1.5">
          <p className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-muted-foreground/70">Bateria</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div className="flex gap-[3px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 w-[3px] rounded-[1px]",
                    i < batteryBars ? (batteryBars <= 1 ? "bg-rose-500" : "bg-foreground") : "bg-muted",
                  )}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] tabular-nums text-foreground">
              {battery !== null ? `${battery}%` : "—"}
            </span>
          </div>
        </div>
        <div className="px-3">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
      </div>
    </button>
  );
}
