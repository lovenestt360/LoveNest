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

function AnimatedCounter({ value, duration = 1000, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  useEffect(() => {
    if (!started) return;
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
  }, [value, duration, started]);

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
  
  // Cinematic States
  const [stage, setStage] = useState(0); // 0: Hide, 1: Intro Text, 2: Data Reveal, 3: Conclusion
  
  const [houseName, setHouseName] = useState("LoveNest");
  const [partner1Name, setPartner1Name] = useState("");
  const [relationshipStart, setRelationshipStart] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  
  const touchStartX = useRef<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const stageTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode === 'story' && !isPaused) {
      // Story duration is now longer to allow for cinematic stages
      const slideDuration = 5500; 
      
      autoPlayTimer.current = setInterval(() => {
        nextSlide();
      }, slideDuration);

      // Stage timing logic
      setStage(1);
      const t2 = setTimeout(() => setStage(2), 1500); // Reveal data after 1.5s
      const t3 = setTimeout(() => setStage(3), 4000); // Climax/Final text
      
      return () => {
        clearInterval(autoPlayTimer.current!);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    }
  }, [mode, isPaused, currentSlide]);

  useEffect(() => {
    if (!spaceId || !user) return;

    const fetchData = async () => {
      const { data: wrappedData } = await supabase.from("love_wrapped").select("*")
        .eq("couple_space_id", spaceId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      const { data: spaceData } = await supabase.from("couple_spaces").select("house_name, relationship_start_date, partner1_name").eq("id", spaceId).maybeSingle();
      
      if (wrappedData && wrappedData.length > 0) {
        setWrappedList(wrappedData as WrappedData[]);
        fetchLastPhoto(spaceId, wrappedData[0].month, wrappedData[0].year);
      }
      
      setHouseName(spaceData?.house_name || "LoveNest");
      setPartner1Name(spaceData?.partner1_name || "");
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

  const lastPointerDownTime = useRef<number>(0);

  const nextSlide = () => {
    if (Date.now() - lastPointerDownTime.current > 300) return; // Ignore if it was a hold
    setCurrentSlide(s => {
      if (s < 10) return s + 1;
      setMode('list');
      return 0;
    });
  };

  const prevSlide = () => {
    if (Date.now() - lastPointerDownTime.current > 300) return;
    setCurrentSlide(s => (s > 0 ? s - 1 : 0));
  };

  const handleStartStory = (index: number) => {
    setSelectedWrappedIndex(index);
    setCurrentSlide(0);
    setMode('story');
    setIsPaused(false);
    lastPointerDownTime.current = 0;
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
        onPointerDown={() => {
          setIsPaused(true);
          lastPointerDownTime.current = Date.now();
        }}
        onPointerUp={() => setIsPaused(false)}
      >
        {/* Cinematic Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[80px] animate-glow-pulsate pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] animate-glow-pulsate delay-1000 pointer-events-none" />
        
        {/* Cinematic Film Overlay */}
        <div className="absolute inset-0 cinematic-overlay z-[101]" />

        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-[110]">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full bg-white transition-all duration-300",
                  i < currentSlide ? "w-full" : i === currentSlide ? (isPaused ? "w-[50%]" : "animate-progress-4s") : "w-0"
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

        {/* Interaction Areas */}
        <div className="absolute inset-0 z-[105] flex">
          <div className="flex-1" onClick={prevSlide} />
          <div className="flex-1" onClick={nextSlide} />
        </div>

        {/* Content Area */}
        <div className="relative z-[106] w-full h-full max-w-md mx-auto p-10 flex flex-col items-center justify-center text-center select-none pointer-events-none overflow-hidden">
          
          {/* SLIDE 0: CINEMATIC INTRO */}
          {currentSlide === 0 && (
            <div className="space-y-4">
              <p className={cn(
                "text-2xl font-medium text-white/60 transition-all duration-1000",
                stage >= 1 ? "animate-text-reveal" : "opacity-0"
              )}>
                Este foi o vosso mês...
              </p>
              <h1 className={cn(
                "text-4xl font-black italic tracking-tighter text-primary transition-all duration-1000",
                stage >= 2 ? "animate-text-reveal" : "opacity-0 invisible"
              )}>
                no LoveNest 💛
              </h1>
              <div className={cn(
                "pt-10 transition-all duration-1000",
                stage >= 3 ? "animate-fade-scale-in" : "opacity-0"
              )}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  {MONTH_NAMES[current.month]} {current.year}
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 1: DAYS TOGETHER */}
          {currentSlide === 1 && (
            <div className="space-y-8">
              <div className={cn("transition-all duration-1000", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                <p className="text-xl font-bold italic text-white/40">Vocês já somam...</p>
              </div>
              <div className={cn("space-y-4 transition-all duration-700", stage >= 2 ? "animate-fade-scale-in" : "opacity-0 invisible")}>
                <p className="text-8xl font-black tracking-tighter drop-shadow-glow">
                  <AnimatedCounter value={totalDays} delay={500} />
                </p>
                <p className="text-2xl font-black italic text-primary">Dias de pura história ✨</p>
              </div>
            </div>
          )}

          {/* SLIDE 2: STREAK (EMOTIONAL) */}
          {currentSlide === 2 && (
            <div className="space-y-10">
              <div className={cn("transition-all duration-1000", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                <p className="text-2xl font-bold italic leading-tight text-white/60 px-6">
                  "Nem sempre foi fácil..."
                </p>
              </div>
              <div className={cn("space-y-6 transition-all duration-1000", stage >= 2 ? "animate-fade-scale-in" : "opacity-0 invisible")}>
                <p className="text-2xl font-black italic text-primary px-4">
                  ...mas vocês continuaram 🔥
                </p>
                <div className="relative inline-block mt-4">
                   <Flame className="w-24 h-24 mx-auto text-orange-500 fill-orange-500 animate-pulse-glow" />
                   <p className="text-6xl font-black tracking-tighter absolute inset-0 flex items-center justify-center pt-4 text-white drop-shadow-md">
                     <AnimatedCounter value={current.streak_days} delay={200} />
                   </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: MOOD (DRAMATIC) */}
          {currentSlide === 3 && (
            <div className="space-y-12">
              <div className={cn("transition-base", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                <p className="text-xl font-bold italic text-white/50">Este mês vocês sentiram-se...</p>
              </div>
              <div className={cn("space-y-6", stage >= 2 ? "animate-fade-scale-in" : "opacity-0 invisible")}>
                <div className="text-9xl drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] animate-bounce-in">
                  {current.top_mood ? MOOD_EMOJIS[current.top_mood] || "😊" : "🥰"}
                </div>
                <h2 className="text-5xl font-black tracking-tighter text-primary uppercase drop-shadow-glow">
                  {current.top_mood || "Apaixonados"} 💛
                </h2>
              </div>
            </div>
          )}

          {/* SLIDE 4: MESSAGES */}
          {currentSlide === 4 && (
            <div className="space-y-8">
              <div className={cn("transition-base", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                <p className="text-xl font-bold italic text-white/60">Este mês...</p>
                <p className="text-2xl font-black italic text-primary mt-2">vossas palavras aqueceram a casa 💬</p>
              </div>
              <div className={cn("space-y-4", stage >= 2 ? "animate-fade-scale-in" : "opacity-0 invisible")}>
                <p className="text-8xl font-black tracking-tighter">
                  <AnimatedCounter value={current.messages_count} delay={300} />
                </p>
                <p className="text-xs font-black uppercase tracking-widest text-white/30">Mensagens enviadas com carinho.</p>
              </div>
            </div>
          )}

          {/* SLIDE 5: CHALLENGES */}
          {currentSlide === 5 && (
            <div className="space-y-10">
              <Trophy className={cn("w-24 h-24 mx-auto transition-all duration-700", stage >= 2 ? "text-yellow-400 animate-bounce-in" : "text-white/10")} />
              <div className={cn("space-y-4", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                <p className="text-2xl font-black italic px-4">
                  Vocês cresceram juntos, <br/>
                  desafio por desafio ✨
                </p>
                {stage >= 2 && (
                  <p className="text-7xl font-black tracking-tighter delay-300 animate-fade-scale-in">
                    <AnimatedCounter value={current.challenges_completed} />
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 6: PHOTO (KEN BURNS) */}
          {currentSlide === 6 && (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden">
              {lastPhoto ? (
                <>
                  <img 
                    src={lastPhoto} 
                    className="absolute inset-0 w-full h-full object-cover animate-ken-burns opacity-60" 
                    alt="Momento" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-[107]" />
                  <div className="relative z-[108] p-10 space-y-4 scale-95">
                    <p className={cn("text-3xl font-black italic leading-tight drop-shadow-2xl transition-all duration-1000", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                      Momentos que ficam <br/>para sempre 📸
                    </p>
                    <p className={cn("text-lg font-medium text-primary shadow-black drop-shadow-md transition-all duration-1000", stage >= 2 ? "animate-fade-slide-up" : "opacity-0")}>
                      Vivido em equipa.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-10 space-y-8">
                  <div className={cn("transition-all duration-1500 px-6", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                    <p className="text-2xl font-bold italic leading-relaxed text-white/50">
                      "Nem todos os momentos foram registados..."
                    </p>
                  </div>
                  <div className={cn("transition-all duration-1000", stage >= 2 ? "animate-fade-scale-in" : "opacity-0 invisible")}>
                    <p className="text-3xl font-black italic text-primary">
                      mas foram vividos 💛
                    </p>
                    <div className="mt-8 opacity-20"><Camera className="w-16 h-16 mx-auto" /></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 7: CLIMAX 1 */}
          {currentSlide === 7 && (
            <div className="space-y-6">
              <Heart className="w-20 h-20 mx-auto text-rose-500 fill-rose-500 animate-pulse-glow" />
              <p className={cn("text-3xl font-black italic leading-tight transition-all duration-1000", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                Vocês são mais do que números...
              </p>
            </div>
          )}

          {/* SLIDE 8: CLIMAX 2 */}
          {currentSlide === 8 && (
            <div className="space-y-6">
              <Sparkles className="w-16 h-16 text-primary mx-auto animate-pulse-soft" />
              <p className={cn("text-4xl font-black italic tracking-tighter transition-all duration-1000", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                São história 💛
              </p>
            </div>
          )}

          {/* SLIDE 9: CLIMAX 3 */}
          {currentSlide === 9 && (
            <div className="space-y-6">
              <p className={cn("text-2xl font-medium text-white/60 transition-all duration-1000", stage >= 1 ? "animate-text-reveal" : "opacity-0")}>
                E isto...
              </p>
              <h2 className={cn("text-5xl font-black italic text-primary animate-pulse transition-all duration-1000", stage >= 2 ? "animate-text-reveal" : "opacity-0 invisible")}>
                é só o começo.
              </h2>
            </div>
          )}

          {/* SLIDE 10: FINAL BUTTONS */}
          {currentSlide === 10 && (
            <div className="space-y-12 animate-in fade-in zoom-in duration-1000">
              <div className="space-y-6">
                <div className="bg-primary/10 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-glow">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse-soft" />
                </div>
                <h3 className="text-5xl font-black italic tracking-tighter gradient-text drop-shadow-glow">{houseName}</h3>
                <p className="text-sm font-black uppercase tracking-[0.4em] text-white/30">O vosso refúgio ✨</p>
              </div>
              
              <div className="space-y-4 pt-4 px-4 pointer-events-auto">
                <Button 
                   onClick={() => {
                    const monthName = MONTH_NAMES[current.month];
                    const shareText = `O nosso mês no LoveNest 💛\n\n🏠 ${houseName}\n🔥 ${current.streak_days} dias de Streak\n💬 ${current.messages_count} mensagens trocadas\n\n${partner1Name && partner1Name + ' & '}Parceiro(a) estão a construir história! ✨`;
                    
                    if (navigator.share) {
                      navigator.share({ 
                        title: `LoveWrapped: ${monthName} ${current.year}`, 
                        text: shareText, 
                        url: window.location.origin 
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(shareText);
                      toast({ title: "Resumo copiado!", description: "Agora podes partilhar nas redes sociais! 🚀" });
                    }
                  }}
                  className="w-full bg-primary text-white hover:bg-primary/90 font-black py-8 rounded-[2rem] shadow-glow text-lg active:scale-95 transition-all animate-bounce-in flex items-center justify-center group"
                >
                  <Share2 className="mr-2 h-6 w-6 group-hover:rotate-12 transition-transform" /> Partilhar o mês 💛
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setMode('list')}
                  className="text-white/40 font-bold hover:text-white"
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
