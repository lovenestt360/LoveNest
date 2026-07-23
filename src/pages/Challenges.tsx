import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft, CheckCircle2, Plus, Trophy, Sparkles, Loader2, Trash2,
  Heart, Compass, MessageCircle, Gamepad2, Sprout, BookOpen,
  Star, X, Flame, Target,
} from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useBiblioteca, type Book } from "@/hooks/useBiblioteca";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// ─── Category definitions ─────────────────────────────────────────────────
const CATEGORY_DEFS = [
  { id: "romantico",   label: "Romance",     Icon: Heart,         color: "text-rose-500",   bg: "bg-rose-50 dark:bg-rose-950/30"    },
  { id: "aventura",    label: "Aventura",    Icon: Compass,       color: "text-sky-500",    bg: "bg-sky-50 dark:bg-sky-950/30"      },
  { id: "comunicacao", label: "Conversas",   Icon: MessageCircle, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30"},
  { id: "diversao",    label: "Diversão",    Icon: Gamepad2,      color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30"},
  { id: "crescimento", label: "Crescimento", Icon: Sprout,        color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/30"  },
  { id: "livros",      label: "Leitura",     Icon: BookOpen,      color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30"},
] as const;

const MEMORY_PHRASES = [
  "Mais uma memória construída juntos.",
  "Pequenos momentos criam grandes histórias.",
  "Cada desafio é uma página da vossa história.",
  "Uma memória que ficará para sempre.",
  "A vossa relação cresce com cada momento partilhado.",
  "Continuem a escrever a vossa história, capítulo a capítulo.",
];

// ─── Book suggestions (logic unchanged) ──────────────────────────────────
function generateBookSuggestions(
  books: Book[],
  ownedBookIds: Set<string>,
  myProgressByBook: Map<string, number>
): { title: string; description: string }[] {
  const accessible = books.filter(b => b.is_free || ownedBookIds.has(b.id));
  const unfinished = accessible
    .filter(b => (myProgressByBook.get(b.id) ?? 0) < 100)
    .sort((a, b) => (myProgressByBook.get(b.id) ?? 0) - (myProgressByBook.get(a.id) ?? 0))
    .slice(0, 3);

  const suggestions: { title: string; description: string }[] = [];
  if (accessible.length === 0) {
    suggestions.push({
      title: "Escolham o vosso primeiro livro",
      description: "Visitem a Biblioteca e escolham uma leitura para começarem juntos.",
    });
  } else {
    for (const book of unfinished) {
      const progress = myProgressByBook.get(book.id) ?? 0;
      suggestions.push({
        title: `Terminem de ler "${book.title}"`,
        description: progress > 0 ? `Já leram ${progress}% — falta pouco!` : "Comecem a ler juntos.",
      });
    }
  }
  suggestions.push({
    title: "Partilhem uma reflexão de leitura",
    description: "Depois de um capítulo, escrevam uma reflexão na Biblioteca para o vosso par ler.",
  });
  return suggestions;
}

// ─── Main component ───────────────────────────────────────────────────────
export default function Challenges() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { books, ownedBookIds, myProgressByBook } = useBiblioteca();
  const { profile, loading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [houseId, setHouseId] = useState<string | null>(null);

  // Manual creation
  const [showManual, setShowManual] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // AI generation
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("romantico");

  // UI flows
  const [activeTab, setActiveTab] = useState<"desafios" | "historico">("desafios");
  const [pendingComplete, setPendingComplete] = useState<any | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [completionPhrase, setCompletionPhrase] = useState(MEMORY_PHRASES[0]);
  const [lastCompletedTitle, setLastCompletedTitle] = useState("");

  // Ref para não mostrar overlay duplicado no próprio dispositivo via Realtime
  const justCompletedRef = useRef<string | null>(null);
  // Ref para snapshot do estado anterior (usado no handler de Realtime UPDATE)
  const challengesRef = useRef<any[]>([]);
  useEffect(() => { challengesRef.current = challenges; }, [challenges]);

  useEffect(() => { loadChallenges(); }, [user]);

  // Realtime: INSERT/UPDATE/DELETE propagam instantaneamente para ambos os parceiros
  useEffect(() => {
    if (!houseId) return;
    const channel = supabase
      .channel(`challenges-rt-${houseId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "couple_challenges", filter: `couple_space_id=eq.${houseId}` },
        ({ new: row }: any) => {
          setChallenges(prev => prev.some(c => c.id === row.id) ? prev : [row, ...prev]);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "couple_challenges", filter: `couple_space_id=eq.${houseId}` },
        ({ new: row }: any) => {
          // Verificar estado ANTES desta atualização (via ref síncrona)
          const existing = challengesRef.current.find(c => c.id === row.id);
          const wasInProgress = existing && !existing.is_completed;
          // Mostrar overlay de celebração apenas para o parceiro (não para quem concluiu)
          if (row.is_completed && wasInProgress && justCompletedRef.current !== row.id) {
            setLastCompletedTitle(row.title);
            setCompletionPhrase(MEMORY_PHRASES[Math.floor(Math.random() * MEMORY_PHRASES.length)]);
            setShowSuccessOverlay(true);
            setTimeout(() => setShowSuccessOverlay(false), 4000);
          }
          setChallenges(prev => prev.map(c => c.id === row.id ? row : c));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "couple_challenges", filter: `couple_space_id=eq.${houseId}` },
        ({ old: row }: any) => {
          setChallenges(prev => prev.filter(c => c.id !== row.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [houseId]);

  const loadChallenges = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: member } = await supabase
        .from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
      if (!member) return;
      setHouseId(member.couple_space_id);

      const { data: chData } = await supabase
        .from("couple_challenges")
        .select("*")
        .eq("couple_space_id", member.couple_space_id)
        .order("is_completed", { ascending: true })
        .order("created_at", { ascending: false });

      setChallenges(chData || []);
    } catch (error) {
      console.error("Erro a carregar desafios", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !houseId) return;
    try {
      const { error } = await supabase.from("couple_challenges").insert({
        couple_space_id: houseId, title: newTitle, description: newDesc, is_completed: false,
      });
      if (error) throw error;
      toast({ title: "Desafio criado", description: "Preparem-se para esta aventura." });
      setNewTitle(""); setNewDesc(""); setShowManual(false);
      loadChallenges();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("couple_challenges").delete().eq("id", id);
      if (error) throw error;
      loadChallenges();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleComplete = async (challenge: any) => {
    const becomeCompleted = !challenge.is_completed;
    try {
      const { error } = await supabase.from("couple_challenges").update({
        is_completed: becomeCompleted,
        completed_at: becomeCompleted ? new Date().toISOString() : null,
      }).eq("id", challenge.id);
      if (error) throw error;
      loadChallenges();
      if (becomeCompleted) {
        // Marcar este id para que o handler Realtime não duplique o overlay
        justCompletedRef.current = challenge.id;
        setTimeout(() => { justCompletedRef.current = null; }, 10_000);

        setLastCompletedTitle(challenge.title);
        setCompletionPhrase(MEMORY_PHRASES[Math.floor(Math.random() * MEMORY_PHRASES.length)]);
        setShowSuccessOverlay(true);
        setTimeout(() => setShowSuccessOverlay(false), 4000);

        // Push notification para o parceiro
        if (houseId) {
          supabase.functions.invoke("send-push", {
            body: {
              couple_space_id: houseId,
              title: "Desafio concluído",
              body: `"${challenge.title}" foi vivido juntos. Uma nova memória criada.`,
              url: "/desafios",
            },
          }).catch(() => {});
        }
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleGenerateChallenges = async () => {
    setGenerating(true);
    setAiSuggestions([]);
    if (selectedCategory === "livros") {
      setAiSuggestions(generateBookSuggestions(books, ownedBookIds, myProgressByBook));
      setGenerating(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("generate-challenges", {
        body: { category: selectedCategory },
      });
      if (error) throw error;
      if (data?.challenges?.length > 0) {
        setAiSuggestions(data.challenges);
      } else {
        toast({ title: "Sem sugestões", description: "Tenta novamente.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleAddAiChallenge = async (suggestion: { title: string; description: string }) => {
    if (!houseId) return;
    try {
      const { error } = await supabase.from("couple_challenges").insert({
        couple_space_id: houseId, title: suggestion.title, description: suggestion.description, is_completed: false,
      });
      if (error) throw error;
      setAiSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
      loadChallenges();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleAddAllAiChallenges = async () => {
    if (!houseId || aiSuggestions.length === 0) return;
    try {
      const inserts = aiSuggestions.map(s => ({
        couple_space_id: houseId, title: s.title, description: s.description, is_completed: false,
      }));
      const { error } = await supabase.from("couple_challenges").insert(inserts);
      if (error) throw error;
      toast({ title: "Todos adicionados", description: `${aiSuggestions.length} novos desafios aguardam-vos.` });
      setAiSuggestions([]); setShowGenerator(false);
      loadChallenges();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const inProgress        = challenges.filter(c => !c.is_completed);
  const completed         = challenges.filter(c =>  c.is_completed);
  const heroChallenge     = inProgress[0] ?? null;
  const remainingProgress = inProgress.slice(1);

  if (!profileLoading && profile?.usage_mode === "solo") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Desafios</h1>
      </header>

      <main className="p-4 space-y-5 max-w-md mx-auto">
        {/* ── Tab switcher ─────────────────────────────────────── */}
        <div className="flex bg-muted rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("desafios")}
            className={cn(
              "flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
              activeTab === "desafios" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Desafios
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={cn(
              "flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5",
              activeTab === "historico" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Histórico
            {completed.length > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                activeTab === "historico"
                  ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                  : "bg-muted-foreground/15 text-muted-foreground"
              )}>
                {completed.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : activeTab === "desafios" ? (
          /* ════════════════════════════════════════════════════
             TAB: DESAFIOS
          ════════════════════════════════════════════════════ */
          <div className="space-y-5">

            {/* ── Botões de ação ───────────────────────────────── */}
            {!showGenerator && !showManual && (
              <div className="flex gap-2 animate-in fade-in duration-200">
                <button
                  onClick={() => setShowGenerator(true)}
                  className="flex-1 h-11 rounded-2xl bg-rose-500 text-white text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Gerar com IA
                </button>
                <button
                  onClick={() => setShowManual(true)}
                  className="flex-1 h-11 rounded-2xl bg-card border border-border text-foreground text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Criar manual
                </button>
              </div>
            )}

            {/* ── Gerador IA (expandido) ────────────────────────── */}
            {showGenerator && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    <span className="font-semibold text-[15px]">Gerador de Desafios</span>
                  </div>
                  <button
                    onClick={() => { setShowGenerator(false); setAiSuggestions([]); }}
                    className="p-1.5 rounded-lg text-muted-foreground/40 active:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground mb-3">
                      O que gostariam de explorar juntos?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORY_DEFS.map(({ id, label, Icon, color, bg }) => (
                        <button
                          key={id}
                          onClick={() => setSelectedCategory(id)}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all active:scale-[0.97]",
                            selectedCategory === id
                              ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30"
                              : "border-border bg-muted/40"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", bg)}>
                            <Icon className={cn("w-4 h-4", color)} />
                          </div>
                          <span className={cn(
                            "text-[13px] font-semibold leading-tight",
                            selectedCategory === id ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                          )}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateChallenges}
                    disabled={generating}
                    className="w-full h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> A gerar sugestões...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Gerar 5 Desafios</>
                    )}
                  </button>

                  {/* ── Sugestões IA — redesenhadas ─────────────── */}
                  {aiSuggestions.length > 0 && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">
                          {aiSuggestions.length} sugestões para vocês
                        </p>
                        <button
                          className="text-[12px] font-semibold text-rose-500 active:opacity-70"
                          onClick={handleAddAllAiChallenges}
                        >
                          Adicionar todas
                        </button>
                      </div>
                      {aiSuggestions.map((s, i) => (
                        <div
                          key={i}
                          className="bg-background border border-border rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            {/* number badge */}
                            <div className="shrink-0 w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mt-0.5">
                              <span className="text-[11px] font-black text-rose-500 tabular-nums">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[14px] text-foreground leading-snug">{s.title}</p>
                              {s.description && (
                                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">{s.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddAiChallenge(s)}
                              className="shrink-0 w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm mt-0.5"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Criação manual (expandida) ────────────────────── */}
            {showManual && (
              <form
                onSubmit={handleAddChallenge}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-[15px]">Criar desafio</span>
                  <button
                    type="button"
                    onClick={() => { setShowManual(false); setNewTitle(""); setNewDesc(""); }}
                    className="p-1.5 rounded-lg text-muted-foreground/40 active:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-muted-foreground">
                      O que gostariam de fazer?
                    </label>
                    <Input
                      placeholder="Ex: Cozinhar uma receita nova juntos"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      autoFocus
                      className="h-12 rounded-xl bg-muted border-border text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-muted-foreground">
                      Mais detalhes (opcional)
                    </label>
                    <Textarea
                      placeholder="Descrevam como gostariam de viver este desafio..."
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      className="rounded-xl bg-muted border-border resize-none text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400 min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowManual(false); setNewTitle(""); setNewDesc(""); }}
                      className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground active:scale-[0.98] transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all"
                    >
                      Criar desafio
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── Hero: O desafio de hoje ───────────────────────── */}
            {heroChallenge && (
              <section className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-5 overflow-hidden shadow-lg">
                  <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                  <div className="absolute -right-2 -bottom-12 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/75 mb-3 uppercase tracking-wide">
                      <Target className="w-3 h-3" />
                      O desafio de hoje
                    </span>
                    <h2 className="text-[19px] font-bold text-white leading-snug mb-1.5 pr-4">
                      {heroChallenge.title}
                    </h2>
                    {heroChallenge.description && (
                      <p className="text-[13px] text-white/70 mb-4 leading-relaxed line-clamp-2">
                        {heroChallenge.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-white/50">
                        Criado {format(new Date(heroChallenge.created_at), "d MMM", { locale: pt })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(heroChallenge.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 text-white/60 active:bg-white/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingComplete(heroChallenge)}
                          className="px-5 h-9 rounded-xl bg-white text-rose-600 text-[13px] font-bold active:scale-[0.97] transition-all shadow-sm"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Stats ─────────────────────────────────────────── */}
            {challenges.length > 0 && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                <div className="bg-card border border-border rounded-2xl p-4 text-center">
                  <Trophy className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-foreground">{completed.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Concluídos</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 text-center">
                  <Flame className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-foreground">{inProgress.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Em progresso</p>
                </div>
              </div>
            )}

            {/* ── Restantes em progresso ────────────────────────── */}
            {remainingProgress.length > 0 && (
              <section className="space-y-2.5 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest px-0.5">
                  Em progresso
                </h3>
                {remainingProgress.map(c => (
                  <div
                    key={c.id}
                    className="bg-card border border-border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all"
                  >
                    <h4 className="font-semibold text-[15px] text-foreground leading-snug mb-1">{c.title}</h4>
                    {c.description && (
                      <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">{c.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground/50">
                        Criado {format(new Date(c.created_at), "d MMM", { locale: pt })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/35 active:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingComplete(c)}
                          className="px-4 h-8 rounded-xl bg-rose-500 text-white text-[12px] font-semibold active:scale-[0.97] transition-all"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* ── Empty state ───────────────────────────────────── */}
            {inProgress.length === 0 && (
              <div className="text-center py-14 space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto">
                  <Star className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-[16px]">Que memória vão criar hoje?</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5">
                    Usem a IA ou escrevam o vosso próprio desafio
                  </p>
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ════════════════════════════════════════════════════
             TAB: HISTÓRICO
          ════════════════════════════════════════════════════ */
          <div className="space-y-4 animate-in fade-in duration-200">
            {completed.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Trophy className="w-7 h-7 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-[16px]">Ainda sem memórias</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5">
                    Os desafios concluídos aparecem aqui
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Contador ─────────────────────────────────── */}
                <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-5 overflow-hidden shadow-lg">
                  <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                      <Trophy className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white/75 uppercase tracking-wide">
                        Livro de Memórias
                      </p>
                      <p className="text-[28px] font-black text-white leading-none mt-0.5">
                        {completed.length}
                        <span className="text-[14px] font-semibold text-white/70 ml-2">
                          {completed.length === 1 ? "memória" : "memórias"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Cards de concluídos — redesenhados ──────── */}
                <section className="space-y-3">
                  {completed.map((c, i) => (
                    <div
                      key={c.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200"
                    >
                      {/* Top bar verde */}
                      <div className="bg-green-50 dark:bg-green-950/25 px-4 py-2.5 flex items-center justify-between border-b border-green-100 dark:border-green-900/30">
                        <span className="text-[11px] font-semibold text-green-700 dark:text-green-400">
                          {c.completed_at
                            ? format(new Date(c.completed_at), "d 'de' MMMM 'de' yyyy", { locale: pt })
                            : "Concluído"}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      </div>

                      <div className="p-4">
                        <h4 className="font-bold text-[15px] text-foreground leading-snug">{c.title}</h4>
                        {c.description && (
                          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                            {c.description}
                          </p>
                        )}

                        {/* Frase memorável */}
                        <div className="mt-3 pl-3 border-l-2 border-rose-200 dark:border-rose-800">
                          <p className="text-[12px] text-muted-foreground/70 italic leading-relaxed">
                            {MEMORY_PHRASES[i % MEMORY_PHRASES.length]}
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-3.5">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground/25 active:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleComplete(c)}
                            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-1"
                          >
                            Desfazer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              </>
            )}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════
          OVERLAY: Confirmar conclusão — centrado, mais emoção
      ════════════════════════════════════════════════════════ */}
      {pendingComplete && (
        <div
          className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setPendingComplete(null)}
        >
          <div
            className="w-full max-w-sm bg-card border border-border rounded-3xl p-7 shadow-2xl animate-in zoom-in-95 duration-300 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Ícone com anéis */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-rose-100 dark:bg-rose-950/30" style={{ transform: "translate(-50%,-50%)", left: "50%", top: "50%", width: "96px", height: "96px" }} />
                <div className="absolute rounded-full bg-rose-100/60 dark:bg-rose-900/20" style={{ width: "72px", height: "72px", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
                <div className="relative w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shadow-md">
                  <Heart className="w-8 h-8 text-rose-500" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[21px] font-bold text-foreground leading-tight">
                Viveram este desafio?
              </h3>
              <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                Cada momento partilhado fica gravado para sempre na vossa história.
              </p>
            </div>

            {/* Título do desafio em destaque */}
            <div className="bg-muted/60 rounded-2xl px-4 py-3 text-center">
              <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
                "{pendingComplete.title}"
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={async () => {
                  const c = pendingComplete;
                  setPendingComplete(null);
                  await handleComplete(c);
                }}
                className="w-full h-13 rounded-2xl bg-rose-500 text-white font-bold text-[15px] active:scale-[0.98] transition-all py-3.5"
              >
                Sim, vivemos esta memória
              </button>
              <button
                onClick={() => setPendingComplete(null)}
                className="w-full py-3 rounded-2xl text-muted-foreground text-[14px] font-medium active:bg-muted transition-colors"
              >
                Ainda não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          OVERLAY: Parabéns — mais detalhe e emoção
      ════════════════════════════════════════════════════════ */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-lg animate-in fade-in duration-300 px-8">
          <div
            className="w-full max-w-xs text-center space-y-5"
            style={{ animation: "celebration-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            {/* Ícone com anéis pulsantes */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div
                  className="absolute rounded-full bg-green-100/50 dark:bg-green-950/20"
                  style={{ width: "120px", height: "120px", left: "50%", top: "50%", transform: "translate(-50%,-50%)", animation: "capsule-ring 2.5s ease-in-out infinite" }}
                />
                <div
                  className="absolute rounded-full bg-green-100/70 dark:bg-green-950/30"
                  style={{ width: "88px", height: "88px", left: "50%", top: "50%", transform: "translate(-50%,-50%)", animation: "capsule-ring 2.5s ease-in-out 0.4s infinite" }}
                />
                <div className="relative w-20 h-20 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Badge de estado */}
            <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mx-auto">
              <Star className="w-3 h-3" />
              Memória criada
            </div>

            {/* Nome do desafio */}
            {lastCompletedTitle && (
              <div className="bg-muted/60 rounded-2xl px-4 py-3">
                <p className="text-[14px] font-bold text-foreground leading-snug">
                  "{lastCompletedTitle}"
                </p>
              </div>
            )}

            {/* Frase */}
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {completionPhrase}
            </p>

            {/* Data */}
            <p className="text-[11px] text-muted-foreground/45 font-medium">
              {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>

            {/* Indicador decorativo */}
            <div className="flex justify-center items-center gap-1.5 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-200 dark:bg-green-800" />
              <div className="w-5 h-1.5 rounded-full bg-green-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-200 dark:bg-green-800" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
