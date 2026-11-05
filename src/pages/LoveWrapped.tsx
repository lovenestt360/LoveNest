import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useProfile } from "@/hooks/useProfile";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, ChevronRight, Sparkles, Play, MessageCircle, Image as ImageIcon, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";
import { differenceInDays, parseISO } from "date-fns";
import { ScreenHeader } from "@/components/ScreenHeader";
import { WrappedFilm } from "@/features/wrapped/WrappedFilm";
import type { FilmData } from "@/features/wrapped/filmMarkup";
import { displayableUrl } from "@/lib/heic";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Humor mais frequente → como o casal se sentiu (plural).
const MOOD_PLURAL: Record<string, string> = {
  feliz: "Felizes", tranquilo: "Tranquilos", apaixonado: "Apaixonados", apaixonada: "Apaixonados",
  grato: "Gratos", grata: "Gratos", ansioso: "Ansiosos", cansado: "Cansados", triste: "Tristes",
  irritado: "Irritados", animado: "Animados", calmo: "Calmos",
};
const moodLabel = (m: string | null) => {
  if (!m) return "Apaixonados";
  const k = m.trim().toLowerCase();
  return MOOD_PLURAL[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
};

interface WrappedData {
  id: string;
  couple_space_id: string;
  month: number;
  year: number;
  messages_count: number;
  memories_count: number;
  challenges_completed: number;
  streak_days: number;
  mood_checkins: number;
  top_mood: string | null;
  generated_at: string;
}

export default function LoveWrapped() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { partner } = usePartnerProfile();

  const [wrappedList, setWrappedList] = useState<WrappedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [houseName, setHouseName] = useState("");
  const [relationshipStart, setRelationshipStart] = useState<string | null>(null);
  const [film, setFilm] = useState<FilmData | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!spaceId || !user) return;

    const fetchData = async () => {
      const { data: wrappedData } = await supabase.from("love_wrapped").select("*")
        .eq("couple_space_id", spaceId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      const { data: spaceData } = await supabase.from("couple_spaces").select("house_name, relationship_start_date").eq("id", spaceId).maybeSingle();

      if (wrappedData && wrappedData.length > 0) setWrappedList(wrappedData as WrappedData[]);
      const house = (spaceData?.house_name ?? "").trim();
      setHouseName(house && house !== "LoveNest" ? house : "");
      setRelationshipStart(spaceData?.relationship_start_date || null);
      setLoading(false);
    };

    fetchData();
  }, [spaceId, user]);

  // Fotos do mês (a mais recente é a capa; até 5 para a montagem).
  const fetchMonthPhotos = async (sid: string, month: number, year: number): Promise<string[]> => {
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const { data } = await supabase
      .from("photos")
      .select("file_path")
      .eq("couple_space_id", sid)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd)
      .order("created_at", { ascending: false })
      .limit(5);

    const paths = (data ?? []).map((p) => p.file_path);
    if (!paths.length) return [];
    const { data: signed } = await supabase.storage.from("memories").createSignedUrls(paths, 3600);
    const urls = (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[];
    return Promise.all(urls.map(displayableUrl));
  };

  const handleStartStory = async (index: number) => {
    if (!spaceId || opening) return;
    setOpening(true);
    const current = wrappedList[index];
    const photos = await fetchMonthPhotos(spaceId, current.month, current.year).catch(() => [] as string[]);
    const me = profile?.display_name?.split(" ")[0] ?? "";
    const them = partner?.display_name?.split(" ")[0] ?? "";
    setFilm({
      names: me && them ? `${me} & ${them}` : me || "Vocês",
      month: MONTH_NAMES[current.month],
      year: current.year,
      cover: photos[0] ?? null,
      photos,
      days: relationshipStart ? Math.max(0, differenceInDays(new Date(), parseISO(relationshipStart))) : 0,
      streak: current.streak_days ?? 0,
      mood: moodLabel(current.top_mood),
      moodCheckins: current.mood_checkins ?? 0,
      messages: current.messages_count ?? 0,
      challenges: current.challenges_completed ?? 0,
      memories: current.memories_count ?? 0,
      house: houseName || "O vosso ninho",
    });
    setOpening(false);
  };

  const shareFilm = () => {
    if (!film) return;
    const text = `O nosso ${film.month} no LoveNest\n\n${film.names}\n${film.streak} dias de chama\n${film.messages} mensagens trocadas\n${film.memories} memórias guardadas`;
    if (navigator.share) {
      navigator.share({ title: `LoveWrapped · ${film.month} ${film.year}`, text, url: window.location.origin }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => toast({ title: "Resumo copiado", description: "Já podes partilhar onde quiseres." }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Sparkles className="h-6 w-6 animate-pulse text-[#0B1324]/40" />
      </div>
    );
  }

  if (film) return <WrappedFilm data={film} onClose={() => setFilm(null)} onShare={shareFilm} />;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct = now.getDate() / daysInMonth;
  const nextMonthName = MONTH_NAMES[now.getMonth() === 11 ? 1 : now.getMonth() + 2];
  const daysToFilm = daysInMonth - now.getDate() + 1;
  const [latest, ...earlier] = wrappedList;

  return (
    <section className="animate-fade-in">
      <ScreenHeader title="LoveWrapped" subtitle="O filme de cada mês" className="mb-5" />

      <div className="space-y-3">
        {latest ? (
          <>
            {/* O último filme, em destaque */}
            <div className={cn(CARD, "relative overflow-hidden p-4")}>
              <img src={faisca} alt="" className="pointer-events-none absolute right-2 top-1.5 w-[80px] animate-[ln-bob_3.6s_ease-in-out_infinite]" />
              <p className="text-[12px] font-semibold text-muted-foreground">O vosso último filme</p>
              <h2 className="mt-1 text-[26px] font-bold tracking-[-0.035em] text-foreground">
                {MONTH_NAMES[latest.month]}{latest.year !== now.getFullYear() ? ` ${latest.year}` : ""}
              </h2>
              <p className="mt-1 max-w-[210px] text-[13.5px] leading-snug text-[#4A5060] dark:text-muted-foreground">{monthLine(latest)}</p>
              <div className="mt-3.5 grid grid-cols-4 gap-1.5">
                {[[latest.messages_count, "mensagens"], [latest.memories_count, "memórias"], [latest.challenges_completed, "desafios"], [latest.streak_days, "dias de chama"]].map(([n, l]) => (
                  <div key={l as string} className="rounded-[14px] bg-[#F7F5F2] px-1 py-2 text-center dark:bg-muted">
                    <p className="text-[17px] font-bold tracking-[-0.03em] tabular-nums text-foreground">{n ?? 0}</p>
                    <p className="text-[10.5px] font-semibold leading-tight text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => handleStartStory(0)} disabled={opening}
                className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1324] text-[15px] font-semibold text-white active:scale-[0.99] transition-transform disabled:opacity-70 dark:bg-foreground dark:text-background">
                {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
                Ver o filme
              </button>
            </div>

            {/* O mês que está a decorrer */}
            <MonthInProgress pct={monthPct} title={`${MONTH_NAMES[now.getMonth() + 1]} está a ser escrito`} sub={`O filme chega a 1 de ${nextMonthName.toLowerCase()}`} />

            {earlier.length > 0 && (
              <section>
                <h3 className="mb-2 mt-5 px-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">Meses anteriores</h3>
                <div className={cn(CARD, "px-3.5")}>
                  {earlier.map((w, i) => {
                    const { Icon, text } = rowSummary(w);
                    return (
                      <button key={w.id} onClick={() => handleStartStory(i + 1)} disabled={opening}
                        className="flex w-full items-center gap-3 border-b border-[#F0EDE9] py-3 text-left last:border-b-0 active:opacity-75 dark:border-border/60">
                        <span className={TILE}><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold text-foreground">
                            {MONTH_NAMES[w.month]}{w.year !== now.getFullYear() ? ` ${w.year}` : ""}
                          </span>
                          <span className="block truncate text-[12.5px] text-muted-foreground">{text}</span>
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F5F2] dark:bg-muted">
                          <Play className="ml-0.5 h-3 w-3" fill="currentColor" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Antes do primeiro filme */
          <div className={cn(CARD, "px-5 pb-5 pt-6 text-center")}>
            <img src={faisca} alt="" className="mx-auto w-[112px] animate-[ln-bob_3.6s_ease-in-out_infinite]" />
            <h2 className="mt-1.5 text-[19px] font-bold tracking-[-0.02em] text-foreground">O vosso primeiro filme vem aí</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4A5060] dark:text-muted-foreground">
              No fim de cada mês junto as vossas mensagens, memórias e desafios num pequeno filme.
            </p>
            <div className="mt-3.5 flex justify-center gap-2">
              <div className="w-[78px] rounded-2xl border border-[#ECE8E3] py-2.5 dark:border-border">
                <p className="text-[22px] font-bold tabular-nums text-foreground">{daysToFilm}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">{daysToFilm === 1 ? "dia" : "dias"}</p>
              </div>
              <div className="w-[78px] rounded-2xl border border-[#ECE8E3] py-2.5 dark:border-border">
                <p className="text-[22px] font-bold text-foreground">1 {nextMonthName.slice(0, 3).toLowerCase()}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">chega</p>
              </div>
            </div>
            <ul className="mt-3.5 space-y-1 text-left">
              {[[MessageCircle, "As conversas do mês"], [ImageIcon, "As fotos que guardaram"], [Flame, "A vossa chama e os desafios"]].map(([I, t]) => {
                const Icon = I as typeof Flame;
                return (
                  <li key={t as string} className="flex items-center gap-2.5 py-1 text-[13.5px] text-[#4A5060] dark:text-muted-foreground">
                    <span className={TILE}><Icon className="h-4 w-4" strokeWidth={1.7} /></span>{t as string}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Convidar */}
        <button
          className={cn(CARD, "mt-2 flex w-full items-center gap-3 px-3.5 py-3 text-left active:scale-[0.99] transition-transform")}
          onClick={() => {
            const text = `A usar o LoveNest para construir uma relação mais forte! Junta-te a nós: ${window.location.origin}`;
            if (navigator.share) navigator.share({ title: "LoveNest", text, url: window.location.origin }).catch(() => {});
            else { navigator.clipboard.writeText(text); toast({ title: "Link copiado!" }); }
          }}
        >
          <span className={TILE}><Gift className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
          <span className="flex-1">
            <span className="block text-[14px] font-semibold text-foreground">Convidar amigos</span>
            <span className="block text-[12.5px] text-muted-foreground">Partilhem a LoveNest com outro casal</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
      </div>
    </section>
  );
}

/* ── Apoio ─────────────────────────────────────────────────── */

const CARD = "rounded-[22px] border border-[#ECE8E3] bg-white shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border dark:bg-card";
const TILE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F2] text-[#0B1324] dark:bg-muted dark:text-foreground";

/** Uma frase sobre o mês, a partir dos números. */
function monthLine(w: WrappedData): string {
  const parts: string[] = [];
  if ((w.messages_count ?? 0) >= 100) parts.push("muitas conversas");
  else if ((w.messages_count ?? 0) > 0) parts.push(`${w.messages_count} mensagens`);
  if ((w.memories_count ?? 0) > 0) parts.push(`${w.memories_count} ${w.memories_count === 1 ? "memória guardada" : "memórias guardadas"}`);
  if ((w.challenges_completed ?? 0) > 0) parts.push(`${w.challenges_completed} ${w.challenges_completed === 1 ? "desafio vivido" : "desafios vividos"}`);
  if (parts.length === 0) return "Um mês tranquilo, só vosso.";
  const list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
  return `Um mês de ${list}.`;
}

/** O destaque de cada mês anterior: o número mais forte. */
function rowSummary(w: WrappedData): { Icon: typeof Flame; text: string } {
  const bits: string[] = [];
  if (w.messages_count) bits.push(`${w.messages_count} mensagens`);
  if (w.memories_count) bits.push(`${w.memories_count} ${w.memories_count === 1 ? "memória" : "memórias"}`);
  if (w.challenges_completed) bits.push(`${w.challenges_completed} ${w.challenges_completed === 1 ? "desafio" : "desafios"}`);
  const text = bits.slice(0, 2).join(" · ") || (w.streak_days ? `${w.streak_days} dias de chama` : "Ver o filme");
  const Icon = (w.memories_count ?? 0) >= 5 ? ImageIcon : (w.messages_count ?? 0) > 0 ? MessageCircle : Flame;
  return { Icon, text };
}

function MonthInProgress({ pct, title, sub }: { pct: number; title: string; sub: string }) {
  const c = 2 * Math.PI * 16;
  return (
    <div className={cn(CARD, "flex items-center gap-3 px-3.5 py-3")}>
      <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 text-[#0B1324] dark:text-foreground" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 20 20)" />
      </svg>
      <span>
        <span className="block text-[14.5px] font-semibold text-foreground">{title}</span>
        <span className="block text-[12.5px] text-muted-foreground">{sub}</span>
      </span>
    </div>
  );
}
