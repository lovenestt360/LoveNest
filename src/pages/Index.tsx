import { useEffect, useState, useRef } from "react";
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
  ArrowRight, Megaphone, Trophy, Clock, Sparkles, Share2, Compass
} from "lucide-react";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { useLoveStreak } from "@/hooks/useLoveStreak";
import { LoveStreakHomeCard } from "@/features/streak/LoveStreakHomeCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notifyPartner } from "@/lib/notifyPartner";
import { Button } from "@/components/ui/button";

/* ── Components ── */
import { DashCard } from "@/features/home/components/DashCard";
import { TimeTogetherCard } from "@/features/home/components/TimeTogetherCard";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { Coffee } from "lucide-react";

/* ── data hooks ── */

function usePlanoStats() {
  const spaceId = useCoupleSpaceId();
  const [pending, setPending] = useState(0);
  const [next, setNext] = useState<{ title: string; time: string | null } | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    supabase.from("plano_items")
      .select("title,plan_at,completed")
      .eq("couple_space_id", spaceId)
      .then(({ data }) => {
        if (!data) return;
        setPending(data.filter(t => !t.completed).length);
        const upcoming = data
          .filter(t => !t.completed && t.plan_at)
          .sort((a, b) => a.plan_at!.localeCompare(b.plan_at!))[0];
        if (upcoming) {
          setNext({ 
            title: upcoming.title, 
            time: format(new Date(upcoming.plan_at!), "HH:mm") 
          });
        }
      });
  }, [spaceId]);
  return { pending, next };
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

function useWrappedStatus() {
  const spaceId = useCoupleSpaceId();
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    if (!spaceId) return;
    const now = new Date();
    let month = now.getMonth(); 
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    supabase.from("love_wrapped").select("id")
      .eq("couple_space_id", spaceId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle()
      .then(({ data }) => setHasNew(!!data));
  }, [spaceId]);
  return hasNew;
}

function useMessagePreview() {
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const [data, setData] = useState<{ preview: string | null; lastTime: string | null }>({ preview: null, lastTime: null });
  useEffect(() => {
    if (!spaceId) return;
    supabase.from("messages").select("content,sender_user_id,created_at")
      .eq("couple_space_id", spaceId).order("created_at", { ascending: false }).limit(1)
      .then(({ data: msgs }) => {
        if (msgs?.[0]) {
          const prefix = msgs[0].sender_user_id === user?.id ? "Tu: " : "";
          const text = msgs[0].content;
          setData({
            preview: prefix + (text.length > 40 ? text.slice(0, 40) + "…" : text),
            lastTime: msgs[0].created_at
          });
        }
      });
  }, [spaceId, user]);
  return data;
}

function useIntelligentNotifs(spaceId: string | null) {
  const { user } = useAuth();
  const { data: streakData, dailyStatus, isPartner1 } = useLoveStreak();
  const lastMsg = useMessagePreview();
  const sentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!spaceId || !user || !streakData) return;

    const now = new Date();
    const currentHour = now.getHours();

    // 1. Streak Reminder (if after 19h and partner hasn't interacted)
    const partnerInteracted = isPartner1 ? streakData.partner2_interacted_today : streakData.partner1_interacted_today;
    if (currentHour >= 19 && !partnerInteracted && !sentRef.current.has("streak_reminder")) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "Quase lá! 🔥",
        body: "Não deixem o streak cair hoje 🔥",
        url: "/",
        type: "routine",
        template_key: "streak_reminder"
      });
      sentRef.current.add("streak_reminder");
    }

    // 1b. Mission Reminder (if after 17h and mission not done)
    const meMission = isPartner1 ? dailyStatus?.is_completed_p1 : dailyStatus?.is_completed_p2;
    if (currentHour >= 17 && !meMission && dailyStatus?.mission_title && !sentRef.current.has("mission_reminder")) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "Missão Especial! 📸",
        body: `Já viste a missão do dia? "${dailyStatus.mission_title}" ✨`,
        url: "/plano",
        type: "plano",
        template_key: "mission_reminder"
      });
      sentRef.current.add("mission_reminder");
    }

    // 2. Chat Inactivity (if last message > 8 hours ago during day)
    if (lastMsg.lastTime && currentHour > 10 && currentHour < 22) {
      const lastTime = new Date(lastMsg.lastTime);
      const diffHours = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
      if (diffHours > 8 && !sentRef.current.has("chat_inactivity")) {
        notifyPartner({
          couple_space_id: spaceId,
          title: "Falta um brilho aqui... 💛",
          body: "Hoje ainda não falaram muito… tudo bem por aí? 💛",
          url: "/chat",
          type: "chat",
          template_key: "chat_inactivity"
        });
        sentRef.current.add("chat_inactivity");
      }
    }
  }, [spaceId, user, streakData, lastMsg.lastTime, isPartner1]);
}

function useReferralCode() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.referral_code) setCode(data.referral_code);
      });
  }, [user]);
  return code;
}

function useHouseInviteCode() {
  const spaceId = useCoupleSpaceId();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (!spaceId) return;
    supabase.from("couple_spaces").select("invite_code").eq("id", spaceId).maybeSingle()
      .then(({ data }) => {
        if (data?.invite_code) setCode(data.invite_code);
      });
  }, [spaceId]);
  return code;
}

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
        supabase.from("fasting_day_logs" as any).select("day_key,result,finalized")
          .eq("user_id", user.id).eq("profile_id", profile.id)
          .then(({ data: logs }) => {
            if (!logs) return;
            const today = new Date().toISOString().slice(0, 10);
            const finalized = (logs as any[]).filter(l => l.finalized);
            setLoggedDays(finalized.length);
            const todayLog = (logs as any[]).find(l => l.day_key === today);
            setTodayResult(todayLog?.result ?? null);
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

function useGlobalAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("admin_announcements").select("*")
      .eq("active", true).order("created_at", { ascending: false })
      .then(({ data }) => setAnnouncements(data || []));
  }, []);
  return announcements;
}

const Index = () => {
  const time = useTimeTogether();
  const navigate = useNavigate();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });
  const { data: streakData, dailyStatus, isPartner1 } = useLoveStreak();
  const streak = streakData?.current_streak ?? 0;
  const { isEnabled } = useFeatureAccess();
  
  useIntelligentNotifs(useCoupleSpaceId());

  const { 
    chatUnread, moodUnread, tasksUnread, memoriesUnread, 
    scheduleUnread, prayerUnread, complaintsUnread 
  } = useAppNotifContext();

  const avatars = useCoupleAvatars();
  const plano = usePlanoStats();
  const mood = useMoodToday();
  const photoCount = usePhotoCount();
  const prayer = usePrayerStatus();
  const chatPreview = useMessagePreview();
  const fasting = useFastingHome();
  const hasWrapped = useWrappedStatus();
  const announcements = useGlobalAnnouncements();
  const referralCode = useReferralCode();
  const houseInviteCode = useHouseInviteCode();

  const handleShareReferral = () => {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;
    const message = `Estamos a usar o LoveNest 💛\num espaço só nosso…\ncria o teu também ✨\n\nCódigo: ${referralCode}`;

    if (navigator.share) {
      navigator.share({ title: 'Convite LoveNest', text: message, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${shareUrl}`);
      toast.success("Convite copiado! Partilha com amigos. ✨");
    }
  };

  const handleShareHouse = () => {
    if (!houseInviteCode) return;
    const message = `Vem construir o nosso ninho no LoveNest! 🏠❤️ Usa o código do nosso espaço: ${houseInviteCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Nosso Ninho no LoveNest', text: message, url: window.location.origin }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${window.location.origin}`);
      toast.success("Código e link copiados! 🏠");
    }
  };

  const fastingProgress = fasting.plan
    ? Math.min(100, Math.round((fasting.loggedDays / fasting.plan.total_days) * 100))
    : 0;

  return (
    <section className="space-y-6 animate-fade-in pb-20">
      {/* ── Premium Apple Header ── */}
      <HomeHeader me={avatars.me} partner={avatars.partner} today={today} loading={avatars.loading} />

      {/* ── Highlights & Status ── */}
      <div className="space-y-3">
        <TimeTogetherCard 
          days={time.days} hours={time.hours} minutes={time.minutes} seconds={time.seconds} 
          streak={streak} hasDate={!!time.startDate} onSetDate={() => navigate("/configuracoes")} 
        />

        {/* Announcements */}
        {announcements.map((ann) => (
          <div key={ann.id} className="glass-card border-primary/20 bg-primary/5 text-primary p-4 rounded-3xl animate-fade-slide-up shadow-sm">
            <h3 className="font-black text-[10px] flex items-center gap-2 mb-1 uppercase tracking-widest">
              <Megaphone className="w-3 h-3" /> {ann.title}
            </h3>
            <p className="text-sm font-medium">{ann.content}</p>
          </div>
        ))}

        <InstallBanner />

        {/* LoveStreak Component */}
        <div className="animate-fade-slide-up">
          <LoveStreakHomeCard />
        </div>
      </div>

      {/* ── Primary Grid (2 Columns) ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* O Plano - Full Width */}
        <DashCard
          icon={<CheckSquare className="h-6 w-6 stroke-[2.5]" />}
          title="Agenda"
          lines={[
            plano.pending > 0 ? `${plano.pending} pendentes` : "Tudo pronto ✨",
            plano.next ? `${plano.next.time} ${plano.next.title}` : "Nada mais por hoje"
          ]}
          to="/plano"
          badge={tasksUnread + scheduleUnread}
          accent="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
          className="col-span-2 py-6"
        />

        {isEnabled("home_conversas") && (
          <button
            onClick={() => navigate("/chat")}
            className="glass-card glass-card-hover group flex flex-col items-center justify-center gap-2 rounded-[2rem] p-4 text-center active:scale-[0.96] transition-all bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/10"
          >
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
                <MessageCircle className="h-6 w-6" />
              </div>
              {chatUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-white shadow-lg">
                  {chatUnread}
                </span>
              )}
            </div>
            <span className="text-[14px] font-black tracking-tight">Conversas</span>
            <p className="text-[10px] text-muted-foreground font-medium italic line-clamp-1 h-3">
              {chatPreview.preview ? "Nova mensagem!" : "Abrir chat"}
            </p>
          </button>
        )}

        <DashCard
          icon={<Smile className="h-6 w-6 stroke-[2.5]" />}
          title="Humor"
          lines={[
            mood.mine ? `Tu: ${mood.mine.emoji}` : "Registar hoje",
            mood.partner ? `Par: ${mood.partner.emoji}` : "Esperando par...",
          ]}
          to="/humor"
          badge={moodUnread}
          accent="bg-orange-500/20 text-orange-600 dark:text-orange-400"
        />

        {isEnabled("home_jejum") && (
          <button
            onClick={() => navigate("/jejum")}
            className="glass-card glass-card-hover group flex flex-col items-center justify-center gap-2 rounded-[2rem] p-4 text-center active:scale-[0.96] transition-all bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 group-hover:scale-110 transition-transform shadow-sm">
              <Flame className="h-6 w-6" />
            </div>
            <span className="text-[14px] font-black tracking-tight">Jejum</span>
            <div className="w-full h-1 bg-amber-500/10 rounded-full overflow-hidden mt-1">
              <div className="bg-amber-500 h-full" style={{ width: `${fastingProgress}%` }} />
            </div>
          </button>
        )}
      </div>

      {/* ── Apps & Tools Grid (3 Columns) ── */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 px-2 flex items-center justify-center gap-2">
            Ferramentas do Casal
        </h2>
        
        <div className="grid grid-cols-3 gap-3">
          {isEnabled("home_memories") && (
            <AppIconButton 
              icon={<Camera className="w-6 h-6" />} 
              label="Memórias" 
              badge={memoriesUnread} 
              to="/memorias" 
              color="text-violet-500 bg-violet-500/10" 
            />
          )}

          {isEnabled("home_desafios") && (
            <AppIconButton 
              icon={<Trophy className="w-6 h-6" />} 
              label="Desafios" 
              to="/desafios" 
              color="text-blue-500 bg-blue-500/10" 
            />
          )}

          {isEnabled("home_wrapped") && (
            <AppIconButton 
              icon={<Sparkles className="w-6 h-6" />} 
              label="Wrapped" 
              badge={hasWrapped ? "!" : 0} 
              to="/wrapped" 
              color="text-rose-500 bg-rose-500/10" 
            />
          )}

          {isEnabled("home_oracao") && (
            <AppIconButton 
              icon={<BookHeart className="w-6 h-6" />} 
              label="Oração" 
              badge={prayerUnread} 
              to="/oracao" 
              color="text-amber-500 bg-amber-500/10" 
            />
          )}

          {isEnabled("home_capsula") && (
            <AppIconButton 
              icon={<Clock className="w-6 h-6" />} 
              label="Cápsula" 
              to="/capsula" 
              color="text-primary bg-primary/10" 
            />
          )}

          <AppIconButton 
            icon={<Flower2 className="w-6 h-6" />} 
            label="Ciclo" 
            to="/ciclo" 
            color="text-pink-500 bg-pink-500/10" 
          />
        </div>
      </div>

      {/* Share / Invite Section */}
      <div className="space-y-4 pt-4">
        {!avatars.partner && houseInviteCode && (
          <div className="glass-card bg-gradient-to-br from-primary/15 to-transparent border-primary/20 rounded-[2.5rem] p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-4 text-center justify-center flex-col">
                <HeartHandshake className="w-8 h-8 text-primary" />
                <h3 className="text-sm font-black tracking-tight">O teu ninho está vazio!</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Partilha o código com o teu par</p>
             </div>
             <div className="flex gap-2">
                <div className="flex-1 bg-white/50 border border-primary/10 rounded-2xl h-12 flex items-center justify-center font-black text-lg tracking-widest text-primary shadow-inner">
                  {houseInviteCode}
                </div>
                <button 
                  onClick={handleShareHouse}
                  className="h-12 w-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                </button>
             </div>
          </div>
        )}

        <button
          onClick={handleShareReferral}
          className="w-full glass-card bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10 rounded-[2rem] p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-white/50 flex items-center justify-center text-primary shadow-sm">
                <Share2 className="w-5 h-5" />
             </div>
             <div className="text-left">
                <h4 className="text-[13px] font-black tracking-tight">Convidar Amigos</h4>
                <p className="text-[10px] text-muted-foreground font-bold">Ganha 50 Pontos! 💰</p>
             </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
        </button>
      </div>
    </section>
  );
};

export default Index;
