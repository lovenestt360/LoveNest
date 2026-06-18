import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { THEME_COLORS, FONT_FAMILY_MAP, type ReaderSettings } from "@/hooks/useReaderSettings";
import { useBookChapters } from "@/hooks/useBookChapters";
import { useBookReflections } from "@/hooks/useBookReflections";
import { cn } from "@/lib/utils";
import { ChapterContent } from "./ChapterContent";
import { ChapterReflectionPrompt, type ChapterPrompt } from "./ChapterReflectionPrompt";

export function NativeBookReader({ bookId, bookTitle, settings, onProgress }: {
    bookId: string;
    bookTitle?: string;
    settings: ReaderSettings;
    onProgress?: (percent: number, location: string) => void;
}) {
    const { chapters, loading } = useBookChapters(bookId);
    const { addReflection } = useBookReflections(bookId);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [tocOpen, setTocOpen] = useState(false);
    const [chapterPrompt, setChapterPrompt] = useState<ChapterPrompt | null>(null);
    const promptedRef = useRef<Set<string>>(new Set());
    const contentRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const rafRef = useRef<number>();

    useEffect(() => {
        if (initializedRef.current || chapters.length === 0) return;
        initializedRef.current = true;
        const savedId = localStorage.getItem(`book-progress-${bookId}`);
        const idx = savedId ? chapters.findIndex(c => c.id === savedId) : -1;
        setCurrentIndex(idx >= 0 ? idx : 0);
    }, [chapters, bookId]);

    const currentChapter = chapters[currentIndex];

    const reportProgress = () => {
        const el = contentRef.current;
        if (!el || !currentChapter || chapters.length === 0) return;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const fraction = maxScroll <= 0 ? 1 : Math.min(1, Math.max(0, el.scrollTop / maxScroll));
        const percent = Math.round(((currentIndex + fraction) / chapters.length) * 100);
        onProgress?.(percent, currentChapter.id);
    };

    const handleScroll = () => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = undefined;
            reportProgress();
        });
    };

    useEffect(() => {
        if (!currentChapter) return;
        localStorage.setItem(`book-progress-${bookId}`, currentChapter.id);
        contentRef.current?.scrollTo({ top: 0 });
        reportProgress();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    const promptForChapter = (chapter: { id: string; title: string }) => {
        if (promptedRef.current.has(chapter.id)) return;
        promptedRef.current.add(chapter.id);
        setChapterPrompt({ chapterId: chapter.id, title: chapter.title });
    };

    const goToChapter = (index: number) => {
        if (index === currentIndex || index < 0 || index >= chapters.length) return;
        if (index > currentIndex && currentChapter) promptForChapter(currentChapter);
        setCurrentIndex(index);
        setTocOpen(false);
    };

    const dismissPrompt = () => setChapterPrompt(null);

    const handleReflectionSubmit = async (content: string) => {
        if (!chapterPrompt) return;
        await addReflection(content, chapterPrompt.chapterId, bookTitle);
        setChapterPrompt(null);
    };

    const colors = THEME_COLORS[settings.theme];

    if (loading) {
        return <div className="h-full" style={{ backgroundColor: colors.bg }} />;
    }

    if (chapters.length === 0) {
        return (
            <div className="h-full flex items-center justify-center px-6 text-center" style={{ backgroundColor: colors.bg, color: colors.fg }}>
                <p className="text-sm opacity-60">Este livro ainda não tem capítulos publicados.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="flex-1 overflow-y-auto relative" ref={contentRef} onScroll={handleScroll}>
                {currentChapter && (
                    <>
                        <h2
                            className="px-6 pt-6 pb-2 text-xl font-bold"
                            style={{ color: colors.fg, fontFamily: FONT_FAMILY_MAP[settings.font] }}
                        >
                            {currentChapter.title}
                        </h2>
                        <ChapterContent content={currentChapter.content} settings={settings} />

                        <div className="px-6 pb-12 pt-2">
                            {currentIndex < chapters.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => goToChapter(currentIndex + 1)}
                                    className="w-full h-12 rounded-2xl font-bold text-[14px] text-white bg-rose-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Próximo Capítulo <ChevronRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5 py-2 text-center" style={{ color: colors.fg }}>
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    <p className="text-[13px] font-bold">Chegaste ao fim do livro</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {chapterPrompt && (
                    <ChapterReflectionPrompt prompt={chapterPrompt} onDismiss={dismissPrompt} onSubmit={handleReflectionSubmit} />
                )}
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border shrink-0" style={{ backgroundColor: colors.bg }}>
                <button
                    type="button"
                    onClick={() => goToChapter(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-full disabled:opacity-30 active:scale-95 transition-all"
                    style={{ color: colors.fg }}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                    type="button"
                    onClick={() => setTocOpen(true)}
                    className="flex items-center gap-1.5 text-[12px] font-bold"
                    style={{ color: colors.fg }}
                >
                    <List className="h-3.5 w-3.5" /> Capítulo {currentIndex + 1} de {chapters.length}
                </button>
                <button
                    type="button"
                    onClick={() => goToChapter(currentIndex + 1)}
                    disabled={currentIndex === chapters.length - 1}
                    className="p-2 rounded-full disabled:opacity-30 active:scale-95 transition-all"
                    style={{ color: colors.fg }}
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <Sheet open={tocOpen} onOpenChange={setTocOpen}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
                    <SheetHeader className="text-left mb-2">
                        <SheetTitle>Capítulos</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-1 pb-6">
                        {chapters.map((c, i) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => goToChapter(i)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors",
                                    i === currentIndex ? "bg-rose-500 text-white" : "text-foreground hover:bg-muted"
                                )}
                            >
                                {i + 1}. {c.title}
                            </button>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
