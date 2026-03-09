import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Clock, MapPin } from "lucide-react";

interface NextItem {
  title: string;
  time: string | null;
  date: string;
  location: string | null;
  who: string;
}

export function ScheduleHomeCard() {
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [next, setNext] = useState<NextItem | null>(null);

  useEffect(() => {
    if (!spaceId || !user) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const nowTime = format(new Date(), "HH:mm:ss");
    const todayDow = new Date().getDay();

    Promise.all([
      supabase.from("events").select("*").eq("couple_space_id", spaceId)
        .gte("event_date", todayStr).order("event_date").order("start_time").limit(1),
      supabase.from("schedule_blocks").select("*").eq("couple_space_id", spaceId)
        .order("start_time").limit(50),
    ]).then(([evRes, blRes]) => {
      let nextItem: NextItem | null = null;

      // Nearest event
      if (evRes.data?.[0]) {
        const e = evRes.data[0] as any;
        nextItem = { title: e.title, time: e.start_time?.slice(0, 5) ?? null, date: e.event_date, location: e.location, who: "Casal" };
      }

      // Nearest block today or tomorrow
      if (blRes.data) {
        const todayBlock = (blRes.data as any[]).find(b => b.day_of_week === todayDow && b.start_time >= nowTime);
        const tomorrowDow = (todayDow + 1) % 7;
        const tomorrowBlock = (blRes.data as any[]).find(b => b.day_of_week === tomorrowDow);
        const block = todayBlock || tomorrowBlock;
        if (block) {
          const blockDate = todayBlock ? todayStr : format(addDays(new Date(), 1), "yyyy-MM-dd");
          const blockItem: NextItem = {
            title: block.title,
            time: block.start_time.slice(0, 5),
            date: blockDate,
            location: block.location,
            who: block.user_id === user.id ? "Tu" : "Teu par",
          };
          // Compare with event
          if (!nextItem || blockDate < nextItem.date || (blockDate === nextItem.date && (blockItem.time ?? "") < (nextItem.time ?? ""))) {
            nextItem = blockItem;
          }
        }
      }

      setNext(nextItem);
    });
  }, [spaceId, user]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Agenda</CardTitle>
        <CardDescription>{next ? "Próxima actividade" : "Nada agendado por agora."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {next ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{next.title}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {next.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{next.time}</span>}
              <span>{format(new Date(next.date + "T00:00:00"), "d MMM", { locale: pt })}</span>
              <span>· {next.who}</span>
            </div>
            {next.location && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{next.location}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Adiciona rotinas e eventos! 📅</p>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/agenda")}>Ver agenda</Button>
          <Button size="sm" className="flex-1" onClick={() => navigate("/agenda")}>Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
