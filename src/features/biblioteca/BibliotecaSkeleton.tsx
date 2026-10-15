export function BibliotecaSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="w-full aspect-[16/7] rounded-[24px] bg-[#F1EEEA] dark:bg-muted" />
            {[0, 1].map(row => (
                <div key={row} className="space-y-3">
                    <div className="h-4 w-32 rounded-md bg-[#F1EEEA] dark:bg-muted" />
                    <div className="flex gap-3">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-[118px] shrink-0 space-y-2">
                                <div className="aspect-[2/3] rounded-[16px] bg-[#F1EEEA] dark:bg-muted" />
                                <div className="h-3 w-full rounded bg-[#F1EEEA] dark:bg-muted" />
                                <div className="h-3 w-2/3 rounded bg-[#F1EEEA] dark:bg-muted" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
