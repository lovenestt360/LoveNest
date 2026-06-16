import { useRef, useState } from "react";
import { ReactReader } from "react-reader";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { Rendition } from "epubjs";

const FONT_STEPS = [90, 100, 110, 125, 140, 160, 180];

export function EpubReader({ fileUrl, bookId, onProgress }: { fileUrl: string; bookId: string; onProgress?: (percent: number, location: string) => void }) {
    const [location, setLocation] = useState<string | number | null>(
        () => localStorage.getItem(`book-progress-${bookId}`)
    );
    const [progress, setProgress] = useState(0);
    const [fontIndex, setFontIndex] = useState(1);
    const renditionRef = useRef<Rendition | null>(null);

    const applyFontSize = (index: number) => {
        renditionRef.current?.themes.fontSize(`${FONT_STEPS[index]}%`);
        setFontIndex(index);
    };

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
        rendition.themes.fontSize(`${FONT_STEPS[fontIndex]}%`);

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

    return (
        <div className="h-full flex flex-col">
            <div className="h-1 bg-muted shrink-0">
                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex-1 relative">
                <ReactReader
                    url={fileUrl}
                    location={location}
                    locationChanged={handleLocationChanged}
                    getRendition={handleRendition}
                />

                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                    <button
                        type="button"
                        onClick={() => applyFontSize(Math.min(FONT_STEPS.length - 1, fontIndex + 1))}
                        disabled={fontIndex >= FONT_STEPS.length - 1}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center text-foreground active:scale-95 transition-all disabled:opacity-30"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => applyFontSize(Math.max(0, fontIndex - 1))}
                        disabled={fontIndex <= 0}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center text-foreground active:scale-95 transition-all disabled:opacity-30"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
