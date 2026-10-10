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
  /** Presença de hoje — anel contínuo + ponto verde quando já apareceu */
  mePresent?: boolean;
  partnerPresent?: boolean;
}

// Tu em rosa, o par em azul — as mesmas cores na presença da Chama e no mapa.
const TONES = {
  me: { ring: "text-rose-400", fill: "bg-gradient-to-br from-[#F27A97] to-[#D9466B]" },
  partner: { ring: "text-[#4D7CFE]", fill: "bg-gradient-to-br from-[#7D9DFF] to-[#3F68E6]" },
} as const;

function CoupleAvatar({
  user,
  tone,
  present,
  loading,
  fallback,
  onClick,
}: {
  user: UserInfo | null;
  tone: keyof typeof TONES;
  present: boolean;
  loading?: boolean;
  fallback: string;
  onClick: () => void;
}) {
  const t = TONES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${user?.displayName ?? fallback}${present ? ", já apareceu hoje" : ", ainda não apareceu hoje"}`}
      className={cn("relative h-12 w-12 active:opacity-70 transition-opacity", t.ring)}
    >
      <span
        className={cn(
          "absolute -inset-[4px] rounded-full border-2 border-current transition-opacity",
          present ? "opacity-100" : "border-dashed opacity-50",
        )}
      />
      <Avatar className={cn("h-12 w-12", loading && "animate-pulse")}>
        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" className="object-cover" />}
        <AvatarFallback className={cn("text-[17px] font-semibold text-white", loading ? "bg-muted" : t.fill)}>
          {loading ? "" : (user?.displayName?.charAt(0)?.toUpperCase() ?? fallback)}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-background transition-colors",
          present ? "bg-emerald-500" : "bg-muted-foreground/30",
        )}
      />
      {user?.verificationStatus === "verified" && (
        <span className="absolute -left-1 -top-1 rounded-full bg-background p-px">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        </span>
      )}
    </button>
  );
}

export function HomeHeader({ me, partner, today, loading, mePresent = false, partnerPresent = false }: HomeHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="w-full pt-2">
      <div className="grid grid-cols-[52px_1fr_52px] items-center px-0.5">
        <CoupleAvatar
          user={me}
          tone="me"
          present={mePresent}
          loading={loading}
          fallback="U"
          onClick={() => navigate("/configuracoes")}
        />

        <div className="text-center">
          <span className="block text-[21px] font-semibold leading-tight tracking-[-0.025em] text-foreground">LoveNest</span>
          <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{today}</span>
        </div>

        {/* Espaço reservado para manter a marca centrada em modo solo */}
        {loading || partner ? (
          <div className="justify-self-end">
            <CoupleAvatar
              user={partner}
              tone="partner"
              present={partnerPresent}
              loading={loading}
              fallback="P"
              onClick={() => navigate("/configuracoes")}
            />
          </div>
        ) : (
          <div className="h-12 w-12" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
