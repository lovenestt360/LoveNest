import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    document.body.style.overflow = "hidden";
    const t = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = "";
    };
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 260);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 260);
  };

  // Portal renders directly in document.body — escapes any CSS transform
  // context in parent components (AppShell, etc.) that would break fixed positioning
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-[3px] transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleDismiss}
      />

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden",
          "transition-all duration-300 ease-out",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        {/* Rose accent top bar */}
        <div className="h-1 bg-gradient-to-r from-rose-300 via-rose-400 to-rose-300" />

        <div className="p-7">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-rose-400" strokeWidth={1.5} />
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-center text-[21px] font-bold text-foreground leading-tight tracking-tight mb-2">
            Fiquem ligados.
          </h2>
          <p className="text-center text-[13px] text-[#999] leading-relaxed mb-6">
            Lembretes suaves para cuidarem do vosso espaço — sem spam, sem pressão.
          </p>

          {/* Reasons */}
          <div className="space-y-3 mb-7">
            {REASONS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] text-[#717171] leading-snug">{text}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <button
              onClick={handleConfirm}
              className="w-full h-12 rounded-2xl bg-rose-500/90 text-white font-semibold text-[14px] active:scale-[0.98] transition-transform shadow-[0_2px_14px_rgba(244,63,94,0.20)]"
            >
              Ativar notificações
            </button>
            <button
              onClick={handleDismiss}
              className="w-full h-10 rounded-2xl text-[13px] font-medium text-[#bbb] hover:text-[#717171] transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
