import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { notifyPartner } from "@/lib/notifyPartner";
import { useLoveStreak } from "@/hooks/useLoveStreak";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { MoodCheckin } from "@/features/mood/types";
import { MoodForm } from "@/features/mood/MoodForm";
import { MoodHistory } from "@/features/mood/MoodHistory";
import { MOOD_OPTIONS } from "@/features/mood/constants";
import { toast } from "sonner";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Mood() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { resetMoodUnread } = useAppNotifContext();
  // Removed useLoveStreak for daily_activity
  const navigate = useNavigate();

  const [partnerRespondedToday, setPartnerRespondedToday] = useState(false);

  const [moodKey, setMoodKey] = useState("feliz");
  const [moodPercent, setMoodPercent] = useState(50);
  const [note, setNote] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);

  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

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

      const partnerCheckin = todayData.find((c) => c.user_id !== user.id);
      setPartnerRespondedToday(!!partnerCheckin);
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
      const { error } = await supabase
        .from("mood_checkins")
        .update(payload)
        .eq("id", existingId);
      
      if (error) {
        setSaving(false);
        toast.error("Erro ao atualizar humor: " + error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("mood_checkins")
        .insert({
          couple_space_id: spaceId,
          user_id: user.id,
          day_key: today,
          ...payload
        })
        .select("id")
        .maybeSingle();
      
      if (error) {
        setSaving(false);
        toast.error("Erro ao guardar humor: " + error.message);
        return;
      }
      if (data) setExistingId(data.id);
    }

    setSaving(false);
    loadData();

    // Registrar interação para o Streak (com await para garantir no banco)
    // Registrar interação atómicamente direct bypassing old hooks
    const { error: actErr } = await (supabase as any).from('daily_activity').insert({
      couple_space_id: spaceId,
      user_id: user.id,
      type: "mood_logged"
    });
    if (actErr) console.error(actErr);
    else window.dispatchEvent(new CustomEvent("refetch-streak"));

    // Push to partner
    if (spaceId) {
      const moodInfo = MOOD_OPTIONS.find(m => m.key === moodKey);
      notifyPartner({
        couple_space_id: spaceId,
        title: `${moodInfo?.emoji ?? "😶"} Novo Humor (${moodPercent}%)`,
        body: emotions.length > 0 ? `Sentindo-se: ${emotions.join(", ")}` : (note ? `Houve uma actualização no humor de hoje.` : (moodInfo?.label ?? moodKey)),
        url: "/humor",
        type: "humor",
        template_key: "partner_mood",
      });
    }

    setShowSuccessOverlay(true);
    setTimeout(() => setShowSuccessOverlay(false), 2500);

    // Emotional Feedback UI
    toast.success("Obrigado por partilhares como te sentes 💛", {
      description: "O teu par vai sentir-se mais próximo de ti.",
      duration: 5000,
    });

    if (!partnerRespondedToday) {
      setTimeout(() => {
        toast("O teu par ainda não respondeu... 💬", {
          description: "Talvez precise de um empurrãozinho para partilhar também.",
          icon: "✨",
          action: {
            label: "Dar empurrãozinho",
            onClick: () => navigate("/chat"),
          },
        });
      }, 1500);
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

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="text-center space-y-4 animate-bounce-in">
            <div className="bg-primary/20 p-6 rounded-full inline-block shadow-glow">
              <CheckCircle2 className="w-20 h-20 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-foreground">Obrigado por partilhares 💛</h2>
              <p className="text-sm text-muted-foreground font-medium italic">O teu par vai valorizar saber como estás.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
