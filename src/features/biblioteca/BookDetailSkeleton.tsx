export function BookDetailSkeleton() {
    return (
        <div className="pb-24 max-w-lg mx-auto animate-pulse">
            <div className="px-4 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                <div className="h-5 w-40 rounded-md bg-muted" />
            </div>

            <div className="px-4 pt-6 flex flex-col items-center">
                <div className="w-40 aspect-[2/3] rounded-2xl bg-muted mb-4" />
                <div className="h-4 w-44 rounded-md bg-muted mb-2" />
                <div className="h-3 w-24 rounded-md bg-muted mb-4" />
                <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-muted" />
                    <div className="h-6 w-20 rounded-full bg-muted" />
                </div>
            </div>

            <div className="px-4 pt-8 space-y-2">
                <div className="h-3 w-full rounded-md bg-muted" />
                <div className="h-3 w-full rounded-md bg-muted" />
                <div className="h-3 w-2/3 rounded-md bg-muted" />
            </div>

            <div className="px-4 pt-8">
                <div className="h-12 w-full rounded-2xl bg-muted" />
            </div>
        </div>
    );
}
