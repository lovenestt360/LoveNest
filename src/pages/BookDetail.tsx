import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    BookText, BookOpenText, CheckCircle2, Lock, Clock,
    Bookmark, BookmarkCheck, Share2, Eye, Hash, ChevronDown, ChevronUp, HeartHandshake, ChevronRight,
} from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useBookStats } from "@/hooks/useBookStats";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SURFACE, SectionTitle } from "@/features/home/components/HomeSections";
import { PurchaseSection } from "@/features/biblioteca/PurchaseSection";
import { BookRow } from "@/features/biblioteca/BookRow";
import { StarRating } from "@/features/biblioteca/StarRating";
import { BookDetailSkeleton } from "@/features/biblioteca/BookDetailSkeleton";
import { cn } from "@/lib/utils";

export default function BookDetail() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const spaceId = useCoupleSpaceId();
    const { books, categories, ownedBookIds, pendingBookIds, rejectedPurchases, myProgressByBook, loading, refetch } = useBiblioteca();
    const { myProgress, partnerProgress } = useReadingProgress(bookId);
    const { partner } = usePartnerProfile();
    const { stats, myRating, isFavorite, rate, toggleFavorite } = useBookStats(bookId);
    const [descExpanded, setDescExpanded] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    // Parallax suave na capa: acompanha o scroll a uma velocidade menor,
    // com um limite para não exagerar nem deslocar a capa para fora da área.
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    const coverParallax = Math.min(20, Math.max(0, scrollY) * 0.15);

    const book = books.find(b => b.id === bookId);
    const category = categories.find(c => c.id === book?.category_id);
    const owned = bookId ? ownedBookIds.has(bookId) : false;
    const pending = bookId ? pendingBookIds.has(bookId) : false;
    const rejected = bookId ? rejectedPurchases.get(bookId) : undefined;
    const canRead = book?.is_free || owned;

    const similarBooks = useMemo(() => {
        if (!book) return [];
        return books.filter(b => b.id !== book.id && b.category_id === book.category_id).slice(0, 6);
    }, [books, book]);

    const myPercent = myProgress?.progress_percent ?? 0;
    const readLabel = myPercent >= 100 ? "Ler novamente" : myPercent > 0 ? "Continuar leitura" : "Ler agora";

    const handleRead = () => {
        navigate(`/biblioteca/${bookId}/ler`);
    };

    const handleShare = async () => {
        if (!book) return;
        const text = `"${book.title}"${book.author ? ` de ${book.author}` : ""} — descobre na Biblioteca do LoveNest.`;
        const url = `${window.location.origin}/biblioteca/${book.id}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: book.title, text, url });
                return;
            } catch (e: any) {
                if (e?.name === "AbortError") return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
        } catch {}
    };

    if (loading) {
        return <BookDetailSkeleton />;
    }

    if (!book) {
        return (
            <section className="animate-fade-in">
                <ScreenHeader title="Livro" />
                <div className={cn(SURFACE, "mt-6 space-y-2 rounded-[20px] p-10 text-center")}>
                    <BookText className="mx-auto h-8 w-8 text-[#C9C4BD]" strokeWidth={1.6} />
                    <p className="text-[15px] font-semibold text-foreground">Livro não encontrado</p>
                </div>
            </section>
        );
    }

    return (
        <section className="animate-fade-in">
            <ScreenHeader title={category?.name ?? "Livro"} subtitle="Biblioteca" />

            <div className="flex flex-col items-center pt-6 text-center">
                <div
                    className="mb-5 aspect-[2/3] w-[148px] overflow-hidden rounded-[18px] border border-[#ECE8E3] bg-[#F4F2EF] shadow-[0_22px_40px_-20px_rgba(11,19,36,0.45)] dark:border-border dark:bg-muted"
                    style={{ transform: `translateY(${coverParallax}px)` }}
                >
                    {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#C9C4BD]">
                            <BookText className="w-10 h-10" strokeWidth={1.5} />
                        </div>
                    )}
                </div>

                <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{book.title}</h2>
                {book.author && <p className="mt-1 text-[14px] text-muted-foreground">{book.author}</p>}

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {category && (
                        <span className="rounded-full border border-[#ECE8E3] bg-white px-3 py-1 text-[12px] font-semibold text-[#3A4150] dark:border-border dark:bg-card dark:text-muted-foreground">{category.name}</span>
                    )}
                    {book.is_free ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Grátis</span>
                    ) : owned ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-bold text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Comprado
                        </span>
                    ) : (
                        <span className="rounded-full bg-[#0B1324] px-3 py-1 text-[12px] font-bold text-white dark:bg-foreground dark:text-background">
                            {Number(book.price).toFixed(2)} {book.currency}
                        </span>
                    )}
                </div>

                {book.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                        {book.tags.map(tag => (
                            <span key={tag} className="text-[11.5px] font-medium text-[#9A9DA6]">#{tag}</span>
                        ))}
                    </div>
                )}

                <div className="mt-4 flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={toggleFavorite}
                        className={cn(
                            "flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors active:scale-95",
                            isFavorite
                                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30"
                                : "border-[#ECE8E3] bg-white text-[#3A4150] dark:border-border dark:bg-card dark:text-foreground",
                        )}
                    >
                        {isFavorite ? (
                            <BookmarkCheck key="filled" className="h-4 w-4 animate-scale-in" />
                        ) : (
                            <Bookmark key="empty" className="h-4 w-4" strokeWidth={1.8} />
                        )}
                        {isFavorite ? "Guardado" : "Guardar"}
                    </button>
                    <button
                        type="button"
                        onClick={handleShare}
                        className="flex h-10 items-center gap-1.5 rounded-full border border-[#ECE8E3] bg-white px-4 text-[13px] font-semibold text-[#3A4150] transition-colors active:scale-95 dark:border-border dark:bg-card dark:text-foreground"
                    >
                        <Share2 className="h-4 w-4" strokeWidth={1.8} /> Partilhar
                    </button>
                </div>
            </div>

            <div className={cn(SURFACE, "mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-[18px] px-4 py-3 text-[12.5px] text-[#3A4150] dark:text-muted-foreground")}>
                <div className="flex items-center gap-1.5">
                    <StarRating value={stats?.avgRating ?? 0} />
                    <span>{stats && stats.ratingsCount > 0 ? `${stats.avgRating.toFixed(1)} (${stats.ratingsCount})` : "Sem avaliações"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-[#9A9DA6]" /> {book.views_count}
                </div>
                <div className="flex items-center gap-1">
                    <Bookmark className="h-3.5 w-3.5 text-[#9A9DA6]" /> {stats?.favoritesCount ?? 0}
                </div>
                {book.estimated_minutes != null && (
                    <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#9A9DA6]" /> {book.estimated_minutes} min
                    </div>
                )}
                {book.file_type === "pdf" && book.page_count != null && (
                    <div className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-[#9A9DA6]" /> {book.page_count} págs.
                    </div>
                )}
                {(book.file_type === "epub" || book.file_type === "lovenest") && book.chapter_count != null && (
                    <div className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-[#9A9DA6]" /> {book.chapter_count} caps.
                    </div>
                )}
            </div>

            {book.description && (
                <div>
                    <SectionTitle title="Sobre este livro" />
                    <p className={cn("px-1 text-[14px] leading-relaxed text-[#3A4150] whitespace-pre-line dark:text-muted-foreground", !descExpanded && "line-clamp-3")}>
                        {book.description}
                    </p>
                    {book.description.length > 140 && (
                        <button
                            type="button"
                            onClick={() => setDescExpanded(v => !v)}
                            className="mt-1.5 flex items-center gap-1 px-1 text-[13px] font-semibold text-rose-500"
                        >
                            {descExpanded ? "Ler menos" : "Ler mais"}
                            {descExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
            )}

            {canRead && (myPercent > 0 || (partnerProgress?.progress_percent ?? 0) > 0) && (
                <div className={cn(SURFACE, "mt-5 space-y-3.5 rounded-[20px] p-4")}>
                    {myPercent > 0 && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-foreground">
                                <span className="flex items-center gap-1.5">
                                    {myPercent >= 100
                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        : <span className="h-2 w-2 rounded-full bg-rose-500" />}
                                    A tua leitura
                                </span>
                                <span className="tabular-nums text-muted-foreground">{myPercent}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EEEA] dark:bg-muted">
                                <div className="h-full bg-rose-500 transition-all" style={{ width: `${myPercent}%` }} />
                            </div>
                        </div>
                    )}
                    {(partnerProgress?.progress_percent ?? 0) > 0 && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-[#4D7CFE]" />
                                    Leitura de {partner?.display_name || "o teu par"}
                                </span>
                                <span className="tabular-nums text-muted-foreground">{partnerProgress?.progress_percent}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EEEA] dark:bg-muted">
                                <div className="h-full bg-[#4D7CFE] transition-all" style={{ width: `${partnerProgress?.progress_percent}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {canRead && (book.file_type === "pdf" || book.file_type === "epub" || book.file_type === "lovenest") && (
                <button
                    type="button"
                    onClick={() => navigate(`/biblioteca/${bookId}/reflexoes`)}
                    className={cn(SURFACE, "mt-3 flex w-full items-center gap-3 rounded-[20px] px-3.5 py-3 text-left active:scale-[0.99] transition-transform")}
                >
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-rose-50 text-rose-500 dark:bg-rose-950/30">
                        <HeartHandshake className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <b className="block text-[14px] font-semibold text-foreground">Reflexões do Casal</b>
                        <small className="block truncate text-[12.5px] text-muted-foreground">Partilhem o que aprenderam com este livro</small>
                    </span>
                    <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />
                </button>
            )}

            <div className="mt-6">
                {canRead ? (
                    <button
                        type="button"
                        onClick={handleRead}
                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#0B1324] text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] transition-transform active:scale-[0.99] dark:bg-foreground dark:text-background"
                    >
                        <BookOpenText className="h-[18px] w-[18px]" /> {readLabel}
                    </button>
                ) : pending ? (
                    <div className="flex h-[52px] items-center justify-center gap-2 rounded-[18px] bg-[#F4F2EF] text-[14px] font-semibold text-[#3A4150] dark:bg-muted dark:text-muted-foreground">
                        <Clock className="h-4 w-4" /> Pedido em análise
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <Lock className="h-[18px] w-[18px] text-rose-500" strokeWidth={1.8} />
                            <p className="text-[15px] font-semibold text-foreground">
                                Comprar — {Number(book.price).toFixed(2)} {book.currency}
                            </p>
                        </div>
                        {spaceId && (
                            <PurchaseSection
                                book={book}
                                coupleSpaceId={spaceId}
                                existingPurchaseId={rejected?.id}
                                adminNotes={rejected?.admin_notes}
                                onSubmitted={refetch}
                            />
                        )}
                    </div>
                )}
            </div>

            {canRead && (
                <div className={cn(SURFACE, "mt-5 flex flex-col items-center gap-2 rounded-[20px] p-4 text-center")}>
                    <p className="text-[14px] font-semibold text-foreground">A tua avaliação</p>
                    <StarRating value={myRating ?? 0} onRate={rate} size="md" />
                </div>
            )}

            {similarBooks.length > 0 && (
                <BookRow
                    title="Livros semelhantes"
                    books={similarBooks}
                    ownedBookIds={ownedBookIds}
                    pendingBookIds={pendingBookIds}
                    myProgressByBook={myProgressByBook}
                />
            )}
        </section>
    );
}
