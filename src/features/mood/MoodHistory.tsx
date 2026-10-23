import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoodCheckin } from "./types";
import { ACTIVITIES, SLEEP_QUALITY_OPTIONS } from "./constants";
import { MoodFace, SleepMoon, ActivityTile } from "./MoodArt";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MoodHistoryProps {
    history: MoodCheckin[];
    userId: string;
    isSolo?: boolean;
}

function sleepLabel(key: string) {
    return SLEEP_QUALITY_OPTIONS.find(s => s.key === key)?.label ?? key;
}

export function MoodHistory({ history, userId, isSolo = false }: MoodHistoryProps) {
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
                <Card key={day} className="overflow-hidden rounded-[20px] border-[#ECE8E3] shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border">
                    <div className="border-b border-[#ECE8E3] bg-[#F7F5F2] px-4 py-2.5 text-[12.5px] font-semibold text-[#3A4150] first-letter:uppercase dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                        {format(parseISO(day), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </div>
                    <CardContent className="p-0 divide-y">
                        {/* My Record */}
                        <RecordRow data={mine} isMe={true} />
                        {/* Partner Record — não existe em modo solo */}
                        {!isSolo && <RecordRow data={partner} isMe={false} />}
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
                    <MoodFace mood={data.mood_key} size={42} />
                    <div>
                        <p className="text-sm font-semibold">{isMe ? "Eu" : "Parceiro"}</p>
                        <p className="text-xs text-muted-foreground">Intensidade: {data.mood_percent}%</p>
                    </div>
                </div>
                {data.sleep_quality && (
                    <span className="flex items-center gap-1.5 rounded-full border border-[#ECE8E3] py-0.5 pl-0.5 pr-2.5 text-[11px] font-medium text-[#3A4150] dark:border-border dark:text-muted-foreground" title="Qualidade do sono">
                        <SleepMoon quality={data.sleep_quality} size={20} />
                        Sono {sleepLabel(data.sleep_quality).toLowerCase()}
                    </span>
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
                        <span key={a.key} className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE8E3] py-0.5 pl-0.5 pr-2.5 text-[10.5px] font-medium text-[#3A4150] dark:border-border dark:text-muted-foreground">
                            <ActivityTile activity={a.key} size={18} />
                            {a.label}
                        </span>
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
