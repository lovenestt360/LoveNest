import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoodCheckin } from "./types";
import { MOOD_OPTIONS, ACTIVITIES, SLEEP_QUALITY_OPTIONS } from "./constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MoodHistoryProps {
    history: MoodCheckin[];
    userId: string;
}

function getMoodEmoji(key: string) {
    return MOOD_OPTIONS.find(m => m.key === key)?.emoji ?? "😶";
}

function getSleepEmoji(key: string | null) {
    if (!key) return null;
    return SLEEP_QUALITY_OPTIONS.find(s => s.key === key)?.emoji ?? null;
}

export function MoodHistory({ history, userId }: MoodHistoryProps) {
    const grouped = groupByDay(history, userId);

    if (grouped.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-center text-muted-foreground">Sem registos recentes.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {grouped.map(({ day, mine, partner }) => (
                <Card key={day} className="overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {format(parseISO(day), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </div>
                    <CardContent className="p-0 divide-y">
                        {/* My Record */}
                        <RecordRow data={mine} isMe={true} />
                        {/* Partner Record */}
                        <RecordRow data={partner} isMe={false} />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function RecordRow({ data, isMe }: { data?: MoodCheckin; isMe: boolean }) {
    if (!data) {
        return (
            <div className="p-4 flex items-center justify-between opacity-50 bg-muted/10">
                <span className="text-sm font-medium">{isMe ? "O meu registo" : "Registo do par"}</span>
                <span className="text-xs text-muted-foreground">Sem dados</span>
            </div>
        );
    }

    const actDetails = data.activities?.map(a => ACTIVITIES.find(x => x.key === a)).filter(Boolean) as typeof ACTIVITIES;

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-3xl" title={`${data.mood_percent}%`}>{getMoodEmoji(data.mood_key)}</div>
                    <div>
                        <p className="text-sm font-semibold">{isMe ? "Eu" : "Parceiro"}</p>
                        <p className="text-xs text-muted-foreground">Intensidade: {data.mood_percent}%</p>
                    </div>
                </div>
                {data.sleep_quality && (
                    <Badge variant="outline" className="text-xs font-normal" title="Qualidade de sono">
                        {getSleepEmoji(data.sleep_quality)}
                    </Badge>
                )}
            </div>

            {(data.emotions?.length > 0 || actDetails?.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {data.emotions?.map(e => (
                        <Badge key={e} variant="secondary" className="text-[10px] font-medium bg-secondary/50">
                            {e}
                        </Badge>
                    ))}
                    {actDetails?.map(a => (
                        <Badge key={a.key} variant="outline" className="text-[10px] font-medium opacity-80">
                            {a.emoji} {a.label}
                        </Badge>
                    ))}
                </div>
            )}

            {data.note && (
                <div className="mt-2 text-xs italic text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/50">
                    "{data.note}"
                </div>
            )}
        </div>
    );
}

function groupByDay(checkins: MoodCheckin[], userId: string) {
    const map = new Map<string, { mine?: MoodCheckin; partner?: MoodCheckin }>();
    for (const c of checkins) {
        const entry = map.get(c.day_key) ?? {};
        if (c.user_id === userId) entry.mine = c;
        else entry.partner = c;
        map.set(c.day_key, entry);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, { mine, partner }]) => ({ day, mine, partner }));
}
