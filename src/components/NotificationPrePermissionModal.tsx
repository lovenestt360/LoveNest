import { useEffect, useState } from "react";
import { Bell, HeartHandshake, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onConfirm: () => void;
  onDismiss: () => void;
}

const REASONS = [
  { icon: HeartHandshake, text: "Quando o teu par aparece no vosso espaço." },
  { icon: Flame,          text: "Quando a vossa chama precisa de um gesto." },
  { icon: Sparkles,       text: "Quando completam um dia especial juntos." },
];

export function NotificationPrePermissionModal({ onConfirm, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 260);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 260);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 transition-opacity duration-260",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={handleDismiss}
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
          <div className="w-14 h-14 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Bell className="w-6 h-6 text-rose-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-center text-[22px] font-bold text-foreground leading-tight tracking-tight mb-2">
          Fiquem ligados.
        </h2>
        <p className="text-center text-[13px] text-[#999] leading-relaxed mb-7">
          Lembretes suaves para cuidarem do vosso espaço — sem spam, sem pressão.
        </p>

        {/* Reasons */}
        <div className="space-y-3 mb-8">
          {REASONS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-[#717171] leading-snug pt-1">{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            className="w-full h-13 rounded-2xl bg-rose-500/90 text-white font-semibold text-[14px] active:scale-[0.98] transition-transform shadow-[0_2px_14px_rgba(244,63,94,0.18)] py-3.5"
          >
            Ativar notificações
          </button>
          <button
            onClick={handleDismiss}
            className="w-full h-11 rounded-2xl text-[13px] font-medium text-[#bbb] hover:text-[#717171] transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
