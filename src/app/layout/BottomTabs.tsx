import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Flower2, Home, Library, MessageCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { useProfile } from "@/hooks/useProfile";

type Tab = {
  to: string;
  label: string;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
  badge?: number;
};

const startsWithAny = (pathname: string, paths: string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(path + "/"));

// Ecrãs que antes viviam em "Nós" e "Vida" e agora abrem a partir da Home.
const HOME_DESTINATIONS = [
  "/humor",
  "/nos",
  "/vida",
  "/momentos",
  "/memorias",
  "/historia",
  "/desafios",
  "/conflitos",
  "/capsula",
  "/wrapped",
  "/jornada",
  "/plano",
  "/rotina",
  "/jornada-espiritual",
  "/oracao",
  "/jejum",
  "/localizacao",
];

/**
 * Barra inferior flutuante: Hoje · Chat · Biblioteca · Ciclo · Perfil.
 * Chat sai no modo solo; Ciclo sai para homens no modo solo.
 */
export function BottomTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const { chatUnread } = useAppNotifContext();

  const isSolo = profile?.usage_mode === "solo";
  const hideCycle = isSolo && profile?.gender === "male";

  const tabs: Tab[] = [
    {
      to: "/",
      label: "Hoje",
      icon: Home,
      active: (pathname) => pathname === "/" || startsWithAny(pathname, HOME_DESTINATIONS),
    },
    ...(!isSolo
      ? [{
          to: "/chat",
          label: "Chat",
          icon: MessageCircle,
          active: (pathname: string) => pathname === "/chat",
          badge: chatUnread,
        }]
      : []),
    {
      to: "/biblioteca",
      label: "Biblioteca",
      icon: Library,
      active: (pathname) => startsWithAny(pathname, ["/biblioteca"]),
    },
    ...(!hideCycle
      ? [{
          to: "/ciclo",
          label: "Ciclo",
          icon: Flower2,
          active: (pathname: string) => startsWithAny(pathname, ["/ciclo"]),
        }]
      : []),
    {
      to: "/configuracoes",
      label: "Perfil",
      icon: UserRound,
      active: (pathname) => startsWithAny(pathname, ["/configuracoes", "/subscricao"]),
    },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      aria-label="Navegação principal"
    >
      <div className="pointer-events-auto mx-auto max-w-md">
        <div
          className="grid rounded-[26px] bg-white/[0.92] p-1.5 shadow-[0_0_0_1px_rgba(11,19,36,0.05),0_16px_40px_-12px_rgba(11,19,36,0.22)] backdrop-blur-xl dark:bg-card/[0.92] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_40px_-12px_rgba(0,0,0,0.5)]"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => (
            <TabButton
              key={tab.to}
              tab={tab}
              isActive={tab.active(location.pathname)}
              onClick={() => navigate(tab.to)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  const badge = tab.badge ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-h-[54px] flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors active:opacity-60",
        isActive ? "font-semibold text-[#0B1324] dark:text-foreground" : "font-medium text-[#9A9DA6]",
      )}
    >
      <span className="relative">
        <Icon className="h-[23px] w-[23px]" strokeWidth={isActive ? 2.1 : 1.7} />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[10.5px] font-bold leading-none text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span>{tab.label}</span>
      {isActive && <span className="absolute bottom-[3px] h-1 w-1 rounded-full bg-[#E5484D]" aria-hidden="true" />}
    </button>
  );
}
