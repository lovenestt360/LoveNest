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
            <Card className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40 grayscale">
                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <span className="text-3xl">😶</span>
                </div>
                <div className="space-y-1">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Sem registos recentes</p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight italic">Partilha o teu humor para veres o histórico! ✨</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {grouped.map(({ day, mine, partner }) => (
                <Card key={day} className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {format(parseISO(day), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </span>
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                    </div>
                    <div className="divide-y divide-slate-50">
                        {/* My Record */}
                        <RecordRow data={mine} isMe={true} />
                        {/* Partner Record */}
                        <RecordRow data={partner} isMe={false} />
                    </div>
                </Card>
            ))}
        </div>
    );
}

function RecordRow({ data, isMe }: { data?: MoodCheckin; isMe: boolean }) {
    if (!data) {
        return (
            <div className="p-6 flex items-center justify-between opacity-30 grayscale transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-50">
                    <span className="text-xl">😶</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isMe ? "Eu" : "Parceiro"}</p>
                    <p className="text-[12px] font-bold text-slate-300 italic">Sem registo</p>
                  </div>
                </div>
            </div>
        );
    }

    const actDetails = data.activities?.map(a => ACTIVITIES.find(x => x.key === a)).filter(Boolean) as typeof ACTIVITIES;

    return (
        <div className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors duration-300">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-white shadow-apple border border-slate-50 flex items-center justify-center text-3xl" title={`${data.mood_percent}%`}>
                      {getMoodEmoji(data.mood_key)}
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{isMe ? "O Teu Humor" : "Humor do Par"}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.mood_percent}% Intensidade</span>
                           {data.sleep_quality && (
                             <>
                               <div className="h-1 w-1 rounded-full bg-slate-200" />
                               <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sono: {getSleepEmoji(data.sleep_quality)}</span>
                             </>
                           )}
                        </div>
                    </div>
                </div>
            </div>

            {(data.emotions?.length > 0 || actDetails?.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1 pl-1">
                    {data.emotions?.map(e => (
                        <Badge key={e} variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none rounded-full">
                            {e}
                        </Badge>
                    ))}
                    {actDetails?.map(a => (
                        <Badge key={a.key} variant="outline" className="border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
                            {a.emoji} {a.label}
                        </Badge>
                    ))}
                </div>
            )}

            {data.note && (
                <div className="mt-2 text-[12px] font-medium text-slate-500 bg-slate-50/80 p-4 rounded-2xl italic border border-slate-100/50 leading-relaxed shadow-inner">
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
