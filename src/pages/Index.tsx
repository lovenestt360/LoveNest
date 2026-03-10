import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { supabase } from "@/integrations/supabase/client";
import { InstallBanner } from "@/features/pwa/InstallBanner";
import { computeCycleInfo, useCycleTarget, type CycleProfile, type PeriodEntry } from "@/features/cycle/useCycleData";
import { getEasterDate, dayResultLabel } from "@/features/fasting/types";
import { Progress } from "@/components/ui/progress";
import {
  CheckSquare, Smile, Camera, CalendarDays, BookHeart,
  HeartHandshake, MessageCircle, Heart, Flower2, Flame,
  ArrowRight, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/* ── data hooks ── */

function useTaskStats() {
  const spaceId = useCoupleSpaceId();
  const [open, setOpen] = useState(0);
  const [doneToday, setDoneToday] = useState(0);
  useEffect(() => {
    if (!spaceId) return;
    supabase.from("tasks").select("status,done_at")
      .eq("couple_space_id", spaceId)
      .then(({ data }) => {
        if (!data) return;
        const today = new Date().toISOString().slice(0, 10);
        setOpen(data.filter(t => t.status === "open").length);
        setDoneToday(data.filter(t => t.status === "done" && t.done_at?.slice(0, 10) === today).length);
      });
  }, [spaceId]);
  return { open, doneToday };
}

const MOOD_MAP: Record<string, [string, string]> = {
  feliz: ["😊", "Feliz"], tranquilo: ["😌", "Tranquilo"], apaixonado: ["🥰", "Apaixonado"],
  ansioso: ["😰", "Ansioso"], triste: ["😢", "Triste"], cansado: ["😴", "Cansado"],
  irritado: ["😤", "Irritado"], grato: ["🙏", "Grato"],
};

function useMoodToday() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [mine, setMine] = useState<{ emoji: string; label: string } | null>(null);
  const [partner, setPartner] = useState<{ emoji: string; label: string } | null>(null);
  useEffect(() => {
    if (!spaceId || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("mood_checkins").select("mood_key,mood_percent,user_id")
      .eq("couple_space_id", spaceId).eq("day_key", today)
      .then(({ data }) => {
        if (!data) return;
        const myCheckin = data.find(d => d.user_id === user.id);
        if (myCheckin) {
          const [emoji, label] = MOOD_MAP[myCheckin.mood_key] ?? ["😶", myCheckin.mood_key];
          setMine({ emoji, label });
        }
        const partnerCheckin = data.find(d => d.user_id !== user.id);
        if (partnerCheckin) {
          const [emoji, label] = MOOD_MAP[partnerCheckin.mood_key] ?? ["😶", partnerCheckin.mood_key];
          setPartner({ emoji, label });
        }
      });
  }, [spaceId, user]);
  return { mine, partner };
}

function usePhotoCount() {
  const spaceId = useCoupleSpaceId();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!spaceId) return;
    supabase.from("photos").select("id", { count: "exact", head: true })
      .eq("couple_space_id", spaceId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [spaceId]);
  return count;
}

function useNextEvent() {
  const spaceId = useCoupleSpaceId();
  const [ev, setEv] = useState<{ title: string; date: string } | null>(null);
  useEffect(() => {
    if (!spaceId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    supabase.from("events").select("title,event_date").eq("couple_space_id", spaceId)
      .gte("event_date", today).order("event_date").limit(1)
      .then(({ data }) => {
        if (data?.[0]) setEv({ title: data[0].title, date: data[0].event_date });
      });
  }, [spaceId]);
  return ev;
}

function usePrayerStatus() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [myPrayed, setMyPrayed] = useState(false);
  const [partnerPrayed, setPartnerPrayed] = useState(false);
  useEffect(() => {
    if (!spaceId || !user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    supabase.from("daily_spiritual_logs").select("prayed_today,user_id")
      .eq("couple_space_id", spaceId).eq("day_key", today)
      .then(({ data }) => {
        if (!data) return;
        setMyPrayed(data.some(d => d.user_id === user.id && d.prayed_today));
        setPartnerPrayed(data.some(d => d.user_id !== user.id && d.prayed_today));
      });
  }, [spaceId, user]);
  return { myPrayed, partnerPrayed };
}

function useOpenComplaints() {
  const spaceId = useCoupleSpaceId();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!spaceId) return;
    supabase.from("complaints").select("id", { count: "exact", head: true })
      .eq("couple_space_id", spaceId).in("status", ["open", "talking"])
      .then(({ count: c }) => setCount(c ?? 0));
  }, [spaceId]);
  return count;
}

function useMessagePreview() {
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!spaceId) return;
    supabase.from("messages").select("content,sender_user_id")
      .eq("couple_space_id", spaceId).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const prefix = data[0].sender_user_id === user?.id ? "Tu: " : "";
          const text = data[0].content;
          setPreview(prefix + (text.length > 40 ? text.slice(0, 40) + "…" : text));
        }
      });
  }, [spaceId, user]);
  return preview;
}

/* ── Fasting mini-hook (Home only) ── */

function useFastingHome() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<{
    plan_name: string; start_date: string; end_date: string; total_days: number
  } | null>(null);
  const [loggedDays, setLoggedDays] = useState(0);
  const [todayResult, setTodayResult] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("fasting_profiles" as any).select("*")
      .eq("user_id", user.id).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data: p }) => {
        if (!p) return;
        const profile = p as any;
        setPlan({
          plan_name: profile.plan_name,
          start_date: profile.start_date,
          end_date: profile.end_date,
          total_days: profile.total_days,
        });
        // Get day logs
        supabase.from("fasting_day_logs" as any).select("day_key,result,finalized")
          .eq("user_id", user.id).eq("profile_id", profile.id)
          .then(({ data: logs }) => {
            if (!logs) return;
            const today = new Date().toISOString().slice(0, 10);
            const finalized = (logs as any[]).filter(l => l.finalized);
            setLoggedDays(finalized.length);
            const todayLog = (logs as any[]).find(l => l.day_key === today);
            setTodayResult(todayLog?.result ?? null);
            // Streak
            let s = 0;
            const d = new Date();
            for (let i = 0; i < 100; i++) {
              const dd = new Date(d);
              dd.setDate(dd.getDate() - i);
              const key = dd.toISOString().slice(0, 10);
              const log = finalized.find((l: any) => l.day_key === key && l.result === "cumprido");
              if (log) s++; else break;
            }
            setStreak(s);
          });
      });
  }, [user]);

  return { plan, loggedDays, todayResult, streak };
}

/* ── Cycle mini-hook (Home only) ── */

function useCycleHome() {
  const { user } = useAuth();
  const { targetUserId, isMale, loadingTarget } = useCycleTarget();
  const [profile, setProfile] = useState<CycleProfile | null>(null);
  const [lastPeriod, setLastPeriod] = useState<PeriodEntry | null>(null);

  useEffect(() => {
    if (!user || loadingTarget || !targetUserId) return;
    Promise.all([
      supabase.from("cycle_profiles").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("period_entries").select("*").eq("user_id", targetUserId)
        .order("start_date", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([pRes, peRes]) => {
      setProfile(pRes.data as CycleProfile | null);
      setLastPeriod(peRes.data as PeriodEntry | null);
    });
  }, [user, targetUserId, loadingTarget]);

  const info = computeCycleInfo(profile, lastPeriod);
  return { profile, info, isMale };
}

/* ── Global Announcements ── */
function useGlobalAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("admin_announcements").select("*")
      .eq("active", true).order("created_at", { ascending: false })
      .then(({ data }) => setAnnouncements(data || []));
  }, []);
  return announcements;
}

/* ── Time digit ── */

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-extrabold tabular-nums text-foreground">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Notification Badge ── */

function NotifBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ── Dashboard Card ── */

interface DashCardProps {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  to: string;
  badge?: number;
  accent?: string;
}

function DashCard({ icon, title, lines, to, badge = 0, accent }: DashCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="glass-card glass-card-hover relative flex flex-col gap-2 rounded-2xl p-4 text-left w-full active:scale-[0.97] transition-transform duration-150"
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          accent ?? "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <NotifBadge count={badge} />
      </div>
      <span className="text-sm font-bold text-foreground">{title}</span>
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-muted-foreground leading-snug line-clamp-1">
          {line}
        </p>
      ))}
    </button>
  );
}

/* ── Phase colors for Cycle ── */

const PHASE_COLORS: Record<string, string> = {
  "Menstruação": "bg-red-500/15 text-red-700",
  "Fértil": "bg-green-500/15 text-green-700",
  "TPM": "bg-purple-500/15 text-purple-700",
  "Folicular": "bg-blue-500/15 text-blue-700",
  "Lútea": "bg-amber-500/15 text-amber-700",
};

/* ── Main ── */

const Index = () => {
  const time = useTimeTogether();
  const navigate = useNavigate();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });

  const { chatUnread, moodUnread, tasksUnread, memoriesUnread, scheduleUnread, prayerUnread, complaintsUnread } = useAppNotifContext();

  const avatars = useCoupleAvatars();
  const tasks = useTaskStats();
  const mood = useMoodToday();
  const photoCount = usePhotoCount();
  const nextEvent = useNextEvent();
  const prayer = usePrayerStatus();
  const complaints = useOpenComplaints();
  const chatPreview = useMessagePreview();
  const fasting = useFastingHome();
  const cycle = useCycleHome();
  const announcements = useGlobalAnnouncements();

  // Easter countdown
  const easterStr = getEasterDate();
  const easterDate = new Date(easterStr + "T00:00:00");
  const daysToEaster = Math.max(0, differenceInDays(easterDate, new Date()));

  // Fasting day number
  const fastingDayNumber = fasting.plan
    ? Math.max(1, differenceInDays(new Date(), new Date(fasting.plan.start_date + "T00:00:00")) + 1)
    : 0;
  const fastingProgress = fasting.plan
    ? Math.min(100, Math.round((fasting.loggedDays / fasting.plan.total_days) * 100))
    : 0;

  return (
    <section className="space-y-4 animate-fade-in pb-4">
      {/* ── Emotional Header ── */}
      <header className="space-y-3 pt-1 text-center">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/30">
            {avatars.me?.avatarUrl ? (
              <AvatarImage src={avatars.me.avatarUrl} alt="Eu" />
            ) : null}
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
              {avatars.me?.displayName?.charAt(0)?.toUpperCase() ?? "D"}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-primary fill-primary animate-pulse" />
            <h1 className="text-2xl font-extrabold tracking-tight gradient-text">LoveNest</h1>
            <Heart className="h-4 w-4 text-primary fill-primary animate-pulse" />
          </div>

          <Avatar className="h-10 w-10 ring-2 ring-primary/30">
            {avatars.partner?.avatarUrl ? (
              <AvatarImage src={avatars.partner.avatarUrl} alt="Par" />
            ) : null}
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
              {avatars.partner?.displayName?.charAt(0)?.toUpperCase() ?? "K"}
            </AvatarFallback>
          </Avatar>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{today}</p>

        {time.startDate ? (
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              💕 Tempo juntos
            </p>
            <div className="flex items-center justify-center gap-3">
              <TimeUnit value={time.days} label="dias" />
              <span className="text-lg font-bold text-muted-foreground/40">:</span>
              <TimeUnit value={time.hours} label="hrs" />
              <span className="text-lg font-bold text-muted-foreground/40">:</span>
              <TimeUnit value={time.minutes} label="min" />
              <span className="text-lg font-bold text-muted-foreground/40">:</span>
              <TimeUnit value={time.seconds} label="seg" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/configuracoes")}
            className="mx-auto block text-xs text-primary underline underline-offset-2"
          >
            Definir data do início do namoro
          </button>
        )}
      </header>

      {/* ── Global Announcements ── */}
      {announcements.map((ann) => (
        <div key={ann.id} className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-2xl animate-in slide-in-from-top-4 relative shadow-sm">
          <h3 className="font-bold flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4" /> {ann.title}
          </h3>
          <p className="text-sm font-medium">{ann.content}</p>
        </div>
      ))}

      <InstallBanner />

      {/* ── Jejum (Páscoa) Featured Card ── */}
      <button
        onClick={() => navigate("/jejum")}
        className="glass-card glass-card-hover relative flex w-full flex-col rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
      >
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-4 space-y-3 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground">
                  🕯️ Jejum (Páscoa)
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {fasting.plan ? fasting.plan.plan_name : "Iniciar percurso de jejum"}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {fasting.plan ? (
            <>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-amber-600">
                  Dia {fastingDayNumber}/{fasting.plan.total_days}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  fasting.todayResult === "cumprido" ? "bg-green-500/20 text-green-700" :
                    fasting.todayResult === "parcial" ? "bg-yellow-400/20 text-yellow-700" :
                      fasting.todayResult === "falhei" ? "bg-red-500/20 text-red-700" :
                        "bg-muted text-muted-foreground"
                )}>
                  {fasting.todayResult
                    ? dayResultLabel(fasting.todayResult as any)
                    : "— Não registado"}
                </span>
                {fasting.streak > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-amber-600 font-bold">🔥 {fasting.streak}</span>
                  </>
                )}
              </div>
              <Progress value={fastingProgress} className="h-1.5" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{fasting.loggedDays} dias registados</span>
                <span>Páscoa em {daysToEaster} dia{daysToEaster !== 1 ? "s" : ""}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Faltam <strong className="text-amber-600">{daysToEaster} dias</strong> para a Páscoa</span>
              <span>•</span>
              <span className="text-primary font-medium">Começar agora →</span>
            </div>
          )}
        </div>
      </button>

      {/* ── Ciclo Featured Card ── */}
      {(cycle.profile || cycle.isMale) && (
        <button
          onClick={() => navigate("/ciclo")}
          className="glass-card glass-card-hover relative flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform duration-150"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
            <Flower2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                🌸 Ciclo {cycle.isMale && <span className="text-xs text-muted-foreground font-normal ml-1">(Da Parceira)</span>}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                PHASE_COLORS[cycle.info.phase] ?? "bg-muted text-muted-foreground"
              )}>
                {cycle.info.phase}
              </span>
              {cycle.info.cycleDay > 0 && (
                <span className="text-[10px] text-muted-foreground">Dia {cycle.info.cycleDay}</span>
              )}
              {cycle.info.nextPeriod && (
                <span className="text-[10px] text-muted-foreground">
                  Próx: {format(new Date(cycle.info.nextPeriod + "T12:00:00"), "d MMM", { locale: pt })}
                </span>
              )}
            </div>
          </div>
        </button>
      )}

      {/* ── Chat quick peek ── */}
      <button
        onClick={() => navigate("/chat")}
        className="glass-card glass-card-hover relative flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform duration-150"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Chat</span>
            <NotifBadge count={chatUnread} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {chatPreview ?? "Nenhuma mensagem ainda…"}
          </p>
        </div>
      </button>

      {/* ── 2-col grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <DashCard
          icon={<CheckSquare className="h-4.5 w-4.5" />}
          title="Tarefas"
          lines={[
            tasks.open > 0 ? `${tasks.open} pendente${tasks.open !== 1 ? "s" : ""}` : "Tudo em dia ✓",
            tasks.doneToday > 0 ? `${tasks.doneToday} feita${tasks.doneToday !== 1 ? "s" : ""} hoje` : "",
          ].filter(Boolean)}
          to="/tarefas"
          badge={tasksUnread}
          accent="bg-accent/15 text-accent-foreground"
        />

        <DashCard
          icon={<Smile className="h-4.5 w-4.5" />}
          title="Humor"
          lines={[
            mood.mine ? `Tu: ${mood.mine.emoji} ${mood.mine.label}` : "Registar humor",
            mood.partner ? `Par: ${mood.partner.emoji} ${mood.partner.label}` : "Par ainda não registou",
          ]}
          to="/humor"
          badge={moodUnread}
          accent="bg-secondary text-secondary-foreground"
        />

        <DashCard
          icon={<Camera className="h-4.5 w-4.5" />}
          title="Memórias"
          lines={[
            photoCount > 0 ? `${photoCount} foto${photoCount !== 1 ? "s" : ""} guardadas` : "Sem fotos ainda",
            "Adicionar memória 📸",
          ]}
          to="/memorias"
          badge={memoriesUnread}
        />

        <DashCard
          icon={<CalendarDays className="h-4.5 w-4.5" />}
          title="Agenda"
          lines={[
            nextEvent ? nextEvent.title : "Sem eventos próximos",
            nextEvent ? format(new Date(nextEvent.date + "T12:00:00"), "d MMM", { locale: pt }) : "Planear algo juntos 📅",
          ]}
          to="/agenda"
          badge={scheduleUnread}
          accent="bg-primary/10 text-primary"
        />

        <DashCard
          icon={<BookHeart className="h-4.5 w-4.5" />}
          title="Oração"
          lines={[
            prayer.myPrayed ? "Orei hoje ✓" : "Ainda não orei",
            prayer.partnerPrayed ? "O teu par orou ✓" : "Par ainda não orou",
          ]}
          to="/oracao"
          badge={prayerUnread}
          accent="bg-accent/15 text-accent-foreground"
        />

        <DashCard
          icon={<HeartHandshake className="h-4.5 w-4.5" />}
          title="Conflitos"
          lines={[
            complaints > 0 ? `${complaints} aberto${complaints !== 1 ? "s" : ""}` : "Sem conflitos 🕊️",
            complaints > 0 ? "Resolver juntos 💬" : "Tudo em paz",
          ]}
          to="/conflitos"
          badge={complaintsUnread}
          accent="bg-destructive/10 text-destructive"
        />
      </div>
    </section>
  );
};

export default Index;
