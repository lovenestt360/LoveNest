import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ChevronLeft, Loader2, Type, NotebookPen } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useReaderSettings, THEME_COLORS } from "@/hooks/useReaderSettings";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { logActivity } from "@/lib/logActivity";
import { triggerCeremony } from "@/lib/ceremonies";
import { PdfReader } from "@/features/biblioteca/reader/PdfReader";
import { EpubReader } from "@/features/biblioteca/reader/EpubReader";
import { NativeBookReader } from "@/features/biblioteca/reader/NativeBookReader";
import { ReaderSettingsSheet } from "@/features/biblioteca/reader/ReaderSettingsSheet";
import { ReflectionSpotlightTutorial } from "@/features/biblioteca/reader/ReflectionSpotlightTutorial";
import type { ChapterReaderHandle } from "@/features/biblioteca/reader/ChapterReflectionPrompt";

const PROGRESS_SAVE_DELAY_MS = 1500;
const REFLECTION_ONBOARDING_KEY = "reflection-onboarding-done";

// Botão redondo do leitor: a borda e o ícone seguem as cores do tema de leitura.
const READER_BTN = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-opacity active:opacity-60";

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

    // Barra fina de progresso por baixo do cabeçalho.
    const [readPct, setReadPct] = useState<number | null>(null);
    const shownPct = readPct ?? myProgress?.progress_percent ?? 0;

    const flushMinutes = () => {
        const delta = Math.floor(minutesAccumulatedRef.current);
        minutesAccumulatedRef.current -= delta;
        return delta;
    };

    const handleProgress = (percent: number, location: string) => {
        setReadPct(percent);
        const wasCompleted = (myProgress?.progress_percent ?? 0) >= 100;
        if (percent >= 100 && !wasCompleted && spaceId && book) {
            notifyPartner({
                couple_space_id: spaceId,
                title: "Livro terminado!",
                body: `O teu par terminou de ler "${book.title}".`,
                url: `/biblioteca/${book.id}`,
                type: "biblioteca",
            }).catch(() => {});
            triggerCeremony(spaceId, "livro_concluido", book.id, {
                type: "livro_concluido",
                eyebrow: "Livro terminado",
                title: book.title,
                subtitle: "Mais uma história que passa a fazer parte da Jornada.",
            });
        }

        pendingProgressRef.current = { percent, location };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            if (pendingProgressRef.current) {
                saveProgress(pendingProgressRef.current.percent, pendingProgressRef.current.location, flushMinutes());
            }
            if (spaceId) logActivity(spaceId, "leitura");
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
            <header
                className="flex items-center gap-2.5 px-4 pb-3 shrink-0 border-b"
                style={{ paddingTop: "max(12px, env(safe-area-inset-top))", borderColor: colors.fg + "1f", color: colors.fg }}
            >
                <button type="button" onClick={() => navigate(-1)} className={READER_BTN} style={{ borderColor: colors.fg + "26" }} aria-label="Voltar">
                    <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <h1 className="flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{book.title}</h1>
                {(book.file_type === "pdf" || book.file_type === "epub" || book.file_type === "lovenest") && (
                    <button
                        ref={noteButtonRef}
                        type="button"
                        onClick={() => readerRef.current?.openManualReflection()}
                        className={READER_BTN}
                        style={{ borderColor: colors.fg + "26" }}
                        aria-label="Escrever uma reflexão"
                    >
                        <NotebookPen className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </button>
                )}
                <button type="button" onClick={() => setSettingsOpen(true)} className={READER_BTN} style={{ borderColor: colors.fg + "26" }} aria-label="Letra e tema">
                    <Type className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </button>
            </header>
            <div className="h-[3px] shrink-0" style={{ background: colors.fg + "1a" }} aria-hidden="true">
                <div className="h-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, shownPct))}%`, background: colors.fg, opacity: 0.7 }} />
            </div>

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
