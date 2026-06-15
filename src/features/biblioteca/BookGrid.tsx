import { cn } from "@/lib/utils";
import { BookCard } from "./BookCard";
import type { Book } from "@/hooks/useBiblioteca";

const GRID_COLS: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
};

export function BookGrid({ books, columns, ownedBookIds, pendingBookIds }: {
    books: Book[];
    columns: number;
    ownedBookIds: Set<string>;
    pendingBookIds: Set<string>;
}) {
    const cols = GRID_COLS[columns] ?? GRID_COLS[2];

    return (
        <div className={cn("grid gap-x-4 gap-y-6 px-4", cols)}>
            {books.map(book => (
                <BookCard
                    key={book.id}
                    book={book}
                    owned={ownedBookIds.has(book.id)}
                    pending={pendingBookIds.has(book.id)}
                />
            ))}
        </div>
    );
}
