import React, { useState, useEffect } from "react";
import { usePWATutorial } from "./PWATutorialContext";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function PWAInstallButton() {
  const { settings, setShowModal, installPrompt } = usePWATutorial();
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    // Show tooltip 2 seconds after mount, then hide it 5 seconds later
    const timer = setTimeout(() => setShowTooltip(true), 2000);
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
      setPulse(false);
    }, 7000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!settings?.is_enabled) return null;

  // Hide if already running as installed PWA
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
    || (window.navigator as any).standalone === true;
  if (isStandalone) return null;

  const handleInstallClick = () => {
    setShowModal(true);
    // If it's Android and we have a prompt, we could also trigger it
    // But per user request, we primarily open the tutorial modal.
  };

  return (
    <div className="fixed top-24 right-4 z-[150] flex flex-col items-end gap-2 pointer-events-none sm:pointer-events-auto">
      {/* Floating Button */}
      <button
        onClick={handleInstallClick}
        className={cn(
          "w-11 h-11 rounded-full bg-primary/90 backdrop-blur-md text-primary-foreground flex items-center justify-center shadow-xl pointer-events-auto transition-all active:scale-95 hover:scale-110 relative group border border-white/20",
          pulse && "animate-pulse"
        )}
      >
        <Download className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        
        {/* Subtle Ring Animation */}
        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20 pointer-events-none" />
      </button>

      {/* Tooltip */}
      <div className={cn(
        "bg-zinc-900/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl backdrop-blur-md shadow-xl transition-all duration-500 origin-top scale-0",
        showTooltip && "scale-100"
      )}>
        Instalar App ✨
      </div>
    </div>
  );
}
