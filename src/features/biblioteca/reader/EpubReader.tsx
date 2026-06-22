import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ReactReader, ReactReaderStyle } from "react-reader";
import type { Rendition, NavItem, Location } from "epubjs";
import {
    FONT_SIZE_STEPS, FONT_FAMILY_MAP, SPACING_MAP, MARGIN_MAP, THEME_COLORS,
    type ReaderSettings,
} from "@/hooks/useReaderSettings";
import { useBookReflections } from "@/hooks/useBookReflections";
import { ChapterReflectionPrompt, type ChapterPrompt, type ChapterReaderHandle } from "./ChapterReflectionPrompt";

export const EpubReader = forwardRef<ChapterReaderHandle, {
    fileUrl: string;
    bookId: string;
    bookTitle?: string;
    settings: ReaderSettings;
    onProgress?: (percent: number, location: string) => void;
    autoPromptEnabled?: boolean;
    showIntroInPrompt?: boolean;
    onReflectionPromptClosed?: (wasAutoTriggered: boolean) => void;
}>(function EpubReader({ fileUrl, bookId, bookTitle, settings, onProgress, autoPromptEnabled = true, showIntroInPrompt, onReflectionPromptClosed }, ref) {
    const [location, setLocation] = useState<string | number | null>(
        () => localStorage.getItem(`book-progress-${bookId}`)
    );
    const [progress, setProgress] = useState(0);
    const renditionRef = useRef<Rendition | null>(null);
    const prevHrefRef = useRef<string | null>(null);
    const tocRef = useRef<NavItem[]>([]);
    const promptedHrefsRef = useRef<Set<string>>(new Set());
    const wasAutoTriggeredRef = useRef(false);
    const relocateDebounceRef = useRef<ReturnType<typeof setTimeout>>();

    const { addReflection } = useBookReflections(bookId);
    const [chapterPrompt, setChapterPrompt] = useState<ChapterPrompt | null>(null);

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
                if (autoPromptEnabled && prevHrefRef.current && href !== prevHrefRef.current) {
                    const finishedHref = prevHrefRef.current;
                    if (!promptedHrefsRef.current.has(finishedHref)) {
                        promptedHrefsRef.current.add(finishedHref);
                        const navItem = tocRef.current.find(item => item.href.split("#")[0] === finishedHref.split("#")[0]);
                        wasAutoTriggeredRef.current = true;
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

    useImperativeHandle(ref, () => ({
        openManualReflection: () => {
            const href = renditionRef.current?.location?.start?.href ?? prevHrefRef.current;
            if (!href) return;
            const navItem = tocRef.current.find(item => item.href.split("#")[0] === href.split("#")[0]);
            wasAutoTriggeredRef.current = false;
            setChapterPrompt({ chapterId: href, title: navItem?.label?.trim() || "este capítulo" });
        },
    }));

    const dismissPrompt = () => {
        setChapterPrompt(null);
        onReflectionPromptClosed?.(wasAutoTriggeredRef.current);
    };

    const handleReflectionSubmit = async (content: string) => {
        if (!chapterPrompt) return;
        await addReflection(content, chapterPrompt.chapterId, bookTitle);
        setChapterPrompt(null);
        onReflectionPromptClosed?.(wasAutoTriggeredRef.current);
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
                    <ChapterReflectionPrompt
                        prompt={chapterPrompt}
                        onDismiss={dismissPrompt}
                        onSubmit={handleReflectionSubmit}
                        showIntro={showIntroInPrompt}
                    />
                )}
            </div>
        </div>
    );
});
