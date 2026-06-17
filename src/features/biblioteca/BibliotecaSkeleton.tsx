export function BibliotecaSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="px-4">
                <div className="w-full aspect-[16/7] rounded-3xl bg-muted" />
            </div>
            {[0, 1].map(row => (
                <div key={row} className="space-y-3">
                    <div className="h-4 w-32 rounded-md bg-muted mx-4" />
                    <div className="flex gap-3 px-4">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-[120px] shrink-0 space-y-2">
                                <div className="aspect-[2/3] rounded-2xl bg-muted" />
                                <div className="h-3 w-full rounded bg-muted" />
                                <div className="h-3 w-2/3 rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
