import { ShieldCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserInfo {
  avatarUrl?: string | null;
  displayName?: string | null;
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
}

interface HomeHeaderProps {
  me: UserInfo | null;
  partner: UserInfo | null;
  today: string;
  loading?: boolean;
  /** Presença de hoje: anel contínuo quando a pessoa já apareceu, tracejado quando não. */
  meHere?: boolean;
  partnerHere?: boolean;
  /** Online agora: com a app aberta neste momento (ponto verde). */
  meOnline?: boolean;
  partnerOnline?: boolean;
}

/**
 * Cabeçalho da Home: tu à esquerda (rosa), o par à direita (azul).
 * O anel mostra a presença de hoje; o ponto verde, quem está online agora.
 */
export function HomeHeader({ me, partner, today, loading, meHere = false, partnerHere = false, meOnline = false, partnerOnline = false }: HomeHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="w-full pt-0.5">
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-1">
        <PresenceAvatar
          user={me}
          loading={loading}
          here={meHere}
          online={meOnline}
          tone="rose"
          fallback="U"
          label="Eu"
          onClick={() => navigate("/configuracoes")}
        />

        <div className="flex flex-col items-center">
          <span className="text-[18px] font-semibold leading-tight tracking-[-0.025em] text-foreground">LoveNest</span>
          <span className="mt-0.5 text-[11.5px] text-muted-foreground">{today}</span>
        </div>

        {/* Espaço reservado para manter a marca centrada no modo solo, sem par. */}
        {loading || partner ? (
          <PresenceAvatar
            user={partner}
            loading={loading}
            here={partnerHere}
            online={partnerOnline}
            tone="blue"
            fallback="P"
            label="Par"
            className="justify-self-end"
            onClick={() => navigate("/configuracoes")}
          />
        ) : (
          <div className="h-[38px] w-[38px] justify-self-end" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}

function PresenceAvatar({
  user,
  loading,
  here,
  online,
  tone,
  fallback,
  label,
  className,
  onClick,
}: {
  user: UserInfo | null;
  loading?: boolean;
  here: boolean;
  online: boolean;
  tone: "rose" | "blue";
  fallback: string;
  label: string;
  className?: string;
  onClick: () => void;
}) {
  // Anel suave: quem é quem sem gritar (cheio = já apareceu hoje).
  const ring = tone === "rose" ? "border-[#F3B5C4]" : "border-[#B5C8FF]";
  const fill =
    tone === "rose"
      ? "bg-gradient-to-br from-[#F27A97] to-[#D9466B]"
      : "bg-gradient-to-br from-[#7D9DFF] to-[#3F68E6]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}, ${online ? "online agora" : "offline"}, ${here ? "já apareceu hoje" : "ainda não apareceu hoje"}`}
      className={cn("relative h-[38px] w-[38px] transition-opacity active:opacity-70", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute -inset-[3px] rounded-full border-2",
          ring,
          here ? "border-solid" : "border-dashed opacity-50",
        )}
      />
      <Avatar className={cn("h-[38px] w-[38px]", loading && "animate-pulse")}>
        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={label} className="object-cover" />}
        <AvatarFallback className={cn("text-[14px] font-semibold text-white", fill)}>
          {loading ? "" : (user?.displayName?.charAt(0)?.toUpperCase() ?? fallback)}
        </AvatarFallback>
      </Avatar>
      <span
        aria-hidden="true"
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-[11px] w-[11px] rounded-full border-2 border-white dark:border-background",
          online ? "bg-emerald-500" : "bg-[#D5D1CB]",
        )}
      />
      {online && (
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-[11px] w-[11px] animate-ping rounded-full bg-emerald-400 opacity-40 motion-reduce:hidden" style={{ animationDuration: "2.4s" }} />
      )}
      {user?.verificationStatus === "verified" && (
        <span className="absolute -left-0.5 -top-0.5 rounded-full bg-white p-px dark:bg-background">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
        </span>
      )}
    </button>
  );
}
