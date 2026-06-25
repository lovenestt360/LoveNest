import { useState } from "react";
import type { ComponentType } from "react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { useFreeMode } from "@/hooks/useFreeMode";
import { useProfile } from "@/hooks/useProfile";
import {
  Home,
  MessageCircle,
  Smile,
  CheckSquare,
  MoreHorizontal,
  HeartHandshake,
  CalendarDays,
  Image,
  Settings,
  BookOpen,
  Flower2,
  ClipboardList,
  CreditCard,
  Heart,
  Library,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mainTabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/chat", label: "Chat", Icon: MessageCircle },
  { to: "/humor", label: "Mood", Icon: Smile },
  { to: "/biblioteca", label: "Biblioteca", Icon: Library },
] as const;

const moreItems = [
  { to: "/memorias", label: "Memórias", Icon: Image },
  { to: "/ciclo", label: "Ciclo", Icon: Flower2 },
  { to: "/jornada-espiritual", label: "Espiritual", Icon: BookOpen },
  { to: "/conflitos", label: "Conflitos", Icon: HeartHandshake },
  { to: "/plano", label: "Plano", Icon: CheckSquare },
  { to: "/configuracoes", label: "Definições", Icon: Settings },
  { to: "/subscricao", label: "Subscrição", Icon: CreditCard },
] as const;

const MORE_PATHS = moreItems.map((i) => i.to);

export function BottomTabs() {
  const {
    chatUnread,
    moodUnread,
    tasksUnread,
    memoriesUnread,
    scheduleUnread,
    prayerUnread,
    complaintsUnread,
  } = useAppNotifContext();
  const { freeMode } = useFreeMode();
  const { profile } = useProfile();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isSolo = profile?.usage_mode === "solo";
  const hideCiclo = isSolo && profile?.gender === "male";
  const visibleMainTabs = isSolo ? mainTabs.filter(t => t.to !== "/chat") : mainTabs;

  const hasSpiritual = profile?.religion !== "none";
  const effectivePrayerUnread = hasSpiritual ? prayerUnread : 0;
  const effectiveComplaintsUnread = isSolo ? 0 : complaintsUnread;
  const effectiveChatUnread = isSolo ? 0 : chatUnread;

  const moreBadge =
    memoriesUnread + scheduleUnread + effectivePrayerUnread + effectiveComplaintsUnread + tasksUnread;
  const isMoreActive = MORE_PATHS.some((p) => location.pathname === p);

  const totalUnread = effectiveChatUnread + moodUnread + tasksUnread + memoriesUnread + scheduleUnread + effectivePrayerUnread + effectiveComplaintsUnread;

  const getBadge = (to: string) => {
    switch (to) {
      case "/": return totalUnread;
      case "/chat": return chatUnread;
      case "/humor": return moodUnread;
      default: return 0;
    }
  };

  const getMoreBadge = (to: string) => {
    switch (to) {
      case "/memorias": return memoriesUnread;
      case "/agenda": return scheduleUnread;
      case "/jornada-espiritual": return prayerUnread;
      case "/conflitos": return complaintsUnread;
      case "/plano": return tasksUnread + scheduleUnread;
      default: return 0;
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="w-full">
        <div className={cn("grid h-14", visibleMainTabs.length === 4 ? "grid-cols-5" : "grid-cols-4")}>
          {visibleMainTabs.map(({ to, label, Icon }) => (
            <TabItem
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              badge={getBadge(to)}
            />
          ))}

          {/* More tab */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150 active:opacity-60",
                  isMoreActive ? "text-rose-500" : "text-muted-foreground"
                )}
                aria-label="Mais"
              >
                <span className="relative">
                  <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={isMoreActive ? 2 : 1.5} />
                  {moreBadge > 0 && <Badge count={moreBadge} />}
                </span>
                <span className="leading-none">More</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-[2rem] border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),1.5rem)]"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-5">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-1 pb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-base font-bold text-foreground">LoveNest</span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Mais funcionalidades</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {moreItems
                  .filter(item => freeMode ? item.to !== "/subscricao" : true)
                  .filter(item => profile?.religion === "none" ? item.to !== "/jornada-espiritual" : true)
                  .filter(item => isSolo ? item.to !== "/conflitos" : true)
                  .filter(item => hideCiclo ? item.to !== "/ciclo" : true)
                  .map(({ to, label, Icon }) => {
                    const badge = getMoreBadge(to);
                    const active = location.pathname === to;
                    return (
                      <button
                        key={to}
                        type="button"
                        onClick={() => { setMoreOpen(false); navigate(to); }}
                        className="relative flex flex-col items-center gap-2 active:scale-[0.95] transition-all duration-150 outline-none"
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center relative border transition-colors",
                          active
                            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-500"
                            : "bg-card border-border text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                        )}>
                          <Icon className="h-6 w-6" strokeWidth={1.5} />
                          {badge > 0 && <Badge count={badge} />}
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium leading-tight text-center",
                          active ? "text-rose-500" : "text-foreground/60"
                        )}>{label}</span>
                      </button>
                    );
                  })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ActiveDot() {
  return (
    <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose-500" />
  );
}

function TabItem({
  to,
  label,
  Icon,
  badge = 0,
}: {
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  badge?: number;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors duration-150 active:opacity-60"
      )}
      activeClassName="text-rose-500"
      aria-label={label}
    >
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2 : 1.5} />
        {badge > 0 && <Badge count={badge} />}
      </span>
      <span className="leading-none">{label}</span>
    </NavLink>
  );
}
