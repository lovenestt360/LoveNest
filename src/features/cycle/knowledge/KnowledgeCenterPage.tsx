import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Bookmark, ChevronRight, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  allCategories, allArticles, searchArticles,
  getArticleById, COLOR_MAP,
} from "./articles";
import { ILLUSTRATIONS } from "./illustrations";
import { useCycleTarget } from "../useCycleData";
import { runCycleEngineFromProfile } from "../engine";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { CycleProfile, PeriodEntry } from "../useCycleData";

const FAV_KEY = "kc_favs";
function getFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]")); } catch { return new Set(); }
}

export default function KnowledgeCenterPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<Set<string>>(getFavs);
  const [activeFilter, setActiveFilter] = useState<"all" | "favs">("all");

  // Ciclo atual para personalização
  const { targetUserId } = useCycleTarget();
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUserId) return;
    Promise.all([
      supabase.from("cycle_profiles").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("period_entries").select("*").eq("user_id", targetUserId)
        .order("start_date", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([pRes, peRes]) => {
      const engine = runCycleEngineFromProfile(
        (pRes.data as CycleProfile | null),
        (peRes.data as PeriodEntry | null)
      );
      if (engine) setCurrentPhase(engine.phase);
    });
  }, [targetUserId]);

  const searchResults = useMemo(() => searchArticles(query), [query]);

  const phaseArticles = useMemo(() => {
    if (!currentPhase) return [];
    return allArticles.filter(a => a.phase === currentPhase).slice(0, 2);
  }, [currentPhase]);

  const favArticles = useMemo(() => {
    return allArticles.filter(a => favs.has(a.id));
  }, [favs]);

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const PHASE_LABELS: Record<string, string> = {
    menstrual: "Menstruação",
    folicular: "Fase Folicular",
    ovulacao: "Ovulação",
    luteal: "Fase Lútea",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3">
          <button
            onClick={() => navigate("/ciclo")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">Ciclo</p>
            <h1 className="text-base font-bold text-foreground leading-none">Centro de Conhecimento</h1>
          </div>
        </div>

        {/* Barra de pesquisa */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Pesquisar: ovulação, TPM, cólicas..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-2xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/60 border-0 outline-none focus:ring-1 focus:ring-rose-300 dark:focus:ring-rose-700"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-28 space-y-6 pt-4">

        {/* ── Resultados de pesquisa ── */}
        {query && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
            </p>
            {searchResults.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Sem resultados para "{query}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map(article => {
                  const cat = allCategories.find(c => c.id === article.categoryId);
                  const colors = COLOR_MAP[cat?.colorKey ?? "slate"];
                  return (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      isFav={favs.has(article.id)}
                      onFav={(e) => toggleFav(article.id, e)}
                      colors={colors}
                      onClick={() => navigate(`/ciclo/conhecimento/${article.id}`)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!query && (
          <>
            {/* ── Filtros ── */}
            <div className="flex gap-2">
              {[
                { id: "all" as const, label: "Todos" },
                { id: "favs" as const, label: `Guardados${favArticles.length > 0 ? ` (${favArticles.length})` : ""}` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                    activeFilter === f.id
                      ? "bg-rose-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* ── Guardados ── */}
            {activeFilter === "favs" && (
              <div className="space-y-2">
                {favArticles.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <Bookmark className="h-8 w-8 mx-auto text-muted-foreground/30" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground">Nenhum artigo guardado ainda.</p>
                    <p className="text-xs text-muted-foreground/70">Carrega no marcador ao ler um artigo.</p>
                  </div>
                ) : (
                  favArticles.map(article => {
                    const cat = allCategories.find(c => c.id === article.categoryId);
                    const colors = COLOR_MAP[cat?.colorKey ?? "slate"];
                    return (
                      <ArticleRow
                        key={article.id}
                        article={article}
                        isFav={true}
                        onFav={(e) => toggleFav(article.id, e)}
                        colors={colors}
                        onClick={() => navigate(`/ciclo/conhecimento/${article.id}`)}
                      />
                    );
                  })
                )}
              </div>
            )}

            {activeFilter === "all" && (
              <>
                {/* ── Para ti agora ── */}
                {phaseArticles.length > 0 && (
                  <section className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Para ti agora</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Estás na fase {PHASE_LABELS[currentPhase!] ?? currentPhase} — estes artigos são sobre o que estás a viver
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {phaseArticles.map(article => {
                        const cat = allCategories.find(c => c.id === article.categoryId);
                        const colors = COLOR_MAP[cat?.colorKey ?? "slate"];
                        return (
                          <PhaseArticleCard
                            key={article.id}
                            article={article}
                            isFav={favs.has(article.id)}
                            onFav={(e) => toggleFav(article.id, e)}
                            colors={colors}
                            onClick={() => navigate(`/ciclo/conhecimento/${article.id}`)}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* ── Categorias ── */}
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Categorias</p>
                  <div className="grid grid-cols-2 gap-3">
                    {allCategories.map(cat => {
                      const Illus = ILLUSTRATIONS[cat.illustrationKey] ?? ILLUSTRATIONS.faq;
                      const colors = COLOR_MAP[cat.colorKey];
                      const count = cat.articleIds.length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            // Navega directo para o primeiro artigo se só tiver 1
                            if (count === 1) {
                              navigate(`/ciclo/conhecimento/${cat.articleIds[0]}`);
                            } else {
                              // scroll até à secção da categoria (implementação simples)
                              document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className={cn(
                            "text-left rounded-3xl p-4 border transition-all active:scale-[0.97] duration-150 space-y-3",
                            colors.cardBg, colors.cardBgDark,
                            colors.border, colors.borderDark,
                          )}
                        >
                          <Illus className="w-12 h-12" />
                          <div>
                            <p className={cn("text-sm font-semibold leading-tight", colors.text, colors.textDark)}>
                              {cat.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {count} artigo{count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ── Todos os artigos por categoria ── */}
                {allCategories.map(cat => {
                  if (cat.articleIds.length === 0) return null;
                  const colors = COLOR_MAP[cat.colorKey];
                  const articles = cat.articleIds.map(id => getArticleById(id)).filter(Boolean);
                  return (
                    <section key={cat.id} id={`cat-${cat.id}`} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {cat.title}
                        </p>
                      </div>
                      {articles.map(article => article && (
                        <ArticleRow
                          key={article.id}
                          article={article}
                          isFav={favs.has(article.id)}
                          onFav={(e) => toggleFav(article.id, e)}
                          colors={colors}
                          onClick={() => navigate(`/ciclo/conhecimento/${article.id}`)}
                        />
                      ))}
                    </section>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Componentes internos ──────────────────────────────────────────────────────

function ArticleRow({
  article, isFav, onFav, colors, onClick,
}: {
  article: ReturnType<typeof getArticleById> & {};
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
  colors: (typeof COLOR_MAP)[string];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left glass-card p-4 flex items-center gap-3 active:scale-[0.99] transition-all"
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug truncate">{article.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
          <span className="text-[11px] text-muted-foreground">{article.readTime} min</span>
        </div>
      </div>
      <button onClick={onFav} className="p-1 shrink-0">
        <Bookmark
          className={cn("h-4 w-4 transition-colors", isFav ? "text-rose-400 fill-rose-400" : "text-muted-foreground/40")}
          strokeWidth={1.5}
        />
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
    </button>
  );
}

function PhaseArticleCard({
  article, isFav, onFav, colors, onClick,
}: {
  article: ReturnType<typeof getArticleById> & {};
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
  colors: (typeof COLOR_MAP)[string];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.99] duration-150",
        colors.cardBg, colors.cardBgDark, colors.border, colors.borderDark
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn("text-xs font-semibold uppercase tracking-widest", colors.text, colors.textDark)}>
            Relevante agora
          </p>
          <p className="text-sm font-bold text-foreground leading-snug">{article.title}</p>
          <p className="text-[12px] text-muted-foreground leading-snug line-clamp-2">{article.subtitle}</p>
          <div className="flex items-center gap-1.5 pt-1">
            <Clock className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-[11px] text-muted-foreground">{article.readTime} min de leitura</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button onClick={onFav}>
            <Bookmark
              className={cn("h-4 w-4", isFav ? "text-rose-400 fill-rose-400" : "text-muted-foreground/40")}
              strokeWidth={1.5}
            />
          </button>
          <ChevronRight className={cn("h-4 w-4", colors.text, colors.textDark)} strokeWidth={1.5} />
        </div>
      </div>
    </button>
  );
}
