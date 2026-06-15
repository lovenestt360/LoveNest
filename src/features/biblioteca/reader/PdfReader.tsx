import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

const ZOOM_STEPS = [1, 1.25, 1.5, 1.75, 2, 2.5];

export function PdfReader({ fileUrl, bookId }: { fileUrl: string; bookId: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [zoomIndex, setZoomIndex] = useState(0);

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
    };

    const zoom = ZOOM_STEPS[zoomIndex];
    const progress = numPages ? (pageNumber / numPages) * 100 : 0;

    return (
        <div className="h-full flex flex-col">
            <div className="h-1 bg-muted shrink-0">
                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex-1 relative overflow-hidden">
                <div ref={containerRef} className="absolute inset-0 overflow-auto flex justify-center px-4 py-4">
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
                            <Page pageNumber={pageNumber} width={Math.min(containerWidth, 720) * zoom} className="shadow-sm" />
                        )}
                    </Document>
                </div>

                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                    <button
                        type="button"
                        onClick={() => setZoomIndex(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                        disabled={zoomIndex >= ZOOM_STEPS.length - 1}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center text-foreground active:scale-95 transition-all disabled:opacity-30"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoomIndex(i => Math.max(0, i - 1))}
                        disabled={zoomIndex <= 0}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center text-foreground active:scale-95 transition-all disabled:opacity-30"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {numPages !== null && numPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 bg-background">
                    <button
                        type="button"
                        onClick={() => goToPage(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber <= 1}
                        className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground disabled:opacity-30"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-[13px] font-semibold text-muted-foreground">
                        Página {pageNumber} de {numPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => goToPage(Math.min(numPages, pageNumber + 1))}
                        disabled={pageNumber >= numPages}
                        className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground disabled:opacity-30"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
