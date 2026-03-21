import { useState, useEffect } from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Sparkles } from "lucide-react";
import { usePWATutorial } from "@/features/pwa/PWATutorialContext";

export function VerificationPrompt() {
  const [open, setOpen] = useState(false);
  const { showModal: pwaModalShowing } = usePWATutorial();

  useEffect(() => {
    const hasSeen = localStorage.getItem("verification_prompt_seen");
    
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
    localStorage.setItem("verification_prompt_seen", "true");
    setOpen(false);
  };

  const handleVerify = () => {
    localStorage.setItem("verification_prompt_seen", "true");
    setOpen(false);
    window.location.href = "/configuracoes#verification";
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-[90vw] rounded-[2.5rem] p-8 border-none shadow-2xl glass-card animate-in fade-in zoom-in duration-500">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="bg-primary/10 p-4 rounded-3xl mb-2 animate-pulse-subtle">
            <ShieldCheck className="h-12 w-12 text-primary mb-4" />
          </div>
          <AlertDialogTitle className="text-2xl font-black gradient-text">
            Ajuda-nos a manter o LoveNest seguro 💛
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground font-medium pt-2">
            Podes verificar a tua identidade para aumentar a confiança e segurança na plataforma. É rápido e opcional!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-6 flex flex-col sm:flex-row gap-3">
          <AlertDialogCancel 
            onClick={handleClose}
            className="w-full h-12 rounded-2xl font-bold border-none bg-muted hover:bg-muted/80 transition-all"
          >
            Pular por agora
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleVerify}
            className="w-full h-14 rounded-2xl font-bold text-lg glow-primary flex items-center justify-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Verificar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
