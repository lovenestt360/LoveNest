import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CycleIcon } from "../CycleIcon";
import { useCycleData } from "../useCycleData";
import { CARD, ROUND } from "../cycleUi";
import { allArticles, allCategories, getCategoryById, searchArticles, type Article } from "./articles";
import { SaveButton, TopicTile, getFavs, getRead, toggleFav, topicOf } from "./knowledgeUi";

const PHASE_NOW: Record<string, [string, string]> = {
  // [para ela, para ele]
  menstrual: ["Estás com o período", "Ela está com o período"],
  folicular: ["Estás na fase folicular", "Ela está na fase folicular"],
  ovulacao: ["Estás na ovulação", "Ela está na ovulação"],
  luteal: ["Estás na fase lútea", "Ela está na fase lútea"],
};

export default function KnowledgeCenterPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const topicId = params.get("tema");
  const topic = topicId ? getCategoryById(topicId) : undefined;

  const { engine, openPeriod, isMale } = useCycleData();
  const phase = openPeriod ? "menstrual" : engine?.phase;

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"todos" | "guardados">("todos");
  const [favs, setFavs] = useState(getFavs);
  const [read] = useState(getRead);

  const onSave = (id: string) => (e: React.MouseEvent) => { e.stopPropagation(); setFavs(new Set(toggleFav(id))); };
  const open = (a: Article) => navigate(`/ciclo/conhecimento/${a.id}`);
  const openTopic = (id: string | null) => setParams(id ? { tema: id } : {}, { replace: false });

  // O artigo da fase atual, de preferência um que ainda não leu.
  const featured = useMemo(() => {
    if (!phase || !PHASE_NOW[phase]) return null;
    const list = allArticles.filter((a) => a.phase === phase);
    return list.find((a) => !read.has(a.id)) ?? list[0] ?? null;
  }, [phase, read]);

  const results = useMemo(() => searchArticles(query), [query]);
  const saved = useMemo(() => allArticles.filter((a) => favs.has(a.id)), [favs]);

  const row = (a: Article, withTopic = false) => (
    <div key={a.id} role="button" tabIndex={0} onClick={() => open(a)} onKeyDown={(e) => e.key === "Enter" && open(a)}
      className="flex cursor-pointer items-center gap-3 py-3 [&+&]:border-t [&+&]:border-[#ECE8E3] dark:[&+&]:border-border">
      {withTopic && <TopicTile categoryId={a.categoryId} size={40} />}
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">{a.title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {withTopic && `${topicOf(a.categoryId).short} · `}{a.readTime} min
          {read.has(a.id) && <span className="font-semibold text-[#23733F]"> · Lido</span>}
        </p>
      </div>
      <SaveButton saved={favs.has(a.id)} onClick={onSave(a.id)} />
    </div>
  );

  const topicGrid = (ids: string[]) => (
    <div className="grid grid-cols-2 gap-2.5">
      {ids.map((id) => {
        const c = getCategoryById(id)!;
        const n = c.articleIds.length;
        return (
          <button key={id} type="button" onClick={() => openTopic(id)}
            className="flex items-center gap-2.5 rounded-[20px] border border-[#ECE8E3] bg-white p-3 text-left transition-colors hover:bg-[#FBFAF8] active:scale-[0.98] dark:border-border dark:bg-card dark:hover:bg-muted">
            <TopicTile categoryId={id} size={40} />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground">{topicOf(id).short}</span>
              <span className="text-[12px] text-muted-foreground">{n} {n === 1 ? "artigo" : "artigos"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  // ── Um tema aberto ──────────────────────────────────────────────────────────
  if (topic) {
    const list = topic.articleIds.map((id) => allArticles.find((a) => a.id === id)).filter(Boolean) as Article[];
    const related = allArticles
      .filter((a) => a.categoryId !== topic.id && list.some((x) => x.tags.some((t) => a.tags.includes(t))))
      .slice(0, 2);
    return (
      <section className="space-y-4 pb-6">
        <header>
          <button type="button" onClick={() => openTopic(null)} aria-label="Voltar" className={ROUND}>
            <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </header>
        <div className="flex items-center gap-3.5">
          <TopicTile categoryId={topic.id} size={56} tinted />
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.035em] text-foreground">{topicOf(topic.id).short}</h1>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{topic.description}</p>
          </div>
        </div>
        <section className={cn(CARD, "py-1")}>{list.map((a) => row(a))}</section>
        {related.length > 0 && (
          <>
            <p className="px-1 text-[12.5px] font-semibold text-muted-foreground">Também te pode interessar</p>
            <section className={cn(CARD, "py-1")}>{related.map((a) => row(a, true))}</section>
          </>
        )}
        <p className="px-1 text-[12.5px] font-semibold text-muted-foreground">Mais temas</p>
        {topicGrid(allCategories.map((c) => c.id).filter((id) => id !== topic.id))}
      </section>
    );
  }

  // ── Centro ──────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-4 pb-6">
      <header>
        <button type="button" onClick={() => navigate("/ciclo")} aria-label="Voltar ao Ciclo" className={ROUND}>
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </header>
      <div className="px-1">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.035em] text-foreground">
          {isMale ? "Entende o ciclo dela" : "Aprende sobre o teu ciclo"}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{allArticles.length} artigos curtos, escritos com carinho.</p>
      </div>

      <label className="flex h-[46px] items-center gap-2.5 rounded-[16px] border border-[#ECE8E3] bg-[#F7F5F2] px-3.5 focus-within:border-[#0B1324] focus-within:bg-white dark:border-border dark:bg-muted dark:focus-within:bg-card">
        <CycleIcon kind="lupa" size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar: TPM, cólicas, ovulação…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-[#77736C]" />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Limpar pesquisa"><X className="h-4 w-4 text-muted-foreground" /></button>
        )}
      </label>

      {query ? (
        <>
          <p className="px-1 text-[12.5px] font-semibold text-muted-foreground">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </p>
          {results.length ? (
            <section className={cn(CARD, "py-1")}>{results.map((a) => row(a, true))}</section>
          ) : (
            <p className="px-1 text-[13.5px] text-muted-foreground">Nada encontrado. Experimenta outra palavra, como "cólicas" ou "fértil".</p>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-1 rounded-[14px] bg-[#F4F1EC] p-1 dark:bg-muted">
            {(["todos", "guardados"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={cn("h-[34px] flex-1 rounded-[10px] text-[13px] font-semibold transition-colors",
                  tab === t ? "bg-white text-[#0B1324] shadow-[0_1px_2px_rgba(11,19,36,0.06),0_4px_12px_-6px_rgba(11,19,36,0.2)] dark:bg-card dark:text-foreground" : "text-muted-foreground")}>
                {t === "todos" ? "Todos" : `Guardados${saved.length ? ` · ${saved.length}` : ""}`}
              </button>
            ))}
          </div>

          {tab === "guardados" ? (
            saved.length ? (
              <section className={cn(CARD, "py-1")}>{saved.map((a) => row(a, true))}</section>
            ) : (
              <p className="px-1 pt-2 text-[13.5px] leading-snug text-muted-foreground">
                Ainda não guardaste nenhum artigo. Toca no marcador de um artigo para o encontrares aqui.
              </p>
            )
          ) : (
            <>
              {featured && phase && (
                <>
                  <p className="px-1 text-[12.5px] font-semibold text-muted-foreground">Para ti agora</p>
                  <button type="button" onClick={() => open(featured)}
                    className={cn("flex w-full items-center gap-3.5 rounded-[24px] p-4 text-left active:scale-[0.99]", topicOf(featured.categoryId).tint)}>
                    <TopicTile categoryId={featured.categoryId} size={52} className="bg-white/70 dark:bg-card/60" />
                    <span className="min-w-0">
                      <span className="inline-flex h-6 items-center rounded-full bg-white px-2.5 text-[12px] font-semibold text-[#3A4150] dark:bg-card dark:text-foreground/80">
                        {PHASE_NOW[phase][isMale ? 1 : 0]}
                      </span>
                      <span className="mt-1.5 block text-[16px] font-semibold leading-snug tracking-[-0.02em] text-foreground">{featured.title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{featured.readTime} min de leitura</span>
                    </span>
                  </button>
                </>
              )}
              <p className="px-1 text-[12.5px] font-semibold text-muted-foreground">Temas</p>
              {topicGrid(allCategories.map((c) => c.id))}
            </>
          )}
        </>
      )}
    </section>
  );
}
