import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Flag, Flame, Moon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";

interface Props {
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Pedido para ativar notificações: a Faísca mostra três notificações de exemplo
 * a chegar, como aparecem no telemóvel, e a regra que a app cumpre
 * (no máximo 2 por dia, entre as 8h e as 22h — ver smart-notifications).
 */
export function NotificationPrePermissionModal({ onConfirm, onDismiss }: Props) {
  const { partner } = usePartnerProfile();
  const partnerName = partner?.display_name?.split(" ")[0] || "O teu par";
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(0);

  const samples = [
    { Icon: Users, when: "agora", title: `${partnerName} está no vosso espaço`, body: "Deixou-te um bom dia no chat." },
    { Icon: Flame, when: "19:30", title: "A vossa chama precisa de um gesto", body: "Ainda vão a tempo de manter a sequência de hoje." },
    { Icon: Flag, when: "ontem", title: "Faltam 3 dias para os 500 dias", body: "Já pensaram em como vão celebrar?" },
  ];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setVisible(true));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ids = reduce ? [] : [500, 1200, 1900].map((ms, i) => setTimeout(() => setShown(i + 1), ms));
    if (reduce) setShown(3);
    return () => {
      cancelAnimationFrame(raf);
      ids.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, []);

  const close = (fn: () => void) => {
    setVisible(false);
    setTimeout(fn, 260);
  };

  // Portal: escapa a qualquer transform dos componentes pais (AppShell).
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end justify-center p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div
        className={cn("absolute inset-0 bg-[#0B1324]/35 backdrop-blur-[3px] transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
        onClick={() => close(onDismiss)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-title"
        className={cn(
          "relative w-full max-w-sm rounded-[30px] bg-white px-[18px] pb-4 pt-4 dark:bg-card",
          "transition-[transform,opacity] duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <img src={faisca} alt="" className="mx-auto -mt-14 block w-[88px] animate-[ln-bob_3.6s_ease-in-out_infinite]" />

        {/* Notificações de exemplo, a chegar uma a uma */}
        <div className="mt-2 space-y-2" aria-hidden="true">
          {samples.map(({ Icon, when, title, body }, i) => (
            <div
              key={title}
              className={cn(
                "flex items-start gap-2.5 rounded-[18px] bg-[#F7F5F2] px-3 py-2.5 dark:bg-muted",
                "transition-[opacity,transform] duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)]",
                shown > i ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-[0.97] opacity-0",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#0B1324] text-white dark:bg-foreground dark:text-background">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>LoveNest</span><span>{when}</span>
                </span>
                <span className="mt-px block text-[13px] font-semibold text-foreground">{title}</span>
                <span className="block text-[12.5px] leading-snug text-muted-foreground">{body}</span>
              </span>
            </div>
          ))}
        </div>

        <h2 id="notif-title" className="mt-4 text-center text-[21px] font-bold tracking-[-0.025em] text-foreground">
          Fiquem ligados
        </h2>
        <p className="mt-1.5 text-center text-[13.5px] leading-relaxed text-muted-foreground">
          Avisamos só o que importa para os dois.
        </p>

        <div className="mb-3.5 mt-3 flex flex-wrap justify-center gap-1.5">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#ECE8E3] px-2.5 text-[12px] font-semibold text-muted-foreground dark:border-border">
            <Check className="h-3 w-3" strokeWidth={2.4} /> No máximo 2 por dia
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#ECE8E3] px-2.5 text-[12px] font-semibold text-muted-foreground dark:border-border">
            <Moon className="h-3 w-3" strokeWidth={2} /> Nunca depois das 22h
          </span>
        </div>

        <button
          onClick={() => close(onConfirm)}
          className="h-[50px] w-full rounded-2xl bg-[#0B1324] text-[15px] font-semibold text-white transition-transform active:scale-[0.98] dark:bg-foreground dark:text-background"
        >
          Ativar notificações
        </button>
        <button
          onClick={() => close(onDismiss)}
          className="mt-1 h-10 w-full text-[14px] font-semibold text-muted-foreground"
        >
          Agora não
        </button>
        <p className="text-center text-[11.5px] text-muted-foreground/70">
          Podes mudar a qualquer momento em Perfil → Notificações.
        </p>
      </div>
    </div>,
    document.body,
  );
}
