import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Bookmark, Type, ChevronUp, ChevronDown,
  CheckCircle2, AlertTriangle, Lightbulb, Stethoscope, Sparkles, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getArticleById, allCategories, COLOR_MAP, type BlockType } from "./articles";

const FAV_KEY = "kc_favs";
function getFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveFavs(s: Set<string>) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...s])); } catch {}
}

const FONT_SIZES = ["text-sm", "text-base", "text-lg"] as const;
type FontSize = (typeof FONT_SIZES)[number];

// ── Bloco de conteúdo ─────────────────────────────────────────────────────────

function Block({
  type, title, text, items, colors, fontSize,
}: {
  type: BlockType;
  title?: string;
  text?: string;
  items?: string[];
  colors: (typeof COLOR_MAP)[string];
  fontSize: FontSize;
}) {
  if (type === "text") {
    return (
      <div className="space-y-2">
        {title && (
          <h3 className="text-base font-bold text-foreground leading-snug">{title}</h3>
        )}
        {text && (
          <p className={cn("text-foreground leading-relaxed", fontSize)}>{text}</p>
        )}
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-2">
        {title && <h3 className="text-base font-bold text-foreground">{title}</h3>}
        <ul className="space-y-2.5">
          {(items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={cn("mt-2 h-1.5 w-1.5 rounded-full shrink-0", colors.dot)} />
              <span className={cn("text-foreground leading-relaxed", fontSize)}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === "highlight") {
    return (
      <div className={cn(
        "rounded-2xl p-4 border space-y-1.5",
        colors.cardBg, colors.cardBgDark, colors.border, colors.borderDark
      )}>
        {title && (
          <p className={cn("text-xs font-bold uppercase tracking-widest", colors.text, colors.textDark)}>
            {title}
          </p>
        )}
        {text && <p className={cn("text-foreground leading-relaxed", fontSize)}>{text}</p>}
        {(items ?? []).map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 list-none">
            <span className={cn("mt-2 h-1.5 w-1.5 rounded-full shrink-0", colors.dot)} />
            <span className={cn("text-foreground leading-relaxed", fontSize)}>{item}</span>
          </li>
        ))}
      </div>
    );
  }

  if (type === "tip") {
    return (
      <div className="rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.5} />
          {title && <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{title}</p>}
        </div>
        {text && <p className={cn("text-foreground leading-relaxed", fontSize)}>{text}</p>}
        {(items ?? []).map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 list-none">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span className={cn("text-foreground leading-relaxed", fontSize)}>{item}</span>
          </li>
        ))}
      </div>
    );
  }

  if (type === "warning") {
    return (
      <div className="rounded-2xl p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/40 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" strokeWidth={1.5} />
          {title && <p className="text-xs font-bold uppercase tracking-widest text-rose-500">{title}</p>}
        </div>
        {text && <p className={cn("text-foreground leading-relaxed", fontSize)}>{text}</p>}
        {(items ?? []).map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 list-none">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className={cn("text-foreground leading-relaxed", fontSize)}>{item}</span>
          </li>
        ))}
      </div>
    );
  }

  if (type === "curiosity") {
    return (
      <div className="rounded-2xl p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/40 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-500 shrink-0" strokeWidth={1.5} />
          {title && <p className="text-xs font-bold uppercase tracking-widest text-sky-500">{title}</p>}
        </div>
        {text && <p className={cn("text-foreground leading-relaxed", fontSize)}>{text}</p>}
      </div>
    );
  }

  if (type === "doctor") {
    return (
      <div className="rounded-2xl p-4 bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/40 space-y-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-violet-500 shrink-0" strokeWidth={1.5} />
          {title && <p className="text-xs font-bold uppercase tracking-widest text-violet-500">{title}</p>}
        </div>
        {text && <p className={cn("text-foreground leading-relaxed", fontSize)}>{text}</p>}
        {(items ?? []).map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 list-none">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
            <span className={cn("text-foreground leading-relaxed", fontSize)}>{item}</span>
          </li>
        ))}
      </div>
    );
  }

  return null;
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ArticleReader() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = getArticleById(slug ?? "");
  const cat = allCategories.find(c => c.id === article?.categoryId);
  const colors = COLOR_MAP[cat?.colorKey ?? "slate"];

  const [favs, setFavs] = useState<Set<string>>(getFavs);
  const [fontSizeIdx, setFontSizeIdx] = useState(0);
  const [showFontPanel, setShowFontPanel] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFav = favs.has(slug ?? "");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const pct = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setProgress(pct);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const toggleFav = () => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(slug!)) next.delete(slug!); else next.add(slug!);
      saveFavs(next);
      return next;
    });
  };

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-foreground font-semibold">Artigo não encontrado</p>
          <button onClick={() => navigate("/ciclo/conhecimento")} className="text-sm text-rose-500 underline">
            Voltar ao Centro de Conhecimento
          </button>
        </div>
      </div>
    );
  }

  const fontSize = FONT_SIZES[fontSizeIdx];

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Barra de progresso ── */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-30 bg-muted">
        <div
          className={cn("h-full transition-all duration-150", colors.dot)}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Header fixo ── */}
      <header className="sticky top-0.5 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 px-4 pt-safe-top pt-3 pb-3">
          <button
            onClick={() => navigate("/ciclo/conhecimento")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <div className="flex-1 min-w-0">
            <p className={cn("text-[10px] font-semibold uppercase tracking-widest truncate", colors.text, colors.textDark)}>
              {cat?.title ?? "Ciclo"}
            </p>
          </div>

          {/* Botão de tipo de letra */}
          <div className="relative">
            <button
              onClick={() => setShowFontPanel(p => !p)}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Type className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
            {showFontPanel && (
              <div className="absolute right-0 top-10 bg-card border border-border rounded-2xl shadow-lg p-2 flex flex-col gap-1 z-30">
                <button
                  onClick={() => { setFontSizeIdx(Math.min(2, fontSizeIdx + 1)); setShowFontPanel(false); }}
                  disabled={fontSizeIdx === 2}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground disabled:opacity-40"
                >
                  <ChevronUp className="h-3.5 w-3.5" /> Maior
                </button>
                <button
                  onClick={() => { setFontSizeIdx(Math.max(0, fontSizeIdx - 1)); setShowFontPanel(false); }}
                  disabled={fontSizeIdx === 0}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground disabled:opacity-40"
                >
                  <ChevronDown className="h-3.5 w-3.5" /> Menor
                </button>
              </div>
            )}
          </div>

          {/* Favorito */}
          <button
            onClick={toggleFav}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <Bookmark
              className={cn("h-4 w-4 transition-colors", isFav ? "text-rose-400 fill-rose-400" : "text-muted-foreground")}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-5 pb-20">

          {/* Hero */}
          <div className="pt-6 pb-8 space-y-3">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{article.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{article.subtitle}</p>
            <div className="flex items-center gap-3 pt-1">
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", colors.text, colors.textDark)}>
                {cat?.title}
              </span>
              <span className="text-muted-foreground/30 text-xs">·</span>
              <span className="text-[11px] text-muted-foreground">{article.readTime} min de leitura</span>
            </div>
          </div>

          {/* Intro */}
          <div className={cn("rounded-2xl p-5 mb-6", colors.cardBg, colors.cardBgDark)}>
            <p className={cn("text-foreground leading-relaxed font-medium", fontSize)}>{article.intro}</p>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Blocos */}
          <div className="space-y-6">
            {article.blocks.map((block, i) => (
              <Block
                key={i}
                type={block.type}
                title={block.title}
                text={block.text}
                items={block.items}
                colors={colors}
                fontSize={fontSize}
              />
            ))}
          </div>

          {/* ── O que isto significa para vocês como casal? ── */}
          <div className="mt-10 mb-4">
            <div className="rounded-3xl overflow-hidden border border-rose-200/50 dark:border-rose-800/40"
              style={{ background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)" }}>
              <div className="dark:hidden p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                    O que isto significa para vocês como casal
                  </p>
                </div>
                <p className={cn("text-gray-700 leading-relaxed", fontSize)}>{article.coupleNote}</p>
              </div>
              <div
                className="hidden dark:block p-5 space-y-3 rounded-3xl"
                style={{ background: "linear-gradient(135deg, #2a1520 0%, #3b1827 100%)" }}
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-400" strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
                    O que isto significa para vocês como casal
                  </p>
                </div>
                <p className={cn("text-gray-200 leading-relaxed", fontSize)}>{article.coupleNote}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {article.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Botão voltar ao centro */}
          <button
            onClick={() => navigate("/ciclo/conhecimento")}
            className="w-full mt-8 h-12 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Voltar ao Centro de Conhecimento
          </button>

        </div>
      </div>

      {/* Clique fora do painel de fonte fecha-o */}
      {showFontPanel && (
        <div className="fixed inset-0 z-10" onClick={() => setShowFontPanel(false)} />
      )}
    </div>
  );
}
