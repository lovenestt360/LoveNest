import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarHeart,
  Heart,
  Home,
  MessageCircle,
  UserRound,
} from "lucide-react";
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

export function BottomTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const {
    chatUnread,
    memoriesUnread,
    tasksUnread,
    scheduleUnread,
    prayerUnread,
    complaintsUnread,
    capsuleUnread,
  } = useAppNotifContext();

  const isSolo = profile?.usage_mode === "solo";

  const tabs: Tab[] = [
    {
      to: "/",
      label: "Hoje",
      icon: Home,
      active: (pathname) => pathname === "/" || startsWithAny(pathname, ["/humor"]),
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
      to: "/nos",
      label: isSolo ? "Eu" : "Nós",
      icon: Heart,
      active: (pathname) =>
        startsWithAny(pathname, [
          "/nos",
          "/momentos",
          "/memorias",
          "/historia",
          "/desafios",
          "/conflitos",
          "/capsula",
          "/wrapped",
          "/jornada",
        ]),
      badge: isSolo ? 0 : memoriesUnread + complaintsUnread + capsuleUnread,
    },
    {
      to: "/vida",
      label: "Vida",
      icon: CalendarHeart,
      active: (pathname) =>
        startsWithAny(pathname, [
          "/vida",
          "/plano",
          "/rotina",
          "/ciclo",
          "/jornada-espiritual",
          "/localizacao",
          "/biblioteca",
        ]),
      badge: tasksUnread + scheduleUnread + prayerUnread,
    },
    {
      to: "/configuracoes",
      label: "Perfil",
      icon: UserRound,
      active: (pathname) => startsWithAny(pathname, ["/configuracoes", "/subscricao"]),
    },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      aria-label="Navegação principal"
    >
      <div className="pointer-events-auto mx-auto max-w-md">
        <div className="flex h-[64px] items-center justify-between gap-1 rounded-full border border-border/60 bg-card/95 px-2 shadow-[0_2px_6px_rgba(15,23,42,0.05),0_18px_40px_-10px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10">
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
      aria-label={tab.label}
      className={cn(
        "relative flex h-12 items-center justify-center gap-2 rounded-full transition-all duration-300 ease-out active:scale-95",
        isActive
          ? "flex-[1.9] bg-foreground px-4 text-background"
          : "flex-1 text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="relative">
        <Icon
          className="h-[21px] w-[21px]"
          strokeWidth={isActive ? 2 : 1.6}
          fill={isActive ? "currentColor" : "none"}
          fillOpacity={isActive ? 0.18 : 0}
        />
        {badge > 0 && <Badge count={badge} />}
      </span>
      {isActive && (
        <span className="truncate text-[12px] font-semibold leading-none animate-in fade-in slide-in-from-left-1 duration-300">
          {tab.label}
        </span>
      )}
    </button>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[8px] font-medium leading-none text-white ring-2 ring-card">
      {count > 9 ? "9+" : count}
    </span>
  );
}
