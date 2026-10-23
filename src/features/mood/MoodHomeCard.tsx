import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayLocal } from "@/lib/timezone";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MoodFace } from "./MoodArt";

interface MoodCheckin {
  user_id: string;
  mood_key: string;
  mood_percent: number;
}

export function MoodHomeCard() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const [mine, setMine] = useState<MoodCheckin | null>(null);
  const [partner, setPartner] = useState<MoodCheckin | null>(null);

  useEffect(() => {
    if (!spaceId || !user) return;
    const today = todayLocal();

    supabase
      .from("mood_checkins")
      .select("user_id, mood_key, mood_percent")
      .eq("couple_space_id", spaceId)
      .eq("day_key", today)
      .then(({ data }) => {
        if (!data) return;
        const rows = data as MoodCheckin[];
        setMine(rows.find((r) => r.user_id === user.id) ?? null);
        setPartner(rows.find((r) => r.user_id !== user.id) ?? null);
      });
  }, [spaceId, user]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Humor do dia</CardTitle>
        <CardDescription>Check-in seu e do seu par.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {mine ? (
          <p className="flex items-center gap-2 text-sm">
            <MoodFace mood={mine.mood_key} size={24} /> Eu: {mine.mood_percent}%
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Você ainda não registou.</p>
        )}
        {partner ? (
          <p className="flex items-center gap-2 text-sm">
            <MoodFace mood={partner.mood_key} size={24} /> Par: {partner.mood_percent}%
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Seu par ainda não registou.</p>
        )}
        <Button variant="outline" size="sm" className="mt-1" onClick={() => navigate("/humor")}>
          {mine ? "Actualizar" : "Registar"}
        </Button>
      </CardContent>
    </Card>
  );
}
