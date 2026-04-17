import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/features/streak/useStreak";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { RankingCard } from "@/components/RankingCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Flame, ArrowLeft, Heart, AlertCircle, Sparkles, Loader2,
  Coins, Target, CheckCircle2, Circle, Trophy
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Tab = "streaks" | "pontos" | "missoes";

interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  activityType: string;
  points: number;
  completed: boolean;
}

// ─────────────────────────────────────────────
// Missões definidas com base em daily_activity
// ─────────────────────────────────────────────

const MISSION_DEFS: Omit<Mission, "completed">[] = [
  { id: "message",  title: "Conversar",   description: "Envia uma mensagem no chat",       emoji: "💬", activityType: "message",  points: 10 },
  { id: "checkin",  title: "Check-in",    description: "Faz o check-in diário do streak",  emoji: "✅", activityType: "checkin",  points: 10 },
  { id: "mood",     title: "Humor",       description: "Regista o teu humor de hoje",      emoji: "😊", activityType: "mood",     points: 5  },
  { id: "prayer",   title: "Oração",      description: "Partilha uma oração com o par",    emoji: "🙏", activityType: "prayer",   points: 5  },
];

// ─────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────

function TabBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200",
        active
          ? "bg-primary text-white shadow-md shadow-primary/20"
          : "text-muted-foreground/60 hover:text-foreground active:scale-95"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function LoveStreak() {
  const navigate = useNavigate();
  const spaceId = useCoupleSpaceId();
  const { streak, loading, checkIn, checkingIn } = useStreak();

  const [activeTab, setActiveTab] = useState<Tab>("streaks");
  const [totalPoints, setTotalPoints]     = useState<number>(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [missions, setMissions]           = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // ── Pontos ──────────────────────────────────
  const fetchPoints = useCallback(async () => {
    if (!spaceId) return;
    setLoadingPoints(true);
    try {
      const { data } = await supabase
        .from("love_points" as any)
        .select("total_points")
        .eq("couple_space_id", spaceId)
        .maybeSingle();
      setTotalPoints((data as any)?.total_points ?? 0);
    } finally {
      setLoadingPoints(false);
    }
  }, [spaceId]);

  // ── Missões ──────────────────────────────────
  const fetchMissions = useCallback(async () => {
    if (!spaceId) return;
    setLoadingMissions(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_activity" as any)
        .select("type")
        .eq("couple_id", spaceId)
        .eq("activity_date", today);

      const done = new Set(((data as any[]) || []).map((d: any) => d.type));
      setMissions(MISSION_DEFS.map(m => ({ ...m, completed: done.has(m.activityType) })));
    } finally {
      setLoadingMissions(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (activeTab === "pontos")  fetchPoints();
    if (activeTab === "missoes") fetchMissions();
  }, [activeTab, fetchPoints, fetchMissions]);

  // ── Check-in ─────────────────────────────────
  const handleCheckIn = async () => {
    const ok = await checkIn();
    if (ok) {
      toast.success("Boa! Estás a cuidar do vosso streak 💖");
      if (activeTab === "missoes") fetchMissions();
    } else {
      toast.error("Não foi possível registar o check-in.");
    }
  };

  // ── Loading ──────────────────────────────────
  if (loading && !streak) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const s = streak;
  const isZero          = (s?.currentStreak ?? 0) === 0;
  const bothActive      = s?.bothActiveToday ?? false;
  const streakAtRisk    = s?.streakAtRisk ?? false;
  const currentStreak   = s?.currentStreak ?? 0;
  const longestStreak   = s?.longestStreak ?? 0;
  const activeCount     = s?.activeCount ?? 0;
  const totalMembers    = s?.totalMembers ?? 0;
  const progress        = s?.progressPercentage ?? 0;
  const pointsToday     = bothActive ? 10 : 0;
  const missionsDone    = missions.filter(m => m.completed).length;
  const missionsPts     = missions.filter(m => m.completed).reduce((a, m) => a + m.points, 0);

  return (
    <div className="min-h-screen bg-background pb-28 animate-in fade-in duration-300">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 frosted-glass shadow-sm px-4 py-4 space-y-3">
        <div className="flex items-center gap-4">
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

        {/* ── TABS ─── */}
        <div className="flex items-center gap-1.5">
          <TabBtn
            label="Streak"
            icon={<Flame className="w-3 h-3" />}
            active={activeTab === "streaks"}
            onClick={() => setActiveTab("streaks")}
          />
          <TabBtn
            label="Pontos"
            icon={<Coins className="w-3 h-3" />}
            active={activeTab === "pontos"}
            onClick={() => setActiveTab("pontos")}
          />
          <TabBtn
            label="Missões"
            icon={<Target className="w-3 h-3" />}
            active={activeTab === "missoes"}
            onClick={() => setActiveTab("missoes")}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ABA: STREAKS                               */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === "streaks" && (
        <div className="max-w-md mx-auto px-5 py-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Hero */}
          <section className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-1.5 px-3 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              {isZero ? "Chegou a hora" : "Manter a chama acesa"}
              <Sparkles className="w-3 h-3 ml-1.5" />
            </div>
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/8 blur-[50px] rounded-full pointer-events-none" />
              <div className="flex items-baseline justify-center gap-2 relative z-10">
                <span className="text-[6rem] font-black tabular-nums tracking-tighter text-foreground leading-none drop-shadow-sm">
                  {currentStreak}
                </span>
                <span className="text-xl font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">dias</span>
              </div>
              <p className="text-sm font-semibold text-muted-foreground/70 max-w-[220px] mx-auto leading-tight">
                {isZero
                  ? "O vosso streak começa hoje. Cuidem um do outro."
                  : `Vocês estão há ${currentStreak} dias a cuidar um do outro.`}
              </p>
            </div>
          </section>

          {/* Risk warning */}
          {streakAtRisk && (
            <div className="glass-card rounded-3xl p-4 border-amber-500/30 bg-amber-50/40">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="pt-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-0.5">Atenção ao Streak</h3>
                  <p className="text-sm font-bold text-amber-900/70 leading-tight">
                    Hoje é decisivo. Não deixem o vosso streak cair!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status + progress */}
          <section className="glass-card rounded-[2.5rem] p-6 space-y-5 relative overflow-hidden border-white/40">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Estatuto de Hoje</span>
                <Heart className={cn("w-4 h-4 transition-all duration-700", bothActive ? "fill-primary text-primary" : "text-muted-foreground/30")} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground/90 leading-tight mb-0.5">
                  {bothActive ? "Hoje já está completo 💕" : (isZero ? "A aguardar o primeiro gesto" : "Ainda falta alguém hoje")}
                </h2>
                <p className="text-xs text-muted-foreground/60 font-medium">
                  {activeCount}/{totalMembers} {activeCount === 1 ? "pessoa activa" : "pessoas activas"} hoje
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">
                  <span>Progresso mensal (28 d)</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2.5 bg-muted" />
              </div>
            </div>
          </section>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-[2rem] p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Recorde</span>
              <span className="text-2xl font-black tabular-nums">{longestStreak}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">Dias</span>
            </div>
            <div className="glass-card rounded-[2rem] p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Atividade</span>
              <span className="text-2xl font-black">
                {totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0}%
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">Hoje</span>
            </div>
          </div>

          {/* Ranking por streak */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Ranking Global — Streak</span>
            </div>
            <RankingCard compact={false} initialRankType="streak" hideToggle />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ABA: PONTOS                                */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === "pontos" && (
        <div className="max-w-md mx-auto px-5 py-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Hero pontos */}
          <section className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-1.5 px-3 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              Pontos do casal <Sparkles className="w-3 h-3 ml-1.5" />
            </div>
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-400/8 blur-[50px] rounded-full pointer-events-none" />
              <div className="flex items-baseline justify-center gap-2 relative z-10">
                {loadingPoints ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <>
                    <span className="text-[5.5rem] font-black tabular-nums tracking-tighter text-foreground leading-none drop-shadow-sm">
                      {totalPoints.toLocaleString("pt-PT")}
                    </span>
                    <span className="text-lg font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">pts</span>
                  </>
                )}
              </div>
              <p className="text-sm font-semibold text-muted-foreground/70">Total acumulado pelo casal</p>
            </div>
          </section>

          {/* Stats pontos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-[2rem] p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Hoje</span>
              <span className="text-2xl font-black tabular-nums text-primary">{pointsToday}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">Pontos</span>
            </div>
            <div className="glass-card rounded-[2rem] p-5 flex flex-col items-center text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Streak</span>
              <span className="text-2xl font-black tabular-nums">{currentStreak}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">Dias +10/dia</span>
            </div>
          </div>

          {/* Info */}
          <div className="glass-card rounded-2xl p-4 flex items-start gap-3 bg-primary/5 border-primary/10">
            <Coins className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-foreground/70 leading-snug">
              Ganham <span className="text-primary">+10 pontos</span> por cada dia em que ambos façam atividade.
              Mantejam o streak para acumular mais!
            </p>
          </div>

          {/* Ranking por pontos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Ranking Global — Pontos</span>
            </div>
            <RankingCard compact={false} initialRankType="points" hideToggle />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ABA: MISSÕES                               */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === "missoes" && (
        <div className="max-w-md mx-auto px-5 py-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Progress header */}
          <section className="glass-card rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden border-white/40">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground/90">Missões de Hoje</h2>
                  <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">{missionsDone}/{MISSION_DEFS.length} completas · {missionsPts} pts ganhos</p>
                </div>
                <Target className="w-5 h-5 text-primary/60" />
              </div>
              <Progress value={MISSION_DEFS.length > 0 ? (missionsDone / MISSION_DEFS.length) * 100 : 0} className="h-2.5 bg-muted" />
            </div>
          </section>

          {/* Missions list */}
          {loadingMissions ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {missions.map(m => (
                <div
                  key={m.id}
                  className={cn(
                    "glass-card rounded-2xl p-4 flex items-center gap-4 border transition-all duration-300",
                    m.completed
                      ? "border-primary/20 bg-primary/5 opacity-80"
                      : "border-border/30 hover:border-primary/20"
                  )}
                >
                  {/* Icon */}
                  <span className="text-2xl shrink-0">{m.emoji}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-black tracking-tight",
                      m.completed ? "line-through text-foreground/40" : "text-foreground"
                    )}>
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-medium truncate">{m.description}</p>
                  </div>

                  {/* Points badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-primary/60">+{m.points} pts</span>
                    {m.completed
                      ? <CheckCircle2 className="w-5 h-5 text-primary" />
                      : <Circle className="w-5 h-5 text-muted-foreground/30" />
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          <div className="glass-card rounded-2xl p-4 flex items-start gap-3 bg-muted/30 border-border/20">
            <Sparkles className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-foreground/50 leading-snug">
              Usa o chat, regista o humor e faz check-in para completar todas as missões hoje!
            </p>
          </div>
        </div>
      )}

      {/* ── CTA FIXO (visível em qualquer tab se não completo) ─── */}
      {!bothActive && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent z-40">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full h-14 rounded-2xl text-[15px] font-bold shadow-xl shadow-primary/20 transition-transform active:scale-[0.98] relative overflow-hidden group"
              onClick={handleCheckIn}
              disabled={checkingIn}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
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
