import React, { useState } from "react";
import { usePWATutorial } from "./PWATutorialContext";
import { X, Smartphone, Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PWATutorialModal() {
  const { showModal, setShowModal, settings, isIOS, isAndroid, markAsSeen } = usePWATutorial();
  const [activePlatform, setActivePlatform] = useState<"android" | "ios">(isIOS ? "ios" : "android");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!showModal || !settings) return null;

  const videoUrl = activePlatform === "android" ? settings.android_video_url : settings.ios_video_url;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={() => setShowModal(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[500px] bg-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="p-6 pb-0 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight gradient-text">Instalar LoveNest</h2>
            <p className="text-sm text-muted-foreground font-medium">Aprende a instalar no teu telemóvel.</p>
          </div>
          <button 
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Switch */}
        <div className="p-6">
          <div className="flex p-1 bg-muted/50 rounded-2xl gap-1 mb-6">
            <button 
              onClick={() => setActivePlatform("android")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                activePlatform === "android" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Android
            </button>
            <button 
              onClick={() => setActivePlatform("ios")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                activePlatform === "ios" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              iPhone (iOS)
            </button>
          </div>

          {/* Video / Content Section */}
          <div className="w-full bg-black/5 rounded-2xl overflow-hidden border border-border/50 relative">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                className="w-full max-h-[55vh] object-contain rounded-2xl" 
                controls 
                playsInline
                loop
                autoPlay
                muted
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[200px]">
                <HelpCircle className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-medium italic">
                  O administrador ainda não configurou o vídeo tutorial para {activePlatform === "android" ? "Android" : "iPhone"}.
                </p>
              </div>
            )}
          </div>

          {/* Tips for the Current Platform */}
          <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary/70 mb-2">Dica Rápida</h4>
            <p className="text-sm font-medium leading-relaxed">
              {activePlatform === "android" 
                ? "No Chrome, toca nos 3 pontos verticais (topo direito) e escolhe 'Instalar Aplicativo'. É rápido e seguro!"
                : "No Safari, toca no ícone 'Partilhar' (seta no fundo) e escolhe 'Adicionar ao Ecrã Principal'. Feito!"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/30 border-t border-border/50 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="dont-show" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
            />
            <label htmlFor="dont-show" className="text-sm font-bold cursor-pointer select-none">
              Não mostrar automaticamente de novo
            </label>
          </div>
          
          <Button 
            className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/25 gap-2"
            onClick={() => {
              if (dontShowAgain) markAsSeen();
              else setShowModal(false);
            }}
          >
            <Check className="w-5 h-5" />
            Já Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
