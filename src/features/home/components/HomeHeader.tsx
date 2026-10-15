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
}

/**
 * Cabeçalho da Home: tu à esquerda (rosa), o par à direita (azul).
 * O anel mostra a presença de hoje.
 */
export function HomeHeader({ me, partner, today, loading, meHere = false, partnerHere = false }: HomeHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="w-full pt-0.5">
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-1">
        <PresenceAvatar
          user={me}
          loading={loading}
          here={meHere}
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
  tone,
  fallback,
  label,
  className,
  onClick,
}: {
  user: UserInfo | null;
  loading?: boolean;
  here: boolean;
  tone: "rose" | "blue";
  fallback: string;
  label: string;
  className?: string;
  onClick: () => void;
}) {
  const ring = tone === "rose" ? "border-rose-500" : "border-[#4D7CFE]";
  const fill =
    tone === "rose"
      ? "bg-gradient-to-br from-[#F27A97] to-[#D9466B]"
      : "bg-gradient-to-br from-[#7D9DFF] to-[#3F68E6]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}, ${here ? "já apareceu hoje" : "ainda não apareceu hoje"}`}
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
          here ? "bg-emerald-600" : "bg-[#D5D1CB]",
        )}
      />
      {user?.verificationStatus === "verified" && (
        <span className="absolute -left-0.5 -top-0.5 rounded-full bg-white p-px dark:bg-background">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
        </span>
      )}
    </button>
  );
}
