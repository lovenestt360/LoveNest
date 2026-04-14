import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/features/streak/useStreak";
import { logActivity } from "@/lib/logActivity";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Button } from "@/components/ui/button";
import { Flame, ArrowLeft, Heart, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function LoveStreak() {
  const navigate = useNavigate();
  const spaceId = useCoupleSpaceId();
  const { streak, loading, refresh } = useStreak();
  const [checkingIn, setCheckingIn] = useState(false);

  // Fallback loading state
  if (loading && !streak) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!streak || streak.status === "invalid") {
    return (
      <div className="p-6 text-center mt-20">
        <p className="text-muted-foreground">Não foi possível carregar o LoveStreak.</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const {
    currentStreak,
    longestStreak,
    bothActiveToday,
    streakAtRisk,
    progressPercentage
  } = streak;

  const isZero = currentStreak === 0;

  // Handle manual check-in
  const handleCheckIn = async () => {
    if (!spaceId || checkingIn || bothActiveToday) return;

    setCheckingIn(true);
    try {
      await logActivity(spaceId, "checkin");
      toast.success("Boa! Estás a cuidar do vosso streak 💖");
      
      await refresh();
    } catch (error) {
      toast.error("Ocorreu um erro ao registar o check-in.");
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in zoom-in-95 duration-500">
      
      {/* HEADER */}
      <div className="sticky top-0 z-10 frosted-glass shadow-sm px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-2xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-black tracking-tight text-foreground">LoveStreak</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-8 space-y-8">

        {/* HERO SECTION */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-1.5 px-3 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
            {isZero ? "Chegou a hora" : "Manter a chama acesa"} 
            <Sparkles className="w-3 h-3 ml-1.5" />
          </div>

          <div className="space-y-1 relative">
            {/* Soft decorative glow behind number */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="flex items-baseline justify-center gap-2 relative z-10">
              <span className="text-[5rem] font-black tabular-nums tracking-tighter text-foreground drop-shadow-sm leading-none">
                {currentStreak}
              </span>
              <span className="text-xl font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                dias
              </span>
            </div>
            
            <p className="text-sm font-semibold text-muted-foreground/80 lowercase max-w-[200px] mx-auto leading-tight">
              {isZero 
                ? "O vosso streak começa hoje. Cuidem um do outro." 
                : "Vocês estão a cuidar um do outro de forma consistente."}
            </p>
          </div>
        </section>

        {/* RISK UX WARNING */}
        {streakAtRisk && (
          <div className="glass-card rounded-3xl p-5 border-amber-500/30 bg-amber-50/40 animate-pulse-slow">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-600">Atenção ao Streak</h3>
                <p className="text-sm font-bold text-amber-900/70 leading-tight">
                  Hoje é decisivo. Não deixem o vosso streak cair a zeros!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS & STATUS BLOCK */}
        <section className="glass-card rounded-[2.5rem] p-6 space-y-6 shadow-sm border-white/50 relative overflow-hidden">
          {/* Subtle gradient pattern overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/5 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                Estatuto de Hoje
              </span>
              <Heart className={cn(
                "w-4 h-4 transition-all duration-700",
                bothActiveToday ? "fill-primary text-primary" : "text-muted-foreground/30"
              )} />
            </div>

            <h2 className="text-xl font-black tracking-tight mb-2 text-foreground/90 leading-tight">
              {bothActiveToday 
                ? "Hoje já está completo 💕" 
                : (isZero ? "A aguardar o primeiro gesto" : "Ainda falta alguém hoje")}
            </h2>
            
            <div className="space-y-2 mt-6">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">
                <span>Progresso (28 d)</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2.5 bg-muted" />
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
           <div className="glass-card rounded-[2rem] p-5 flex flex-col items-center justify-center text-center shadow-sm">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
               Recorde
             </span>
             <span className="text-xl font-black tabular-nums">{longestStreak}</span>
             <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">Dias</span>
           </div>
           
           <div className="glass-card rounded-[2rem] p-5 flex flex-col items-center justify-center text-center shadow-sm">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
               Atividade
             </span>
             <span className="text-xl font-black">{bothActiveToday ? "100" : "50"}%</span>
             <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">Hoje</span>
           </div>
        </div>

      </div>

      {/* FIXED ACTION BUTTON (BOTTOM) */}
      {!bothActiveToday && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent z-40 pb-safe-offset-4">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full h-14 rounded-2xl text-[15px] font-bold shadow-xl shadow-primary/20 transition-transform active:scale-[0.98] relative overflow-hidden group"
              onClick={handleCheckIn}
              disabled={checkingIn}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              {checkingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="relative z-10 flex items-center gap-2">
                  👉 {isZero ? "Começar agora" : "Fazer check-in agora"}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
      
    </div>
  );
}
