import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Type, NotebookPen } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useReaderSettings, THEME_COLORS } from "@/hooks/useReaderSettings";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { PdfReader } from "@/features/biblioteca/reader/PdfReader";
import { EpubReader } from "@/features/biblioteca/reader/EpubReader";
import { NativeBookReader } from "@/features/biblioteca/reader/NativeBookReader";
import { ReaderSettingsSheet } from "@/features/biblioteca/reader/ReaderSettingsSheet";
import { ReflectionSpotlightTutorial } from "@/features/biblioteca/reader/ReflectionSpotlightTutorial";
import type { ChapterReaderHandle } from "@/features/biblioteca/reader/ChapterReflectionPrompt";

const PROGRESS_SAVE_DELAY_MS = 1500;
const REFLECTION_ONBOARDING_KEY = "reflection-onboarding-done";

export default function BookReader() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const { books, ownedBookIds, loading: libraryLoading } = useBiblioteca();
    const { myProgress, saveProgress } = useReadingProgress(bookId);
    const spaceId = useCoupleSpaceId();
    const { settings, update: updateSettings } = useReaderSettings();
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [urlLoading, setUrlLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [reflectionOnboardingDone, setReflectionOnboardingDone] = useState(
        () => localStorage.getItem(REFLECTION_ONBOARDING_KEY) === "1"
    );
    const [showReflectionSpotlight, setShowReflectionSpotlight] = useState(false);

    const book = books.find(b => b.id === bookId);
    const canRead = !!book && (book.is_free || ownedBookIds.has(book.id));

    const pendingProgressRef = useRef<{ percent: number; location: string } | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const minutesAccumulatedRef = useRef(0);
    const readerRef = useRef<ChapterReaderHandle>(null);
    const noteButtonRef = useRef<HTMLButtonElement>(null);

    // O prompt automático de reflexão só aparece para ensinar o gesto uma
    // única vez (em qualquer livro). Depois disso, só este botão o abre —
    // evita interromper a leitura a cada capítulo.
    const handleReflectionPromptClosed = (wasAutoTriggered: boolean) => {
        if (!reflectionOnboardingDone && wasAutoTriggered) setShowReflectionSpotlight(true);
    };

    const dismissReflectionSpotlight = () => {
        setShowReflectionSpotlight(false);
        localStorage.setItem(REFLECTION_ONBOARDING_KEY, "1");
        setReflectionOnboardingDone(true);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) minutesAccumulatedRef.current += 1 / 60;
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const flushMinutes = () => {
        const delta = Math.floor(minutesAccumulatedRef.current);
        minutesAccumulatedRef.current -= delta;
        return delta;
    };

    const handleProgress = (percent: number, location: string) => {
        const wasCompleted = (myProgress?.progress_percent ?? 0) >= 100;
        if (percent >= 100 && !wasCompleted && spaceId && book) {
            notifyPartner({
                couple_space_id: spaceId,
                title: "Livro terminado!",
                body: `O teu par terminou de ler "${book.title}".`,
                url: `/biblioteca/${book.id}`,
                type: "biblioteca",
            }).catch(() => {});
        }

        pendingProgressRef.current = { percent, location };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            if (pendingProgressRef.current) {
                saveProgress(pendingProgressRef.current.percent, pendingProgressRef.current.location, flushMinutes());
            }
        }, PROGRESS_SAVE_DELAY_MS);
    };

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            if (pendingProgressRef.current) {
                saveProgress(pendingProgressRef.current.percent, pendingProgressRef.current.location, flushMinutes());
            }
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

    const colors = THEME_COLORS[settings.theme];

    return (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all"
                    style={{ color: colors.fg }}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-[15px] font-bold tracking-tight line-clamp-1 flex-1" style={{ color: colors.fg }}>{book.title}</h1>
                {(book.file_type === "pdf" || book.file_type === "epub" || book.file_type === "lovenest") && (
                    <button
                        ref={noteButtonRef}
                        type="button"
                        onClick={() => readerRef.current?.openManualReflection()}
                        className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
                        style={{ color: colors.fg }}
                    >
                        <NotebookPen className="h-5 w-5" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all"
                    style={{ color: colors.fg }}
                >
                    <Type className="h-5 w-5" />
                </button>
            </header>

            <div className="flex-1 overflow-hidden relative">
                {book.file_type === "lovenest" ? (
                    <NativeBookReader
                        ref={readerRef}
                        bookId={book.id}
                        bookTitle={book.title}
                        settings={settings}
                        onProgress={handleProgress}
                        autoPromptEnabled={!reflectionOnboardingDone}
                        showIntroInPrompt={!reflectionOnboardingDone}
                        onReflectionPromptClosed={handleReflectionPromptClosed}
                    />
                ) : urlLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                ) : error || !signedUrl ? (
                    <div className="h-full flex items-center justify-center px-6 text-center">
                        <p className="text-sm text-muted-foreground">{error ?? "Ficheiro não disponível."}</p>
                    </div>
                ) : book.file_type === "pdf" ? (
                    <PdfReader
                        ref={readerRef}
                        fileUrl={signedUrl}
                        bookId={book.id}
                        bookTitle={book.title}
                        settings={settings}
                        onProgress={handleProgress}
                        showIntroInPrompt={!reflectionOnboardingDone}
                    />
                ) : book.file_type === "epub" ? (
                    <EpubReader
                        ref={readerRef}
                        fileUrl={signedUrl}
                        bookId={book.id}
                        bookTitle={book.title}
                        settings={settings}
                        onProgress={handleProgress}
                        autoPromptEnabled={!reflectionOnboardingDone}
                        showIntroInPrompt={!reflectionOnboardingDone}
                        onReflectionPromptClosed={handleReflectionPromptClosed}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center px-6 text-center">
                        <p className="text-sm text-muted-foreground">Formato de livro não suportado.</p>
                    </div>
                )}
            </div>

            <ReaderSettingsSheet
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                settings={settings}
                onChange={updateSettings}
                mode={book.file_type === "pdf" ? "pdf" : book.file_type === "lovenest" ? "lovenest" : "epub"}
            />

            {showReflectionSpotlight && (
                <ReflectionSpotlightTutorial targetRef={noteButtonRef} onDismiss={dismissReflectionSpotlight} />
            )}
        </div>
    );
}
