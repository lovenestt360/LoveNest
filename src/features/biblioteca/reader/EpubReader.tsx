import { useEffect, useRef, useState } from "react";
import { ReactReader, ReactReaderStyle } from "react-reader";
import type { Rendition } from "epubjs";
import {
    FONT_SIZE_STEPS, FONT_FAMILY_MAP, SPACING_MAP, MARGIN_MAP, THEME_COLORS,
    type ReaderSettings,
} from "@/hooks/useReaderSettings";

export function EpubReader({ fileUrl, bookId, settings, onProgress }: {
    fileUrl: string;
    bookId: string;
    settings: ReaderSettings;
    onProgress?: (percent: number, location: string) => void;
}) {
    const [location, setLocation] = useState<string | number | null>(
        () => localStorage.getItem(`book-progress-${bookId}`)
    );
    const [progress, setProgress] = useState(0);
    const renditionRef = useRef<Rendition | null>(null);

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

    const handleRendition = (rendition: Rendition) => {
        renditionRef.current = rendition;
        applyTheme(rendition, settings);

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
                    getRendition={handleRendition}
                    readerStyles={readerStyles}
                    epubOptions={{ flow: settings.flow === "scrolled" ? "scrolled-doc" : "paginated" }}
                />
            </div>
        </div>
    );
}
