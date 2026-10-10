import { ShieldCheck, Settings } from "lucide-react";
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
}

export function HomeHeader({ me, partner, today, loading }: HomeHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="w-full pt-2 pb-1">
      <div className="flex items-center justify-between">

        {/* Me avatar */}
        <button
          onClick={() => navigate("/configuracoes")}
          className="relative active:opacity-70 transition-opacity"
        >
          <Avatar className={cn(
            "h-12 w-12 ring-2 ring-card shadow-[0_4px_14px_rgba(15,23,42,0.12)]",
            loading && "animate-pulse"
          )}>
            {me?.avatarUrl && <AvatarImage src={me.avatarUrl} alt="Eu" className="object-cover" />}
            <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
              {loading ? "" : (me?.displayName?.charAt(0)?.toUpperCase() ?? "U")}
            </AvatarFallback>
          </Avatar>
          {me?.verificationStatus === "verified" && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-px shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          )}
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center">
          <span className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">LoveNest</span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{today}</span>
        </div>

        {/* Partner avatar — espaço reservado para manter a marca centrada;
            escondido (mas o espaço fica) em modo solo, sem parceiro */}
        {(loading || partner) ? (
          <button
            onClick={() => navigate("/configuracoes")}
            className="relative active:opacity-70 transition-opacity"
          >
            <Avatar className={cn(
              "h-12 w-12 ring-2 ring-card shadow-[0_4px_14px_rgba(15,23,42,0.12)]",
              loading && "animate-pulse"
            )}>
              {partner?.avatarUrl && <AvatarImage src={partner.avatarUrl} alt="Par" className="object-cover" />}
              <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                {loading ? "" : (partner?.displayName?.charAt(0)?.toUpperCase() ?? "P")}
              </AvatarFallback>
            </Avatar>
            {partner?.verificationStatus === "verified" && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-px shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            )}
          </button>
        ) : (
          <div className="h-12 w-12" aria-hidden="true" />
        )}

      </div>
    </header>
  );
}
