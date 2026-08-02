import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { LocationNotifPrefs } from "@/hooks/useLocationNotifPrefs";

interface Props {
  prefs: LocationNotifPrefs;
  onUpdate: (key: keyof LocationNotifPrefs, value: boolean) => void;
}

const ITEMS: { key: keyof LocationNotifPrefs; label: string; desc: string }[] = [
  {
    key: "notify_arrives",
    label: "Chegada a um local",
    desc: "Avisa o par quando chegas a um local favorito",
  },
  {
    key: "notify_leaves",
    label: "Saída de um local",
    desc: "Avisa o par quando sais de um local favorito",
  },
  {
    key: "notify_proximity",
    label: "Estão perto",
    desc: "Avisa o par quando estão a menos de 100 m um do outro",
  },
];

export function LocationNotifSettings({ prefs, onUpdate }: Props) {
  return (
    <div className="px-4 pb-6 mt-4 space-y-2">
      <div className="flex items-center gap-1.5 px-0.5 mb-1">
        <Bell className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-[12px] font-bold text-muted-foreground/60 uppercase tracking-wider">
          Notificações
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        {ITEMS.map((item, i) => (
          <div
            key={item.key}
            className={`flex items-center justify-between px-4 py-3.5 bg-card ${i < ITEMS.length - 1 ? 'border-b border-border/40' : ''}`}
          >
            <div className="flex-1 min-w-0 mr-4 space-y-0.5">
              <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
                {item.desc}
              </p>
            </div>
            <Switch
              checked={prefs[item.key]}
              onCheckedChange={v => onUpdate(item.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
