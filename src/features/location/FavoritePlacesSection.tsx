import { useState } from "react";
import {
  Home, Briefcase, GraduationCap, Coffee, Heart,
  ShoppingBag, Dumbbell, Church, MapPin, Plus, Trash2,
  type LucideIcon,
} from "lucide-react";
import { useFavoritePlaces, PLACE_ICONS } from "@/hooks/useFavoritePlaces";

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Briefcase, GraduationCap, Coffee, Heart,
  ShoppingBag, Dumbbell, Church, MapPin,
};

function PlaceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? MapPin;
  return <Icon className={className} strokeWidth={1.5} />;
}

interface Props {
  myLat: number | null;
  myLng: number | null;
}

export function FavoritePlacesSection({ myLat, myLng }: Props) {
  const { places, addPlace, removePlace } = useFavoritePlaces();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Home");
  const [saving, setSaving] = useState(false);

  const canAdd = myLat !== null && myLng !== null;

  const handleSave = async () => {
    if (!name.trim() || !canAdd) return;
    setSaving(true);
    await addPlace({ name: name.trim(), icon, lat: myLat!, lng: myLng! });
    setName("");
    setIcon("Home");
    setShowAdd(false);
    setSaving(false);
  };

  return (
    <div className="px-4 pb-4 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[12px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          Os nossos locais
        </p>
        <button
          onClick={() => setShowAdd(v => !v)}
          disabled={!canAdd}
          className="flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Adicionar
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card p-4 space-y-3">
          {/* Icon picker */}
          <div className="flex gap-2 flex-wrap">
            {PLACE_ICONS.map(p => (
              <button
                key={p.key}
                onClick={() => setIcon(p.key)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  icon === p.key
                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-500"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                title={p.label}
              >
                <PlaceIcon name={p.key} className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Name input */}
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do local (ex: Casa, Trabalho...)"
            className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-800"
            onKeyDown={e => e.key === "Enter" && handleSave()}
          />

          <p className="text-[10px] text-muted-foreground/50">
            Vai guardar a tua localização atual como este local.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 rounded-xl bg-muted text-[12px] text-muted-foreground active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex-1 py-2 rounded-xl bg-rose-400 text-white text-[12px] font-semibold disabled:opacity-50 active:scale-95 transition-all"
            >
              {saving ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Places list */}
      {places.length > 0 && (
        <div className="glass-card divide-y divide-border/30">
          {places.map(place => (
            <div key={place.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
                <PlaceIcon name={place.icon} className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="flex-1 text-[13px] font-medium text-foreground">{place.name}</p>
              <button
                onClick={() => removePlace(place.id)}
                className="text-muted-foreground/30 hover:text-rose-400 transition-colors active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {places.length === 0 && !showAdd && (
        <p className="text-[11px] text-muted-foreground/40 text-center py-2">
          {canAdd
            ? "Adiciona a Casa, o Trabalho ou outros locais favoritos."
            : "Ativa a partilha de presença para adicionar locais."}
        </p>
      )}
    </div>
  );
}
