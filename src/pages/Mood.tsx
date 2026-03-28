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
  const { recordInteraction } = useLoveStreak();
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
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-8 max-w-2xl mx-auto overflow-x-hidden animate-fade-in">
      {/* Header Estilo iPhone */}
      <header className="space-y-4 pt-4 px-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">O Teu Humor</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-400">Como te sentes hoje?</span>
              <div className="h-1 w-1 rounded-full bg-slate-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Registo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Switcher - iOS Inspired */}
      <Tabs defaultValue="hoje" className="w-full space-y-8">
        <TabsList className="p-1 h-auto rounded-[1.4rem] bg-slate-100 flex items-center border border-slate-200/20 w-full">
          <TabsTrigger 
            value="hoje" 
            className="flex-1 py-2.5 rounded-[1.1rem] transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400"
          >
            Hoje
          </TabsTrigger>
          <TabsTrigger 
            value="historico" 
            className="flex-1 py-2.5 rounded-[1.1rem] transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400"
          >
            Histórico e Par
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
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

        <TabsContent value="historico" className="mt-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <MoodHistory history={history} userId={user?.id || ""} />
        </TabsContent>
      </Tabs>

      {/* Success Overlay - Refined Glass Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="text-center space-y-6 scale-up-center">
            <div className="bg-white p-6 rounded-[2rem] shadow-apple-soft border border-slate-50 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Obrigado por partilhares 💛</h2>
                <p className="text-[11px] font-bold text-slate-400 italic">O teu par vai valorizar saber como estás.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
