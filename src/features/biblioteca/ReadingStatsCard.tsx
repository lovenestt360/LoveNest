import { Clock, BookCheck, Flame } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useReadingStats, type ReadingStats } from "@/hooks/useReadingStats";

function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function PersonStats({ label, stats, loading }: { label: string; stats: ReadingStats | null; loading: boolean }) {
    return (
        <div className="flex-1 bg-card border border-border rounded-2xl p-3.5 space-y-2.5">
            <p className="text-[12px] font-bold text-foreground line-clamp-1">{label}</p>
            {loading || !stats ? (
                <div className="h-[68px] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-muted border-t-rose-400 animate-spin" />
                </div>
            ) : (
                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" /> {formatMinutes(stats.totalMinutes)} lidos
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BookCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        {stats.booksCompleted} livro{stats.booksCompleted !== 1 ? "s" : ""} terminado{stats.booksCompleted !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" /> {stats.readingDays} dia{stats.readingDays !== 1 ? "s" : ""} de leitura
                    </div>
                </div>
            )}
        </div>
    );
}

export function ReadingStatsCard() {
    const { user } = useAuth();
    const { partner } = usePartnerProfile();
    const { stats: myStats, loading: myLoading } = useReadingStats(user?.id);
    const { stats: partnerStats, loading: partnerLoading } = useReadingStats(partner?.user_id);

    const hasAnyActivity = (myStats?.booksStarted ?? 0) > 0 || (partnerStats?.booksStarted ?? 0) > 0;
    if (!myLoading && !partnerLoading && !hasAnyActivity) return null;

    return (
        <div className="px-4 flex gap-3 animate-fade-in">
            <PersonStats label="A tua leitura" stats={myStats} loading={myLoading} />
            {partner && (
                <PersonStats label={partner.display_name || "O teu par"} stats={partnerStats} loading={partnerLoading} />
            )}
        </div>
    );
}
