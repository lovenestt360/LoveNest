import { Heart, ShieldCheck } from "lucide-react";
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
    <header className="space-y-4 pt-2 text-center w-full">
      <div className="flex items-center justify-center gap-3 md:gap-8 px-2">
        {/* Me Avatar */}
        <div className="relative shrink-0">
          <Avatar 
            className={cn(
              "h-14 w-14 md:h-16 md:w-16 ring-4 ring-white/30 shadow-xl transition-all active:scale-95 duration-500 cursor-pointer",
              loading && "animate-pulse"
            )}
            onClick={() => navigate("/configuracoes")}
          >
            {me?.avatarUrl ? (
              <AvatarImage src={me.avatarUrl} alt="Eu" className="object-cover" />
            ) : null}
            <AvatarFallback className={cn(
              "bg-gradient-to-tr from-primary/20 to-primary/40 text-primary font-black text-lg",
              loading && "text-transparent"
            )}>
              {loading ? "" : (me?.displayName?.charAt(0)?.toUpperCase() ?? "L")}
            </AvatarFallback>
          </Avatar>
          {me?.verificationStatus === 'verified' && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm z-10">
              <ShieldCheck className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 md:gap-1.5 px-2 shrink-0 min-w-0">
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary fill-primary animate-pulse" />
            <span className="text-2xl md:text-3xl font-black tracking-tighter gradient-text">LoveNest</span>
            <Heart className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary fill-primary animate-pulse" />
          </div>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-muted-foreground/70 whitespace-nowrap">
            {today}
          </p>
        </div>

        {/* Partner Avatar */}
        <div className="relative shrink-0">
          <Avatar 
            className={cn(
              "h-14 w-14 md:h-16 md:w-16 ring-4 ring-white/30 shadow-xl transition-all active:scale-95 duration-500 cursor-pointer",
              loading && "animate-pulse"
            )}
            onClick={() => navigate("/configuracoes")}
          >
            {partner?.avatarUrl ? (
              <AvatarImage src={partner.avatarUrl} alt="Par" className="object-cover" />
            ) : null}
            <AvatarFallback className={cn(
              "bg-gradient-to-tr from-secondary/40 to-secondary/60 text-primary font-black text-lg",
              loading && "text-transparent"
            )}>
              {loading ? "" : (partner?.displayName?.charAt(0)?.toUpperCase() ?? "N")}
            </AvatarFallback>
          </Avatar>
          {partner?.verificationStatus === 'verified' && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm z-10">
              <ShieldCheck className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
