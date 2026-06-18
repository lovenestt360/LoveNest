import { useEffect, useRef, useState } from "react";
import { ReactReader, ReactReaderStyle } from "react-reader";
import type { Rendition, NavItem, Location } from "epubjs";
import {
    FONT_SIZE_STEPS, FONT_FAMILY_MAP, SPACING_MAP, MARGIN_MAP, THEME_COLORS,
    type ReaderSettings,
} from "@/hooks/useReaderSettings";
import { useBookReflections } from "@/hooks/useBookReflections";

export function EpubReader({ fileUrl, bookId, bookTitle, settings, onProgress }: {
    fileUrl: string;
    bookId: string;
    bookTitle?: string;
    settings: ReaderSettings;
    onProgress?: (percent: number, location: string) => void;
}) {
    const [location, setLocation] = useState<string | number | null>(
        () => localStorage.getItem(`book-progress-${bookId}`)
    );
    const [progress, setProgress] = useState(0);
    const renditionRef = useRef<Rendition | null>(null);
    const prevHrefRef = useRef<string | null>(null);
    const tocRef = useRef<NavItem[]>([]);
    const promptedHrefsRef = useRef<Set<string>>(new Set());
    const relocateDebounceRef = useRef<ReturnType<typeof setTimeout>>();

    const { addReflection } = useBookReflections(bookId);
    const [chapterPrompt, setChapterPrompt] = useState<{ chapterId: string; title: string } | null>(null);
    const [reflectionText, setReflectionText] = useState("");
    const [savingReflection, setSavingReflection] = useState(false);

    const applyTheme = (rendition: Rendition, s: ReaderSettings) => {
        const colors = THEME_COLORS[s.theme];
        rendition.themes.register("lovenest", {
            body: { background: colors.bg, color: colors.fg },
        });
        rendition.themes.select("lovenest");
        rendition.themes.fontSize(`${FONT_SIZE_STEPS[s.fontSizeIndex]}%`);
        rendition.themes.font(FONT_FAMILY_MAP[s.font]);
        rendition.themes.override("line-height", SPACING_MAP[s.spacing]);
        rendition.themes.override("padding", `0 ${MARGIN_MAP[s.margin]}`);
    };

    useEffect(() => {
        if (renditionRef.current) applyTheme(renditionRef.current, settings);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.theme, settings.fontSizeIndex, settings.font, settings.spacing, settings.margin]);

    useEffect(() => {
        return () => {
            if (relocateDebounceRef.current) clearTimeout(relocateDebounceRef.current);
        };
    }, []);

    const handleLocationChanged = (epubcfi: string) => {
        setLocation(epubcfi);
        localStorage.setItem(`book-progress-${bookId}`, epubcfi);

        const book = renditionRef.current?.book;
        if (book?.locations.length()) {
            const percent = Math.round(book.locations.percentageFromCfi(epubcfi) * 100);
            setProgress(percent);
            onProgress?.(percent, epubcfi);
        }
    };

    const handleTocChanged = (toc: NavItem[]) => {
        tocRef.current = toc;
    };

    const handleRendition = (rendition: Rendition) => {
        renditionRef.current = rendition;
        applyTheme(rendition, settings);

        rendition.on("relocated", (loc: Location) => {
            const href = loc.start.href;
            if (relocateDebounceRef.current) clearTimeout(relocateDebounceRef.current);

            // Debounce: só considera um capitulo "terminado" depois da posicao
            // assentar — evita disparos repetidos por flutuacao do epubjs no
            // modo de scroll continuo perto de uma fronteira de capitulo.
            relocateDebounceRef.current = setTimeout(() => {
                if (prevHrefRef.current && href !== prevHrefRef.current) {
                    const finishedHref = prevHrefRef.current;
                    if (!promptedHrefsRef.current.has(finishedHref)) {
                        promptedHrefsRef.current.add(finishedHref);
                        const navItem = tocRef.current.find(item => item.href.split("#")[0] === finishedHref.split("#")[0]);
                        setChapterPrompt({ chapterId: finishedHref, title: navItem?.label?.trim() || "este capítulo" });
                    }
                }
                prevHrefRef.current = href;
            }, 1200);
        });

        const book = rendition.book;
        const cacheKey = `book-locations-${bookId}`;
        book.ready.then(() => {
            const cached = localStorage.getItem(cacheKey);
            const ready = cached
                ? Promise.resolve(book.locations.load(cached))
                : book.locations.generate(1024).then(() => {
                    localStorage.setItem(cacheKey, book.locations.save());
                });

            ready.then(() => {
                const cfi = rendition.location?.start?.cfi;
                if (cfi) setProgress(Math.round(book.locations.percentageFromCfi(cfi) * 100));
            });
        });
    };

    const dismissPrompt = () => {
        setChapterPrompt(null);
        setReflectionText("");
    };

    const submitReflection = async () => {
        if (!chapterPrompt || !reflectionText.trim()) return;
        setSavingReflection(true);
        await addReflection(reflectionText, chapterPrompt.chapterId, bookTitle);
        setSavingReflection(false);
        dismissPrompt();
    };

    const colors = THEME_COLORS[settings.theme];
    const readerStyles = {
        ...ReactReaderStyle,
        readerArea: { ...ReactReaderStyle.readerArea, backgroundColor: colors.bg, transition: "none" },
        titleArea: { ...ReactReaderStyle.titleArea, color: colors.fg },
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="h-1 bg-muted shrink-0">
                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex-1 relative">
                <ReactReader
                    key={settings.flow}
                    url={fileUrl}
                    location={location}
                    locationChanged={handleLocationChanged}
                    tocChanged={handleTocChanged}
                    getRendition={handleRendition}
                    readerStyles={readerStyles}
                    epubOptions={{ flow: settings.flow === "scrolled" ? "scrolled-doc" : "paginated" }}
                />

                {chapterPrompt && (
                    <div className="absolute inset-0 z-20 bg-black/50 flex items-end" onClick={dismissPrompt}>
                        <div
                            className="w-full bg-card rounded-t-3xl p-5 space-y-3 animate-in slide-in-from-bottom-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <p className="text-[14px] font-bold text-foreground">
                                O que aprendeste em "{chapterPrompt.title}"?
                            </p>
                            <textarea
                                value={reflectionText}
                                onChange={e => setReflectionText(e.target.value)}
                                placeholder="Escreve a tua reflexão para partilhar com o teu par..."
                                className="w-full min-h-24 rounded-2xl border border-border bg-background p-3 text-[13px] text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={dismissPrompt}
                                    className="flex-1 h-11 rounded-2xl font-bold text-[13px] text-muted-foreground bg-muted active:scale-95 transition-all"
                                >
                                    Agora não
                                </button>
                                <button
                                    type="button"
                                    disabled={!reflectionText.trim() || savingReflection}
                                    onClick={submitReflection}
                                    className="flex-1 h-11 rounded-2xl font-bold text-[13px] text-white bg-rose-500 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {savingReflection ? "A guardar..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
