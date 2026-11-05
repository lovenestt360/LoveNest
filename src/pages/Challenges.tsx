import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  CheckCircle2, Plus, Trophy, Sparkles, Loader2, Trash2,
  Heart, Compass, MessageCircle, Gamepad2, Sprout, BookOpen,
  Star, X, Flame, Target, Check, ImagePlus,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";
import { usePhotoUrl } from "@/features/relationship-events/usePhotoUrl";
import { toJpegIfHeic } from "@/lib/heic";
import { useAuth } from "@/features/auth/AuthContext";
import { useBiblioteca, type Book } from "@/hooks/useBiblioteca";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ScreenHeader } from "@/components/ScreenHeader";
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

  // Ideias (uma de cada vez) e memória ao concluir
  const [ideaIdx, setIdeaIdx] = useState(0);
  const [memNote, setMemNote] = useState("");
  const [memPhoto, setMemPhoto] = useState<File | null>(null);
  const [memPreparing, setMemPreparing] = useState(false);
  const [memSaving, setMemSaving] = useState(false);

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

  const handleComplete = async (challenge: any, memory?: { note?: string; photoPath?: string }) => {
    const becomeCompleted = !challenge.is_completed;
    try {
      const { error } = await supabase.from("couple_challenges").update({
        is_completed: becomeCompleted,
        completed_at: becomeCompleted ? new Date().toISOString() : null,
        // Colunas da migração 20261106120000 — só quando há nota/foto
        ...(becomeCompleted && memory?.note ? { memory_note: memory.note } : {}),
        ...(becomeCompleted && memory?.photoPath ? { memory_photo: memory.photoPath } : {}),
      } as any).eq("id", challenge.id);
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

  const handleGenerateChallenges = async (category: string = selectedCategory) => {
    setGenerating(true);
    setAiSuggestions([]);
    setIdeaIdx(0);
    if (category === "livros") {
      setAiSuggestions(generateBookSuggestions(books, ownedBookIds, myProgressByBook));
      setGenerating(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("generate-challenges", {
        body: { category },
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

  const saveMemory = async () => {
    const c = pendingComplete;
    if (!c) return;
    setMemSaving(true);
    try {
      let photoPath: string | undefined;
      if (memPhoto && houseId) {
        const ext = memPhoto.name.split(".").pop() ?? "jpg";
        const path = `${houseId}/desafio-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("memories").upload(path, memPhoto, { contentType: memPhoto.type });
        if (error) throw error;
        photoPath = path;
      }
      setPendingComplete(null);
      await handleComplete(c, { note: memNote.trim() || undefined, photoPath });
      setMemNote(""); setMemPhoto(null);
    } catch (error: any) {
      toast({ title: "Erro ao guardar", description: error.message, variant: "destructive" });
    } finally {
      setMemSaving(false);
    }
  };

  const pickCategory = (id: string) => {
    setSelectedCategory(id);
    handleGenerateChallenges(id);
  };
  const currentIdea = aiSuggestions[Math.min(ideaIdx, aiSuggestions.length - 1)] ?? null;
  const nextIdea = () => {
    if (ideaIdx + 1 < aiSuggestions.length) setIdeaIdx(i => i + 1);
    else handleGenerateChallenges();
  };

  const inProgress        = challenges.filter(c => !c.is_completed);
  const completed         = challenges.filter(c =>  c.is_completed);
  const heroChallenge     = inProgress[0] ?? null;
  const remainingProgress = inProgress.slice(1);
  const thisMonth = completed.filter(c => c.completed_at && new Date(c.completed_at).getMonth() === new Date().getMonth()
    && new Date(c.completed_at).getFullYear() === new Date().getFullYear()).length;

  if (!profileLoading && profile?.usage_mode === "solo") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="animate-fade-in">
      <ScreenHeader title="Desafios" subtitle="Pequenas aventuras a dois" className="mb-5" />

      <main className="space-y-5">
        {/* ── Tab switcher ─────────────────────────────────────── */}
        <div className="flex gap-1 rounded-[16px] bg-[#F4F2EF] p-1 dark:bg-muted">
          <button
            onClick={() => setActiveTab("desafios")}
            className={cn(
              "flex-1 h-10 rounded-[12px] text-[13px] font-semibold transition-colors duration-150",
              activeTab === "desafios" ? "bg-white text-[#0B1324] shadow-[0_1px_2px_rgba(11,19,36,0.06),0_4px_12px_-6px_rgba(11,19,36,0.2)] dark:bg-card dark:text-foreground" : "text-[#7A7F8C] dark:text-muted-foreground"
            )}
          >
            Desafios
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={cn(
              "flex-1 h-10 rounded-[12px] text-[13px] font-semibold transition-colors duration-150 flex items-center justify-center gap-1.5",
              activeTab === "historico" ? "bg-white text-[#0B1324] shadow-[0_1px_2px_rgba(11,19,36,0.06),0_4px_12px_-6px_rgba(11,19,36,0.2)] dark:bg-card dark:text-foreground" : "text-[#7A7F8C] dark:text-muted-foreground"
            )}
          >
            Memórias
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

            {/* ── A viver agora ─────────────────────────────── */}
            {heroChallenge ? (
              <section className="animate-in fade-in duration-300">
                <p className="mb-2 px-1 text-[12px] font-semibold text-muted-foreground">A viver agora</p>
                <div className={CARD + " p-4"}>
                  <p className="text-[12px] font-medium text-muted-foreground">
                    Começaram {daysAgo(heroChallenge.created_at)}
                  </p>
                  <h2 className="mt-1.5 text-[17.5px] font-bold leading-snug tracking-[-0.02em] text-foreground">{heroChallenge.title}</h2>
                  {heroChallenge.description && (
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#4A5060] dark:text-muted-foreground line-clamp-3">{heroChallenge.description}</p>
                  )}
                  <div className="mt-3.5 flex items-center justify-between border-t border-[#F0EDE9] pt-3 dark:border-border/60">
                    <button onClick={() => handleDelete(heroChallenge.id)} aria-label="Apagar desafio"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/50 active:bg-muted">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setPendingComplete(heroChallenge)}
                      className="inline-flex h-[38px] items-center gap-1.5 rounded-full bg-[#0B1324] px-3.5 text-[13px] font-semibold text-white active:scale-[0.97] transition-transform dark:bg-foreground dark:text-background">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> Já vivemos isto
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <div className={CARD + " flex items-center gap-3 p-4"}>
                <img src={faisca} alt="" className="w-[58px] shrink-0 animate-[ln-bob_3.6s_ease-in-out_infinite]" />
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Que memória vão criar?</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Escolham uma ideia em baixo ou criem o vosso desafio.</p>
                </div>
              </div>
            )}

            {/* ── Números ───────────────────────────────────── */}
            {challenges.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[[completed.length, "vividos"], [inProgress.length, "a viver"], [thisMonth, "este mês"]].map(([n, l]) => (
                  <div key={l as string} className="rounded-2xl border border-[#ECE8E3] px-3 py-2.5 dark:border-border">
                    <p className="text-[20px] font-bold tracking-[-0.03em] tabular-nums text-foreground">{n}</p>
                    <p className="text-[11.5px] font-medium text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Restantes a viver ─────────────────────────── */}
            {remainingProgress.length > 0 && (
              <section>
                <h3 className="mb-2 px-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">Também a viver</h3>
                <div className={CARD + " px-3.5"}>
                  {remainingProgress.map(c => (
                    <div key={c.id} className="flex items-center gap-3 border-b border-[#F0EDE9] py-3 last:border-b-0 dark:border-border/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-foreground">{c.title}</span>
                        <span className="block text-[12.5px] text-muted-foreground">Começaram {daysAgo(c.created_at)}</span>
                      </span>
                      <button onClick={() => handleDelete(c.id)} aria-label="Apagar desafio" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/50 active:bg-muted">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setPendingComplete(c)} className="h-8 rounded-full bg-[#F7F5F2] px-3 text-[12.5px] font-semibold text-foreground active:scale-[0.97] dark:bg-muted">
                        Vivemos
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Ideias para vocês ─────────────────────────── */}
            <section>
              <h3 className="mb-2 px-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground">Ideias para vocês</h3>
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORY_DEFS.map(({ id, label }) => (
                  <button key={id} onClick={() => pickCategory(id)}
                    className={cn("h-[34px] shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                      selectedCategory === id && (aiSuggestions.length > 0 || generating)
                        ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background"
                        : "border-[#ECE8E3] text-[#4A5060] dark:border-border dark:text-muted-foreground")}>
                    {label}
                  </button>
                ))}
              </div>
              <div className={CARD + " mt-2.5 flex gap-3 p-3.5"}>
                <img src={faisca} alt="" className="h-[46px] w-[46px] shrink-0" />
                <div className="min-w-0 flex-1">
                  {generating ? (
                    <p className="flex items-center gap-2 py-2 text-[13.5px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> A pensar numa ideia…</p>
                  ) : currentIdea ? (
                    <div key={currentIdea.title} className="animate-in fade-in slide-in-from-right-2 duration-300">
                      <p className="text-[14.5px] font-semibold text-foreground">{currentIdea.title}</p>
                      {currentIdea.description && <p className="mt-0.5 text-[13px] leading-snug text-[#4A5060] dark:text-muted-foreground">{currentIdea.description}</p>}
                      <div className="mt-2.5 flex gap-2">
                        <button onClick={() => handleAddAiChallenge(currentIdea)} className="h-8 rounded-full bg-[#0B1324] px-3 text-[12.5px] font-semibold text-white dark:bg-foreground dark:text-background">Aceitar</button>
                        <button onClick={nextIdea} className="h-8 rounded-full bg-[#F7F5F2] px-3 text-[12.5px] font-semibold text-[#4A5060] dark:bg-muted dark:text-muted-foreground">Outra ideia</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[14.5px] font-semibold text-foreground">Escolham um tema</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">A Faísca sugere uma ideia para fazerem juntos.</p>
                    </div>
                  )}
                </div>
              </div>

              {!showManual ? (
                <button onClick={() => setShowManual(true)}
                  className="mt-2.5 flex h-[46px] w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#DED9D3] text-[13.5px] font-semibold text-[#4A5060] dark:border-border dark:text-muted-foreground">
                  <Plus className="h-4 w-4" /> Criar o nosso próprio desafio
                </button>
              ) : (
                <form onSubmit={handleAddChallenge} className={CARD + " mt-2.5 space-y-3 p-4 animate-in fade-in duration-200"}>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold">O vosso desafio</span>
                    <button type="button" onClick={() => { setShowManual(false); setNewTitle(""); setNewDesc(""); }} aria-label="Fechar"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F5F2] text-muted-foreground dark:bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                  <Input placeholder="Ex: Cozinhar uma receita nova juntos" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus
                    className="h-12 rounded-xl border-[#ECE8E3] bg-white text-[15px] dark:border-border dark:bg-card" />
                  <Textarea placeholder="Mais detalhes (opcional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                    className="min-h-[80px] resize-none rounded-xl border-[#ECE8E3] bg-white text-[14px] dark:border-border dark:bg-card" />
                  <button type="submit" disabled={!newTitle.trim()}
                    className="h-11 w-full rounded-xl bg-[#0B1324] text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-foreground dark:text-background">
                    Criar desafio
                  </button>
                </form>
              )}
            </section>
          </div>

        ) : (
          /* ════════════════════════════════════════════════════
             TAB: HISTÓRICO
          ════════════════════════════════════════════════════ */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className={CARD + " flex items-center gap-3 px-4 py-3"}>
              <img src={faisca} alt="" className="w-[52px] shrink-0" />
              {completed.length === 0 ? (
                <p className="text-[13.5px] text-muted-foreground">Os desafios que viverem aparecem aqui, como memórias.</p>
              ) : (
                <p className="text-[13px] leading-snug text-[#4A5060] dark:text-muted-foreground">
                  <b className="mr-1 text-[24px] font-bold tracking-[-0.03em] text-foreground">{completed.length}</b>
                  {completed.length === 1 ? "aventura vivida juntos" : "aventuras vividas juntos"}
                  {completed[0]?.completed_at && <><br />A última foi {daysAgo(completed[0].completed_at)}.</>}
                </p>
              )}
            </div>
            {completed.length > 0 && (
              <div className="relative pl-5">
                <span className="absolute bottom-1.5 left-[5px] top-1.5 w-[1.5px] bg-[#ECE8E3] dark:bg-border" />
                {[...completed].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")).map(c => (
                  <MemoryItem key={c.id} c={c} onUndo={() => handleComplete(c)} onDelete={() => handleDelete(c.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════
          OVERLAY: Confirmar conclusão — centrado, mais emoção
      ════════════════════════════════════════════════════════ */}
      {pendingComplete && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0B1324]/35 animate-in fade-in duration-200"
          onClick={() => !memSaving && setPendingComplete(null)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-white px-[18px] pb-[max(env(safe-area-inset-bottom,0px),22px)] pt-2.5 animate-in slide-in-from-bottom duration-300 dark:bg-card"
            onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-[38px] rounded-full bg-[#E6E2DD] dark:bg-border" />
            <div className="flex items-start justify-between gap-3">
              <p className="text-[17px] font-bold leading-snug tracking-[-0.02em] text-foreground">{pendingComplete.title}</p>
              <button onClick={() => setPendingComplete(null)} aria-label="Fechar"
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-muted-foreground dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>
            <p className="mb-2 mt-4 text-[12.5px] font-semibold text-muted-foreground">Como foi? (opcional)</p>
            <Textarea value={memNote} onChange={e => setMemNote(e.target.value)} placeholder="Uma frase para se lembrarem…" rows={3} maxLength={280}
              className="min-h-[72px] resize-none rounded-[14px] border-[#ECE8E3] bg-white text-[14px] dark:border-border dark:bg-card" />
            <p className="mb-2 mt-4 text-[12.5px] font-semibold text-muted-foreground">Foto do momento (opcional)</p>
            <label className="relative flex h-[52px] cursor-pointer items-center gap-2.5 rounded-2xl border border-dashed border-[#DED9D3] px-3.5 text-[13.5px] font-semibold text-[#4A5060] dark:border-border dark:text-muted-foreground">
              {memPreparing ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.7} />}
              <span className="truncate">{memPreparing ? "A preparar a foto…" : memPhoto ? memPhoto.name : "Juntar uma foto"}</span>
              {!memPreparing && (
                <input type="file" accept="image/*" className="sr-only" onChange={e => {
                  const f = e.target.files?.[0]; e.target.value = "";
                  if (!f) return;
                  setMemPreparing(true);
                  toJpegIfHeic(f).then(setMemPhoto, () => setMemPhoto(f)).finally(() => setMemPreparing(false));
                }} />
              )}
            </label>
            <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted-foreground">O vosso par recebe um aviso e a memória fica no histórico dos dois.</p>
            <button onClick={saveMemory} disabled={memSaving || memPreparing}
              className="mt-3.5 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1324] text-[15px] font-semibold text-white disabled:opacity-60 dark:bg-foreground dark:text-background">
              {memSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.4} />}
              Sim, vivemos isto
            </button>
            <button onClick={() => setPendingComplete(null)} disabled={memSaving}
              className="mt-1 h-[42px] w-full text-[14px] font-semibold text-muted-foreground">Ainda não</button>
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

/* ── Apoio ─────────────────────────────────────────────────── */

const CARD = "rounded-[22px] border border-[#ECE8E3] bg-white shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border dark:bg-card";

function daysAgo(iso?: string | null) {
  if (!iso) return "";
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  return `há ${m} ${m === 1 ? "mês" : "meses"}`;
}

function MemoryItem({ c, onUndo, onDelete }: { c: any; onUndo: () => void; onDelete: () => void }) {
  const photo = usePhotoUrl(c.memory_photo ?? null);
  return (
    <div className="relative pb-5">
      <span className="absolute -left-[19px] top-[5px] h-[9px] w-[9px] rounded-full bg-[#0B1324] ring-[3px] ring-white dark:bg-foreground dark:ring-background" />
      <p className="text-[12px] font-medium text-muted-foreground">
        {c.completed_at ? format(new Date(c.completed_at), "d 'de' MMMM 'de' yyyy", { locale: pt }) : "Vivido"}
      </p>
      <p className="mt-0.5 text-[15px] font-semibold leading-snug text-foreground">{c.title}</p>
      {c.memory_note && <p className="mt-1 text-[13px] text-[#4A5060] dark:text-muted-foreground">"{c.memory_note}"</p>}
      {c.memory_photo && (
        <div className="mt-2 h-[120px] overflow-hidden rounded-[14px] bg-muted">
          {photo && <img src={photo} alt="" className="h-full w-full object-cover" />}
        </div>
      )}
      <div className="mt-1.5 flex gap-3">
        <button onClick={onUndo} className="text-[11.5px] font-medium text-muted-foreground/60">Desfazer</button>
        <button onClick={onDelete} className="text-[11.5px] font-medium text-muted-foreground/60">Apagar</button>
      </div>
    </div>
  );
}
