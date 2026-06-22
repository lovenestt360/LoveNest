import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { THEME_COLORS, type ReaderSettings } from "@/hooks/useReaderSettings";
import { useBookReflections } from "@/hooks/useBookReflections";
import {
    ChapterReflectionPrompt, GENERAL_CHAPTER_ID, type ChapterPrompt, type ChapterReaderHandle,
} from "./ChapterReflectionPrompt";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

export const PdfReader = forwardRef<ChapterReaderHandle, {
    fileUrl: string;
    bookId: string;
    bookTitle?: string;
    settings: ReaderSettings;
    onProgress?: (percent: number, location: string) => void;
    showIntroInPrompt?: boolean;
}>(function PdfReader({ fileUrl, bookId, bookTitle, settings, onProgress, showIntroInPrompt }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [chapterPrompt, setChapterPrompt] = useState<ChapterPrompt | null>(null);
    const { addReflection } = useBookReflections(bookId);

    useImperativeHandle(ref, () => ({
        openManualReflection: () => {
            setChapterPrompt({ chapterId: GENERAL_CHAPTER_ID, title: "este livro" });
        },
    }));

    const dismissPrompt = () => setChapterPrompt(null);

    const handleReflectionSubmit = async (content: string) => {
        if (!chapterPrompt) return;
        await addReflection(content, chapterPrompt.chapterId, bookTitle);
        setChapterPrompt(null);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setContainerWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        const saved = Number(localStorage.getItem(`book-progress-${bookId}`));
        if (saved >= 1 && saved <= numPages) setPageNumber(saved);
    };

    const goToPage = (page: number) => {
        setPageNumber(page);
        localStorage.setItem(`book-progress-${bookId}`, String(page));
        if (numPages) onProgress?.(Math.round((page / numPages) * 100), String(page));
    };

    const progress = numPages ? (pageNumber / numPages) * 100 : 0;
    const colors = THEME_COLORS[settings.theme];

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="h-1 bg-muted shrink-0">
                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div ref={containerRef} className="flex-1 overflow-hidden relative" style={{ backgroundColor: colors.bg }}>
                <Document
                    file={fileUrl}
                    onLoadSuccess={handleLoadSuccess}
                    loading={
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                        </div>
                    }
                    error={
                        <div className="flex items-center justify-center py-24 px-6 text-center">
                            <p className="text-sm text-muted-foreground">Não foi possível abrir este PDF.</p>
                        </div>
                    }
                >
                    {containerWidth > 0 && (
                        // key={pageNumber} reinicia o zoom/posição sempre que a página muda
                        <TransformWrapper
                            key={pageNumber}
                            minScale={1}
                            maxScale={4}
                            doubleClick={{ mode: "toggle", step: 1.5 }}
                        >
                            <TransformComponent
                                wrapperStyle={{ width: "100%", height: "100%" }}
                                contentStyle={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}
                            >
                                <Page pageNumber={pageNumber} width={Math.min(containerWidth, 720)} className="shadow-sm" />
                            </TransformComponent>
                        </TransformWrapper>
                    )}
                </Document>

                {chapterPrompt && (
                    <ChapterReflectionPrompt
                        prompt={chapterPrompt}
                        onDismiss={dismissPrompt}
                        onSubmit={handleReflectionSubmit}
                        showIntro={showIntroInPrompt}
                    />
                )}
            </div>

            {numPages !== null && numPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0" style={{ backgroundColor: colors.bg }}>
                    <button
                        type="button"
                        onClick={() => goToPage(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber <= 1}
                        className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
                        style={{ color: colors.fg }}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-[13px] font-semibold" style={{ color: colors.fg }}>
                        Página {pageNumber} de {numPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => goToPage(Math.min(numPages, pageNumber + 1))}
                        disabled={pageNumber >= numPages}
                        className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
                        style={{ color: colors.fg }}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
});
