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

type LocationRow = { user_id: string; address: string | null; sharing_enabled: boolean; updated_at: string };

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
      .select("user_id,address,sharing_enabled,updated_at")
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
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt });
  } catch {
    return "";
  }
}

/**
 * "Onde estamos" na Home, sempre com o mesmo cartão de mapa. Com partilha ativa
 * mostra as moradas; sem ela convida a ativar e leva a /localizacao.
 * O mapa é ilustrativo (as posições reais vivem em /localizacao); o texto
 * mostra a morada conhecida de cada um e quando foi atualizada.
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

  // Sem partilha (ou sem acesso no plano) o cartão mantém o mesmo aspeto e
  // continua a ser a entrada para /localizacao, onde se ativa a partilha.
  const active = allowed && (mySharing || partnerSharing);

  const parts: string[] = [];
  if (!active) parts.push(allowed ? "Ativem a partilha para se verem no mapa" : "Partilha de localização entre os dois");
  else {
    if (partnerSharing && partnerLocation?.address) parts.push(`${partnerName} em ${partnerLocation.address}`);
    else if (partnerSharing) parts.push(`${partnerName} está a partilhar`);
    else parts.push(`${partnerName} não está a partilhar`);
    if (mySharing && myLocation?.address) parts.push(`tu em ${myLocation.address}`);
  }

  const updatedAt = partnerSharing ? partnerLocation?.updated_at : myLocation?.updated_at;

  return (
    <button
      type="button"
      onClick={() => navigate("/localizacao")}
      className="w-full overflow-hidden rounded-[24px] border border-[#ECE8E3] bg-white text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] transition-transform active:scale-[0.99] dark:border-border dark:bg-card"
    >
      <div className="relative h-[92px] bg-[#EEEAE4] dark:bg-muted" aria-hidden="true">
        <svg viewBox="0 0 358 92" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <path d="M250 0c-10 28 20 48 108 60V0z" fill="#DCE6EF" />
          <g stroke="#FFFFFF" strokeWidth="6" fill="none" strokeLinecap="round">
            <path d="M-10 66c80-9 150 4 230-14s110-28 150-25" />
            <path d="M60 100c10-36 0-64 30-108" />
            <path d="M180 100c-6-28 10-50 0-108" />
          </g>
          <g stroke="#E4DED6" strokeWidth="2" fill="none">
            <path d="M0 28h358M0 82h358M120 0v92M300 0v92" />
          </g>
          <path d="M92 68C150 50 200 40 262 30" stroke="#0B1324" strokeWidth="1.6" strokeDasharray="4 5" fill="none" opacity=".55" />
        </svg>
        <span className="absolute left-[19%] top-[52%] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-rose-500 text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(11,19,36,0.5)]">
          {myInitial}
        </span>
        <span className="absolute left-[71%] top-[14%] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-[#4D7CFE] text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(11,19,36,0.5)]">
          {partnerInitial}
        </span>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">Onde estamos</p>
          <p className="truncate text-[12.5px] text-muted-foreground">{parts.join(" · ")}</p>
          {active ? (
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
              <span className="h-[7px] w-[7px] rounded-full bg-emerald-600" />
              Partilha ativa{updatedAt ? ` · ${timeAgo(updatedAt)}` : ""}
            </span>
          ) : (
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
              <span className="h-[7px] w-[7px] rounded-full bg-[#D5D1CB]" />
              Partilha desligada
            </span>
          )}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1EEEA] text-foreground dark:bg-muted">
          <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>
    </button>
  );
}
