import { useState } from "react";
import type { ComponentType } from "react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { useFreeMode } from "@/hooks/useFreeMode";
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
  Flame,
  ClipboardList,
  CreditCard,
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
  { to: "/plano", label: "Plano", Icon: CheckSquare },
] as const;

const moreItems = [
  { to: "/memorias", label: "Memórias", Icon: Image },
  { to: "/ciclo", label: "Ciclo", Icon: Flower2 },
  { to: "/jejum", label: "Jejum", Icon: Flame },
  { to: "/oracao", label: "Oração", Icon: BookOpen },
  { to: "/conflitos", label: "Conflitos", Icon: HeartHandshake },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const moreBadge =
    memoriesUnread + scheduleUnread + prayerUnread + complaintsUnread;
  const isMoreActive = MORE_PATHS.some((p) => location.pathname === p);

  const getBadge = (to: string) => {
    switch (to) {
      case "/chat": return chatUnread;
      case "/humor": return moodUnread;
      case "/plano": return tasksUnread + scheduleUnread;
      default: return 0;
    }
  };

  const getMoreBadge = (to: string) => {
    switch (to) {
      case "/memorias": return memoriesUnread;
      case "/agenda": return scheduleUnread;
      case "/oracao": return prayerUnread;
      case "/conflitos": return complaintsUnread;
      default: return 0;
    }
  };

  return (
    <nav
      className="apple-dock"
      aria-label="Navegação principal"
    >
      <div className="w-full">
        <div className="grid grid-cols-5 gap-0.5">
          {mainTabs.map(({ to, label, Icon }) => (
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
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium text-muted-foreground transition-all duration-200 active:animate-tab-tap",
                  isMoreActive && "text-primary"
                )}
                aria-label="Mais"
              >
                <span className="relative">
                  <MoreHorizontal className="h-5 w-5" />
                  {moreBadge > 0 && <Badge count={moreBadge} />}
                </span>
                <span className="leading-none">More</span>
                {isMoreActive && <ActiveDot />}
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-[2rem] border-t-0 bg-white/90 backdrop-blur-2xl pb-[max(env(safe-area-inset-bottom),1.5rem)] shadow-2xl"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-1 pb-4">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              <SheetHeader className="px-1 pb-4">
                <SheetTitle className="text-left text-base font-black text-foreground/70 uppercase tracking-widest text-[11px]">
                  Mais
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-4 gap-3">
                {moreItems
                  .filter(item => freeMode ? item.to !== "/subscricao" : true)
                  .map(({ to, label, Icon }) => {
                    const badge = getMoreBadge(to);
                    const active = location.pathname === to;
                    return (
                      <button
                        key={to}
                        type="button"
                        onClick={() => { setMoreOpen(false); navigate(to); }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-200 active:scale-[0.95]",
                          active
                            ? "bg-rose-50 text-rose-400"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center relative",
                          active ? "bg-rose-100" : "bg-white shadow-sm shadow-black/5"
                        )}>
                          <Icon className="h-5 w-5" strokeWidth={1.5} />
                          {badge > 0 && <Badge count={badge} />}
                        </div>
                        <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
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
    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ActiveDot() {
  return (
    <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
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
        "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium text-muted-foreground transition-all duration-200 active:animate-tab-tap"
      )}
      activeClassName="text-primary"
      aria-label={label}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge > 0 && <Badge count={badge} />}
      </span>
      <span className="leading-none">{label}</span>
      {isActive && <ActiveDot />}
    </NavLink>
  );
}
