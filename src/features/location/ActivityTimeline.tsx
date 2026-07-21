import { LogIn, LogOut, Clock } from "lucide-react";
import type { LocationEvent } from "@/hooks/useLocationEvents";

interface Props {
  events: LocationEvent[];
}

export function ActivityTimeline({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="px-4 pb-4 space-y-2">
      <p className="text-[12px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-0.5">
        Atividade de hoje
      </p>
      <div className="glass-card divide-y divide-border/30">
        {events.map(evt => (
          <div key={evt.id} className="flex items-center gap-3 px-4 py-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                evt.event_type === "enter"
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : "bg-muted"
              }`}
            >
              {evt.event_type === "enter" ? (
                <LogIn className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground">
                {evt.event_type === "enter"
                  ? `Chegou a ${evt.place_name}`
                  : `Saiu de ${evt.place_name}`}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                <p className="text-[10px] text-muted-foreground/50">
                  {new Date(evt.occurred_at).toLocaleTimeString("pt", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
