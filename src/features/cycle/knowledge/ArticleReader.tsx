import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CycleIcon } from "../CycleIcon";
import type { CycleIconKind } from "../cycleIconsSvg";
import { ROUND } from "../cycleUi";
import { picked } from "../CycleSheet";
import { allArticles, getArticleById, type ContentBlock } from "./articles";
import { SaveButton, TopicTile, getFavs, markRead, toggleFav, topicOf } from "./knowledgeUi";

// Três tamanhos de letra: [texto, introdução]
const SIZES = [["text-[15px]", "text-[16px]"], ["text-[16.5px]", "text-[17.5px]"], ["text-[18px]", "text-[19px]"]] as const;
const SIZE_KEY = "kc_font";

// Caixas com significado: a cor diz o que são.
const BOXES: Partial<Record<ContentBlock["type"], { icon: CycleIconKind; title: string; cls: string; head: string }>> = {
  tip:       { icon: "lampada", title: "Dica",                cls: "bg-[#EEF8F1] dark:bg-emerald-950/30", head: "text-[#23733F] dark:text-emerald-300" },
  warning:   { icon: "alerta",  title: "Atenção",             cls: "bg-[#FDECEF] dark:bg-rose-950/30",    head: "text-[#B0244A] dark:text-rose-300" },
  curiosity: { icon: "estrela", title: "Curiosidade",         cls: "bg-[#E9F5FC] dark:bg-sky-950/30",     head: "text-[#176796] dark:text-sky-300" },
  doctor:    { icon: "medico",  title: "Fala com um médico",  cls: "bg-[#F1EDFE] dark:bg-violet-950/30",  head: "text-[#5B3FC4] dark:text-violet-300" },
};

function Dots({ items, body }: { items: string[]; body: string }) {
  return (
    <ul className="grid gap-2">
      {items.map((it, i) => (
        <li key={i} className={cn("flex gap-2.5 leading-[1.55] text-[#3A4150] dark:text-foreground/85", body)}>
          <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8B3AC] dark:bg-muted-foreground/60" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Block({ block, body }: { block: ContentBlock; body: string }) {
  const { type, title, text, items } = block;
  const box = BOXES[type];
  if (box) {
    return (
      <div className={cn("rounded-[20px] p-4", box.cls)}>
        <p className={cn("mb-2 flex items-center gap-2 text-[14px] font-semibold", box.head)}>
          <CycleIcon kind={box.icon} size={22} />{title || box.title}
        </p>
        {text && <p className={cn("leading-[1.55] text-[#3A4150] dark:text-foreground/85", body)}>{text}</p>}
        {items && <Dots items={items} body={body} />}
      </div>
    );
  }
  if (type === "highlight") {
    return (
      <div className="border-l-[3px] border-[#0B1324] py-0.5 pl-4 dark:border-foreground">
        {title && <p className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>}
        {text && <p className={cn("mt-1 leading-[1.55] text-[#3A4150] dark:text-foreground/85", body)}>{text}</p>}
        {items && <div className="mt-2"><Dots items={items} body={body} /></div>}
      </div>
    );
  }
  return (
    <div>
      {title && <h2 className="mb-2 text-[17.5px] font-semibold leading-snug tracking-[-0.02em] text-foreground">{title}</h2>}
      {text && <p className={cn("leading-[1.62] text-[#3A4150] dark:text-foreground/85", body)}>{text}</p>}
      {items && <Dots items={items} body={body} />}
    </div>
  );
}

export default function ArticleReader() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const article = getArticleById(slug ?? "");

  const [saved, setSaved] = useState(() => getFavs().has(slug ?? ""));
  const [size, setSize] = useState(() => { try { return Math.min(2, Math.max(0, Number(localStorage.getItem(SIZE_KEY) ?? 0))); } catch { return 0; } });
  const [showSize, setShowSize] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cada artigo abre no topo, com o seu estado de guardado.
  useEffect(() => { window.scrollTo({ top: 0 }); setSaved(getFavs().has(slug ?? "")); setProgress(0); }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100);
      setProgress(pct);
      if (pct >= 85 && slug) markRead(slug);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  const chooseSize = (i: number) => {
    setSize(i);
    try { localStorage.setItem(SIZE_KEY, String(i)); } catch { /* sem armazenamento */ }
  };

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-semibold text-foreground">Artigo não encontrado</p>
        <button type="button" onClick={() => navigate("/ciclo/conhecimento")} className="text-[14px] font-semibold text-foreground underline underline-offset-[3px]">
          Voltar ao Centro de Conhecimento
        </button>
      </div>
    );
  }

  const topic = topicOf(article.categoryId);
  const [body, lead] = SIZES[size];
  // A seguir: o próximo do mesmo tema; senão, o próximo da lista.
  const sameTopic = allArticles.filter((a) => a.categoryId === article.categoryId);
  const next = sameTopic[sameTopic.indexOf(article) + 1] ?? allArticles[(allArticles.indexOf(article) + 1) % allArticles.length];

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      <div className="fixed inset-x-0 top-0 z-30 h-[3px]">
        <div className="h-full rounded-r-full bg-[#0B1324] transition-[width] duration-150 dark:bg-foreground" style={{ width: `${progress}%` }} />
      </div>

      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm dark:bg-background/95">
        <div className="mx-auto flex max-w-[680px] items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),1rem)]">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar" className={ROUND}>
            <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <div className="relative flex gap-2">
            <button type="button" onClick={() => setShowSize((s) => !s)} aria-expanded={showSize} aria-label="Tamanho da letra"
              className={cn(ROUND, "text-[14px] font-bold")}>Aa</button>
            <span className={cn(ROUND, "p-0")}><SaveButton saved={saved} onClick={() => setSaved(toggleFav(article.id).has(article.id))} /></span>
            {showSize && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSize(false)} aria-hidden="true" />
                <div className="absolute right-0 top-12 z-20 w-[220px] rounded-[20px] border border-[#ECE8E3] bg-white p-3 shadow-[0_18px_40px_-18px_rgba(11,19,36,0.35)] dark:border-border dark:bg-card">
                  <p className="mb-2 text-[12.5px] font-semibold text-muted-foreground">Tamanho da letra</p>
                  <div className="flex gap-1.5">
                    {[13, 16, 19].map((px, i) => (
                      <button key={px} type="button" onClick={() => chooseSize(i)} aria-pressed={size === i} aria-label={["Pequena", "Média", "Grande"][i]}
                        className={cn("flex h-10 flex-1 items-center justify-center rounded-[12px] border border-[#ECE8E3] font-semibold text-foreground dark:border-border", size === i && picked)}
                        style={{ fontSize: px }}>A</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-[680px] px-5 pb-16">
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold", topic.chip)}>
          {topic.short} · {article.readTime} min
        </span>
        <h1 className="mt-3 text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-foreground">{article.title}</h1>
        <p className="mt-2 text-[14.5px] leading-snug text-muted-foreground">{article.subtitle}</p>

        <p className={cn("mt-6 leading-[1.55] text-[#3A4150] dark:text-foreground/90", lead)}>{article.intro}</p>

        <div className="mt-7 space-y-6">
          {article.blocks.map((b, i) => <Block key={i} block={b} body={body} />)}
        </div>

        {article.coupleNote && (
          <div className="mt-8 rounded-[20px] border border-[#E1EAF9] bg-[#F3F7FE] p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
            <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-[#1D4FA8] dark:text-sky-300">
              <CycleIcon kind="casal" size={22} />Para vocês, como casal
            </p>
            <p className={cn("leading-[1.55] text-[#3A4150] dark:text-foreground/85", body)}>{article.coupleNote}</p>
          </div>
        )}

        {next && next.id !== article.id && (
          <button type="button" onClick={() => navigate(`/ciclo/conhecimento/${next.id}`, { replace: true })}
            className="mt-6 flex w-full items-center gap-3 rounded-[22px] border border-[#ECE8E3] p-3.5 text-left transition-colors hover:bg-[#FBFAF8] dark:border-border dark:hover:bg-muted">
            <TopicTile categoryId={next.categoryId} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-muted-foreground">A seguir</span>
              <span className="block text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">{next.title}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <p className="mt-6 text-center text-[12px] leading-snug text-muted-foreground">
          Informação educativa. Não substitui aconselhamento médico.
        </p>
      </article>
    </div>
  );
}
