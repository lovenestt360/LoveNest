import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export function PrayerHomeCard() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const [prayerText, setPrayerText] = useState<string | null>(null);
  const [prayedToday, setPrayedToday] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!spaceId || !user) return;
    const [pRes, lRes] = await Promise.all([
      supabase.from("daily_prayers").select("prayer_text").eq("couple_space_id", spaceId).eq("day_key", todayKey).maybeSingle(),
      supabase.from("daily_spiritual_logs").select("id,prayed_today").eq("couple_space_id", spaceId).eq("user_id", user.id).eq("day_key", todayKey).maybeSingle(),
    ]);
    setPrayerText(pRes.data?.prayer_text ?? null);
    setPrayedToday(lRes.data?.prayed_today ?? false);
    setLogId(lRes.data?.id ?? null);
  }, [spaceId, user, todayKey]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase.channel("prayer-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_prayers", filter: `couple_space_id=eq.${spaceId}` }, () => fetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_spiritual_logs", filter: `couple_space_id=eq.${spaceId}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, fetch]);

  const togglePrayed = async (val: boolean) => {
    if (!spaceId || !user) return;
    setPrayedToday(val);
    if (logId) {
      await supabase.from("daily_spiritual_logs").update({ prayed_today: val, updated_at: new Date().toISOString() }).eq("id", logId);
    } else {
      await supabase.from("daily_spiritual_logs").insert({
        couple_space_id: spaceId,
        user_id: user.id,
        day_key: todayKey,
        prayed_today: val,
        updated_at: new Date().toISOString(),
      });
    }
    fetch();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">🙏 Oração do dia</CardTitle>
        <CardDescription>Rotina espiritual do casal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {prayerText ? (
          <p className="text-sm line-clamp-2">{prayerText}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma oração registada hoje.</p>
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={prayedToday} onCheckedChange={(v) => togglePrayed(!!v)} />
            Orei hoje
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/oracao")}>Abrir</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
