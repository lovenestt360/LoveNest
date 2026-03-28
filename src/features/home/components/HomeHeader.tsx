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
    <header className="space-y-6 pt-4 text-center w-full px-4 mb-4">
      <div className="flex items-center justify-between w-full">
        {/* Me Avatar */}
        <div className="relative shrink-0">
          <Avatar 
            className={cn(
              "h-16 w-16 ring-4 ring-white shadow-apple transition-all active:scale-95 duration-500 cursor-pointer border border-slate-50",
              loading && "animate-pulse"
            )}
            onClick={() => navigate("/configuracoes")}
          >
            {me?.avatarUrl && <AvatarImage src={me.avatarUrl} alt="Eu" className="object-cover" />}
            <AvatarFallback className={cn(
              "bg-slate-100 text-slate-400 font-black text-xl",
              loading && "text-transparent"
            )}>
              {loading ? "" : (me?.displayName?.charAt(0)?.toUpperCase() ?? "U")}
            </AvatarFallback>
          </Avatar>
          {me?.verificationStatus === 'verified' && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm z-10">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0 px-2 min-w-0">
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">LoveNest</span>
            <Heart className="h-4 w-4 text-primary fill-primary" />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] leading-tight">
            Ninho do Amor ✨
          </p>
        </div>

        {/* Partner Avatar */}
        <div className="relative shrink-0">
          <Avatar 
            className={cn(
              "h-16 w-16 ring-4 ring-white shadow-apple transition-all active:scale-95 duration-500 cursor-pointer border border-slate-50",
              loading && "animate-pulse"
            )}
            onClick={() => navigate("/configuracoes")}
          >
            {partner?.avatarUrl && <AvatarImage src={partner.avatarUrl} alt="Par" className="object-cover" />}
            <AvatarFallback className={cn(
              "bg-slate-100 text-slate-400 font-black text-xl",
              loading && "text-transparent"
            )}>
              {loading ? "" : (partner?.displayName?.charAt(0)?.toUpperCase() ?? "P")}
            </AvatarFallback>
          </Avatar>
          {partner?.verificationStatus === 'verified' && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm z-10">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="px-5 py-2.5 rounded-full bg-slate-50 border border-slate-100/50">
           <p className="text-[11px] font-bold text-slate-500 italic">
            {today} ✨
           </p>
        </div>
      </div>
    </header>
  );
}
