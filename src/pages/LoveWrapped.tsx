import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, Copy, MessageCircle, Gift, Flame, Camera, 
  Trophy, Smile, ChevronLeft, ChevronRight, Sparkles, 
  X, Heart, CalendarDays, TrendingUp
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MOOD_EMOJIS: Record<string, string> = {
  feliz: "😊", tranquilo: "😌", apaixonado: "🥰",
  ansioso: "😰", triste: "😢", cansado: "😴",
  irritado: "😤", grato: "🙏",
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
  const navigate = useNavigate();

  const [wrappedList, setWrappedList] = useState<WrappedData[]>([]);
  const [selectedWrappedIndex, setSelectedWrappedIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'story'>('list');
  
  const [houseName, setHouseName] = useState("LoveNest");
  const [relationshipStart, setRelationshipStart] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!spaceId || !user) return;

    const fetchData = async () => {
      const { data: wrappedData } = await supabase.from("love_wrapped").select("*")
        .eq("couple_space_id", spaceId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      const { data: spaceData } = await supabase.from("couple_spaces").select("house_name, relationship_start_date").eq("id", spaceId).maybeSingle();
      
      if (wrappedData && wrappedData.length > 0) {
        setWrappedList(wrappedData as WrappedData[]);
        // Fetch last photo for the most recent wrapped
        fetchLastPhoto(spaceId, wrappedData[0].month, wrappedData[0].year);
      }
      
      setHouseName(spaceData?.house_name || "LoveNest");
      setRelationshipStart(spaceData?.relationship_start_date || null);
      setLoading(false);
    };

    fetchData();
  }, [spaceId, user]);

  const fetchLastPhoto = async (sid: string, month: number, year: number) => {
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
      .limit(1);

    if (data?.[0]) {
      const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data[0].file_path);
      setLastPhoto(urlData.publicUrl);
    } else {
      setLastPhoto(null);
    }
  };

  const handleStartStory = (index: number) => {
    setSelectedWrappedIndex(index);
    setCurrentSlide(0);
    setMode('story');
    fetchLastPhoto(spaceId!, wrappedList[index].month, wrappedList[index].year);
  };

  const nextSlide = () => {
    if (currentSlide < 8) setCurrentSlide(s => s + 1);
    else setMode('list');
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(s => s - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  if (loading) {
    return (
      <section className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </section>
    );
  }

  if (mode === 'story' && wrappedList[selectedWrappedIndex]) {
    const current = wrappedList[selectedWrappedIndex];
    const totalDays = relationshipStart 
      ? differenceInDays(new Date(), parseISO(relationshipStart)) 
      : 0;

    return (
      <div 
        className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-[110]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full bg-white transition-all duration-300",
                  i < currentSlide ? "w-full" : i === currentSlide ? "w-full animate-progress" : "w-0"
                )}
              />
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button 
          onClick={() => setMode('list')}
          className="absolute top-8 right-6 z-[120] h-10 w-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white active:scale-90 transition-transform"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Content Area */}
        <div className="relative w-full h-full max-w-md mx-auto p-8 flex flex-col items-center justify-center text-center select-none" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x > rect.width / 2) nextSlide();
          else prevSlide();
        }}>
          
          {currentSlide === 0 && (
            <div className="space-y-6 animate-fade-slide-up">
              <div className="bg-primary/20 p-8 rounded-full inline-block shadow-glow animate-pulse">
                <Heart className="w-20 h-20 text-primary fill-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-black italic tracking-tighter">LoveWrapped</h1>
                <p className="text-xl font-medium text-white/80">Este foi o vosso mês 💛</p>
                <div className="text-primary font-black uppercase tracking-widest pt-4">
                  {MONTH_NAMES[current.month]} {current.year}
                </div>
              </div>
            </div>
          )}

          {currentSlide === 1 && (
            <div className="space-y-8 animate-fade-slide-up">
              <CalendarDays className="w-24 h-24 mx-auto text-primary animate-bounce-in" />
              <div className="space-y-4">
                <p className="text-5xl font-black">{totalDays}</p>
                <p className="text-2xl font-bold italic">Mais um mês lado a lado ✨</p>
                <p className="text-sm text-white/60">Dias de muita história e amor.</p>
              </div>
            </div>
          )}

          {currentSlide === 2 && (
            <div className="space-y-8 animate-fade-slide-up">
              <Flame className={cn("w-24 h-24 mx-auto animate-pulse-glow", current.streak_days > 0 ? "text-orange-500" : "text-white/20")} />
              <div className="space-y-4">
                <p className="text-5xl font-black">{current.streak_days}</p>
                <h2 className="text-2xl font-black italic">
                  {current.streak_days >= 20 
                    ? "Vocês mantiveram o fogo aceso 🔥" 
                    : "Quase lá… vamos mais forte no próximo mês 💛"}
                </h2>
                <p className="text-sm text-white/60">Maior streak atingido este mês.</p>
              </div>
            </div>
          )}

          {currentSlide === 3 && (
            <div className="space-y-8 animate-fade-slide-up">
              <div className="text-8xl mx-auto drop-shadow-glow animate-bounce-in">
                {current.top_mood ? MOOD_EMOJIS[current.top_mood] || "😊" : "🥰"}
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black italic">
                  Este mês vocês sentiram-se mais... <br/>
                  <span className="text-primary uppercase">{current.top_mood || "Apaixonados"}</span>
                </h2>
                <p className="text-sm text-white/60">Sintonizados um com o outro.</p>
              </div>
            </div>
          )}

          {currentSlide === 4 && (
            <div className="space-y-8 animate-fade-slide-up">
              <MessageCircle className="w-24 h-24 mx-auto text-indigo-400 animate-in zoom-in duration-500" />
              <div className="space-y-4">
                <p className="text-5xl font-black">{current.messages_count}</p>
                <h2 className="text-2xl font-black italic">
                  {current.messages_count > 100 
                    ? "Conversaram muito este mês 💬" 
                    : "Podem falar mais no próximo 💛"}
                </h2>
                <p className="text-sm text-white/60">Mensagens trocadas entre vocês.</p>
              </div>
            </div>
          )}

          {currentSlide === 5 && (
            <div className="space-y-8 animate-fade-slide-up">
              <Trophy className="w-24 h-24 mx-auto text-yellow-400 animate-bounce-in" />
              <div className="space-y-4">
                <p className="text-5xl font-black">{current.challenges_completed}</p>
                <h2 className="text-2xl font-black italic">Vocês cresceram juntos ✨</h2>
                <p className="text-sm text-white/60">Desafios concluídos em equipa.</p>
              </div>
            </div>
          )}

          {currentSlide === 6 && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fade-slide-up">
              {lastPhoto ? (
                <div className="relative group w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                  <img src={lastPhoto} className="w-full h-full object-cover" alt="Momento especial" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-left">
                    <p className="text-xl font-black italic">Momentos que ficam para sempre 📸</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Camera className="w-20 h-20 mx-auto text-white/20" />
                  <p className="text-xl font-bold italic">Ainda não registaram a vossa primeira foto este mês... 📸</p>
                </div>
              )}
            </div>
          )}

          {currentSlide === 7 && (
            <div className="space-y-8 animate-fade-slide-up px-4">
              <Heart className="w-16 h-16 mx-auto text-rose-500 fill-rose-500 animate-pulse" />
              <div className="space-y-6 text-center">
                <p className="text-2xl font-medium leading-relaxed italic">
                  "Mais do que números... vocês construíram momentos 💛"
                </p>
                <p className="text-xl font-bold text-primary italic">
                  E isto é só o começo.
                </p>
              </div>
            </div>
          )}

          {currentSlide === 8 && (
            <div className="space-y-8 animate-fade-slide-up">
              <div className="bg-white/10 p-8 rounded-3xl border border-white/20 space-y-4">
                <Sparkles className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-2xl font-black italic">{houseName}</h3>
                <div className="grid grid-cols-2 gap-4 text-left">
                   <div className="space-y-1">
                     <p className="text-[10px] uppercase opacity-50 font-black">Streak</p>
                     <p className="text-lg font-bold">🔥 {current.streak_days}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] uppercase opacity-50 font-black">Mensagens</p>
                     <p className="text-lg font-bold">💬 {current.messages_count}</p>
                   </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-6">
                <Button 
                  onClick={() => {
                    const text = `💕 Nosso LoveWrapped: 🔥 ${current.streak_days} de streak e 💬 ${current.messages_count} mensagens trocadas! #LoveNest`;
                    if (navigator.share) {
                      navigator.share({ title: "LoveWrapped", text, url: window.location.origin });
                    } else {
                      navigator.clipboard.writeText(text);
                      toast({ title: "Copiado!" });
                    }
                  }}
                  className="w-full bg-white text-black hover:bg-white/90 font-black py-6 rounded-[1.5rem] shadow-glow"
                >
                  <Share2 className="mr-2 h-5 w-5" /> Partilhar o nosso mês 💛
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setMode('list')}
                  className="text-white/60 font-bold"
                >
                  Sair do Wrapped
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-fade-in pb-10">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            LoveWrapped
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resumo mensal do vosso amor</p>
        </div>
      </header>

      {wrappedList.length === 0 ? (
        <Card className="border-dashed h-64 flex flex-col items-center justify-center bg-muted/30 rounded-[2.5rem]">
          <CardContent className="p-8 text-center space-y-4">
            <div className="bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="font-bold">Ainda não há resumos gerados.</p>
              <p className="text-xs text-muted-foreground">O vosso primeiro LoveWrapped será gerado no final deste mês! ✨</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {wrappedList.map((item, idx) => (
            <button 
              key={item.id} 
              onClick={() => handleStartStory(idx)}
              className="glass-card hover:bg-accent/40 p-5 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="bg-pink-500/20 h-12 w-12 rounded-2xl flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-black italic text-lg">{MONTH_NAMES[item.month]} {item.year}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ver o resumo emocional</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Referral Stats */}
      <Card className="rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 overflow-hidden mt-8">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-600">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-[15px] tracking-tight">Convida os Amigos</p>
              <p className="text-[11px] text-muted-foreground font-bold">Partilha o vosso percurso e ganha bónus ✨</p>
            </div>
          </div>
          <Button 
             className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold h-12 rounded-2xl shadow-glow"
             onClick={() => {
               const text = `A usar o LoveNest para construir uma relação mais forte! Junta-te a nós 💛 ${window.location.origin}`;
               if (navigator.share) navigator.share({ title: "LoveNest", text, url: window.location.origin });
               else {
                 navigator.clipboard.writeText(text);
                 toast({ title: "Link copiado!" });
               }
             }}
          >
            Convidar agora
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
