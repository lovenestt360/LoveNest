import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { supabase } from "@/integrations/supabase/client";
import { PdfReader } from "@/features/biblioteca/reader/PdfReader";
import { EpubReader } from "@/features/biblioteca/reader/EpubReader";

const PROGRESS_SAVE_DELAY_MS = 1500;

export default function BookReader() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const { books, ownedBookIds, loading: libraryLoading } = useBiblioteca();
    const { saveProgress } = useReadingProgress(bookId);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [urlLoading, setUrlLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const book = books.find(b => b.id === bookId);
    const canRead = !!book && (book.is_free || ownedBookIds.has(book.id));

    const pendingProgressRef = useRef<{ percent: number; location: string } | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

    const handleProgress = (percent: number, location: string) => {
        pendingProgressRef.current = { percent, location };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            if (pendingProgressRef.current) saveProgress(pendingProgressRef.current.percent, pendingProgressRef.current.location);
        }, PROGRESS_SAVE_DELAY_MS);
    };

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            if (pendingProgressRef.current) saveProgress(pendingProgressRef.current.percent, pendingProgressRef.current.location);
        };
    }, [saveProgress]);

    useEffect(() => {
        if (libraryLoading || !book || !canRead || !book.file_path) {
            setUrlLoading(false);
            return;
        }

        let active = true;
        setUrlLoading(true);
        supabase.storage
            .from("book-files")
            .createSignedUrl(book.file_path, 3600)
            .then(({ data, error }) => {
                if (!active) return;
                if (error || !data) {
                    setError("Não foi possível carregar o ficheiro deste livro.");
                } else {
                    setSignedUrl(data.signedUrl);
                }
                setUrlLoading(false);
            });

        return () => { active = false; };
    }, [book, canRead, libraryLoading]);

    if (libraryLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
            </div>
        );
    }

    if (!book) return <Navigate to="/biblioteca" replace />;
    if (!canRead) return <Navigate to={`/biblioteca/${book.id}`} replace />;

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-[15px] font-bold tracking-tight line-clamp-1 flex-1">{book.title}</h1>
            </header>

            <div className="flex-1 overflow-hidden relative">
                {urlLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                ) : error || !signedUrl ? (
                    <div className="h-full flex items-center justify-center px-6 text-center">
                        <p className="text-sm text-muted-foreground">{error ?? "Ficheiro não disponível."}</p>
                    </div>
                ) : book.file_type === "pdf" ? (
                    <PdfReader fileUrl={signedUrl} bookId={book.id} onProgress={handleProgress} />
                ) : book.file_type === "epub" ? (
                    <EpubReader fileUrl={signedUrl} bookId={book.id} onProgress={handleProgress} />
                ) : (
                    <div className="h-full flex items-center justify-center px-6 text-center">
                        <p className="text-sm text-muted-foreground">Formato de livro não suportado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
