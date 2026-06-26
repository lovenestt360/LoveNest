import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Plus, Heart, Camera, BookHeart, MessageCircle } from "lucide-react";

const ITEMS = [
  { label: "Nova memória", Icon: Heart,         path: "/memorias?new=1",         color: "text-rose-400"   },
  { label: "Foto",         Icon: Camera,        path: "/memorias?new=1",         color: "text-violet-400" },
  { label: "Oração",       Icon: BookHeart,     path: "/jornada-espiritual",     color: "text-purple-400" },
  { label: "Mensagem",     Icon: MessageCircle, path: "/chat",                   color: "text-sky-400"    },
] as const;

export function Fab() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close, { passive: true });
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (location.pathname !== "/") return null;

  return (
    <div className="fixed bottom-[116px] right-5 z-50 flex flex-col items-end gap-3">

      {/* Action items — stagger upward */}
      {ITEMS.map(({ label, Icon, path, color }, i) => (
        <div
          key={label}
          className="flex items-center gap-2.5"
          style={{
            opacity:    open ? 1 : 0,
            transform:  open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.94)",
            pointerEvents: open ? "auto" : "none",
            transition: `opacity ${open ? 180 + i * 40 : 80}ms cubic-bezier(0.34,1.56,0.64,1),
                         transform ${open ? 200 + i * 40 : 80}ms cubic-bezier(0.34,1.56,0.64,1)`,
            transitionDelay: open ? `${i * 50}ms` : "0ms",
          }}
        >
          <span className="text-[11px] font-semibold text-foreground/70 bg-card/95 backdrop-blur-sm border border-border rounded-full px-2.5 py-1 shadow-sm whitespace-nowrap">
            {label}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(path); setOpen(false); }}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center",
              "bg-card/95 backdrop-blur-sm border border-border",
              "shadow-[0_4px_16px_rgba(0,0,0,0.10)]",
              "active:scale-90 transition-transform duration-150",
              color
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      ))}

      {/* Main button */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label={open ? "Fechar" : "Criar"}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center",
          "bg-rose-500 text-white",
          "shadow-[0_8px_32px_rgba(244,63,94,0.32),0_2px_8px_rgba(0,0,0,0.10)]",
          "active:shadow-[0_4px_16px_rgba(244,63,94,0.22)]",
          "transition-all duration-300"
        )}
        style={{
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </button>
    </div>
  );
}
