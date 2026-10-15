import { Link } from "react-router-dom";
import { BookOpenText, BookText } from "lucide-react";
import type { Book } from "@/hooks/useBiblioteca";
import { SURFACE } from "@/features/home/components/HomeSections";
import { cn } from "@/lib/utils";

export function ContinueReadingCard({ book, progress }: { book: Book; progress: number }) {
    return (
        <Link
            to={`/biblioteca/${book.id}`}
            className="shrink-0 w-[230px] active:scale-[0.97] transition-transform"
        >
            <div className={cn(SURFACE, "flex h-full gap-3 rounded-[20px] p-3")}>
                <div className="w-14 aspect-[2/3] rounded-[10px] overflow-hidden bg-[#F4F2EF] shrink-0 dark:bg-muted">
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
                        <p className="text-[14px] font-semibold leading-snug line-clamp-2 text-foreground">{book.title}</p>
                        <p className="mt-1 text-[12px] text-muted-foreground">{progress}% concluído</p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-1.5 rounded-full bg-[#F1EEEA] overflow-hidden dark:bg-muted">
                            <div className="h-full bg-[#1C1F24] dark:bg-foreground" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex items-center gap-1 text-[12px] font-semibold text-[#0B1324] dark:text-foreground">
                            <BookOpenText className="w-3 h-3" /> Continuar
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
