import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  CheckSquare, Smile, Camera, CalendarDays, BookHeart, CalendarHeart,
  HeartHandshake, MessageCircle, Heart, Flower2,
  ArrowRight, Megaphone, Trophy, Clock, Sparkles, Share2, Compass
} from "lucide-react";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { useProfile } from "@/hooks/useProfile";


import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notifyPartner } from "@/lib/notifyPartner";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/features/feature-access/FeatureAccessContext";
import { PartnerPresenceCard } from "@/components/PartnerPresenceCard";
import { useStreak } from "@/features/streak/useStreak";
import { useMilestone } from "@/hooks/useMilestone";
import { getMilestoneMicroMemory, getMilestoneCeremonyContent } from "@/components/MilestoneModal";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { getJourneyLevel } from "@/features/streak/journeyLevels";
import { triggerCeremony, dispatchCeremony } from "@/lib/ceremonies";

/* ── Components ── */
import { DashCard } from "@/features/home/components/DashCard";
import { TimeTogetherCard } from "@/features/home/components/TimeTogetherCard";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { LoveStreakCard } from "@/components/LoveStreakCard";
import { Coffee } from "lucide-react";

/* ── data hooks ── */

function usePlanoStats() {
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["plano-stats", spaceId],
    enabled: !!spaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: rows } = await (supabase.from("plano_items" as any)
        .select("title,plan_at,completed").eq("couple_space_id", spaceId) as any);
      if (!rows) return { pending: 0, next: null };
      const pending = (rows as any[]).filter(t => !t.completed).length;
      const upcoming = (rows as any[])
        .filter(t => !t.completed && t.plan_at)
        .sort((a, b) => a.plan_at!.localeCompare(b.plan_at!))[0];
      return {
        pending,
        next: upcoming ? { title: upcoming.title, time: format(new Date(upcoming.plan_at!), "HH:mm") } : null,
      };
    },
  });
  return { pending: data?.pending ?? 0, next: data?.next ?? null };
}

const MOOD_MAP: Record<string, [string, string]> = {
  feliz: ["😊", "Feliz"], tranquilo: ["😌", "Tranquilo"], apaixonado: ["🥰", "Apaixonado"],
  ansioso: ["😰", "Ansioso"], triste: ["😢", "Triste"], cansado: ["😴", "Cansado"],
  irritado: ["😤", "Irritado"], grato: ["🙏", "Grato"],
};

function useMoodToday() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = useQuery({
    queryKey: ["mood-today", spaceId, user?.id, today],
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows } = await (supabase.from("mood_checkins" as any)
        .select("mood_key,user_id").eq("couple_space_id", spaceId).eq("day_key", today) as any);
      if (!rows) return { mine: null, partner: null };
      const myRow = rows.find((d: any) => d.user_id === user!.id);
      const partnerRow = rows.find((d: any) => d.user_id !== user!.id);
      const toMood = (row: any) => {
        const [emoji, label] = MOOD_MAP[row.mood_key] ?? ["😶", row.mood_key];
        return { emoji, label };
      };
      return { mine: myRow ? toMood(myRow) : null, partner: partnerRow ? toMood(partnerRow) : null };
    },
  });
  return { mine: data?.mine ?? null, partner: data?.partner ?? null };
}

function usePhotoCount() {
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["photo-count", spaceId],
    enabled: !!spaceId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count: c } = await (supabase.from("photos" as any)
        .select("id", { count: "exact", head: true }).eq("couple_space_id", spaceId) as any);
      return c ?? 0;
    },
  });
  return data ?? 0;
}
function usePrayerStatus() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = useQuery({
    queryKey: ["prayer-status", spaceId, user?.id, today],
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows } = await (supabase.from("daily_spiritual_logs" as any)
        .select("prayed_today,user_id").eq("couple_space_id", spaceId).eq("day_key", today) as any);
      if (!rows) return { myPrayed: false, partnerPrayed: false };
      return {
        myPrayed: (rows as any[]).some(d => d.user_id === user!.id && d.prayed_today),
        partnerPrayed: (rows as any[]).some(d => d.user_id !== user!.id && d.prayed_today),
      };
    },
  });
  return { myPrayed: data?.myPrayed ?? false, partnerPrayed: data?.partnerPrayed ?? false };
}

function useOpenComplaints() {
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["open-complaints", spaceId],
    enabled: !!spaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count: c } = await supabase.from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("couple_space_id", spaceId!).in("status", ["open", "talking"]);
      return c ?? 0;
    },
  });
  return data ?? 0;
}

function useWrappedStatus() {
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["wrapped-status", spaceId],
    enabled: !!spaceId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const now = new Date();
      let month = now.getMonth();
      let year = now.getFullYear();
      if (month === 0) { month = 12; year -= 1; }
      const { data: row } = await supabase.from("love_wrapped").select("id")
        .eq("couple_space_id", spaceId!).eq("month", month).eq("year", year).maybeSingle();
      return !!row;
    },
  });
  return data ?? false;
}

function useMessagePreview() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["message-preview", spaceId],
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: msgs } = await supabase.from("messages")
        .select("content,sender_user_id,created_at")
        .eq("couple_space_id", spaceId!).order("created_at", { ascending: false }).limit(1);
      if (!msgs?.[0]) return { preview: null, lastTime: null };
      const prefix = msgs[0].sender_user_id === user?.id ? "Tu: " : "";
      const text = msgs[0].content;
      return {
        preview: prefix + (text.length > 40 ? text.slice(0, 40) + "…" : text),
        lastTime: msgs[0].created_at,
      };
    },
  });
  return { preview: data?.preview ?? null, lastTime: data?.lastTime ?? null };
}



function useReferralCode() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["referral-code", user?.id],
    enabled: !!user,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data: row } = await supabase.from("profiles")
        .select("referral_code").eq("user_id", user!.id).maybeSingle();
      return row?.referral_code ?? null;
    },
  });
  return data ?? null;
}

function useHouseInviteCode() {
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["house-invite-code", spaceId],
    enabled: !!spaceId,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data: row } = await supabase.from("couple_spaces")
        .select("invite_code").eq("id", spaceId!).maybeSingle();
      return row?.invite_code ?? null;
    },
  });
  return data ?? null;
}

function useFastingHome() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["fasting-home", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: p } = await (supabase.from("fasting_profiles" as any).select("*")
        .eq("user_id", user!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle() as any);
      if (!p) return { plan: null, loggedDays: 0, todayResult: null, streak: 0 };
      const profile = p as any;
      const plan = { plan_name: profile.plan_name, start_date: profile.start_date,
        end_date: profile.end_date, total_days: profile.total_days };
      const { data: logs } = await (supabase.from("fasting_day_logs" as any)
        .select("day_key,result,finalized").eq("user_id", user!.id).eq("profile_id", profile.id) as any);
      if (!logs) return { plan, loggedDays: 0, todayResult: null, streak: 0 };
      const today = new Date().toISOString().slice(0, 10);
      const finalized = (logs as any[]).filter(l => l.finalized);
      const todayResult = (logs as any[]).find(l => l.day_key === today)?.result ?? null;
      let s = 0;
      for (let i = 0; i < 100; i++) {
        const dd = new Date(); dd.setDate(dd.getDate() - i);
        const key = dd.toISOString().slice(0, 10);
        if (finalized.find((l: any) => l.day_key === key && l.result === "cumprido")) s++; else break;
      }
      return { plan, loggedDays: finalized.length, todayResult, streak: s };
    },
  });
  return { plan: data?.plan ?? null, loggedDays: data?.loggedDays ?? 0,
    todayResult: data?.todayResult ?? null, streak: data?.streak ?? 0 };
}

function useCycleHome() {
  const { user } = useAuth();
  const { targetUserId, isMale, loadingTarget } = useCycleTarget();
  const { data } = useQuery({
    queryKey: ["cycle-home", targetUserId],
    enabled: !!user && !loadingTarget && !!targetUserId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [pRes, peRes] = await Promise.all([
        supabase.from("cycle_profiles").select("*").eq("user_id", targetUserId!).maybeSingle(),
        supabase.from("period_entries").select("*").eq("user_id", targetUserId!)
          .order("start_date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return { profile: pRes.data as CycleProfile | null, lastPeriod: peRes.data as PeriodEntry | null };
    },
  });
  const profile = data?.profile ?? null;
  const lastPeriod = data?.lastPeriod ?? null;
  const info = computeCycleInfo(profile, lastPeriod);
  return { profile, info, isMale };
}

function useGlobalAnnouncements() {
  const { data } = useQuery({
    queryKey: ["global-announcements"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("admin_announcements").select("*")
        .eq("active", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return data ?? [];
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
      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border shadow-sm active:scale-95 transition-all"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", color)}>
        {icon}
      </div>
      {badge && badge !== 0 ? (
        <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-card shadow-sm">
          {badge}
        </span>
      ) : null}
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </button>
  );
};

const Index = () => {
  const time = useTimeTogether();
  const navigate = useNavigate();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });
  const { isEnabled } = useFeatureAccess();

  // Track app opens — used to defer notification permission to 3rd open
  useEffect(() => {
    const current = parseInt(localStorage.getItem("app_open_count") || "0", 10);
    localStorage.setItem("app_open_count", String(current + 1));
  }, []);
  


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
  const spaceId = useCoupleSpaceId();
  const { nextSpecialDate } = useRelationshipEvents(spaceId);
  const { profile, loading: profileLoading } = useProfile();
  const isSolo = profile?.usage_mode === "solo";
  // Evita o flash de cartões de casal antes do perfil carregar (profile
  // começa null, logo isSolo seria false por um instante para quem é solo).
  const profileReady = !profileLoading;
  const { streak: streakData } = useStreak();
  const { pendingMilestone, recentMilestone, confirmMilestone } = useMilestone(
    streakData?.currentStreak ?? 0,
    spaceId
  );
  const bothActiveToday = streakData?.bothActiveToday ?? false;

  // ── Cerimónias ──────────────────────────────────────────────────────────
  // Marcos de streak já têm o seu próprio dedupe (relationship_milestones,
  // via useMilestone acima) — quando um novo marco aparece, mostramos a
  // Cerimónia em vez do antigo modal e confirmamos como já visto.
  useEffect(() => {
    if (!pendingMilestone) return;
    const content = getMilestoneCeremonyContent(pendingMilestone);
    if (content) dispatchCeremony(content);
    confirmMilestone();
  }, [pendingMilestone, confirmMilestone]);

  // Subida de Nível da Jornada — dedupe via ceremonies_log (ver lib/ceremonies.ts).
  // lifetimePoints = total alguma vez ganho (nunca desce ao gastar) — é
  // este que define o Nível da Jornada, nunca o saldo gastável.
  const [lifetimePoints, setLifetimePoints] = useState(0);
  useEffect(() => {
    if (!spaceId) return;
    const fetchPoints = () => {
      supabase.rpc("get_lifetime_points" as any, { p_couple_space_id: spaceId }).then(({ data }) => {
        if (typeof data === "number") setLifetimePoints(data);
      });
    };
    fetchPoints();
    window.addEventListener("streak-updated", fetchPoints);
    return () => window.removeEventListener("streak-updated", fetchPoints);
  }, [spaceId]);

  useEffect(() => {
    if (!spaceId || lifetimePoints <= 0) return;
    const journey = getJourneyLevel(lifetimePoints);
    if (journey.level <= 1) return;
    triggerCeremony(spaceId, "level_up", String(journey.level), {
      type: "level_up",
      eyebrow: "Novo nível da Jornada",
      title: `Nível ${journey.level} — ${journey.name}`,
      subtitle: isSolo
        ? "O teu cuidado contigo próprio fez-te crescer."
        : "O vosso cuidado diário fez-vos crescer.",
    });
  }, [spaceId, lifetimePoints, isSolo]);

  // Aniversário de relação — recorrência anual, dispara no próprio dia.
  useEffect(() => {
    if (!spaceId || !nextSpecialDate || nextSpecialDate.daysUntil !== 0) return;
    const year = new Date().getFullYear();
    triggerCeremony(spaceId, "aniversario", `${nextSpecialDate.id}_${year}`, {
      type: "aniversario",
      eyebrow: "Aniversário",
      title: nextSpecialDate.title,
      subtitle: isSolo ? "Mais um ano da tua história." : "Mais um ano a escolherem-se.",
    });
  }, [spaceId, nextSpecialDate, isSolo]);

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

  const phrasePool = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return [
      "A manhã é mais suave quando há amor perto",
      "Um novo dia, uma nova oportunidade de estar presente",
      "Bom dia — como começa o coração hoje?",
    ];
    if (hour >= 12 && hour < 19) return [
      "Pequenos gestos constroem grandes amores",
      "O amor que cuidam cresce sem que percebam",
      "O silêncio partilhado também é intimidade.",
      "Cada dia juntos é um presente que não se repete",
    ];
    if (hour >= 19 && hour < 23) return [
      "O fim do dia é o melhor momento para se encontrarem",
      "Não deixem o dia acabar sem um gesto de amor",
      "Pequenos gestos tornam-se história.",
    ];
    return [
      "O amor que cuidam cresce enquanto dormem",
      "O vosso ninho é o vosso lugar seguro",
      "Amanhã trazem a vossa presença um ao outro",
    ];
  }, []);

  const [phraseIdx, setPhraseIdx]       = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % phrasePool.length);
        setPhraseVisible(true);
      }, 550);
    }, 8000);
    return () => clearInterval(id);
  }, [phrasePool]);

  const currentMessage = phrasePool[phraseIdx];
  const phraseColor    = "#F43F5E";

  return (
    <>

      <div className="space-y-6 animate-fade-in pb-20 max-w-lg mx-auto overflow-x-hidden">
      {/* ── Premium Header & Greeting ── */}
      <div className="space-y-4">
        <HomeHeader me={avatars.me} partner={avatars.partner} today={today} loading={avatars.loading} />
        
        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-1200" style={{ animationDelay: "400ms" }}>
          <div className="w-6 h-px rounded-full" style={{ background: phraseColor, opacity: 0.45 }} />
          <p
            className="text-[13px] font-medium tracking-wide leading-relaxed text-center px-6"
            style={{
              color:      phraseColor,
              opacity:    phraseVisible ? 1 : 0,
              transition: "opacity 550ms ease-in-out",
            }}
          >
            {currentMessage}
          </p>
        </div>
      </div>

      {/* ── Visual Highlights ── */}
      <div className="space-y-4 px-1">
        {profileReady && !isSolo && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "0ms" }}>
            <TimeTogetherCard
              days={time.days} hours={time.hours} minutes={time.minutes} seconds={time.seconds}
              streak={0} hasDate={!!time.startDate} startDate={time.startDate}
              onSetDate={() => navigate("/configuracoes")}
              nextSpecialDate={isEnabled("home_historia") ? nextSpecialDate : null}
              onViewHistory={() => navigate("/historia")}
            />
          </div>
        )}

        {profileReady && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "80ms" }}>
            <LoveStreakCard />
            {/* Milestone micro-memory — visible for 24h after any streak milestone */}
            {recentMilestone && (
              <p className="text-center text-[10px] text-muted-foreground/65 font-medium px-2 mt-1.5 animate-in fade-in duration-500">
                {getMilestoneMicroMemory(recentMilestone)}
              </p>
            )}
          </div>
        )}

        {/* Partner Presence Indicator */}
        {avatars.partner && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "160ms" }}>
            <PartnerPresenceCard />
          </div>
        )}

        {/* Global Announcements */}
        {announcements.map((ann) => (
          <div key={ann.id} className="glass-card border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300 p-4 rounded-3xl animate-in fade-in zoom-in duration-500 shadow-sm border">
            <h3 className="font-black text-[10px] flex items-center gap-2 mb-1 uppercase tracking-widest opacity-60">
              <Megaphone className="w-3 h-3" /> {ann.title}
            </h3>
            <p className="text-sm font-bold tracking-tight">{ann.content}</p>
          </div>
        ))}

        <InstallBanner />
        

      </div>

      {/* ── MAIN TOOL GRID ── */}
      <section className="space-y-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: "220ms" }}>
        <div className="flex items-center gap-3 px-1">
          <div className="w-0.5 h-4 rounded-full" style={{ background: "#FECDD3" }} />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            O vosso dia a dia
          </h2>
        </div>
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
              mood.mine ? `Tu: ${mood.mine.emoji} ${mood.mine.label}` : "Como está o teu coração hoje?",
              mood.partner ? `Par: ${mood.partner.emoji} ${mood.partner.label}` : "Partilha como te sentes",
            ]}
            to="/humor"
            badge={moodUnread}
            accent="text-pink-500"
          />

          {isEnabled("home_conversas") && profileReady && !isSolo && (
            <DashCard
              icon={<MessageCircle className="h-5 w-5" strokeWidth={1.5} />}
              title="Chat"
              lines={[
                chatUnread > 0 ? `${chatUnread} mensagens à espera de ti` : "Uma pequena mensagem importa",
                chatPreview.preview ?? "Às vezes presença começa aqui",
              ]}
              to="/chat"
              badge={chatUnread}
              accent="text-sky-500"
            />
          )}

          {(isEnabled("home_jejum") || isEnabled("home_oracao")) && profileReady && profile?.religion !== "none" && (
            <DashCard
              icon={<BookHeart className="h-5 w-5" strokeWidth={1.5} />}
              title="Jornada Espiritual"
              lines={[
                prayer.myPrayed ? "Em oração hoje" : fasting.streak > 0 ? `${fasting.streak} dias de jejum` : "Oração e disciplina",
                fastingProgress > 0 ? `${fastingProgress}% da jornada` : "Cuidem a alma juntos",
              ]}
              to="/jornada-espiritual"
              badge={prayerUnread}
              accent="text-purple-500"
            />
          )}

          {!(profileReady && isSolo && profile?.gender === "male") && (
            <DashCard
              icon={<Flower2 className="h-5 w-5" strokeWidth={1.5} />}
              title="Ciclo"
              lines={["Saúde & Sintonia", "Ver o vosso ciclo"]}
              to="/ciclo"
              accent="text-pink-500"
            />
          )}

          {profileReady && !isSolo && (
            <DashCard
              icon={<HeartHandshake className="h-5 w-5" strokeWidth={1.5} />}
              title="Conflitos"
              lines={["Resolver juntos", "Com calma e amor"]}
              to="/conflitos"
              badge={complaintsUnread}
              accent="text-rose-500"
            />
          )}
        </div>
      </section>

      {/* ── SECONDARY TOOLS GRID (3 Columns) ── */}
      <section className="space-y-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: "340ms" }}>
        <div className="flex items-center gap-3 px-1">
          <div className="w-0.5 h-4 rounded-full" style={{ background: "#FECDD3" }} />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Memórias & Aventuras
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {isEnabled("home_memories") && profileReady && !isSolo && (
            <AppIconButton
              icon={<Camera className="w-5 h-5" />}
              label="Memórias"
              badge={memoriesUnread}
              to="/memorias"
              color="text-violet-500"
            />
          )}

          {isEnabled("home_historia") && profileReady && !isSolo && (
            <AppIconButton
              icon={<CalendarHeart className="w-5 h-5" />}
              label="Nossa História"
              to="/historia"
              color="text-fuchsia-500"
            />
          )}

          {isEnabled("home_desafios") && profileReady && !isSolo && (
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

          {isEnabled("home_capsula") && profileReady && !isSolo && (
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

{/* ── Footer / Invite Section ── */}
      <div className="space-y-4 pt-4 px-1">
        {profileReady && !isSolo && !avatars.partner && houseInviteCode && (
          <div className="glass-card bg-gradient-to-br from-primary/15 to-transparent border-primary/20 rounded-[2.5rem] p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-4 text-center justify-center flex-col">
                <HeartHandshake className="w-8 h-8 text-primary" />
                <h3 className="text-sm font-black tracking-tight">O vosso ninho ainda aguarda o par 🕊️</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Partilha o código com quem amas</p>
             </div>
             <div className="flex gap-2">
                <div className="flex-1 bg-white/50 dark:bg-white/5 border border-primary/10 rounded-2xl h-12 flex items-center justify-center font-black text-lg tracking-widest text-primary shadow-inner">
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
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-[13px] font-semibold text-foreground">Partilha o amor</h4>
              <p className="text-[11px] text-muted-foreground">Ganha 50 pts por cada casal que convidas</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
        </button>
      </div>
    </div>
  </>
  );
};

export default Index;
