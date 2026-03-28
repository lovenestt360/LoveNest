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
  useIntelligentNotifs(useCoupleSpaceId());

  const { chatUnread, moodUnread, tasksUnread, memoriesUnread, scheduleUnread, prayerUnread, complaintsUnread } = useAppNotifContext();

  const avatars = useCoupleAvatars();
  const plano = usePlanoStats();
  const mood = useMoodToday();
  const photoCount = usePhotoCount();
  const prayer = usePrayerStatus();
  const complaints = useOpenComplaints();
  const chatPreview = useMessagePreview();
  const fasting = useFastingHome();
  const cycle = useCycleHome();
  const hasWrapped = useWrappedStatus();
  const announcements = useGlobalAnnouncements();
  const referralCode = useReferralCode();
  const houseInviteCode = useHouseInviteCode();

  const handleShareReferral = () => {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;
    const message = `Estamos a usar o LoveNest 💛\num espaço só nosso…\ncria o teu também ✨\n\nCódigo: ${referralCode}`;

    if (navigator.share) {
      navigator.share({ 
        title: 'Convite LoveNest', 
        text: message, 
        url: shareUrl 
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${shareUrl}`);
      toast.success("Convite copiado! Partilha com amigos. ✨");
    }
  };

  const handleShareHouse = () => {
    if (!houseInviteCode) return;
    const message = `Vem construir o nosso ninho no LoveNest! 🏠❤️ Usa o código do nosso espaço: ${houseInviteCode}`;
    
    if (navigator.share) {
      navigator.share({ 
        title: 'Nosso Ninho no LoveNest', 
        text: message,
        url: window.location.origin 
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${window.location.origin}`);
      toast.success("Código e link copiados! 🏠");
    }
  };

  const easterStr = getEasterDate();
  const easterDate = new Date(easterStr + "T00:00:00");
  const daysToEaster = Math.max(0, differenceInDays(easterDate, new Date()));

  const fastingDayNumber = fasting.plan
    ? Math.max(1, differenceInDays(new Date(), new Date(fasting.plan.start_date + "T00:00:00")) + 1)
    : 0;
  const fastingProgress = fasting.plan
    ? Math.min(100, Math.round((fasting.loggedDays / fasting.plan.total_days) * 100))
    : 0;

  return (
    <section className="space-y-8 animate-fade-in pb-10 px-4 pt-4 max-w-2xl mx-auto">
      {/* ── Premium Apple Header ── */}
      <HomeHeader me={avatars.me} partner={avatars.partner} today={today} loading={avatars.loading} />

      {/* ── Highlights & Status ── */}
      <div className="space-y-6">
        <TimeTogetherCard 
          days={time.days} hours={time.hours} minutes={time.minutes} seconds={time.seconds} 
          streak={streak} hasDate={!!time.startDate} onSetDate={() => navigate("/configuracoes")} 
        />

        {/* Announcements - Minimalist Style */}
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className="bg-slate-50 border border-slate-100 text-slate-900 p-5 rounded-3xl animate-fade-slide-up stagger-1">
              <h3 className="font-black text-[9px] flex items-center gap-2 mb-2 uppercase tracking-[0.2em] text-slate-400">
                <Megaphone className="w-3 h-3" /> {ann.title}
              </h3>
              <p className="text-xs font-bold leading-relaxed">{ann.content}</p>
            </div>
          ))}
        </div>

        <InstallBanner />

        {/* Invite Partner Card - Redesigned to be clean and premium */}
        {!navigator.userAgent.includes("Framer") && !avatars.loading && !avatars.partner && houseInviteCode && (
          <div className="bg-white border border-slate-50 rounded-[2rem] p-6 shadow-apple-soft transition-all animate-fade-slide-up stagger-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black tracking-tight text-slate-900">Convidar Par</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">O vosso ninho espera por vocês!</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 rounded-xl h-14 flex items-center justify-center font-black text-xl tracking-[0.2em] text-slate-900">
                {houseInviteCode}
              </div>
              <button 
                onClick={handleShareHouse}
                className="h-14 w-14 bg-slate-800 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Featured Destaques ── */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-2 flex items-center gap-2">
           <Compass className="w-3 h-3" /> Em Destaque
        </h2>
        
        <div className="space-y-4">
          <LoveStreakHomeCard />

          {/* Fasting Featured Card - Clean Version */}
          <button
            onClick={() => navigate("/jejum")}
            className="group relative flex w-full flex-col rounded-[2rem] bg-white border border-slate-50 shadow-apple-soft overflow-hidden text-left active:scale-[0.99] transition-all duration-300"
          >
            <div className="p-6 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 transition-transform group-hover:rotate-12">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-900 block tracking-tight">Jejum da Páscoa</span>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                      {fasting.plan ? fasting.plan.plan_name : "Iniciar percurso"}
                    </p>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {fasting.plan ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-3">
                      <span className="text-amber-600">Dia {fastingDayNumber}/{fasting.plan.total_days}</span>
                      <span className={cn(
                        "rounded-lg px-2 py-0.5 text-[9px] font-black",
                        fasting.todayResult === "cumprido" ? "bg-green-50 text-green-600" :
                          fasting.todayResult === "parcial" ? "bg-amber-50 text-amber-600" :
                            fasting.todayResult === "falhei" ? "bg-red-50 text-red-600" :
                              "bg-slate-50 text-slate-400"
                      )}>
                        {fasting.todayResult ? dayResultLabel(fasting.todayResult as any) : "Pendente"}
                      </span>
                    </div>
                    <span className="text-slate-900">{fastingProgress}%</span>
                  </div>
                  <Progress value={fastingProgress} className="h-2 rounded-full bg-slate-50" indicatorClassName="bg-amber-500" />
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">Faltam {daysToEaster} dias para a Páscoa. Prepara-te! ✨</p>
              )}
            </div>
          </button>

          {/* Chat Quick Access - Clean Version */}
          <button
            onClick={() => navigate("/chat")}
            className="group relative flex w-full items-center gap-4 rounded-[2rem] bg-white border border-slate-50 shadow-apple-soft p-5 text-left active:scale-[0.99] transition-all duration-300"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] bg-indigo-50 text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
              <MessageCircle className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-slate-900 tracking-tight">Conversas</span>
                {chatUnread > 0 && (
                  <span className="bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg h-5 flex items-center">
                    {chatUnread}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 font-medium line-clamp-1 mt-1 italic">
                {chatPreview.preview ?? "Envia um beijinho agora..."}
              </p>
            </div>
          </button>
        </div>

        {/* Small Gesture Nudge */}
        <div className="flex justify-center pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-primary hover:bg-primary/5 transition-all gap-2 py-3 h-auto"
            onClick={() => {
              notifyPartner({
                couple_space_id: useCoupleSpaceId() || "",
                title: "Hora de um mimo 💌",
                body: "Hora de um pequeno gesto 💌",
                url: "/chat",
                type: "chat",
                template_key: "small_gesture"
              });
              toast.success("Enviado com sucesso! 💌");
            }}
          >
            <Coffee className="w-3 h-3" />
            Enviar um pequeno gesto
          </Button>
        </div>
      </div>

      {/* ── Nossa Vida Section ── */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-2">
          🏠 Nossa Vida
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <DashCard
            icon={<CheckSquare className="h-5 w-5 stroke-[3]" />}
            title="O Plano"
            lines={[
              plano.pending > 0 ? `${plano.pending} pendentes` : "Tudo pronto ✨",
              plano.next ? `Próximo: ${plano.next.time}` : "Fim do dia"
            ]}
            to="/plano"
            badge={tasksUnread + scheduleUnread}
            accent="bg-primary/5 text-primary"
            className="col-span-2 py-6"
          />
          <DashCard
            icon={<Smile className="h-6 w-6 stroke-[2.5]" />}
            title="Humor"
            lines={[
              mood.mine ? `Tu: ${mood.mine.emoji}` : "Registar",
              mood.partner ? `Amor: ${mood.partner.emoji}` : "Pendente",
            ]}
            to="/humor"
            badge={moodUnread}
            accent="bg-orange-50 text-orange-500"
          />
          <DashCard
            icon={<Camera className="h-6 w-6 stroke-[2.5]" />}
            title="Memórias"
            lines={[
              photoCount > 0 ? `${photoCount} fotos` : "0 fotos",
              "Novas fotos 📸"
            ]}
            to="/memorias"
            badge={memoriesUnread}
            accent="bg-violet-50 text-violet-500"
          />
        </div>
      </div>

      {/* ── Crescimento & Diversão ── */}
      <div className="space-y-6 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 px-2">
          ✨ Crescimento
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <DashCard
            icon={<Trophy className="h-6 w-6 stroke-[2.5]" />}
            title="Desafios"
            lines={["Pontos 🎯"]}
            to="/desafios"
            accent="bg-blue-50 text-blue-500"
          />
          <DashCard
            icon={<Sparkles className="h-6 w-6 stroke-[2.5]" />}
            title="Wrapped"
            lines={["Retrospectiva"]}
            to="/wrapped"
            badge={hasWrapped ? "Novo" : 0}
            accent="bg-rose-50 text-rose-500"
          />
          <DashCard
            icon={<BookHeart className="h-6 w-6 stroke-[2.5]" />}
            title="Oração"
            lines={["Hoje ✨"]}
            to="/oracao"
            badge={prayerUnread}
            accent="bg-amber-50 text-amber-500"
          />
          <DashCard
            icon={<Clock className="h-6 w-6 stroke-[2.5]" />}
            title="Cápsula"
            lines={["Futuro 🔒"]}
            to="/capsula"
            accent="bg-primary/5 text-primary"
          />
        </div>

        {/* Invite Friends Card - Redesigned to be clean */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between gap-4 mt-6 shadow-apple-soft">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shadow-sm transition-transform">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black tracking-tight text-slate-900">Convidar Amigos</h4>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Ganha 50 Pontos! 💰</p>
            </div>
          </div>
          <button
            onClick={handleShareReferral}
            className="bg-primary text-white text-[9px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            Partilhar
          </button>
        </div>
      </div>
    </section>
  );
};

export default Index;
