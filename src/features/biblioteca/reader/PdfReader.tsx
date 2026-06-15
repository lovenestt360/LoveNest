import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

export function PdfReader({ fileUrl }: { fileUrl: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setContainerWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="h-full flex flex-col">
            <div ref={containerRef} className="flex-1 overflow-auto flex justify-center px-4 py-4">
                <Document
                    file={fileUrl}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
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
                        <Page pageNumber={pageNumber} width={Math.min(containerWidth, 720)} className="shadow-sm" />
                    )}
                </Document>
            </div>

            {numPages !== null && numPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 bg-background">
                    <button
                        type="button"
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
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
                        onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
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
