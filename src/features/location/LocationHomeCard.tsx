import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDGET, MonoLabel, WidgetFoot } from "@/components/Widget";
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
 * "Onde estamos" na Home. Aparece sempre no modo casal: com partilha ativa
 * mostra onde cada um está; sem ela, convida a ativar (é a entrada para /localizacao).
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
  const active = allowed && (mySharing || partnerSharing);
  const updatedAt = partnerSharing ? partnerLocation?.updated_at : myLocation?.updated_at;

  return (
    <button
      type="button"
      onClick={() => navigate("/localizacao")}
      className={cn(WIDGET, "w-full text-left transition-transform active:scale-[0.99]")}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <MonoLabel>Onde estamos</MonoLabel>
        {active ? (
          <MonoLabel className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="h-[6px] w-[6px] rounded-full bg-emerald-500" />
            {updatedAt ? timeAgo(updatedAt) : "Ativa"}
          </MonoLabel>
        ) : (
          <MonoLabel className="text-[#B4B1AB]">Desligada</MonoLabel>
        )}
      </div>

      <div className="relative mx-4 mt-3 h-[96px] overflow-hidden rounded-[18px] bg-[#F1F0ED] dark:bg-muted" aria-hidden="true">
        <svg viewBox="0 0 326 96" preserveAspectRatio="xMidYMid slice" className={cn("absolute inset-0 h-full w-full", !active && "opacity-60")}>
          <defs>
            <linearGradient id="ln-route" x1="0" x2="1">
              <stop offset="0" stopColor="#1C1F24" stopOpacity="0" />
              <stop offset=".35" stopColor="#1C1F24" />
            </linearGradient>
          </defs>
          <path d="M226 0c-10 30 20 50 100 62V0z" fill="#E4E9EE" />
          <g stroke="#FFFFFF" strokeWidth="7" fill="none" strokeLinecap="round">
            <path d="M-10 70c80-9 150 4 230-14s100-28 120-25" />
            <path d="M58 104c10-36 0-64 30-110" />
            <path d="M170 104c-6-28 10-50 0-110" />
          </g>
          <g stroke="#E6E4E0" strokeWidth="1.5" fill="none">
            <path d="M0 30h326M0 86h326M118 0v96M282 0v96" />
          </g>
          {active && (
            <path d="M40 74C100 70 150 52 232 34" stroke="url(#ln-route)" strokeWidth="5" strokeLinecap="round" fill="none" />
          )}
        </svg>
        {active ? (
          <>
            <span className="absolute left-[16%] top-[58%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-rose-500 text-[12px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(11,19,36,0.55)]">
              {myInitial}
            </span>
            <span className="absolute left-[72%] top-[34%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-[#4D7CFE] text-[12px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(11,19,36,0.55)]">
              {partnerInitial}
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0B1324] shadow-[0_8px_18px_-10px_rgba(11,19,36,0.5)] dark:bg-card dark:text-foreground">
              <MapPin className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
          </span>
        )}
      </div>

      {active ? (
        <WidgetFoot>
          <div className="min-w-0 px-5 py-3.5">
            <MonoLabel className="block truncate">{partnerName}</MonoLabel>
            <p className="mt-1.5 truncate text-[14px] font-medium text-foreground">
              {partnerSharing ? partnerLocation?.address ?? "A partilhar" : "Não está a partilhar"}
            </p>
          </div>
          <div className="min-w-0 border-l border-black/[0.06] px-5 py-3.5 dark:border-border">
            <MonoLabel className="block">Tu</MonoLabel>
            <p className="mt-1.5 truncate text-[14px] font-medium text-foreground">
              {mySharing ? myLocation?.address ?? "A partilhar" : "Não estás a partilhar"}
            </p>
          </div>
        </WidgetFoot>
      ) : (
        <div className="mt-3 flex items-center gap-3 border-t border-black/[0.06] bg-[#FAFAF8] px-5 py-3.5 dark:border-border dark:bg-muted/20">
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">
              {allowed ? "Ativem a partilha de localização" : "Partilha de localização"}
            </span>
            <span className="block text-[12.5px] text-muted-foreground">
              {allowed ? "Para se verem no mapa e saberem quando chegam." : "Vejam onde cada um está, com privacidade."}
            </span>
          </span>
          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" strokeWidth={2} />
        </div>
      )}
    </button>
  );
}
