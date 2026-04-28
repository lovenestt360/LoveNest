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
            "h-11 w-11 ring-2 ring-white shadow-sm",
            loading && "animate-pulse"
          )}>
            {me?.avatarUrl && <AvatarImage src={me.avatarUrl} alt="Eu" className="object-cover" />}
            <AvatarFallback className="bg-[#f5f5f5] text-[#171717] font-semibold text-sm">
              {loading ? "" : (me?.displayName?.charAt(0)?.toUpperCase() ?? "U")}
            </AvatarFallback>
          </Avatar>
          {me?.verificationStatus === "verified" && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-px shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          )}
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center">
          <span className="text-[22px] font-bold tracking-tight text-foreground">LoveNest</span>
          <span className="text-[11px] text-[#717171] capitalize">{today}</span>
        </div>

        {/* Partner avatar */}
        <button
          onClick={() => navigate("/configuracoes")}
          className="relative active:opacity-70 transition-opacity"
        >
          <Avatar className={cn(
            "h-11 w-11 ring-2 ring-white shadow-sm",
            loading && "animate-pulse"
          )}>
            {partner?.avatarUrl && <AvatarImage src={partner.avatarUrl} alt="Par" className="object-cover" />}
            <AvatarFallback className="bg-[#f5f5f5] text-[#171717] font-semibold text-sm">
              {loading ? "" : (partner?.displayName?.charAt(0)?.toUpperCase() ?? "P")}
            </AvatarFallback>
          </Avatar>
          {partner?.verificationStatus === "verified" && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-px shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          )}
        </button>

      </div>
    </header>
  );
}
