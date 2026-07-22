import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Clock, Users,
  ArrowUpRight, ArrowDownLeft, MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCoupleSpaceId } from '@/hooks/useCoupleSpaceId';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeetingMoment {
  id: string;
  met_at: string;
  place_name: string | null;
}

interface LocationEvent {
  id: string;
  user_id: string;
  event_type: 'enter' | 'exit';
  place_name: string;
  occurred_at: string;
}

type DiaryEntry =
  | { kind: 'meeting'; id: string; time: Date; placeName: string | null }
  | { kind: 'arrive' | 'leave'; id: string; time: Date; placeName: string; userId: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('pt', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function isHomePlace(name: string): boolean {
  return /\bcasa\b|\bhome\b/i.test(name);
}

// ── Date range ─────────────────────────────────────────────────────────────────

function buildDateRange(): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function dateLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return format(d, 'd MMM', { locale: pt });
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useHistoryDay(date: Date) {
  const spaceId = useCoupleSpaceId();
  const [meetings, setMeetings] = useState<MeetingMoment[]>([]);
  const [events, setEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const dateKey = date.toDateString();

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [mRes, eRes] = await Promise.all([
      (supabase as any).from('meeting_moments')
        .select('id,met_at,place_name')
        .eq('couple_space_id', spaceId)
        .gte('met_at', start.toISOString())
        .lte('met_at', end.toISOString())
        .order('met_at', { ascending: true }),
      (supabase as any).from('location_events')
        .select('id,user_id,event_type,place_name,occurred_at')
        .eq('couple_space_id', spaceId)
        .gte('occurred_at', start.toISOString())
        .lte('occurred_at', end.toISOString())
        .order('occurred_at', { ascending: true }),
    ]);

    setMeetings(mRes.data ?? []);
    setEvents(eRes.data ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, dateKey]);

  useEffect(() => { load(); }, [load]);
  return { meetings, events, loading };
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function computeStats(
  meetings: MeetingMoment[],
  events: LocationEvent[],
  partnerId: string | undefined,
) {
  const encounterCount = meetings.length;

  // Use partner's location_events to compute home stats
  const partnerHomeEvents = events.filter(
    e => e.user_id === partnerId && isHomePlace(e.place_name),
  );

  const firstExit = partnerHomeEvents.find(e => e.event_type === 'exit');
  const lastEnter = [...partnerHomeEvents].reverse().find(e => e.event_type === 'enter');

  let timeAwayMs: number | null = null;
  if (firstExit && lastEnter) {
    const exitT = new Date(firstExit.occurred_at).getTime();
    const enterT = new Date(lastEnter.occurred_at).getTime();
    if (enterT > exitT) timeAwayMs = enterT - exitT;
  }

  return {
    encounterCount,
    leftHomeAt: firstExit ? new Date(firstExit.occurred_at) : null,
    returnedHomeAt: lastEnter ? new Date(lastEnter.occurred_at) : null,
    timeAwayMs,
  };
}

// ── Diary builder ─────────────────────────────────────────────────────────────

function buildDiary(meetings: MeetingMoment[], events: LocationEvent[]): DiaryEntry[] {
  const all: DiaryEntry[] = [
    ...meetings.map(m => ({
      kind: 'meeting' as const,
      id: m.id,
      time: new Date(m.met_at),
      placeName: m.place_name,
    })),
    ...events.map(e => ({
      kind: (e.event_type === 'enter' ? 'arrive' : 'leave') as 'arrive' | 'leave',
      id: e.id,
      time: new Date(e.occurred_at),
      placeName: e.place_name,
      userId: e.user_id,
    })),
  ];
  return all.sort((a, b) => a.time.getTime() - b.time.getTime());
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LocationHistorico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partner } = usePartnerProfile();
  const { profile } = useProfile();

  const dates = useMemo(() => buildDateRange(), []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedDate = dates[selectedIdx];

  const { meetings, events, loading } = useHistoryDay(selectedDate);

  const stats = useMemo(
    () => computeStats(meetings, events, partner?.user_id),
    [meetings, events, partner?.user_id],
  );

  const diary = useMemo(() => buildDiary(meetings, events), [meetings, events]);

  const partnerName = partner?.display_name ?? 'O teu par';
  const myId = user?.id ?? '';
  const myName = profile?.display_name ?? 'Tu';

  const hasStats =
    stats.encounterCount > 0 || stats.leftHomeAt !== null || stats.timeAwayMs !== null;

  return (
    <div className="flex flex-col bg-background min-h-[100dvh]">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
        </button>
        <h1 className="text-base font-semibold text-foreground">Histórico de Presença</h1>
      </div>

      {/* Date selector */}
      <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-b border-border/20 scrollbar-none">
        {dates.map((d, i) => {
          const sel = i === selectedIdx;
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95',
                sel
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
            >
              {dateLabel(d)}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto pb-6">

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted/30 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>

            {/* Stats strip */}
            {hasStats && (
              <div className="px-4 pt-4 pb-2">
                <div className="grid grid-cols-3 gap-2">

                  <div className="glass-card px-2 py-3 flex flex-col items-center gap-1 text-center">
                    <Users className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
                    <p className="text-[17px] font-bold text-foreground tabular-nums">
                      {stats.encounterCount}
                    </p>
                    <p className="text-[9px] text-muted-foreground/55 uppercase tracking-wide leading-snug">
                      {stats.encounterCount === 1 ? 'Encontro' : 'Encontros'}
                    </p>
                  </div>

                  <div className="glass-card px-2 py-3 flex flex-col items-center gap-1 text-center">
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-[14px] font-bold text-foreground tabular-nums">
                      {stats.leftHomeAt ? fmtTime(stats.leftHomeAt) : '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground/55 uppercase tracking-wide leading-snug">
                      Saiu de casa
                    </p>
                  </div>

                  <div className="glass-card px-2 py-3 flex flex-col items-center gap-1 text-center">
                    <Clock className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-[14px] font-bold text-foreground tabular-nums">
                      {stats.timeAwayMs !== null ? fmtDuration(stats.timeAwayMs) : '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground/55 uppercase tracking-wide leading-snug">
                      Fora de casa
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* Timeline */}
            {diary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-muted-foreground/30" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-medium text-muted-foreground/60">
                  Sem actividade registada
                </p>
                <p className="text-[11px] text-muted-foreground/40 mt-1 leading-relaxed">
                  Os encontros e chegadas a locais favoritos aparecem aqui
                </p>
              </div>
            ) : (
              <div className="px-4 pt-3 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-0.5 mb-2">
                  {dateLabel(selectedDate)} · {format(selectedDate, "d 'de' MMMM", { locale: pt })}
                </p>

                <div className="glass-card divide-y divide-border/20">
                  {diary.map(entry => {
                    const timeStr = fmtTime(entry.time);

                    if (entry.kind === 'meeting') {
                      return (
                        <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
                            <Heart className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} fill="currentColor" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground leading-snug">
                              Encontraram-se{entry.placeName ? ` em ${entry.placeName}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                            {timeStr}
                          </span>
                        </div>
                      );
                    }

                    const isArrive = entry.kind === 'arrive';
                    const isPartner = entry.userId !== myId;
                    const personName = isPartner ? partnerName : myName;

                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          isArrive
                            ? 'bg-emerald-50 dark:bg-emerald-950/20'
                            : 'bg-muted/40',
                        )}>
                          {isArrive
                            ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
                            : <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground leading-snug">
                            {personName} {isArrive
                              ? `chegou a ${entry.placeName}`
                              : `saiu de ${entry.placeName}`}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                          {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
