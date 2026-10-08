import type { ComponentType } from "react";
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
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
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
      active: (pathname) => pathname === "/" || startsWithAny(pathname, ["/humor", "/jornada"]),
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)]"
      aria-label="Navegação principal"
    >
      <div className="pointer-events-auto mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-card/88 shadow-[0_16px_45px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-card/90">
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/35 dark:ring-white/[0.05]" />

          <div
            className={cn(
              "relative grid h-[66px]",
              tabs.length === 5 ? "grid-cols-5" : "grid-cols-4",
            )}
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
        "relative flex flex-col items-center justify-center gap-1 text-[9px] font-semibold transition-colors active:opacity-60",
        isActive ? "text-rose-500" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <Icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2 : 1.5} />
        {badge > 0 && <Badge count={badge} />}
      </span>
      <span className="leading-none">{tab.label}</span>
      {isActive && (
        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose-500" />
      )}
    </button>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black leading-none text-white ring-2 ring-card">
      {count > 9 ? "9+" : count}
    </span>
  );
}
