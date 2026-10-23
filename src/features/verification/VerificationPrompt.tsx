import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { usePWATutorial } from "@/features/pwa/PWATutorialContext";
import faisca from "@/features/entry/assets/faisca.webp";

const SEEN_KEY = "verification_prompt_seen";

function ShieldBadge() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <defs>
        <linearGradient id="vp-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8DB4FF" />
          <stop offset="1" stopColor="#3866E6" />
        </linearGradient>
      </defs>
      <path d="M12 2.5l7.5 2.8v6.1c0 4.7-3.1 8.6-7.5 10.1-4.4-1.5-7.5-5.4-7.5-10.1V5.3Z" fill="url(#vp-shield)" />
      <path d="M8.6 11.8l2.3 2.3 4.4-4.6" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const REASONS = [
  {
    text: "Confirmas que és mesmo tu",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="9" r="3.4" />
        <path d="M5.5 20c.8-3.6 3.4-5.4 6.5-5.4s5.7 1.8 6.5 5.4" />
      </svg>
    ),
  },
  {
    text: "Os teus dados ficam guardados com segurança",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </svg>
    ),
  },
];

export function VerificationPrompt() {
  const [open, setOpen] = useState(false);
  const { showModal: pwaModalShowing } = usePWATutorial();

  useEffect(() => {
    const hasSeen = localStorage.getItem(SEEN_KEY);

    // Só mostramos se não viu ainda E se o modal de PWA não estiver no ecrã
    if (!hasSeen && !pwaModalShowing) {
      // Delay um pouco maior para deixar o utilizador respirar
      const timer = setTimeout(() => {
        setOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pwaModalShowing]);

  const handleClose = () => {
    localStorage.setItem(SEEN_KEY, "true");
    setOpen(false);
  };

  const handleVerify = () => {
    localStorage.setItem(SEEN_KEY, "true");
    setOpen(false);
    window.location.href = "/configuracoes#verification";
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-md rounded-t-[28px] border-0 outline-none focus:outline-none bg-white px-[22px] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] pt-3 text-center shadow-[0_-16px_50px_-20px_rgba(11,19,36,0.4)] dark:bg-card [&>button.absolute]:hidden"
      >
        <div className="mx-auto mb-[18px] h-1 w-10 rounded-full bg-[#E2DED8] dark:bg-border" aria-hidden="true" />

        <div className="relative mx-auto h-28 w-28">
          <img src={faisca} alt="" className="h-full w-full object-contain" />
          <span className="absolute -bottom-0.5 -right-1 grid h-10 w-10 place-items-center rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(11,19,36,0.35),0_0_0_1px_#ECE8E3] dark:bg-card dark:shadow-[0_0_0_1px_hsl(var(--border))]">
            <ShieldBadge />
          </span>
        </div>

        <SheetTitle className="mt-3.5 text-balance text-[22px] font-bold leading-tight tracking-[-0.025em] text-foreground">
          Ajuda-nos a manter o LoveNest seguro
        </SheetTitle>
        <SheetDescription className="mx-auto mt-2 max-w-[30ch] text-[14px] leading-normal text-muted-foreground">
          Verifica a tua identidade para dar mais confiança ao vosso espaço. É rápido e opcional.
        </SheetDescription>

        <ul className="mt-5 space-y-2.5 text-left">
          {REASONS.map(({ text, icon }) => (
            <li key={text} className="flex items-center gap-3 text-[13.5px] text-[#3A4150] dark:text-foreground/80">
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] border border-[#ECE8E3] bg-[#F7F5F2] dark:border-border dark:bg-muted">
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleVerify}
          className="mt-5 flex h-[52px] outline-none focus-visible:outline-none w-full items-center justify-center rounded-[18px] bg-[#0B1324] text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] transition-transform active:scale-[0.99] dark:bg-foreground dark:text-background"
        >
          Verificar agora
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="mt-1 flex h-11 w-full items-center justify-center text-[15px] font-medium text-muted-foreground active:opacity-60"
        >
          Agora não
        </button>
      </SheetContent>
    </Sheet>
  );
}
