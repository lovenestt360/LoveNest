import { useEffect, useState } from "react";
import { Sparkles, Heart, HeartHandshake, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Content per streak milestone ──────────────────────────────────────────────

const MILESTONE_DATA: Record<number, {
  icon: React.ElementType;
  title: string;
  description: string;
  microMemory: string;
}> = {
  7: {
    icon: Sparkles,
    title: "Primeira semana juntos",
    description: "Pequenos gestos tornam-se história.",
    microMemory: "Sete dias de presença juntos.",
  },
  14: {
    icon: Heart,
    title: "Duas semanas de presença",
    description: "O amor cresce nos dias repetidos.",
    microMemory: "Duas semanas a aparecerem um para o outro.",
  },
  30: {
    icon: HeartHandshake,
    title: "Um mês a escolherem-se",
    description: "O vosso espaço está a ganhar raízes.",
    microMemory: "Um mês de amor construído.",
  },
  50: {
    icon: Sparkles,
    title: "Cinquenta dias de cuidado",
    description: "Continuem a aparecer um para o outro.",
    microMemory: "Cinquenta dias de presença partilhada.",
  },
  100: {
    icon: Star,
    title: "Cem dias de presença",
    description: "Uma chama que não se apaga.",
    microMemory: "Cem dias. Uma história que continua.",
  },
  365: {
    icon: HeartHandshake,
    title: "Um ano a escolherem-se",
    description: "Um ano inteiro de gestos que ficam.",
    microMemory: "Um ano inteiro a aparecerem um para o outro.",
  },
};

export function getMilestoneMicroMemory(value: number): string {
  return MILESTONE_DATA[value]?.microMemory ?? "";
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface MilestoneModalProps {
  value: number;
  onClose: () => void;
}

export function MilestoneModal({ value, onClose }: MilestoneModalProps) {
  const [visible, setVisible] = useState(false);

  const data = MILESTONE_DATA[value];

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = requestAnimationFrame(() => setVisible(true));
    // Haptic: medium soft pulse
    try { navigator.vibrate?.([30, 80, 30]); } catch {}
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  if (!data) return null;
  const Icon = data.icon;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl",
          "transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 flex items-center justify-center border border-rose-100">
            <Icon className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Number */}
        <div className="text-center mb-1">
          <span className="text-6xl font-bold text-foreground tabular-nums leading-none">
            {value}
          </span>
          <span className="text-xl font-semibold text-[#717171] ml-2">dias</span>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-bold text-foreground mt-3 mb-3 leading-snug">
          {data.title}
        </h2>

        {/* Description */}
        <p className="text-center text-sm text-[#717171] leading-relaxed mb-8">
          {data.description}
        </p>

        {/* CTA */}
        <button
          onClick={handleClose}
          className="w-full h-14 rounded-2xl bg-rose-500 text-white font-semibold text-base active:scale-[0.98] transition-transform"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
