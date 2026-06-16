import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookText, BookOpenText, CheckCircle2, Loader2, Lock, Clock } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { Button } from "@/components/ui/button";
import { PurchaseSection } from "@/features/biblioteca/PurchaseSection";

export default function BookDetail() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const spaceId = useCoupleSpaceId();
    const { books, categories, ownedBookIds, pendingBookIds, rejectedPurchases, loading, refetch } = useBiblioteca();
    const { myProgress, partnerProgress } = useReadingProgress(bookId);
    const { partner } = usePartnerProfile();

    const book = books.find(b => b.id === bookId);
    const category = categories.find(c => c.id === book?.category_id);
    const owned = bookId ? ownedBookIds.has(bookId) : false;
    const pending = bookId ? pendingBookIds.has(bookId) : false;
    const rejected = bookId ? rejectedPurchases.get(bookId) : undefined;
    const canRead = book?.is_free || owned;

    const myPercent = myProgress?.progress_percent ?? 0;
    const readLabel = myPercent >= 100 ? "Ler novamente" : myPercent > 0 ? "Continuar leitura" : "Ler agora";

    const handleRead = () => {
        navigate(`/biblioteca/${bookId}/ler`);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
            </div>
        );
    }

    if (!book) {
        return (
            <section className="pb-24 max-w-lg mx-auto">
                <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-40 border-b border-border flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Livro</h1>
                </header>
                <div className="mx-4 mt-6 bg-card border border-border rounded-2xl p-10 text-center shadow-sm space-y-2">
                    <BookText className="w-8 h-8 mx-auto text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-foreground">Livro não encontrado</p>
                </div>
            </section>
        );
    }

    return (
        <section className="pb-24 max-w-lg mx-auto animate-fade-in">
            <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-40 border-b border-border flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold tracking-tight line-clamp-1">{book.title}</h1>
            </header>

            <div className="px-4 pt-6 flex flex-col items-center text-center">
                <div className="w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-muted border border-border shadow-lg mb-4">
                    {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <BookText className="w-10 h-10" strokeWidth={1.5} />
                        </div>
                    )}
                </div>

                <h2 className="text-lg font-bold leading-tight">{book.title}</h2>
                {book.author && <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>}

                <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                    {category && (
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">{category.name}</span>
                    )}
                    {book.is_free ? (
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500 text-white">Grátis</span>
                    ) : (
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-500 text-white">
                            {Number(book.price).toFixed(2)} {book.currency}
                        </span>
                    )}
                </div>
            </div>

            {book.description && (
                <div className="px-4 pt-6">
                    <h3 className="text-sm font-bold text-foreground mb-2">Sobre este livro</h3>
                    <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line">{book.description}</p>
                </div>
            )}

            {canRead && (myPercent > 0 || (partnerProgress?.progress_percent ?? 0) > 0) && (
                <div className="px-4 pt-6 space-y-3">
                    {myPercent > 0 && (
                        <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                                <span className="flex items-center gap-1">
                                    {myPercent >= 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    A tua leitura
                                </span>
                                <span>{myPercent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-rose-500 transition-all" style={{ width: `${myPercent}%` }} />
                            </div>
                        </div>
                    )}
                    {(partnerProgress?.progress_percent ?? 0) > 0 && (
                        <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                                <span>Leitura de {partner?.display_name || "o teu par"}</span>
                                <span>{partnerProgress?.progress_percent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-foreground/40 transition-all" style={{ width: `${partnerProgress?.progress_percent}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="px-4 pt-8">
                {canRead ? (
                    <Button onClick={handleRead} className="w-full h-12 rounded-2xl font-bold text-[15px] gap-2 bg-rose-500 hover:bg-rose-600 text-white shadow-lg">
                        <BookOpenText className="w-[18px] h-[18px]" /> {readLabel}
                    </Button>
                ) : pending ? (
                    <div className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-muted text-muted-foreground font-semibold text-[14px]">
                        <Clock className="w-4 h-4" /> Pedido em análise
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Lock className="w-[18px] h-[18px] text-rose-400" strokeWidth={1.5} />
                            <p className="text-sm font-bold text-foreground">
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
        </section>
    );
}
