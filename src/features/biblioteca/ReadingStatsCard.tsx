import { Clock, BookCheck, Flame } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useReadingStats, type ReadingStats } from "@/hooks/useReadingStats";
import { SURFACE } from "@/features/home/components/HomeSections";
import { cn } from "@/lib/utils";

function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function PersonStats({ label, tone, stats, loading }: { label: string; tone: "rose" | "blue"; stats: ReadingStats | null; loading: boolean }) {
    const icon = tone === "rose" ? "text-rose-500" : "text-[#4D7CFE]";
    return (
        <div className="min-w-0 flex-1 space-y-2.5 px-3.5 py-3 [&+&]:border-l [&+&]:border-[#ECE8E3] dark:[&+&]:border-border">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", tone === "rose" ? "bg-rose-500" : "bg-[#4D7CFE]")} />
                <span className="line-clamp-1">{label}</span>
            </p>
            {loading || !stats ? (
                <div className="h-[68px] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-[#F1EEEA] border-t-rose-400 animate-spin" />
                </div>
            ) : (
                <div className="space-y-1.5 text-[12px] text-[#3A4150] dark:text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className={cn("w-3.5 h-3.5 shrink-0", icon)} /> {formatMinutes(stats.totalMinutes)} lidos
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BookCheck className={cn("w-3.5 h-3.5 shrink-0", icon)} />
                        {stats.booksCompleted} livro{stats.booksCompleted !== 1 ? "s" : ""} terminado{stats.booksCompleted !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Flame className={cn("w-3.5 h-3.5 shrink-0", icon)} /> {stats.readingDays} dia{stats.readingDays !== 1 ? "s" : ""} de leitura
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
        <div className={cn(SURFACE, "mt-4 flex overflow-hidden rounded-[20px] animate-fade-in")}>
            <PersonStats label="A tua leitura" tone="rose" stats={myStats} loading={myLoading} />
            {partner && (
                <PersonStats label={partner.display_name || "O teu par"} tone="blue" stats={partnerStats} loading={partnerLoading} />
            )}
        </div>
    );
}
