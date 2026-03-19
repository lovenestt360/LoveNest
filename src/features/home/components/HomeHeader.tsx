import { Heart } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HomeHeaderProps {
  me: { avatarUrl?: string | null; displayName?: string | null } | null;
  partner: { avatarUrl?: string | null; displayName?: string | null } | null;
  today: string;
}

export function HomeHeader({ me, partner, today }: HomeHeaderProps) {
  return (
    <header className="space-y-4 pt-2 text-center">
      <div className="flex items-center justify-center gap-6">
        <div className="relative">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-white/30 shadow-2xl transition-transform active:scale-95 duration-500">
            {me?.avatarUrl ? (
              <AvatarImage src={me.avatarUrl} alt="Eu" className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-primary/20 to-primary/40 text-primary font-black text-lg">
              {me?.displayName?.charAt(0)?.toUpperCase() ?? "L"}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-4">
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-primary fill-primary animate-pulse" />
            <span className="text-3xl font-black tracking-tighter gradient-text">LoveNest</span>
            <Heart className="h-4 w-4 text-primary fill-primary animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 whitespace-nowrap">
            {today}
          </p>
        </div>

        <div className="relative">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-white/30 shadow-2xl transition-transform active:scale-95 duration-500">
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
