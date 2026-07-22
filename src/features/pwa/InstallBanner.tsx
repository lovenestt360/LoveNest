import { useState } from "react";
import { Download, X } from "lucide-react";
import { usePWATutorial } from "./PWATutorialContext";

const DISMISS_KEY = "lovenest_install_banner_v2";
const DISMISS_MS  = 7 * 24 * 3600 * 1000; // volta em 7 dias

function wasDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    return ts ? Date.now() - parseInt(ts) < DISMISS_MS : false;
  } catch { return false; }
}

// Banner fixo acima da barra de navegação inferior.
// Android/Desktop → botão "Instalar" usa o prompt nativo (1 clique).
// iOS             → botão "Como instalar" abre o modal passo a passo.
// Desaparece se já estiver instalado como PWA.
export function InstallBanner() {
  const { installPrompt, isIOS, setShowModal } = usePWATutorial();
  const [dismissed, setDismissed] = useState(wasDismissed);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone || dismissed) return null;
  // Mostrar só se há prompt nativo (Android/Desktop) ou é iOS
  if (!installPrompt && !isIOS) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const handleAction = () => {
    if (installPrompt) {
      installPrompt.prompt();
    } else {
      setShowModal(true);
    }
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[120] mx-auto max-w-md">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            Instalar LoveNest
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {isIOS
              ? "Toca em Partilhar → Adicionar ao Ecrã Principal"
              : "Acede direto do ecrã inicial, sem abrir o browser"}
          </p>
        </div>

        <button
          onClick={handleAction}
          className="px-3.5 py-2 bg-primary text-primary-foreground text-[12px] font-bold rounded-xl shrink-0 active:scale-95 transition-transform"
        >
          {isIOS ? "Como?" : "Instalar"}
        </button>

        <button
          onClick={dismiss}
          aria-label="Dispensar"
          className="text-muted-foreground/60 hover:text-muted-foreground shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
