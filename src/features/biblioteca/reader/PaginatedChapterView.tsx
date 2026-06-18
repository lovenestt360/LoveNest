import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FONT_FAMILY_MAP, MARGIN_MAP, type ReaderSettings } from "@/hooks/useReaderSettings";
import { ChapterContent } from "./ChapterContent";

interface ChapterLike {
    id: string;
    title: string;
    content: string;
}

export function PaginatedChapterView({ chapter, settings, textColor, isLastChapter, onPageProgress, onRequestNextChapter, onRequestPrevChapter }: {
    chapter: ChapterLike;
    settings: ReaderSettings;
    textColor: string;
    isLastChapter: boolean;
    onPageProgress: (fraction: number) => void;
    onRequestNextChapter: () => void;
    onRequestPrevChapter: () => void;
}) {
    const { toast } = useToast();
    const viewportRef = useRef<HTMLDivElement>(null);
    const columnsRef = useRef<HTMLDivElement>(null);
    const touchStartXRef = useRef<number | null>(null);
    const [innerWidth, setInnerWidth] = useState(0);
    const [innerHeight, setInnerHeight] = useState(0);
    const [pageIndex, setPageIndex] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Mede a area util do ecra (descontando a margem horizontal, que é
    // aplicada aqui no viewport em vez de no ChapterContent, para que fique
    // consistente em todas as páginas — não só na primeira/última).
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const marginPx = parseFloat(MARGIN_MAP[settings.margin]) || 0;
        const measure = () => {
            setInnerWidth(Math.max(0, el.clientWidth - marginPx * 2));
            setInnerHeight(el.clientHeight);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [settings.margin]);

    // Recalcula o numero de "paginas" (colunas CSS) sempre que o espaço
    // disponivel ou as definicoes que afetam quanto texto cabe por pagina
    // mudam.
    useLayoutEffect(() => {
        const columnsEl = columnsRef.current;
        if (!columnsEl || innerWidth === 0) return;
        const pages = Math.max(1, Math.round(columnsEl.scrollWidth / innerWidth));
        setTotalPages(pages);
        setPageIndex(p => Math.min(p, pages - 1));
    }, [innerWidth, innerHeight, chapter.content, settings.fontSizeIndex, settings.font, settings.spacing]);

    useEffect(() => {
        onPageProgress(totalPages > 0 ? (pageIndex + 1) / totalPages : 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex, totalPages]);

    const goNext = () => {
        if (pageIndex < totalPages - 1) {
            setPageIndex(p => p + 1);
        } else if (!isLastChapter) {
            onRequestNextChapter();
        } else {
            toast({ title: "Chegaste ao fim do livro" });
        }
    };

    const goPrev = () => {
        if (pageIndex > 0) setPageIndex(p => p - 1);
        else onRequestPrevChapter();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current == null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
        touchStartXRef.current = null;
        const THRESHOLD = 40;
        if (deltaX <= -THRESHOLD) goNext();
        else if (deltaX >= THRESHOLD) goPrev();
    };

    return (
        <div
            ref={viewportRef}
            className="h-full overflow-hidden"
            style={{ padding: `0 ${MARGIN_MAP[settings.margin]}` }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div
                ref={columnsRef}
                style={{
                    columnWidth: innerWidth ? `${innerWidth}px` : undefined,
                    columnGap: 0,
                    columnFill: "auto",
                    height: innerHeight ? `${innerHeight}px` : undefined,
                    transform: `translateX(-${pageIndex * innerWidth}px)`,
                    transition: "transform 220ms ease",
                }}
            >
                <h2 className="pb-2 text-xl font-bold" style={{ color: textColor, fontFamily: FONT_FAMILY_MAP[settings.font] }}>
                    {chapter.title}
                </h2>
                <ChapterContent content={chapter.content} settings={settings} className="space-y-4" applyPadding={false} />
            </div>
        </div>
    );
}
