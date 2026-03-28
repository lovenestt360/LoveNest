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
      className="fixed bottom-6 left-4 right-4 h-20 rounded-[2.5rem] bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.08)] flex items-center justify-around px-4 z-50"
      aria-label="Navegação principal"
    >
      <div className="flex w-full items-center justify-around gap-1">
        {mainTabs.map(({ to, label, Icon }) => (
          <TabItem
            key={to}
            to={to}
            label={label}
            Icon={Icon}
            badge={getBadge(to)}
          />
        ))}

        {/* More tab with Apple-style trigger */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex flex-col items-center justify-center h-16 w-16 rounded-[1.3rem] transition-all duration-300 active:scale-90",
                isMoreActive 
                  ? "bg-primary/5 text-primary" 
                  : "text-slate-400 hover:text-slate-600"
              )}
              aria-label="Mais"
            >
              <span className="relative">
                <MoreHorizontal className="h-6 w-6 stroke-[2.5px]" />
                {moreBadge > 0 && <Badge count={moreBadge} />}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[3.5rem] bg-white/95 backdrop-blur-3xl border-none shadow-2xl p-8 pt-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
            <SheetHeader className="mb-8">
              <SheetTitle className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">Opções Adicionais</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-6">
              {moreItems
                .filter((item) => (freeMode ? item.to !== "/subscricao" : true))
                .map(({ to, label, Icon }) => {
                  const badge = getMoreBadge(to);
                  const active = location.pathname === to;
                  return (
                    <button
                      key={to}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        navigate(to);
                      }}
                      className={cn(
                        "relative flex flex-col items-center gap-3 py-6 rounded-[2.5rem] transition-all duration-300 active:scale-95",
                        active
                          ? "bg-slate-900 shadow-xl shadow-slate-200 text-white"
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      <span className="relative">
                        <Icon className="h-7 w-7" />
                        {badge > 0 && <Badge count={badge} />}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                    </button>
                  );
                })}
            </div>
          </SheetContent>
        </Sheet>
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

function ActiveHighlight() {
  return (
    <div className="absolute inset-0 bg-primary/5 rounded-[1.3rem] -z-10 animate-in fade-in zoom-in-95 duration-500" />
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
        "relative flex flex-col items-center justify-center h-16 w-16 rounded-[1.3rem] transition-all duration-300 active:scale-90",
        isActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
      )}
      aria-label={label}
    >
      <span className="relative">
        <Icon className={cn("h-6 w-6 stroke-[2.5px]", isActive ? "text-primary" : "text-slate-400")} />
        {badge > 0 && <Badge count={badge} />}
      </span>
      <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">{label}</span>
      {isActive && <ActiveHighlight />}
    </NavLink>
  );
}
