import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Pencil, Save, BookOpen, Heart, Eye } from "lucide-react";
import { format, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface DailyPrayer {
  id: string;
  couple_space_id: string;
  day_key: string;
  prayer_text: string;
  verse_ref: string | null;
  created_by: string;
  created_at: string;
}

interface SpiritualLog {
  id: string;
  couple_space_id: string;
  user_id: string;
  day_key: string;
  prayed_today: boolean;
  cried_today: boolean;
  gratitude_note: string | null;
  reflection_note: string | null;
  updated_at: string;
}

export default function Prayer() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const [prayer, setPrayer] = useState<DailyPrayer | null>(null);
  const [myLog, setMyLog] = useState<SpiritualLog | null>(null);
  const [partnerLog, setPartnerLog] = useState<SpiritualLog | null>(null);

  // Prayer form
  const [editingPrayer, setEditingPrayer] = useState(false);
  const [prayerText, setPrayerText] = useState("");
  const [verseRef, setVerseRef] = useState("");

  // Log form
  const [prayedToday, setPrayedToday] = useState(false);
  const [criedToday, setCriedToday] = useState(false);
  const [gratitude, setGratitude] = useState("");
  const [reflection, setReflection] = useState("");
  const [logDirty, setLogDirty] = useState(false);

  // History
  const [historyPrayers, setHistoryPrayers] = useState<DailyPrayer[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SpiritualLog[]>([]);

  const fetchAll = useCallback(async () => {
    if (!spaceId || !user) return;
    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

    const [pRes, logRes, hpRes, hlRes] = await Promise.all([
      supabase.from("daily_prayers").select("*").eq("couple_space_id", spaceId).eq("day_key", todayKey).maybeSingle(),
      supabase.from("daily_spiritual_logs").select("*").eq("couple_space_id", spaceId).eq("day_key", todayKey),
      supabase.from("daily_prayers").select("*").eq("couple_space_id", spaceId).gte("day_key", sevenDaysAgo).order("day_key", { ascending: false }),
      supabase.from("daily_spiritual_logs").select("*").eq("couple_space_id", spaceId).gte("day_key", sevenDaysAgo).order("day_key", { ascending: false }),
    ]);

    if (pRes.data) {
      setPrayer(pRes.data as DailyPrayer);
      setPrayerText(pRes.data.prayer_text);
      setVerseRef(pRes.data.verse_ref ?? "");
    } else {
      setPrayer(null);
      setPrayerText("");
      setVerseRef("");
    }

    if (logRes.data) {
      const mine = (logRes.data as SpiritualLog[]).find(l => l.user_id === user.id) ?? null;
      const partner = (logRes.data as SpiritualLog[]).find(l => l.user_id !== user.id) ?? null;
      setMyLog(mine);
      setPartnerLog(partner);
      if (mine) {
        setPrayedToday(mine.prayed_today);
        setCriedToday(mine.cried_today);
        setGratitude(mine.gratitude_note ?? "");
        setReflection(mine.reflection_note ?? "");
      }
    }

    if (hpRes.data) setHistoryPrayers(hpRes.data as DailyPrayer[]);
    if (hlRes.data) setHistoryLogs(hlRes.data as SpiritualLog[]);
  }, [spaceId, user, todayKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase.channel("prayer-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_prayers", filter: `couple_space_id=eq.${spaceId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_spiritual_logs", filter: `couple_space_id=eq.${spaceId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, fetchAll]);

  const savePrayer = async () => {
    if (!spaceId || !user || !prayerText.trim()) return;
    const payload = {
      couple_space_id: spaceId,
      day_key: todayKey,
      prayer_text: prayerText.trim(),
      verse_ref: verseRef.trim() || null,
      created_by: user.id,
    };
    if (prayer) {
      await supabase.from("daily_prayers").update({ prayer_text: payload.prayer_text, verse_ref: payload.verse_ref }).eq("id", prayer.id);
    } else {
      await supabase.from("daily_prayers").insert(payload);
    }
    setEditingPrayer(false);
    toast({ title: "🙏 Oração guardada" });
    if (spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "🙏 Oração do dia atualizada",
        body: prayerText.trim().slice(0, 80),
        url: "/oracao",
        type: "oracao",
      });
    }
  };

  const saveLog = async () => {
    if (!spaceId || !user) return;
    const payload = {
      couple_space_id: spaceId,
      user_id: user.id,
      day_key: todayKey,
      prayed_today: prayedToday,
      cried_today: criedToday,
      gratitude_note: gratitude.trim() || null,
      reflection_note: reflection.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (myLog) {
      await supabase.from("daily_spiritual_logs").update(payload).eq("id", myLog.id);
    } else {
      await supabase.from("daily_spiritual_logs").insert(payload);
    }
    setLogDirty(false);
    toast({ title: "✅ Diário guardado" });
    if (spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "✨ Diário espiritual atualizado",
        body: gratitude.trim().slice(0, 60) || "Registo do dia atualizado",
        url: "/oracao",
        type: "oracao",
      });
    }
  };

  const togglePrayed = async (val: boolean) => {
    setPrayedToday(val);
    if (!spaceId || !user) return;
    const payload = {
      couple_space_id: spaceId,
      user_id: user.id,
      day_key: todayKey,
      prayed_today: val,
      cried_today: criedToday,
      gratitude_note: gratitude.trim() || null,
      reflection_note: reflection.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (myLog) {
      await supabase.from("daily_spiritual_logs").update({ prayed_today: val, updated_at: payload.updated_at }).eq("id", myLog.id);
    } else {
      await supabase.from("daily_spiritual_logs").insert(payload);
    }
  };

  return (
    <section className="space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Oração</h1>
        <p className="text-sm text-muted-foreground">Diário espiritual do casal.</p>
      </header>

      {/* Prayer of the Day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" /> Oração do Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!editingPrayer && prayer ? (
            <div className="space-y-2">
              <p className="text-sm whitespace-pre-wrap">{prayer.prayer_text}</p>
              {prayer.verse_ref && <p className="text-xs text-muted-foreground italic">📖 {prayer.verse_ref}</p>}
              <Button variant="ghost" size="sm" onClick={() => setEditingPrayer(true)}>
                <Pencil className="mr-1 h-3 w-3" /> Editar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="prayer-text">Texto da oração</Label>
                <Textarea id="prayer-text" value={prayerText} onChange={e => setPrayerText(e.target.value)} rows={4} placeholder="Escreve a oração do dia..." />
              </div>
              <div>
                <Label htmlFor="verse-ref">Referência bíblica (opcional)</Label>
                <Input id="verse-ref" value={verseRef} onChange={e => setVerseRef(e.target.value)} placeholder="Ex: Salmo 23:1" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={savePrayer} disabled={!prayerText.trim()}>
                  <Save className="mr-1 h-3 w-3" /> Guardar
                </Button>
                {prayer && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingPrayer(false); setPrayerText(prayer.prayer_text); setVerseRef(prayer.verse_ref ?? ""); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
          {!editingPrayer && !prayer && (
            <Button variant="outline" size="sm" onClick={() => setEditingPrayer(true)}>
              Adicionar oração do dia
            </Button>
          )}
        </CardContent>
      </Card>

      {/* My Day Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5" /> O meu dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={prayedToday} onCheckedChange={(v) => togglePrayed(!!v)} />
              Orei hoje
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={criedToday} onCheckedChange={(v) => { setCriedToday(!!v); setLogDirty(true); }} />
              Chorei hoje
            </label>
          </div>
          <div>
            <Label htmlFor="gratitude">Gratidão do dia</Label>
            <Textarea id="gratitude" value={gratitude} onChange={e => { setGratitude(e.target.value); setLogDirty(true); }} rows={2} placeholder="Sou grato(a) por..." />
          </div>
          <div>
            <Label htmlFor="reflection">Reflexão</Label>
            <Textarea id="reflection" value={reflection} onChange={e => { setReflection(e.target.value); setLogDirty(true); }} rows={2} placeholder="O que aprendi hoje..." />
          </div>
          {logDirty && (
            <Button size="sm" onClick={saveLog}>
              <Save className="mr-1 h-3 w-3" /> Guardar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Partner section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" /> O teu par
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partnerLog ? (
            <div className="space-y-2 text-sm">
              <div className="flex gap-4">
                <span>{partnerLog.prayed_today ? "🙏 Orou hoje" : "— Ainda não orou"}</span>
                {partnerLog.cried_today && <span>😢 Chorou hoje</span>}
              </div>
              {partnerLog.gratitude_note && (
                <div>
                  <span className="text-xs text-muted-foreground">Gratidão:</span>
                  <p className="text-sm">{partnerLog.gratitude_note}</p>
                </div>
              )}
              {partnerLog.reflection_note && (
                <div>
                  <span className="text-xs text-muted-foreground">Reflexão:</span>
                  <p className="text-sm">{partnerLog.reflection_note}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">O teu par ainda não preencheu hoje.</p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Últimos 7 dias</h2>
        {Array.from({ length: 7 }, (_, i) => {
          const d = subDays(new Date(), i);
          const dk = format(d, "yyyy-MM-dd");
          const dayPrayer = historyPrayers.find(p => p.day_key === dk);
          const dayLogs = historyLogs.filter(l => l.day_key === dk);
          if (!dayPrayer && dayLogs.length === 0) return null;
          return (
            <Card key={dk} className="border-dashed">
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground capitalize">
                  {format(d, "EEEE, d MMM", { locale: pt })}
                </p>
                {dayPrayer && (
                  <div className="space-y-1">
                    <p className="text-sm">🙏 {dayPrayer.prayer_text.length > 80 ? dayPrayer.prayer_text.slice(0, 80) + "…" : dayPrayer.prayer_text}</p>
                    {dayPrayer.verse_ref && <p className="text-xs text-muted-foreground italic">📖 {dayPrayer.verse_ref}</p>}
                  </div>
                )}
                {dayLogs.map(l => (
                  <div key={l.id} className="text-xs text-muted-foreground flex flex-wrap gap-2">
                    <span>{l.user_id === user?.id ? "Eu" : "Par"}:</span>
                    {l.prayed_today && <span>🙏</span>}
                    {l.cried_today && <span>😢</span>}
                    {l.gratitude_note && <span>💛 {l.gratitude_note.slice(0, 40)}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
