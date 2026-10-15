import { Link } from "react-router-dom";
import { BookText, Check, Clock } from "lucide-react";
import type { Book } from "@/hooks/useBiblioteca";
import { cn } from "@/lib/utils";

const PILL = "flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-bold leading-none shadow-[0_2px_6px_-2px_rgba(11,19,36,0.25)]";

export function BookCard({ book, owned, pending, progress }: { book: Book; owned: boolean; pending: boolean; progress?: number }) {
    return (
        <Link
            to={`/biblioteca/${book.id}`}
            className="group flex flex-col gap-2 active:scale-[0.97] transition-transform duration-150"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-[16px] border border-[#ECE8E3] bg-[#F4F2EF] shadow-[0_10px_24px_-16px_rgba(11,19,36,0.35)] dark:border-border dark:bg-muted">
                {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#C9C4BD]">
                        <BookText className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                )}

                <div className="absolute top-2 right-2">
                    {owned ? (
                        <span className={cn(PILL, "bg-emerald-600 text-white")}>
                            <Check className="w-3 h-3" strokeWidth={2.75} /> Comprado
                        </span>
                    ) : pending ? (
                        <span className={cn(PILL, "bg-white/95 text-[#3A4150] dark:bg-card dark:text-muted-foreground")}>
                            <Clock className="w-3 h-3" strokeWidth={2.5} /> Em análise
                        </span>
                    ) : book.is_free ? (
                        <span className={cn(PILL, "bg-white/95 text-emerald-700 dark:bg-card dark:text-emerald-400")}>
                            Grátis
                        </span>
                    ) : (
                        <span className={cn(PILL, "bg-[#0B1324] text-white")}>
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

            <div className="px-0.5">
                <p className="text-[13.5px] font-semibold leading-snug line-clamp-2 text-foreground">{book.title}</p>
                {book.author && <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-1">{book.author}</p>}
            </div>
        </Link>
    );
}
