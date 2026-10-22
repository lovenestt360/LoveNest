import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useProfile } from "@/hooks/useProfile";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, ChevronRight, Sparkles, Heart } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { ScreenHeader } from "@/components/ScreenHeader";
import { WrappedFilm } from "@/features/wrapped/WrappedFilm";
import type { FilmData } from "@/features/wrapped/filmMarkup";

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
    return (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[];
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

  return (
    <section className="animate-fade-in">
      <ScreenHeader title="LoveWrapped" subtitle="Resumo mensal do vosso amor" className="mb-5" />

      <div className="space-y-3">

      {wrappedList.length === 0 ? (
        <div className="bg-white border border-[#ECE8E3] shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:bg-card dark:border-border rounded-[22px] p-10 text-center space-y-3">
          <div className="bg-rose-50 dark:bg-rose-950/30 h-14 w-14 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <p className="font-semibold text-foreground">Ainda sem resumos</p>
          <p className="text-[12px] text-muted-foreground">O primeiro LoveWrapped será gerado no final deste mês</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wrappedList.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => handleStartStory(idx)}
              className="w-full bg-white border border-[#ECE8E3] shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:bg-card dark:border-border rounded-[20px] p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-rose-50 dark:bg-rose-950/30 h-11 w-11 rounded-[13px] flex items-center justify-center text-rose-500">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[15px]">{MONTH_NAMES[item.month]} {item.year}</p>
                  <p className="text-[12px] text-muted-foreground">Ver resumo emocional</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          ))}
        </div>
      )}

      {/* Referral */}
      <button
        className="w-full bg-white border border-[#ECE8E3] shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:bg-card dark:border-border rounded-[20px] p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
        onClick={() => {
          const text = `A usar o LoveNest para construir uma relação mais forte! Junta-te a nós: ${window.location.origin}`;
          if (navigator.share) navigator.share({ title: "LoveNest", text, url: window.location.origin });
          else { navigator.clipboard.writeText(text); toast({ title: "Link copiado!" }); }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500">
            <Gift className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[14px]">Convidar amigos</p>
            <p className="text-[12.5px] text-muted-foreground">Partilha o percurso e ganha bónus</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      </button>

      </div>
    </section>
  );
}
