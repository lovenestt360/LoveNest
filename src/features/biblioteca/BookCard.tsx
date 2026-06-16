import { Link } from "react-router-dom";
import { BookText, Check, Clock } from "lucide-react";
import type { Book } from "@/hooks/useBiblioteca";

export function BookCard({ book, owned, pending, progress }: { book: Book; owned: boolean; pending: boolean; progress?: number }) {
    return (
        <Link
            to={`/biblioteca/${book.id}`}
            className="group flex flex-col gap-2 active:scale-[0.97] transition-transform duration-150"
        >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-muted border border-border shadow-sm">
                {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <BookText className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                )}

                <div className="absolute top-2 right-2">
                    {owned ? (
                        <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            <Check className="w-3 h-3" strokeWidth={2.5} /> Possuído
                        </span>
                    ) : pending ? (
                        <span className="flex items-center gap-1 bg-card/95 text-muted-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-sm border border-border">
                            <Clock className="w-3 h-3" strokeWidth={2.5} /> Em análise
                        </span>
                    ) : book.is_free ? (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            Grátis
                        </span>
                    ) : (
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            {Number(book.price).toFixed(0)} {book.currency}
                        </span>
                    )}
                </div>

                {owned && progress !== undefined && progress > 0 && progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div className="h-full bg-rose-500" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            <div className="px-0.5 space-y-0.5">
                <p className="text-[13px] font-semibold leading-snug line-clamp-2 text-foreground">{book.title}</p>
                {book.author && <p className="text-[11px] text-muted-foreground line-clamp-1">{book.author}</p>}
            </div>
        </Link>
    );
}
