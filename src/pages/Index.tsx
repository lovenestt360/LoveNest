import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  CalendarHeart,
  Heart,
  HeartHandshake,
  MessageCircle,
  Smile,
  Sparkles,
} from "lucide-react";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { supabase } from "@/integrations/supabase/client";
import { InstallBanner } from "@/features/pwa/InstallBanner";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { PartnerPresenceCard } from "@/components/PartnerPresenceCard";
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
  const today = format(new Date(), "yyyy-MM-dd");

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
    queryKey: ["message-preview", spaceId],
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

function DailyAction({
  icon,
  title,
  description,
  to,
  badge = 0,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  badge?: number;
  tone: "rose" | "indigo" | "orange";
}) {
  const navigate = useNavigate();

  const toneClass = {
    rose: "bg-rose-50 text-rose-500 dark:bg-rose-950/25 dark:text-rose-300",
    indigo: "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/25 dark:text-indigo-300",
    orange: "bg-orange-50 text-orange-500 dark:bg-orange-950/25 dark:text-orange-300",
  }[tone];

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex w-full items-center gap-3.5 border-b border-border/55 px-4 py-4 text-left last:border-b-0 active:bg-muted/60"
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", toneClass)}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold text-foreground">{title}</p>
          {badge > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{description}</p>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={1.6} />
    </button>
  );
}

function ExperienceDoor({
  title,
  description,
  to,
  icon,
  tone,
}: {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  tone: "rose" | "indigo";
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group rounded-[1.45rem] border border-border/70 bg-card p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.035)] active:scale-[0.985]"
    >
      <div
        className={cn(
          "mb-5 flex h-10 w-10 items-center justify-center rounded-2xl",
          tone === "rose"
            ? "bg-rose-50 text-rose-500 dark:bg-rose-950/25 dark:text-rose-300"
            : "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/25 dark:text-indigo-300",
        )}
      >
        {icon}
      </div>
      <p className="text-[14px] font-bold text-foreground">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{description}</p>
      <ArrowRight className="mt-4 h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-active:translate-x-1" />
    </button>
  );
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
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const isSolo = profile?.usage_mode === "solo";
  const profileReady = !profileLoading;
  const {
    chatUnread,
    moodUnread,
    tasksUnread,
    scheduleUnread,
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

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Bom dia. Um pouco de presença já conta."
      : hour < 19
        ? "Boa tarde. Como estão vocês hoje?"
        : "Boa noite. Ainda há tempo para um gesto pequeno.";

  const moodDescription = mood.mine
    ? mood.partner
      ? `${mood.mine.emoji} ${mood.mine.label} · Par: ${mood.partner.emoji} ${mood.partner.label}`
      : `${mood.mine.emoji} ${mood.mine.label} · O teu par ainda não partilhou`
    : "Como está o teu coração hoje?";

  const chatDescription =
    chatUnread > 0
      ? `${chatUnread} ${chatUnread === 1 ? "mensagem nova" : "mensagens novas"}`
      : chatPreview.preview ?? "Deixa uma pequena mensagem.";

  const planDescription = plano.next
    ? `${plano.next.time} · ${plano.next.title}`
    : plano.pending > 0
      ? `${plano.pending} ${plano.pending === 1 ? "coisa pendente" : "coisas pendentes"}`
      : "Nada urgente por agora.";

  return (
    <div className="mx-auto max-w-lg space-y-5 overflow-x-hidden pb-20 animate-fade-in">
      <HomeHeader
        me={avatars.me}
        partner={avatars.partner}
        today={today}
        loading={avatars.loading}
      />

      <section className="px-1 pt-1">
        <p className="text-[17px] font-extrabold tracking-[-0.025em] text-foreground">
          {greeting}
        </p>
        {!isSolo && time.startDate && (
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Juntos há {time.days.toLocaleString("pt-PT")} dias.
          </p>
        )}
      </section>

      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className="rounded-[1.4rem] border border-rose-200/60 bg-rose-50/70 px-4 py-3.5 dark:border-rose-900/30 dark:bg-rose-950/20"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-500/70">
            {announcement.title}
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-rose-800 dark:text-rose-200">
            {announcement.content}
          </p>
        </div>
      ))}

      {profileReady && (
        <section>
          <LoveStreakCard streak={streakData} loading={streakLoading} />
          {recentMilestone && (
            <p className="mt-1.5 px-3 text-center text-[10px] font-medium text-muted-foreground/65">
              {getMilestoneMicroMemory(recentMilestone)}
            </p>
          )}
        </section>
      )}

      {profileReady && !isSolo && !avatars.partner && houseInviteCode ? (
        <section className="rounded-[1.6rem] border border-rose-200/70 bg-gradient-to-br from-rose-50 to-white p-5 shadow-[0_12px_35px_rgba(244,63,94,0.06)] dark:border-rose-900/30 dark:from-rose-950/20 dark:to-card">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-950/40">
              <HeartHandshake className="h-5 w-5" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Falta uma pessoa neste espaço.</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Partilha o código com o teu par para começarem a usar o LoveNest juntos.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-rose-200/70 bg-white/80 text-[16px] font-black tracking-[0.2em] text-rose-500 dark:bg-card">
              {houseInviteCode}
            </div>
            <button
              type="button"
              onClick={handleShareHouse}
              className="h-12 rounded-2xl bg-[#0B1324] px-4 text-[11px] font-bold text-white active:scale-[0.98]"
            >
              Partilhar
            </button>
          </div>
        </section>
      ) : (
        avatars.partner && <PartnerPresenceCard />
      )}

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Hoje
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground/70">
              Só o que pode fazer sentido agora.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-[0_12px_35px_rgba(15,23,42,0.035)]">
          <DailyAction
            icon={<Smile className="h-5 w-5" strokeWidth={1.6} />}
            title="Humor"
            description={moodDescription}
            to="/humor"
            badge={moodUnread}
            tone="rose"
          />

          {!isSolo && (
            <DailyAction
              icon={<MessageCircle className="h-5 w-5" strokeWidth={1.6} />}
              title="Chat"
              description={chatDescription}
              to="/chat"
              badge={chatUnread}
              tone="indigo"
            />
          )}

          <DailyAction
            icon={<CalendarDays className="h-5 w-5" strokeWidth={1.6} />}
            title="Plano"
            description={planDescription}
            to="/plano"
            badge={tasksUnread + scheduleUnread}
            tone="orange"
          />
        </div>
      </section>

      {nextSpecialDate && !isSolo && (
        <button
          type="button"
          onClick={() => navigate("/historia")}
          className="flex w-full items-center gap-3 rounded-[1.45rem] border border-border/70 bg-card p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.03)] active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/25">
            <CalendarHeart className="h-4.5 w-4.5" strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Próximo momento
            </p>
            <p className="mt-0.5 truncate text-[13px] font-bold text-foreground">
              {nextSpecialDate.title}
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
            {nextSpecialDate.daysUntil === 0
              ? "Hoje"
              : nextSpecialDate.daysUntil === 1
                ? "Amanhã"
                : `${nextSpecialDate.daysUntil} dias`}
          </span>
        </button>
      )}

      <section>
        <div className="mb-3 px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Continuar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ExperienceDoor
            title={isSolo ? "Eu" : "Nós"}
            description={isSolo ? "Momentos e jornada." : "História, memórias e crescimento."}
            to="/nos"
            icon={<Heart className="h-5 w-5" strokeWidth={1.6} />}
            tone="rose"
          />
          <ExperienceDoor
            title="Vida"
            description="Planos, contexto e ferramentas práticas."
            to="/vida"
            icon={<Sparkles className="h-5 w-5" strokeWidth={1.6} />}
            tone="indigo"
          />
        </div>
      </section>

      <InstallBanner />
    </div>
  );
};

export default Index;
