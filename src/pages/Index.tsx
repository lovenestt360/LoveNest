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


import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notifyPartner } from "@/lib/notifyPartner";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/features/feature-access/FeatureAccessContext";
import { useEmotionalFeed } from "@/hooks/useEmotionalFeed";
import { EmotionalFeed } from "@/components/EmotionalFeed";
import { PartnerPresenceCard } from "@/components/PartnerPresenceCard";
import { DailyRitualCard } from "@/components/DailyRitualCard";

/* ── Components ── */
import { DashCard } from "@/features/home/components/DashCard";
import { TimeTogetherCard } from "@/features/home/components/TimeTogetherCard";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { LoveStreakCard } from "@/components/LoveStreakCard";
import { Coffee } from "lucide-react";

/* ── data hooks ── */

function usePlanoStats() {
  const spaceId = useCoupleSpaceId();
  const [pending, setPending] = useState(0);
  const [next, setNext] = useState<{ title: string; time: string | null } | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    (supabase.from("plano_items" as any)
      .select("title,plan_at,completed")
      .eq("couple_space_id", spaceId) as any)
      .then(({ data }: any) => {
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
    (supabase.from("mood_checkins" as any).select("mood_key,mood_percent,user_id")
      .eq("couple_space_id", spaceId).eq("day_key", today) as any)
      .then(({ data }: any) => {
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
    (supabase.from("photos" as any).select("id", { count: "exact", head: true })
      .eq("couple_space_id", spaceId) as any)
      .then(({ count: c }: any) => setCount(c ?? 0));
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
    (supabase.from("daily_spiritual_logs" as any).select("prayed_today,user_id")
      .eq("couple_space_id", spaceId).eq("day_key", today) as any)
      .then(({ data }: any) => {
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

const AppIconButton = ({
  icon,
  label,
  to,
  badge,
  color
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number | string;
  color: string;
}) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-[#f0f0f0] shadow-sm active:scale-95 transition-all"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", color)}>
        {icon}
      </div>
      {badge && badge !== 0 ? (
        <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          {badge}
        </span>
      ) : null}
      <span className="text-[10px] font-semibold text-[#717171]">{label}</span>
    </button>
  );
};

const Index = () => {
  const time = useTimeTogether();
  const navigate = useNavigate();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });
  const { isEnabled } = useFeatureAccess();
  


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
  const feed = useEmotionalFeed();

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

  const currentMessage = (() => {
    const hour = new Date().getHours();
    const morning = [
      "Bom dia, ninho 🌅 Como começa o coração hoje?",
      "A manhã é mais suave quando há amor perto ☀️",
      "Um novo dia, uma nova oportunidade de estar presente 🌿",
    ];
    const afternoon = [
      "Pequenos gestos constroem grandes amores ✨",
      "Estar presente é o maior gesto de amor 💛",
      "O amor que cuidam cresce sem que percebam 🌿",
      "Cada dia juntos é um presente que não se repete 🎁",
    ];
    const evening = [
      "O fim do dia é o melhor momento para se encontrarem 🌙",
      "A vossa chama ainda vos espera esta noite 🔥",
      "O silêncio partilhado também é intimidade 🌙",
      "Não deixem o dia acabar sem um gesto de amor 💛",
    ];
    const night = [
      "O amor que cuidam cresce enquanto dormem 🌿",
      "O vosso ninho é o vosso lugar seguro 🏠",
      "Amanhã trazem a vossa presença um ao outro ✨",
    ];
    const pool = hour >= 6 && hour < 12 ? morning
               : hour >= 12 && hour < 19 ? afternoon
               : hour >= 19 && hour < 23 ? evening : night;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return pool[dayOfYear % pool.length];
  })();

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-lg mx-auto overflow-x-hidden">
      {/* ── Premium Header & Greeting ── */}
      <div className="space-y-4">
        <HomeHeader me={avatars.me} partner={avatars.partner} today={today} loading={avatars.loading} />
        
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
           <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/40 italic">
             {currentMessage}
           </p>
        </div>
      </div>

      {/* ── Visual Highlights ── */}
      <div className="space-y-4 px-1">
        <TimeTogetherCard 
          days={time.days} hours={time.hours} minutes={time.minutes} seconds={time.seconds} 
          streak={0} hasDate={!!time.startDate} onSetDate={() => navigate("/configuracoes")} 
        />

        <LoveStreakCard />

        {/* Partner Presence Indicator — Pillar 1: Emotional Presence */}
        {avatars.partner && <PartnerPresenceCard />}

        {/* Global Announcements */}
        {announcements.map((ann) => (
          <div key={ann.id} className="glass-card border-amber-500/20 bg-amber-500/5 text-amber-700 p-4 rounded-3xl animate-in fade-in zoom-in duration-500 shadow-sm border">
            <h3 className="font-black text-[10px] flex items-center gap-2 mb-1 uppercase tracking-widest opacity-60">
              <Megaphone className="w-3 h-3" /> {ann.title}
            </h3>
            <p className="text-sm font-bold tracking-tight">{ann.content}</p>
          </div>
        ))}

        <InstallBanner />
        

      </div>

      {/* ── DAILY RITUAL — Pillar 3: Ritual Loop System ── */}
      <section className="px-1">
        <DailyRitualCard />
      </section>

      {/* ── MAIN TOOL GRID ── */}
      <section className="space-y-3 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] px-1">
          O vosso dia a dia
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <DashCard
            icon={<CheckSquare className="h-5 w-5" strokeWidth={1.5} />}
            title="Agenda"
            lines={[
              plano.pending > 0 ? `${plano.pending} a aguardar vocês` : "Em paz por hoje ✨",
              plano.next ? `${plano.next.time} · ${plano.next.title}` : "Adicionem algo especial",
            ]}
            to="/plano"
            badge={tasksUnread + scheduleUnread}
            accent="text-blue-500"
          />

          <DashCard
            icon={<Smile className="h-5 w-5" strokeWidth={1.5} />}
            title="Humor"
            lines={[
              mood.mine ? `Tu: ${mood.mine.emoji} ${mood.mine.label}` : "Como te sentes hoje?",
              mood.partner ? `Par: ${mood.partner.emoji} ${mood.partner.label}` : "O teu par ainda não partilhou",
            ]}
            to="/humor"
            badge={moodUnread}
            accent="text-amber-500"
          />

          {isEnabled("home_conversas") && (
            <DashCard
              icon={<MessageCircle className="h-5 w-5" strokeWidth={1.5} />}
              title="Chat"
              lines={[
                chatUnread > 0 ? `${chatUnread} mensagens à espera de ti` : "Um beijo em texto...",
                chatPreview.preview ?? "Escreve a primeira mensagem hoje",
              ]}
              to="/chat"
              badge={chatUnread}
              accent="text-sky-500"
            />
          )}

          {isEnabled("home_jejum") && (
            <DashCard
              icon={<Flame className="h-5 w-5" strokeWidth={1.5} />}
              title="Jejum"
              lines={[
                fasting.streak > 0 ? `${fasting.streak} dias de disciplina 🔥` : "Comecem o jejum hoje",
                fastingProgress > 0 ? `${fastingProgress}% da jornada feita` : "Cada dia conta",
              ]}
              to="/jejum"
              accent="text-orange-500"
            />
          )}

          <DashCard
            icon={<Flower2 className="h-5 w-5" strokeWidth={1.5} />}
            title="Ciclo"
            lines={["Saúde & Sintonia", "Ver o vosso ciclo"]}
            to="/ciclo"
            accent="text-pink-500"
          />

          {isEnabled("home_oracao") && (
            <DashCard
              icon={<BookHeart className="h-5 w-5" strokeWidth={1.5} />}
              title="Oração"
              lines={[
                prayer.myPrayed ? "Tu: em oração 🙏" : "Partilha a tua oração hoje",
                prayer.partnerPrayed ? "Par: em oração 🙏" : "O teu par ainda não orou hoje",
              ]}
              to="/oracao"
              badge={prayerUnread}
              accent="text-purple-500"
            />
          )}
        </div>
      </section>

      {/* ── SECONDARY TOOLS GRID (3 Columns) ── */}
      <section className="space-y-3 px-1">
        <h2 className="text-[11px] font-semibold text-[#717171] px-1">
          Memórias & Aventuras
        </h2>

        <div className="grid grid-cols-3 gap-2">
          {isEnabled("home_memories") && (
            <AppIconButton
              icon={<Camera className="w-5 h-5" />}
              label="Memórias"
              badge={memoriesUnread}
              to="/memorias"
              color="text-violet-500"
            />
          )}

          {isEnabled("home_desafios") && (
            <AppIconButton
              icon={<Trophy className="w-5 h-5" />}
              label="Desafios"
              to="/desafios"
              color="text-blue-500"
            />
          )}

          {isEnabled("home_wrapped") && (
            <AppIconButton
              icon={<Sparkles className="w-5 h-5" />}
              label="Wrapped"
              badge={hasWrapped ? "!" : 0}
              to="/wrapped"
              color="text-rose-500"
            />
          )}

          {isEnabled("home_capsula") && (
            <AppIconButton
              icon={<Clock className="w-5 h-5" />}
              label="Cápsula"
              to="/capsula"
              color="text-primary"
            />
          )}

           {isEnabled("home_descobrir") && (
            <AppIconButton
              icon={<Compass className="w-5 h-5" />}
              label="Descobrir"
              to="/descobrir"
              color="text-emerald-500"
            />
          )}
        </div>
      </section>

      {/* ── EMOTIONAL FEED PREVIEW ── */}
      {(feed.loading || feed.items.length > 0) && (
        <section className="space-y-3 px-1">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
              Momentos juntos
            </h2>
            <button
              onClick={() => navigate("/momentos")}
              className="flex items-center gap-1 text-[11px] font-medium text-rose-400 active:opacity-70 transition-opacity"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <EmotionalFeed items={feed.items} loading={feed.loading} limit={4} />
        </section>
      )}

      {/* ── Footer / Invite Section ── */}
      <div className="space-y-4 pt-4 px-1">
        {!avatars.partner && houseInviteCode && (
          <div className="glass-card bg-gradient-to-br from-primary/15 to-transparent border-primary/20 rounded-[2.5rem] p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-4 text-center justify-center flex-col">
                <HeartHandshake className="w-8 h-8 text-primary" />
                <h3 className="text-sm font-black tracking-tight">O vosso ninho ainda aguarda o par 🕊️</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Partilha o código com quem amas</p>
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
          className="w-full bg-white border border-[#f0f0f0] rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-[13px] font-semibold text-foreground">Partilha o amor</h4>
              <p className="text-[11px] text-[#717171]">Ganha 50 pts por cada casal que convidas</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#c0c0c0]" />
        </button>
      </div>
    </div>
  );
};

export default Index;
