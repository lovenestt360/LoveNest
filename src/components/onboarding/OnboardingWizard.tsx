import { useEffect, useState } from "react";
import { useOnboarding, type OnboardingStep } from "@/hooks/useOnboarding";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, User, Bell, Sparkles } from "lucide-react";

export function OnboardingWizard() {
  const { step, loading, refresh } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Detect if we're running as an installed PWA (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone === true
      || document.referrer.includes("android-app://");

    // Only show if not loading, a step is required, AND we are in standalone mode
    if (!loading && step !== "complete" && isStandalone) {
      // Don't show modal if we are already in the correct settings section
      const hash = location.hash.replace("#", "");
      if (location.pathname === "/configuracoes" && hash === step) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    } else {
      setOpen(false);
    }
  }, [step, loading, location]);

  const handleAction = () => {
    if (step === "profile") {
      navigate("/configuracoes#profile");
      window.location.hash = "#profile"; // Force hash update if already on page
    } else if (step === "house") {
      navigate("/configuracoes#house");
      window.location.hash = "#house";
    } else if (step === "notifications") {
      navigate("/configuracoes#notifications");
      window.location.hash = "#notifications";
    }
    setOpen(false);
    
    // Refresh onboarding state when user returns or saves (handled by useOnboarding effect)
  };

  if (step === "complete") return null;

  const content = {
    profile: {
      title: "Boas-vindas ao LoveNest! ✨",
      description: "Para começarmos, precisamos de configurar o teu perfil. É rápido e ajuda-nos a personalizar a vossa experiência.",
      icon: <User className="h-12 w-12 text-rose-500 mb-4" />,
      button: "Configurar Perfil",
    },
    house: {
      title: "O vosso Ninho 🏠",
      description: "A vossa casa ainda não está completa. Vamos dar-lhe um nome e definir a vossa data especial!",
      icon: <Heart className="h-12 w-12 text-rose-500 mb-4" />,
      button: "Configurar Nossa Casa",
    },
    notifications: {
      title: "Fiquem Ligados! 🔔",
      description: "Ativa as notificações para receberes os mimos e alertas do teu par em tempo real. É essencial para o LoveNest funcionar bem!",
      icon: <Bell className="h-12 w-12 text-indigo-500 mb-4" />,
      button: "Ativar Notificações",
    }
  };

  const current = content[step as keyof typeof content] || content.profile;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[90vw] rounded-[2.5rem] p-8 border-none shadow-2xl glass-card">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="bg-primary/10 p-4 rounded-3xl mb-2 animate-bounce-subtle">
            {current.icon}
          </div>
          <AlertDialogTitle className="text-2xl font-black gradient-text">
            {current.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground font-medium pt-2">
            {current.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-6 sm:justify-center">
          <AlertDialogAction 
            onClick={handleAction}
            className="w-full h-14 rounded-2xl font-bold text-lg glow-primary flex items-center justify-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            {current.button}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
