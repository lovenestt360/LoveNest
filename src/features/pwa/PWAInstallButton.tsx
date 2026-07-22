import { usePWATutorial } from "./PWATutorialContext";
import { Download } from "lucide-react";

// Botão flutuante de instalação — sempre visível enquanto não instalado.
// Android/Desktop com prompt nativo → 1 clique instala.
// iOS / sem prompt → abre o modal com instruções passo a passo.
export function PWAInstallButton() {
  const { setShowModal, installPrompt } = usePWATutorial();

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone) return null;

  const handleClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
    } else {
      setShowModal(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Instalar aplicação"
      className="fixed top-24 right-4 z-[150] w-11 h-11 rounded-full bg-primary/90 backdrop-blur-md text-primary-foreground flex items-center justify-center shadow-xl border border-white/20 transition-all active:scale-95 hover:scale-105"
    >
      <Download className="w-5 h-5" />
    </button>
  );
}
