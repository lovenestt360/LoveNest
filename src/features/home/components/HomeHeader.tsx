import { Heart } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HomeHeaderProps {
  me: { avatarUrl?: string | null; displayName?: string | null } | null;
  partner: { avatarUrl?: string | null; displayName?: string | null } | null;
  today: string;
}

export function HomeHeader({ me, partner, today }: HomeHeaderProps) {
  return (
    <header className="space-y-4 pt-2 text-center w-full">
      <div className="flex items-center justify-center gap-3 md:gap-8 px-2">
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-4 ring-white/30 shadow-xl transition-all active:scale-95 duration-500">
            {me?.avatarUrl ? (
              <AvatarImage src={me.avatarUrl} alt="Eu" className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-primary/20 to-primary/40 text-primary font-black text-lg">
              {me?.displayName?.charAt(0)?.toUpperCase() ?? "L"}
            </AvatarFallback>
          </Avatar>
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

        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-4 ring-white/30 shadow-xl transition-all active:scale-95 duration-500">
            {partner?.avatarUrl ? (
              <AvatarImage src={partner.avatarUrl} alt="Par" className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-secondary/40 to-secondary/60 text-primary font-black text-lg">
              {partner?.displayName?.charAt(0)?.toUpperCase() ?? "N"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
