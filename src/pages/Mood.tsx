import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { notifyPartner } from "@/lib/notifyPartner";
import { logActivity } from "@/lib/logActivity";
import { cn } from "@/lib/utils";

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

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (spaceId) {
      console.log("Mood READY: spaceId obtained", spaceId);
      setIsReady(true);
    }
  }, [spaceId]);

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
    if (!user || saving) return;
    if (!isReady) {
      console.warn("Mood: Tentativa de guardar humor antes do sistema estar pronto.");
      return;
    }
    setSaving(true);

    let sp = spaceId;
    if (!sp && user) {
      console.log("Mood: spaceId null at start, fetching fallback...");
      const { data: member } = await supabase
        .from('members')
        .select('couple_space_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      sp = member?.couple_space_id;
    }

    if (!sp) {
      console.error("CRITICAL: couple_space_id ainda null no Mood", user?.id);
      setSaving(false);
      toast.error("Não foi possível identificar o teu espaço de casal.");
      return;
    }

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
          couple_space_id: sp,
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

    // LoveStreak: registar atividade (fire-and-forget — não bloqueia UI)
    if (sp) logActivity(sp, "mood");

    // Notificação ao parceiro
    if (sp) {
      const moodInfo = MOOD_OPTIONS.find(m => m.key === moodKey);
      notifyPartner({
        couple_space_id: sp,
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

  const [activeTab, setActiveTab] = useState<"hoje" | "historico">("hoje");

  return (
    <section className="space-y-5 pb-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-foreground">Humor do dia</h1>
        <p className="text-sm text-[#717171] mt-0.5">Regista as tuas emoções, atividades e sono.</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
        {([
          { id: "hoje",      label: "Hoje" },
          { id: "historico", label: "Histórico e Par" },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-[#717171]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "hoje" && (
        <MoodForm
          moodKey={moodKey} setMoodKey={setMoodKey}
          moodPercent={moodPercent} setMoodPercent={setMoodPercent}
          emotions={emotions} setEmotions={setEmotions}
          activities={activities} setActivities={setActivities}
          sleepQuality={sleepQuality} setSleepQuality={setSleepQuality}
          note={note} setNote={setNote}
          saving={saving} onSave={handleSave}
          isUpdate={!!existingId}
          isReady={isReady}
        />
      )}

      {activeTab === "historico" && (
        <MoodHistory history={history} userId={user?.id || ""} />
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-rose-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Obrigado por partilhares</h2>
              <p className="text-sm text-[#717171] mt-1">O teu par vai valorizar saber como estás.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
