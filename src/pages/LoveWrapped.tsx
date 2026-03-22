import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, MessageCircle, Gift, Flame, Camera, 
  Trophy, ChevronLeft, ChevronRight, Sparkles, 
  X, Heart, CalendarDays
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
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

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }

    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
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
  const [isPaused, setIsPaused] = useState(false);
  
  const [houseName, setHouseName] = useState("LoveNest");
  const [relationshipStart, setRelationshipStart] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  
  const touchStartX = useRef<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode === 'story' && !isPaused) {
      autoPlayTimer.current = setInterval(() => {
        nextSlide();
      }, 3500);
    } else {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    }
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [mode, isPaused, currentSlide]);

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

  const nextSlide = () => {
    setCurrentSlide(s => {
      if (s < 8) return s + 1;
      setMode('list');
      return 0;
    });
  };

  const prevSlide = () => {
    setCurrentSlide(s => (s > 0 ? s - 1 : 0));
  };

  const handleStartStory = (index: number) => {
    setSelectedWrappedIndex(index);
    setCurrentSlide(0);
    setMode('story');
    setIsPaused(false);
    fetchLastPhoto(spaceId!, wrappedList[index].month, wrappedList[index].year);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Sparkles className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest">A preparar a vossa história...</p>
      </div>
    );
  }

  if (mode === 'story' && wrappedList[selectedWrappedIndex]) {
    const current = wrappedList[selectedWrappedIndex];
    const totalDays = relationshipStart 
      ? differenceInDays(new Date(), parseISO(relationshipStart)) 
      : 0;

    return (
      <div 
        className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center overflow-hidden bg-wrapped-gradient"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-[110]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full bg-white transition-all duration-300",
                  i < currentSlide ? "w-full" : i === currentSlide ? (isPaused ? "w-[50%]" : "animate-progress-3s") : "w-0"
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

        {/* Interaction Areas for mobile tap navigation */}
        <div className="absolute inset-0 z-[105] flex">
          <div className="flex-1" onClick={prevSlide} />
          <div className="flex-1" onClick={nextSlide} />
        </div>

        {/* Content Area */}
        <div className="relative z-[106] w-full h-full max-w-md mx-auto p-8 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          
          {currentSlide === 0 && (
            <div className="space-y-6 animate-fade-scale-in">
              <div className="bg-primary/20 p-10 rounded-full inline-block shadow-glow animate-pulse-soft">
                <Heart className="w-24 h-24 text-primary fill-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="text-5xl font-black italic tracking-tighter drop-shadow-glow">LoveWrapped</h1>
                <p className="text-xl font-medium text-white/80 delay-300 animate-fade-slide-up">Este foi o vosso mês 💛</p>
                <div className="text-primary font-black uppercase tracking-widest pt-6 animate-fade-slide-up delay-600">
                  {MONTH_NAMES[current.month]} {current.year}
                </div>
              </div>
            </div>
          )}

          {currentSlide === 1 && (
            <div className="space-y-8 animate-fade-scale-in">
              <CalendarDays className="w-24 h-24 mx-auto text-primary animate-bounce-in" />
              <div className="space-y-4">
                <p className="text-7xl font-black tracking-tighter">
                  <AnimatedCounter value={totalDays} />
                </p>
                <p className="text-2xl font-bold italic delay-300 animate-fade-slide-up">Mais um mês lado a lado ✨</p>
                <p className="text-sm text-white/40 delay-450 animate-fade-slide-up uppercase tracking-widest font-black">Dias de pura história.</p>
              </div>
            </div>
          )}

          {currentSlide === 2 && (
            <div className="space-y-8 animate-fade-scale-in">
              <Flame className={cn("w-24 h-24 mx-auto", current.streak_days > 0 ? "text-orange-500 animate-pulse-glow" : "text-white/20")} />
              <div className="space-y-4">
                <p className="text-7xl font-black tracking-tighter">
                  <AnimatedCounter value={current.streak_days} />
                </p>
                <h2 className="text-2xl font-black italic delay-300 animate-fade-slide-up">
                  {current.streak_days >= 20 
                    ? "Vocês mantiveram o fogo aceso 🔥" 
                    : "Quase lá… o próximo mês é vosso 💛"}
                </h2>
                <p className="text-sm text-white/40 delay-450 animate-fade-slide-up">Maior streak ativo este mês.</p>
              </div>
            </div>
          )}

          {currentSlide === 3 && (
            <div className="space-y-10 animate-fade-scale-in">
              <div className="text-9xl mx-auto drop-shadow-glow animate-bounce-in">
                {current.top_mood ? MOOD_EMOJIS[current.top_mood] || "😊" : "🥰"}
              </div>
              <div className="space-y-4">
                <h2 className="text-xl font-bold italic text-white/60 animate-fade-slide-up">
                  Este mês vocês sentiram-se mais...
                </h2>
                <h2 className="text-4xl font-black tracking-tighter text-primary uppercase delay-600 animate-fade-scale-in drop-shadow-glow">
                  {current.top_mood || "Apaixonados"} 💛
                </h2>
              </div>
            </div>
          )}

          {currentSlide === 4 && (
            <div className="space-y-8 animate-fade-scale-in">
              <div className="relative inline-block">
                <MessageCircle className="w-24 h-24 mx-auto text-indigo-400 animate-bounce-in" />
                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
              <div className="space-y-4">
                <p className="text-7xl font-black tracking-tighter">
                  <AnimatedCounter value={current.messages_count} />
                </p>
                <h2 className="text-2xl font-black italic delay-300 animate-fade-slide-up px-4">
                  {current.messages_count > 100 
                    ? "Conversaram bastante este mês 💬✨" 
                    : "Vocês podem falar mais… mas ainda assim estiveram presentes 💛"}
                </h2>
                <p className="text-sm text-white/40 delay-450 animate-fade-slide-up uppercase tracking-widest font-black">Mensagens trocadas.</p>
              </div>
            </div>
          )}

          {currentSlide === 5 && (
            <div className="space-y-8 animate-fade-scale-in">
              <Trophy className="w-24 h-24 mx-auto text-yellow-400 animate-bounce-in" />
              <div className="space-y-4">
                <p className="text-7xl font-black tracking-tighter">
                  <AnimatedCounter value={current.challenges_completed} />
                </p>
                <h2 className="text-2xl font-black italic delay-300 animate-fade-slide-up">Vocês cresceram juntos ✨</h2>
                <p className="text-sm text-white/40 delay-450 animate-fade-slide-up">Desafios concluídos em equipa.</p>
              </div>
            </div>
          )}

          {currentSlide === 6 && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              {lastPhoto ? (
                <div className="relative group w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 animate-fade-scale-in">
                  <img src={lastPhoto} className="w-full h-full object-cover" alt="Momento especial" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-8 text-left">
                    <p className="text-2xl font-black italic drop-shadow-lg">Momentos que ficam para sempre 📸</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-scale-in">
                  <div className="w-64 h-80 rounded-[3rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/10 animate-pulse-soft" />
                    <Camera className="w-16 h-16 text-white/20 relative z-10" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold italic leading-tight">
                      Os melhores momentos nem sempre precisam de foto… <br/>
                      <span className="text-primary">mas vocês viveram-nos 💛</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentSlide === 7 && (
            <div className="space-y-8 px-4 animate-fade-scale-in">
              <Heart className="w-20 h-20 mx-auto text-rose-500 fill-rose-500 animate-pulse-glow" />
              <div className="space-y-10 text-center">
                <p className="text-3xl font-black leading-relaxed italic drop-shadow-glow">
                  "Mais do que números... vocês construíram memórias 💛"
                </p>
                <p className="text-2xl font-bold text-primary italic delay-600 animate-fade-slide-up">
                  E o melhor ainda está por vir.
                </p>
              </div>
            </div>
          )}

          {currentSlide === 8 && (
            <div className="space-y-10 animate-in fade-in zoom-in duration-1000">
              <div className="space-y-6">
                <Sparkles className="w-16 h-16 text-primary mx-auto animate-pulse-soft" />
                <h3 className="text-5xl font-black italic tracking-tighter gradient-text drop-shadow-glow">{houseName}</h3>
                <div className="space-y-4 delay-600 animate-fade-slide-up">
                   <p className="text-2xl font-medium text-white/80">Vocês são mais do que números...</p>
                   <p className="text-3xl font-black italic text-primary animate-pulse">são história 💛</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-10 px-4 delay-1000 animate-fade-slide-up pointer-events-auto">
                <Button 
                   onClick={() => {
                    const text = `💕 Nosso LoveWrapped em ${houseName}: 🔥 ${current.streak_days} de streak e 💬 ${current.messages_count} mensagens! #LoveNest`;
                    if (navigator.share) {
                      navigator.share({ title: "LoveWrapped", text, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(text);
                      toast({ title: "Copiado!" });
                    }
                  }}
                  className="w-full bg-primary text-white hover:bg-primary/90 font-black py-8 rounded-[2rem] shadow-glow text-lg active:scale-95 transition-all animate-bounce-in pointer-events-auto"
                >
                  <Share2 className="mr-2 h-6 w-6" /> Partilhar o nosso mês 💛
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setMode('list')}
                  className="text-white/40 font-bold hover:text-white pointer-events-auto"
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
