import { Link } from "react-router-dom";
import { BookOpenText, BookText } from "lucide-react";
import type { Book } from "@/hooks/useBiblioteca";

export function ContinueReadingCard({ book, progress }: { book: Book; progress: number }) {
    return (
        <Link
            to={`/biblioteca/${book.id}`}
            className="shrink-0 w-[230px] active:scale-[0.97] transition-transform"
        >
            <div className="flex gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm h-full">
                <div className="w-14 aspect-[2/3] rounded-xl overflow-hidden bg-muted shrink-0">
                    {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <BookText className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                        <p className="text-[13px] font-bold leading-snug line-clamp-2 text-foreground">{book.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{progress}% concluído</p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-500">
                            <BookOpenText className="w-3 h-3" /> Continuar
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
