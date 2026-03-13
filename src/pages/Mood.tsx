import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { notifyPartner } from "@/lib/notifyPartner";
import { useLoveStreak } from "@/hooks/useLoveStreak";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoodCheckin } from "@/features/mood/types";
import { MoodForm } from "@/features/mood/MoodForm";
import { MoodHistory } from "@/features/mood/MoodHistory";
import { MOOD_OPTIONS } from "@/features/mood/constants";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Mood() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { resetMoodUnread } = useAppNotifContext();

  const [moodKey, setMoodKey] = useState("feliz");
  const [moodPercent, setMoodPercent] = useState(50);
  const [note, setNote] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);

  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // We fetch history over last 14 days minimum
  const [history, setHistory] = useState<MoodCheckin[]>([]);

  const today = todayKey();

  // Reset unread on mount
  useEffect(() => {
    resetMoodUnread();
  }, [resetMoodUnread]);

  const loadData = useCallback(async () => {
    if (!spaceId || !user) return;

    // Last 14 days history
    const pastDaysAgo = new Date();
    pastDaysAgo.setDate(pastDaysAgo.getDate() - 14);

    const { data: histData } = await supabase
      .from("mood_checkins")
      .select("*")
      .eq("couple_space_id", spaceId)
      .gte("day_key", pastDaysAgo.toISOString().slice(0, 10))
      .order("day_key", { ascending: false });

    if (histData) {
      setHistory(histData as MoodCheckin[]);

      const todayData = (histData as MoodCheckin[]).filter(c => c.day_key === today);
      const mine = todayData.find((c) => c.user_id === user.id);

      if (mine) {
        setMoodKey(mine.mood_key);
        setMoodPercent(mine.mood_percent);
        setNote(mine.note ?? "");
        setEmotions(mine.emotions ?? []);
        setActivities(mine.activities ?? []);
        setSleepQuality(mine.sleep_quality ?? null);
        setExistingId(mine.id);
      }
    }
  }, [spaceId, user, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("mood-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mood_checkins", filter: `couple_space_id=eq.${spaceId}` },
        () => { loadData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, loadData]);

  const handleSave = async () => {
    if (!spaceId || !user) return;
    setSaving(true);

    const payload = {
      mood_key: moodKey,
      mood_percent: moodPercent,
      note: note || null,
      emotions: emotions || [],
      activities: activities || [],
      sleep_quality: sleepQuality
    };

    if (existingId) {
      await supabase
        .from("mood_checkins")
        .update(payload)
        .eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("mood_checkins")
        .insert({
          couple_space_id: spaceId,
          user_id: user.id,
          day_key: today,
          ...payload
        })
        .select("id")
        .maybeSingle();
      if (data) setExistingId(data.id);
    }

    // Record interaction for LoveStreak
    recordInteraction("mood_update");

    setSaving(false);
    loadData();

    // Push to partner
    if (spaceId) {
      const moodInfo = MOOD_OPTIONS.find(m => m.key === moodKey);
      notifyPartner({
        couple_space_id: spaceId,
        title: `${moodInfo?.emoji ?? "😶"} Novo Humor (${moodPercent}%)`,
        body: emotions.length > 0 ? `Sentindo-se: ${emotions.join(", ")}` : (note ? `Houve uma actualização no humor de hoje.` : (moodInfo?.label ?? moodKey)),
        url: "/humor",
        type: "humor",
      });
    }
  };

  return (
    <section className="space-y-6 pb-8 text-foreground">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Humor do dia</h1>
        <p className="text-sm text-muted-foreground">Regista as tuas emoções, atividades e sono.</p>
      </header>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="historico">Histórico e Par</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4">
          <MoodForm
            moodKey={moodKey} setMoodKey={setMoodKey}
            moodPercent={moodPercent} setMoodPercent={setMoodPercent}
            emotions={emotions} setEmotions={setEmotions}
            activities={activities} setActivities={setActivities}
            sleepQuality={sleepQuality} setSleepQuality={setSleepQuality}
            note={note} setNote={setNote}
            saving={saving} onSave={handleSave}
            isUpdate={!!existingId}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <MoodHistory history={history} userId={user?.id || ""} />
        </TabsContent>
      </Tabs>

    </section>
  );
}
