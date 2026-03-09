import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartHandshake, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ComplaintsHomeCard() {
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const [openCount, setOpenCount] = useState(0);
  const [latest, setLatest] = useState<{ title: string } | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    supabase
      .from("complaints")
      .select("title")
      .eq("couple_space_id", spaceId)
      .in("status", ["open", "talking"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setOpenCount(data.length);
          setLatest(data[0] ?? null);
        }
      });
  }, [spaceId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartHandshake className="h-5 w-5" /> Conflitos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {openCount > 0 ? (
          <>
            <p className="text-sm">{openCount} {openCount === 1 ? "conflito aberto" : "conflitos abertos"}</p>
            {latest && <p className="text-xs text-muted-foreground truncate">Último: {latest.title}</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sem conflitos abertos 🕊️</p>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => navigate("/conflitos")}>
            <ArrowRight className="mr-1 h-3 w-3" /> Abrir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/conflitos")}>
            <Plus className="mr-1 h-3 w-3" /> Nova
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
