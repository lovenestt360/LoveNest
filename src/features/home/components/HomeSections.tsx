import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { cn } from "@/lib/utils";
import { MoodFace } from "@/features/mood/MoodArt";
import { FeatureIcon } from "@/features/home/FeatureIcon";

/** Superfície comum da Home refinada: branco, borda fina e sombra suave. */
export const SURFACE =
  "border border-[#ECE8E3] bg-white shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border dark:bg-card";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

// ── Tempo juntos ──────────────────────────────────────────────────────────────

function nextAnniversary(startIso: string): { years: number; daysUntil: number } {
  const start = new Date(startIso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let years = today.getFullYear() - start.getFullYear();
  let next = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  if (next <= today) {
    years += 1;
    next = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  }
  return { years, daysUntil: Math.round((next.getTime() - today.getTime()) / 86400000) };
}

export function TimeTogetherStrip({
  days,
  hours,
  minutes,
  seconds,
  startDate,
}: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  startDate: string | null;
}) {
  const navigate = useNavigate();

  if (!startDate) {
    return (
      <button
        type="button"
        onClick={() => navigate("/configuracoes")}
        className={cn(SURFACE, "w-full rounded-[18px] px-3.5 py-2.5 text-center text-[13px] font-medium text-rose-500 active:scale-[0.99]")}
      >
        Definir a data em que começaram
      </button>
    );
  }

  const start = new Date(startDate + "T00:00:00");
  const since = `Desde ${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  const anniversary = nextAnniversary(startDate);
  const mark =
    anniversary.daysUntil === 0
      ? `Hoje fazem ${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"}`
      : `${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"} em ${anniversary.daysUntil} ${anniversary.daysUntil === 1 ? "dia" : "dias"}`;

  const unit = (value: string, label: string, className?: string) => (
    <span className="flex min-w-[20px] flex-col items-center">
      <b className={cn("text-[14px] font-bold leading-none tracking-[-0.02em] tabular-nums text-foreground", className)}>{value}</b>
      <small className="mt-0.5 text-[7.5px] font-medium uppercase leading-none tracking-[0.1em] text-muted-foreground/70">{label}</small>
    </span>
  );
  const sep = <span className="mb-[9px] text-[11px] font-light leading-none text-muted-foreground/40">:</span>;

  return (
    <section aria-label="Tempo juntos" className={cn(SURFACE, "rounded-[18px] px-3.5 pb-[7px] pt-2 text-center")}>
      <p className="text-[9px] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground/70">Tempo juntos</p>
      <p className="mt-[3px] whitespace-nowrap text-[9.5px] font-medium leading-tight text-muted-foreground/70">
        {since} · {mark}
      </p>
      <div className="mt-[5px] flex items-center justify-center gap-1">
        {unit(String(days), "dias", "text-[17px]")}
        {sep}
        {unit(pad(hours), "hrs")}
        {sep}
        {unit(pad(minutes), "min")}
        {sep}
        {unit(pad(seconds), "seg", "text-foreground/60")}
      </div>
    </section>
  );
}

// ── O vosso dia a dia ─────────────────────────────────────────────────────────

export type DailyTool = {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
};

export function DailyTools({ tools }: { tools: DailyTool[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(tools.length, 4)}, minmax(0, 1fr))` }}>
      {tools.map((tool) => {
        return (
          <button
            key={tool.to}
            type="button"
            onClick={() => navigate(tool.to)}
            className="group flex flex-col items-center gap-[7px]"
          >
            <span className="relative flex h-14 w-14 items-center justify-center transition-transform duration-200 group-active:scale-95">
              {tool.icon}
              {(tool.badge ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[11px] font-bold leading-none text-white dark:border-background">
                  {tool.badge! > 9 ? "9+" : tool.badge}
                </span>
              )}
            </span>
            <span className="text-[11.5px] font-medium text-[#3A4150] dark:text-foreground/80">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const TOOL_ICONS = {
  chat: <FeatureIcon kind="chat" />,
  /** A Faísca do meu humor de hoje (apagada, com +, se ainda não registei). */
  mood: (moodKey?: string | null) => <FeatureIcon kind="humor" mood={moodKey} />,
  agenda: <FeatureIcon kind="agenda" />,
  spiritual: <FeatureIcon kind="espiritual" />,
  conflicts: <FeatureIcon kind="conflitos" />,
};

export function NextUp({
  next,
  pending,
  isSolo,
}: {
  next: { time: string; title: string; day?: string } | null;
  pending: number;
  isSolo: boolean;
}) {
  const navigate = useNavigate();
  if (!next) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/plano")}
      className={cn(SURFACE, "mt-3.5 flex w-full items-center gap-3 rounded-[18px] px-3.5 py-3 text-left active:scale-[0.99]")}
    >
      <span className="w-12 text-[15px] font-semibold tabular-nums text-foreground">{next.time}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[14.5px] font-semibold text-foreground">{next.title}</b>
        <small className="text-[12.5px] text-muted-foreground">
          {next.day ? `${next.day} · ` : ""}Agenda{isSolo ? "" : " · os dois"}
          {pending > 0 ? ` · ${pending} por fazer` : ""}
        </small>
      </span>
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" strokeWidth={2} />
    </button>
  );
}

export function PartnerMoodLine({
  partnerName,
  partnerMood,
  mineShared,
}: {
  partnerName: string;
  partnerMood: { key: string; label: string } | null;
  mineShared: boolean;
}) {
  if (!partnerMood) return null;
  return (
    <p className="mt-2.5 flex items-center gap-2.5 px-1 text-[13px] text-[#3A4150] dark:text-foreground/80">
      <MoodFace mood={partnerMood.key} size={26} />
      <span>
        <b className="font-semibold">{partnerName}</b> está {partnerMood.label.toLowerCase()}
        {mineShared ? "" : " · tu ainda não partilhaste"}
      </span>
    </p>
  );
}

// ── Memórias e aventuras ──────────────────────────────────────────────────────

function useLastMemory(spaceId: string | null) {
  const [photo, setPhoto] = useState<{ url: string; caption: string | null; date: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    supabase
      .from("photos")
      .select("file_path,caption,taken_on,created_at")
      .eq("couple_space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(async ({ data }) => {
        const row = data?.[0];
        if (!row) {
          if (!cancelled) setChecked(true);
          return;
        }
        const { data: signed } = await supabase.storage.from("memories").createSignedUrl(row.file_path, 3600);
        if (cancelled) return;
        if (signed) setPhoto({ url: signed.signedUrl, caption: row.caption, date: row.taken_on ?? row.created_at });
        setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  return { photo, checked };
}

function useMemoriesExtras(spaceId: string | null) {
  const { data } = useQuery({
    queryKey: ["home-memories-extras", spaceId],
    enabled: !!spaceId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const db = supabase as any;
      const [events, capsule, wrapped, challenge] = await Promise.all([
        db.from("relationship_events").select("id", { count: "exact", head: true }).eq("couple_space_id", spaceId),
        db
          .from("time_capsule_messages")
          .select("unlock_date")
          .eq("couple_space_id", spaceId)
          .eq("is_unlocked", false)
          .order("unlock_date", { ascending: true })
          .limit(1),
        db
          .from("love_wrapped")
          .select("month,year,generated_at")
          .eq("couple_space_id", spaceId)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1),
        db
          .from("couple_challenges")
          .select("title")
          .eq("couple_space_id", spaceId)
          .eq("is_completed", false)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      return {
        eventsCount: (events.count as number | null) ?? 0,
        capsuleUnlock: (capsule.data?.[0]?.unlock_date as string | undefined) ?? null,
        wrapped: (wrapped.data?.[0] as { month: number; year: number; generated_at: string | null } | undefined) ?? null,
        challenge: (challenge.data?.[0]?.title as string | undefined) ?? null,
      };
    },
  });

  return data ?? { eventsCount: 0, capsuleUnlock: null, wrapped: null, challenge: null };
}

function daysUntil(iso: string): number {
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function MemoriesSection({
  isSolo,
  historyHint,
  memoriesBadge = 0,
  capsuleBadge = 0,
}: {
  isSolo: boolean;
  /** Ex.: "1 ano em 94 dias" — o próximo marco da história. */
  historyHint?: string | null;
  memoriesBadge?: number;
  capsuleBadge?: number;
}) {
  const navigate = useNavigate();
  const spaceId = useCoupleSpaceId();
  const { photo, checked } = useLastMemory(spaceId);
  const extras = useMemoriesExtras(spaceId);

  const photoDate = photo?.date ? new Date(photo.date) : null;
  const photoLabel = photoDate ? `Última memória · ${photoDate.getDate()} ${MONTHS_SHORT[photoDate.getMonth()]}` : "";

  const capsuleDays = extras.capsuleUnlock ? daysUntil(extras.capsuleUnlock) : null;
  const capsuleText =
    capsuleDays === null
      ? isSolo ? "Escreve para o teu futuro" : "Escrevam para o vosso futuro"
      : capsuleDays <= 0
        ? "Pronta para abrir"
        : `Abre daqui a ${capsuleDays} ${capsuleDays === 1 ? "dia" : "dias"}`;

  const historyText = [
    extras.eventsCount > 0 ? `${extras.eventsCount} ${extras.eventsCount === 1 ? "momento" : "momentos"}` : null,
    historyHint ?? null,
  ]
    .filter(Boolean)
    .join(" · ") || (isSolo ? "A tua história" : "A vossa história");

  const wrappedIsNew =
    !!extras.wrapped?.generated_at && Date.now() - new Date(extras.wrapped.generated_at).getTime() < 10 * 86400000;

  return (
    <>
      <div className="grid grid-cols-[1.25fr_1fr] grid-rows-[auto_auto] gap-2.5">
        {/* A última memória, com a fotografia real. */}
        <button
          type="button"
          onClick={() => navigate("/memorias")}
          className="relative row-span-2 flex min-h-[232px] flex-col justify-end overflow-hidden rounded-[22px] p-3.5 text-left text-white active:scale-[0.99]"
          style={
            photo
              ? undefined
              : { background: "linear-gradient(165deg,#F7C9A8 0%,#E99A8E 38%,#A6728F 72%,#4B4766 100%)" }
          }
        >
          {photo && <img src={photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <span className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[#0B1324]/60" aria-hidden="true" />
          {memoriesBadge > 0 && (
            <span className="absolute right-3 top-3 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10.5px] font-bold">
              {memoriesBadge > 9 ? "9+" : memoriesBadge} {memoriesBadge === 1 ? "nova" : "novas"}
            </span>
          )}
          <span className="relative">
            {photo ? (
              <>
                <small className="block text-[12px] opacity-85">{photoLabel}</small>
                <b className="block text-[17px] font-semibold leading-tight tracking-[-0.015em]">
                  {photo.caption || "Ver a memória"}
                </b>
              </>
            ) : (
              <>
                <small className="block text-[12px] opacity-85">Memórias</small>
                <b className="block text-[17px] font-semibold leading-tight tracking-[-0.015em]">
                  {checked ? (isSolo ? "Guarda a primeira memória" : "Guardem a primeira memória") : " "}
                </b>
              </>
            )}
          </span>
        </button>

        <MiniTile
          onClick={() => navigate("/historia")}
          icon={<FeatureIcon kind="historia" size={40} />}
          title={isSolo ? "A minha história" : "Nossa História"}
          text={historyText}
        />
        <MiniTile
          onClick={() => navigate("/capsula")}
          icon={<FeatureIcon kind="capsula" size={40} />}
          title="Cápsula"
          text={capsuleText}
          badge={capsuleBadge}
        />
      </div>

      <div className={cn(SURFACE, "mt-2.5 overflow-hidden rounded-[20px]")}>
        <RowLink
          onClick={() => navigate("/desafios")}
          icon={<FeatureIcon kind="desafios" size={40} />}
          title="Desafios"
          text={extras.challenge ? `“${extras.challenge}” · em curso` : isSolo ? "Escolhe um desafio" : "Escolham um desafio juntos"}
        />
        {/* LoveWrapped fica sempre à vista; "Novo" nos 10 dias a seguir a ser gerado. */}
        <RowLink
          onClick={() => navigate("/wrapped")}
          icon={<FeatureIcon kind="wrapped" size={40} />}
          title={extras.wrapped ? `LoveWrapped de ${MONTHS_LONG[extras.wrapped.month - 1] ?? ""}` : "LoveWrapped"}
          text={
            extras.wrapped
              ? isSolo ? "O teu mês, em resumo" : "O vosso mês, em resumo"
              : "O primeiro resumo chega no fim do mês"
          }
          trailing={
            extras.wrapped && wrappedIsNew ? (
              <span className="rounded-md bg-[#0B1324] px-[7px] py-[3px] text-[11px] font-bold text-white dark:bg-foreground dark:text-background">Novo</span>
            ) : undefined
          }
        />
      </div>
    </>
  );
}

function MiniTile({
  onClick,
  icon,
  title,
  text,
  badge = 0,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  text: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(SURFACE, "relative flex min-h-[111px] flex-col gap-1.5 rounded-[20px] px-3.5 py-[13px] text-left active:scale-[0.99]")}
    >
      {icon}
      <b className="text-[14px] font-semibold leading-tight text-foreground">{title}</b>
      <small className="text-[12px] leading-snug text-muted-foreground">{text}</small>
      {badge > 0 && (
        <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function RowLink({
  onClick,
  icon,
  title,
  text,
  trailing,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  text: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[58px] w-full items-center gap-3 px-3.5 text-left active:bg-muted/40 [&+&]:border-t [&+&]:border-[#ECE8E3] dark:[&+&]:border-border"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <b className="block text-[14px] font-semibold text-foreground">{title}</b>
        <small className="block truncate text-[12.5px] text-muted-foreground">{text}</small>
      </span>
      {trailing ?? <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" strokeWidth={2} />}
    </button>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="mb-3 mt-6 flex items-baseline justify-between px-1">
      <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{title}</h2>
      {action && (
        <button type="button" onClick={action.onClick} className="text-[13px] text-muted-foreground active:opacity-60">
          {action.label}
        </button>
      )}
    </div>
  );
}
