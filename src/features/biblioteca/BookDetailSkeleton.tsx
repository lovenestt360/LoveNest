const BLOCK = "bg-[#F1EEEA] dark:bg-muted";

export function BookDetailSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 shrink-0 rounded-full ${BLOCK}`} />
                <div className={`h-5 w-40 rounded-md ${BLOCK}`} />
            </div>

            <div className="flex flex-col items-center pt-6">
                <div className={`mb-5 aspect-[2/3] w-[148px] rounded-[18px] ${BLOCK}`} />
                <div className={`mb-2 h-5 w-48 rounded-md ${BLOCK}`} />
                <div className={`mb-4 h-3.5 w-24 rounded-md ${BLOCK}`} />
                <div className="flex gap-2">
                    <div className={`h-7 w-16 rounded-full ${BLOCK}`} />
                    <div className={`h-7 w-20 rounded-full ${BLOCK}`} />
                </div>
            </div>

            <div className={`mt-6 h-12 w-full rounded-[18px] ${BLOCK}`} />

            <div className="space-y-2 pt-6">
                <div className={`h-3.5 w-full rounded-md ${BLOCK}`} />
                <div className={`h-3.5 w-full rounded-md ${BLOCK}`} />
                <div className={`h-3.5 w-2/3 rounded-md ${BLOCK}`} />
            </div>

            <div className={`mt-6 h-[52px] w-full rounded-[18px] ${BLOCK}`} />
        </div>
    );
}
