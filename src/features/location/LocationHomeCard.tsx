import { useNavigate } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useTierAccess } from "@/hooks/useTierAccess";

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt });
  } catch {
    return "";
  }
}

export function LocationHomeCard() {
  const navigate = useNavigate();
  const { allowed, loading: tierLoading } = useTierAccess("location_sharing");
  const { partnerLocation, partnerSharing, mySharing, loading } = useLocationSharing();
  const { partner } = usePartnerProfile();

  // Não mostra nada se não tiver acesso premium
  if (tierLoading || !allowed) return null;

  const partnerName = partner?.display_name ?? "O teu par";
  const partnerInitial = partnerName.charAt(0).toUpperCase();

  return (
    <button
      onClick={() => navigate("/localizacao")}
      className="glass-card glass-card-hover w-full text-left p-4 flex items-center gap-3 active:scale-[0.98] transition-all"
    >
      {/* Ícone */}
      <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
        <MapPin className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/65 mb-0.5">
          Onde Estamos
        </p>

        {loading ? (
          <div className="h-3.5 w-32 bg-muted/60 rounded animate-pulse" />
        ) : partnerSharing && partnerLocation ? (
          <div className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-rose-400 shrink-0" strokeWidth={2} />
            <p className="text-[13px] font-semibold text-foreground truncate">
              {partnerLocation.address
                ? partnerLocation.address
                : partnerName
              }
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground/60">
            {partnerName} não está a partilhar
          </p>
        )}

        {partnerSharing && partnerLocation && (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {timeAgo(partnerLocation.updated_at)}
          </p>
        )}
      </div>

      {/* Avatar do par + indicador ao vivo */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ background: partnerSharing ? "#C4788C" : "#D1D5DB" }}
        >
          {partnerInitial}
        </div>
        {(mySharing || partnerSharing) && (
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-semibold text-emerald-500">Ativo</span>
          </div>
        )}
      </div>
    </button>
  );
}
