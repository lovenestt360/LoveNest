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
  const { data: streakData, isPartner1 } = useLoveStreak();
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
  const { data: streakData } = useLoveStreak();
  const streak = streakData?.current_streak ?? 0;
  useIntelligentNotifs(useCoupleSpaceId());

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
    <section className="space-y-8 animate-fade-in pb-10">
      {/* ── Premium Apple Header ── */}
      <HomeHeader me={avatars.me} partner={avatars.partner} today={today} loading={avatars.loading} />

      {/* ── Highlights & Status ── */}
      <div className="space-y-4">
        <TimeTogetherCard 
          days={time.days} hours={time.hours} minutes={time.minutes} seconds={time.seconds} 
          streak={streak} hasDate={!!time.startDate} onSetDate={() => navigate("/configuracoes")} 
        />

        {/* Announcements */}
        {announcements.map((ann) => (
          <div key={ann.id} className="glass-card border-primary/20 bg-primary/5 text-primary p-4 rounded-3xl animate-fade-slide-up stagger-1 shadow-sm">
            <h3 className="font-black text-xs flex items-center gap-2 mb-1 uppercase tracking-widest">
              <Megaphone className="w-3 h-3" /> {ann.title}
            </h3>
            <p className="text-sm font-medium">{ann.content}</p>
          </div>
        ))}

        <InstallBanner />

        {/* Invite Partner Card - Only if no partner and NOT loading! */}
        {!avatars.loading && !avatars.partner && houseInviteCode && (
          <div className="glass-card bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30 rounded-[2.5rem] p-6 shadow-glow transition-all animate-fade-slide-up stagger-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-black tracking-tight leading-tight">Convidar Par</h3>
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">O teu ninho ainda está vazio!</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-white/50 border border-primary/20 rounded-2xl h-14 flex items-center justify-center font-black text-lg tracking-widest text-primary shadow-inner">
                {houseInviteCode}
              </div>
              <button 
                onClick={handleShareHouse}
                className="h-14 w-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground font-black italic mt-3 text-center">Partilha este código com o teu amor para começarem a jornada juntos. 💕</p>
          </div>
        )}
      </div>

      {/* ── Featured Destaques ── */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 px-2 flex items-center gap-2 animate-fade-slide-up stagger-1">
           <Compass className="w-3 h-3" /> Em Destaque
        </h2>
        
        <div className="space-y-3">
          {/* LoveStreak Component */}
          <div className="animate-fade-slide-up stagger-2">
            <LoveStreakHomeCard />
          </div>

          {/* Fasting Featured Card */}
          <button
            onClick={() => navigate("/jejum")}
            className="glass-card glass-card-hover group relative flex w-full flex-col rounded-[2.5rem] overflow-hidden text-left active:scale-[0.96] transition-transform duration-300 animate-fade-slide-up stagger-3"
          >
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent p-5 space-y-3 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-amber-500/20 text-amber-600 transition-transform group-hover:scale-110 shadow-sm">
                    <Flame className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="text-[15px] font-black text-foreground block tracking-tight">🕯️ Jejum (Páscoa)</span>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">
                      {fasting.plan ? fasting.plan.plan_name : "Iniciar percurso"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:translate-x-1 transition-transform" />
              </div>

              {fasting.plan ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600">Dia {fastingDayNumber}/{fasting.plan.total_days}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className={cn(
                        "rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-wider",
                        fasting.todayResult === "cumprido" ? "bg-green-500/20 text-green-700" :
                          fasting.todayResult === "parcial" ? "bg-yellow-400/20 text-yellow-700" :
                            fasting.todayResult === "falhei" ? "bg-red-500/20 text-red-700" :
                              "bg-muted/50 text-muted-foreground"
                      )}>
                        {fasting.todayResult ? dayResultLabel(fasting.todayResult as any) : "Pendente"}
                      </span>
                    </div>
                    <span className="text-amber-600 font-black">{fastingProgress}%</span>
                  </div>
                  <Progress value={fastingProgress} className="h-2 rounded-full overflow-hidden bg-amber-500/10" />
                </>
              ) : (
                <p className="text-xs text-muted-foreground/80 font-medium">Faltam {daysToEaster} dias para a Páscoa. Prepara-te para a ressurreição! ✨</p>
              )}
            </div>
          </button>

          {/* Chat Quick Access */}
          <button
            onClick={() => navigate("/chat")}
            className="glass-card glass-card-hover group relative flex w-full items-center gap-4 rounded-[2.5rem] p-5 text-left active:scale-[0.96] transition-all duration-300 animate-fade-slide-up stagger-4"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-black text-foreground tracking-tight">Conversas</span>
                {chatUnread > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-lg shadow-glow">
                    {chatUnread}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/80 font-medium line-clamp-1 mt-0.5 italic">
                {chatPreview.preview ?? "Envia um beijinho agora..."}
              </p>
            </div>
          </button>
        </div>

        {/* Small Gesture Nudge */}
        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all gap-2 py-1 h-auto"
            onClick={() => {
              notifyPartner({
                couple_space_id: useCoupleSpaceId() || "",
                title: "Hora de um mimo 💌",
                body: "Hora de um pequeno gesto 💌",
                url: "/chat",
                type: "chat",
                template_key: "small_gesture"
              });
              toast.success("Enviado com sucesso! 💌", {
                description: "O parceiro recebeu o teu convite para um pequeno gesto."
              });
            }}
          >
            <Coffee className="w-3 h-3" />
            Enviar um pequeno gesto
          </Button>
        </div>
      </div>

      {/* ── Nossa Vida Section ── */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 px-2">
          🏠 Nossa Vida
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <DashCard
            icon={<CheckSquare className="h-5 w-5" />}
            title="Tarefas"
            lines={[
              tasks.open > 0 ? `${tasks.open} pendentes` : "Tudo em dia ✓",
              tasks.doneToday > 0 ? `${tasks.doneToday} feitas hoje` : " ",
            ]}
            to="/tarefas"
            badge={tasksUnread}
            accent="bg-emerald-500/10 text-emerald-600"
          />
          <DashCard
            icon={<Smile className="h-5 w-5" />}
            title="Humor"
            lines={[
              mood.mine ? `Tu: ${mood.mine.emoji}` : "Registar hoje",
              mood.partner ? `Par: ${mood.partner.emoji}` : "Esperando par...",
            ]}
            to="/humor"
            badge={moodUnread}
            accent="bg-orange-500/10 text-orange-600"
          />
          <DashCard
            icon={<Camera className="h-5 w-5" />}
            title="Memórias"
            lines={[
              photoCount > 0 ? `${photoCount} fotos` : "Sem fotos",
              "Novas recordações 📸",
            ]}
            to="/memorias"
            badge={memoriesUnread}
            accent="bg-blue-500/10 text-blue-600"
          />
          <DashCard
            icon={<CalendarDays className="h-5 w-5" />}
            title="Agenda"
            lines={[
              nextEvent ? nextEvent.title : "Sem eventos",
              nextEvent ? format(new Date(nextEvent.date + "T12:00:00"), "d MMM", { locale: pt }) : "Planear algo 📅",
            ]}
            to="/agenda"
            badge={scheduleUnread}
            accent="bg-purple-500/10 text-purple-600"
          />
        </div>
      </div>

      {/* ── Crescimento & Diversão ── */}
      <div className="space-y-4 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 px-2">
          ✨ Crescimento
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <DashCard
            icon={<Trophy className="h-5 w-5" />}
            title="Desafios"
            lines={["Concluir Desafios", "Ganhar Pontos 🎯"]}
            to="/desafios"
            accent="bg-yellow-500/10 text-yellow-600"
          />
          <DashCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Wrapped"
            lines={["Resumo Mensal", "Revive memórias"]}
            to="/wrapped"
            accent="bg-pink-500/10 text-pink-500"
          />
          <DashCard
            icon={<BookHeart className="h-5 w-5" />}
            title="Oração"
            lines={[
              prayer.myPrayed ? "Rezei hoje ✓" : "Não rezei",
              prayer.partnerPrayed ? "Par rezou ✓" : "Par pendente",
            ]}
            to="/oracao"
            badge={prayerUnread}
            accent="bg-amber-500/10 text-amber-600"
          />
          <DashCard
            icon={<Clock className="h-5 w-5" />}
            title="Cápsula"
            lines={["Mensagens 🔒", "Futuro Amor"]}
            to="/capsula"
            accent="bg-cyan-500/10 text-cyan-600"
          />
        </div>

        {/* Invite Card */}
        <div className="glass-card bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 rounded-[2.5rem] p-6 flex items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-[1.25rem] bg-white/50 flex items-center justify-center text-primary shadow-sm group-hover:rotate-12 transition-transform">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight">Convidar Amigos</h4>
              <p className="text-[10px] text-muted-foreground font-bold">50 Pontos por cada convite! 💰</p>
            </div>
          </div>
          <button
            onClick={handleShareReferral}
            className="bg-primary text-primary-foreground text-xs font-black px-5 py-2.5 rounded-full shadow-glow active:scale-95 transition-all"
          >
            Partilhar
          </button>
        </div>
      </div>
    </section>
  );
};

export default Index;
