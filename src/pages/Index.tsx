import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  BookHeart,
  CalendarDays,
  CalendarHeart,
  Clock3,
  HeartHandshake,
  Images,
  Library,
  MessageCircle,
  Smile,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { todayLocal } from "@/lib/timezone";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { supabase } from "@/integrations/supabase/client";
import { InstallBanner } from "@/features/pwa/InstallBanner";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useStreak } from "@/features/streak/useStreak";
import { useMilestone } from "@/hooks/useMilestone";
import {
  getMilestoneMicroMemory,
  getMilestoneCeremonyContent,
} from "@/components/MilestoneModal";
import { useRelationshipEvents } from "@/features/relationship-events/useRelationshipEvents";
import { getJourneyLevel } from "@/features/streak/journeyLevels";
import { triggerCeremony, dispatchCeremony } from "@/lib/ceremonies";
import { capsuleSeenKey } from "@/features/capsule/CapsuleRealtimeWatcher";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { TimeTogetherCard } from "@/features/home/components/TimeTogetherCard";
import {
  AdventuresBento,
  DailyDock,
  SectionLabel,
  ShareLoveRow,
  type AdventureTile,
  type DailyShortcut,
} from "@/features/home/components/HomeSections";
import { LocationHomeCard } from "@/features/location/LocationHomeCard";
import { LoveStreakCard } from "@/components/LoveStreakCard";
import { cn } from "@/lib/utils";

const MOOD_MAP: Record<string, [string, string]> = {
  feliz: ["😊", "Feliz"],
  tranquilo: ["😌", "Tranquilo"],
  apaixonado: ["🥰", "Apaixonado"],
  ansioso: ["😰", "Ansioso"],
  triste: ["😢", "Triste"],
  cansado: ["😴", "Cansado"],
  irritado: ["😤", "Irritado"],
  grato: ["🙏", "Grato"],
};

function usePlanoStats() {
  const spaceId = useCoupleSpaceId();
  const { data } = useQuery({
    queryKey: ["plano-stats", spaceId],
    enabled: !!spaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: rows } = await (supabase
        .from("plano_items" as any)
        .select("title,plan_at,completed")
        .eq("couple_space_id", spaceId) as any);

      if (!rows) return { pending: 0, next: null };

      const pending = (rows as any[]).filter((item) => !item.completed).length;
      const upcoming = (rows as any[])
        .filter((item) => !item.completed && item.plan_at)
        .sort((a, b) => a.plan_at.localeCompare(b.plan_at))[0];

      return {
        pending,
        next: upcoming
          ? { title: upcoming.title, time: format(new Date(upcoming.plan_at), "HH:mm") }
          : null,
      };
    },
  });

  return { pending: data?.pending ?? 0, next: data?.next ?? null };
}

function useMoodToday() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const today = todayLocal();

  const { data } = useQuery({
    queryKey: ["mood-today", spaceId, user?.id, today],
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows } = await (supabase
        .from("mood_checkins" as any)
        .select("mood_key,user_id")
        .eq("couple_space_id", spaceId)
        .eq("day_key", today) as any);

      if (!rows) return { mine: null, partner: null };

      const mine = rows.find((row: any) => row.user_id === user!.id);
      const partner = rows.find((row: any) => row.user_id !== user!.id);
      const normalize = (row: any) => {
        const [emoji, label] = MOOD_MAP[row.mood_key] ?? ["", row.mood_key];
        return { emoji, label };
      };

      return {
        mine: mine ? normalize(mine) : null,
        partner: partner ? normalize(partner) : null,
      };
    },
  });

  return { mine: data?.mine ?? null, partner: data?.partner ?? null };
}

function useMessagePreview() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  const { data } = useQuery({
    queryKey: ["message-preview", spaceId, user?.id],
    enabled: !!spaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: messages } = await supabase
        .from("messages")
        .select("content,sender_user_id,created_at")
        .eq("couple_space_id", spaceId!)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!messages?.[0]) return { preview: null, lastTime: null };

      const prefix = messages[0].sender_user_id === user?.id ? "Tu: " : "";
      const text = messages[0].content;

      return {
        preview: prefix + (text.length > 48 ? text.slice(0, 48) + "…" : text),
        lastTime: messages[0].created_at,
      };
    },
  });

  return { preview: data?.preview ?? null, lastTime: data?.lastTime ?? null };
}

function useGlobalAnnouncements() {
  const { data } = useQuery({
    queryKey: ["global-announcements"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      return data ?? [];
    },
  });

  return data ?? [];
}

function useReferralCode() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["referral-code", user?.id],
    enabled: !!user,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data: row } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user!.id)
        .maybeSingle();

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
      const { data: row } = await supabase
        .from("couple_spaces")
        .select("invite_code")
        .eq("id", spaceId!)
        .maybeSingle();

      return row?.invite_code ?? null;
    },
  });

  return data ?? null;
}

const Index = () => {
  const navigate = useNavigate();
  const time = useTimeTogether();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });
  const avatars = useCoupleAvatars();
  const plano = usePlanoStats();
  const mood = useMoodToday();
  const chatPreview = useMessagePreview();
  const announcements = useGlobalAnnouncements();
  const houseInviteCode = useHouseInviteCode();
  const referralCode = useReferralCode();
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const isSolo = profile?.usage_mode === "solo";
  const profileReady = !profileLoading;
  const hasSpiritual = profile?.religion !== "none";
  const {
    chatUnread,
    moodUnread,
    tasksUnread,
    scheduleUnread,
    prayerUnread,
    complaintsUnread,
    memoriesUnread,
    capsuleUnread,
  } = useAppNotifContext();

  const {
    nextSpecialDate,
    fetchEvents: refreshRelationshipEvents,
  } = useRelationshipEvents(spaceId);

  const { streak: streakData, loading: streakLoading } = useStreak();
  const {
    pendingMilestone,
    recentMilestone,
    confirmMilestone,
  } = useMilestone(streakData?.currentStreak ?? 0, spaceId);

  const queryClient = useQueryClient();

  useEffect(() => {
    const current = Number.parseInt(localStorage.getItem("app_open_count") || "0", 10);
    localStorage.setItem("app_open_count", String(current + 1));
  }, []);

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["mood-today"] });
      queryClient.invalidateQueries({ queryKey: ["message-preview", spaceId] });
      queryClient.invalidateQueries({ queryKey: ["plano-stats", spaceId] });
      refreshRelationshipEvents();
    };

    window.addEventListener("home-visible", refresh);
    return () => window.removeEventListener("home-visible", refresh);
  }, [queryClient, spaceId, refreshRelationshipEvents]);

  useEffect(() => {
    if (!pendingMilestone) return;
    const content = getMilestoneCeremonyContent(pendingMilestone);
    if (content) dispatchCeremony(content);
    confirmMilestone();
  }, [pendingMilestone, confirmMilestone]);

  const [lifetimePoints, setLifetimePoints] = useState(0);

  useEffect(() => {
    if (!spaceId) return;

    const fetchPoints = () => {
      supabase
        .rpc("get_lifetime_points" as any, { p_couple_space_id: spaceId })
        .then(({ data }) => {
          if (typeof data === "number") setLifetimePoints(data);
        });
    };

    fetchPoints();
    window.addEventListener("streak-updated", fetchPoints);
    window.addEventListener("home-visible", fetchPoints);

    return () => {
      window.removeEventListener("streak-updated", fetchPoints);
      window.removeEventListener("home-visible", fetchPoints);
    };
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

  useEffect(() => {
    if (!spaceId || !user) return;
    const key = capsuleSeenKey(spaceId, user.id);

    const check = async () => {
      let seenIds: string[];
      try {
        seenIds = JSON.parse(localStorage.getItem(key) ?? "[]");
      } catch {
        seenIds = [];
      }

      const since = new Date();
      since.setDate(since.getDate() - 7);

      const { data } = await (supabase as any)
        .from("time_capsule_messages")
        .select("id")
        .eq("couple_space_id", spaceId)
        .neq("creator_id", user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (!data?.length) return;

      const unseen = (data as { id: string }[]).filter((capsule) => !seenIds.includes(capsule.id));
      if (!unseen.length) return;

      localStorage.setItem(
        key,
        JSON.stringify([...seenIds, ...unseen.map((capsule) => capsule.id)].slice(-100)),
      );

      dispatchCeremony({
        type: "capsula",
        eyebrow: "Cápsula do Tempo",
        title: "O teu par enterrou uma cápsula",
        subtitle: "Uma memória foi guardada para o futuro do vosso ninho.",
      });
    };

    check();
    window.addEventListener("home-visible", check);
    return () => window.removeEventListener("home-visible", check);
  }, [spaceId, user]);

  const handleShareHouse = () => {
    if (!houseInviteCode) return;

    const message = `Vem construir o nosso espaço no LoveNest. Usa o código: ${houseInviteCode}`;

    if (navigator.share) {
      navigator
        .share({ title: "Nosso LoveNest", text: message, url: window.location.origin })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${window.location.origin}`);
      toast.success("Código e link copiados.");
    }
  };

  const handleShareReferral = () => {
    if (!referralCode) return;

    const shareUrl = `${window.location.origin}/inicio?ref=${referralCode}`;
    const message = `Estamos a usar o LoveNest, um espaço só nosso. Cria o vosso também.\n\nCódigo: ${referralCode}`;

    if (navigator.share) {
      navigator.share({ title: "Convite LoveNest", text: message, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${shareUrl}`);
      toast.success("Convite copiado.");
    }
  };

  const partnerPresent =
    !isSolo && streakData.activeCount >= (streakData.myCheckedIn ? 2 : 1);

  const spiritualShortcut: DailyShortcut = hasSpiritual
    ? { to: "/jornada-espiritual", label: "Oração", hint: "Hoje", icon: BookHeart, tone: "violet", badge: prayerUnread }
    : { to: "/biblioteca", label: "Leitura", hint: "Ler", icon: Library, tone: "violet" };

  const dailyItems: DailyShortcut[] = isSolo
    ? [
        { to: "/humor", label: "Humor", hint: mood.mine?.label ?? "Registar", icon: Smile, tone: "rose", badge: moodUnread },
        {
          to: "/plano",
          label: "Agenda",
          hint: plano.next?.time ?? (plano.pending > 0 ? `${plano.pending} pend.` : "Livre"),
          icon: CalendarDays,
          tone: "blue",
          badge: tasksUnread + scheduleUnread,
        },
        spiritualShortcut,
        { to: "/momentos", label: "Momentos", hint: "Guardar", icon: Sparkles, tone: "orange" },
      ]
    : [
        {
          to: "/chat",
          label: "Chat",
          hint: chatUnread > 0 ? `${chatUnread} ${chatUnread === 1 ? "nova" : "novas"}` : chatPreview.preview ? "Responder" : "Escrever",
          icon: MessageCircle,
          tone: "green",
          badge: chatUnread,
        },
        {
          to: "/humor",
          label: "Humor",
          hint: mood.mine ? (mood.partner ? "Ambos" : "Tu ✓") : "Registar",
          icon: Smile,
          tone: "rose",
          badge: moodUnread,
        },
        {
          to: "/plano",
          label: "Agenda",
          hint: plano.next?.time ?? (plano.pending > 0 ? `${plano.pending} pend.` : "Livre"),
          icon: CalendarDays,
          tone: "blue",
          badge: tasksUnread + scheduleUnread,
        },
        spiritualShortcut,
        { to: "/conflitos", label: "Conflitos", hint: "Com calma", icon: HeartHandshake, tone: "pink", badge: complaintsUnread },
      ];

  const featuredAdventure: AdventureTile = isSolo
    ? { to: "/momentos", title: "Momentos", caption: "O que não queres perder", icon: Sparkles }
    : {
        to: "/memorias",
        title: "Memórias",
        caption: memoriesUnread > 0 ? `${memoriesUnread} novas` : "Fotos que ficam",
        icon: Images,
      };

  const adventureTiles: AdventureTile[] = isSolo
    ? [
        { to: "/jornada", title: "Jornada", caption: "O teu caminho", icon: Flame, tone: "orange" },
        { to: "/capsula", title: "Cápsula", caption: "Para o futuro", icon: Clock3, tone: "violet" },
      ]
    : [
        {
          to: "/historia",
          title: "Nossa História",
          caption: nextSpecialDate
            ? nextSpecialDate.daysUntil === 0
              ? "Hoje é especial"
              : `${nextSpecialDate.daysUntil}d p/ data`
            : "Capítulos",
          icon: CalendarHeart,
          tone: "rose",
        },
        { to: "/desafios", title: "Desafios", caption: "Fora da rotina", icon: Trophy, tone: "green" },
        { to: "/wrapped", title: "Wrapped", caption: "O vosso mês", icon: Sparkles, tone: "orange" },
        {
          to: "/capsula",
          title: "Cápsula",
          caption: capsuleUnread > 0 ? `${capsuleUnread} nova` : "Para o futuro",
          icon: Clock3,
          tone: "violet",
        },
      ];

  const waitingForPartner = profileReady && !avatars.loading && !isSolo && !avatars.partner && !!houseInviteCode;

  return (
    <div className="mx-auto max-w-lg space-y-3 overflow-x-hidden pb-20 animate-fade-in">
      <HomeHeader
        me={avatars.me}
        partner={avatars.partner}
        today={today}
        loading={avatars.loading}
        mePresent={streakData.myCheckedIn}
        partnerPresent={partnerPresent}
      />

      <p className="pb-1 text-center text-[13.5px] font-medium text-rose-500">
        {isSolo ? "O teu espaço é o teu lugar seguro" : "O vosso ninho é o vosso lugar seguro"}
      </p>

      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className="rounded-[1.5rem] border border-border/70 bg-card px-4 py-3.5"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-rose-500">
            {announcement.title}
          </p>
          <p className="mt-1 text-[12px] font-medium leading-5 text-foreground">
            {announcement.content}
          </p>
        </div>
      ))}

      {!isSolo && (
        <TimeTogetherCard
          days={time.days}
          hours={time.hours}
          minutes={time.minutes}
          seconds={time.seconds}
          hasDate={!!time.startDate}
          startDate={time.startDate}
          onSetDate={() => navigate("/configuracoes")}
        />
      )}

      {waitingForPartner && (
        <section className="rounded-[1.75rem] bg-foreground p-5 text-background">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-background/60">Convite</p>
          <p className="mt-1.5 text-[16px] font-semibold">Falta uma pessoa neste espaço.</p>
          <p className="mt-1 text-[12px] leading-5 text-background/70">
            Partilha o código com o teu par para começarem a usar o LoveNest juntos.
          </p>
          <div className="mt-4 flex gap-2">
            <div className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-background/10 font-mono text-[16px] font-medium tracking-[0.24em]">
              {houseInviteCode}
            </div>
            <button
              type="button"
              onClick={handleShareHouse}
              className="h-12 rounded-2xl bg-background px-5 text-[12px] font-semibold text-foreground active:scale-[0.98]"
            >
              Partilhar
            </button>
          </div>
        </section>
      )}

      {profileReady && (
        <section>
          <LoveStreakCard streak={streakData} loading={streakLoading} partnerName={avatars.partner?.displayName} />
          {recentMilestone && (
            <p className="mt-1.5 px-3 text-center text-[10px] font-medium text-muted-foreground/65">
              {getMilestoneMicroMemory(recentMilestone)}
            </p>
          )}
        </section>
      )}

      {!isSolo && avatars.partner && <LocationHomeCard />}

      <section className="pt-3">
        <SectionLabel title={isSolo ? "O teu dia a dia" : "O vosso dia a dia"} action="Vida" onAction={() => navigate("/vida")} />
        <DailyDock items={dailyItems} />
      </section>

      <section className="pt-3">
        <SectionLabel title="Memórias e aventuras" action={isSolo ? "Eu" : "Nós"} onAction={() => navigate("/nos")} />
        <AdventuresBento featured={featuredAdventure} tiles={adventureTiles} />
      </section>

      {referralCode && <ShareLoveRow onShare={handleShareReferral} />}

      <InstallBanner />
    </div>
  );
};

export default Index;
