import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const MOOD_OPTIONS: Record<string, { emoji: string; label: string }> = {
  feliz: { emoji: "😊", label: "Feliz" },
  tranquilo: { emoji: "😌", label: "Tranquilo" },
  apaixonado: { emoji: "🥰", label: "Apaixonado" },
  ansioso: { emoji: "😰", label: "Ansioso" },
  triste: { emoji: "😢", label: "Triste" },
  cansado: { emoji: "😴", label: "Cansado" },
  irritado: { emoji: "😤", label: "Irritado" },
  grato: { emoji: "🙏", label: "Grato" },
};

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
    const today = new Date().toISOString().slice(0, 10);

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

  const emoji = (key: string) => MOOD_OPTIONS[key]?.emoji ?? "😶";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Humor do dia</CardTitle>
        <CardDescription>Check-in seu e do seu par.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {mine ? (
          <p className="text-sm">
            {emoji(mine.mood_key)} Eu: {mine.mood_percent}%
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Você ainda não registou.</p>
        )}
        {partner ? (
          <p className="text-sm">
            {emoji(partner.mood_key)} Par: {partner.mood_percent}%
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
