import React, { useState } from "react";
import { usePWATutorial } from "./PWATutorialContext";
import { X, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PWATutorialModal() {
  const { showModal, setShowModal, settings, isIOS, markAsSeen } = usePWATutorial();
  const [activePlatform, setActivePlatform] = useState<"android" | "ios">(isIOS ? "ios" : "android");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!showModal || !settings) return null;

  const videoUrl = activePlatform === "android" ? settings.android_video_url : settings.ios_video_url;
  const tip = activePlatform === "android"
    ? "No Chrome, toca nos 3 pontos → 'Instalar Aplicativo'."
    : "No Safari, toca em 'Partilhar' → 'Adicionar ao Ecrã Principal'.";

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setShowModal(false)}
      />

      {/* Modal — sempre centrado, largura fixa */}
      <div className="relative w-full max-w-[360px] bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col">

        {/* ── HEADER ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-black tracking-tight gradient-text">Instalar App ✨</h2>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Segue o guia para o teu telemóvel
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── TABS ─────────────────────────────────────── */}
        <div className="px-5 pb-3">
          <div className="flex p-1 bg-muted/60 rounded-xl gap-1">
            {(["android", "ios"] as const).map(p => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                  activePlatform === p
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p === "android" ? "Android" : "iPhone"}
              </button>
            ))}
          </div>
        </div>

        {/* ── VÍDEO — ocupa toda a largura, altura automática ── */}
        <div className="w-full bg-black flex items-center justify-center">
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              className="w-full max-h-[52vh] object-contain block"
              controls
              playsInline
              loop
              autoPlay
              muted
            />
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-3 text-white/40 py-16">
              <Smartphone className="w-12 h-12" />
              <p className="text-xs font-bold text-center px-8">
                Tutorial em breve para {activePlatform === "android" ? "Android" : "iPhone"}.
              </p>
            </div>
          )}
        </div>

        {/* ── TIP ──────────────────────────────────────── */}
        <div className="mx-5 mt-4 px-4 py-3 bg-primary/8 rounded-2xl border border-primary/10">
          <p className="text-[11px] font-bold text-foreground/80 leading-relaxed text-center">
            {tip}
          </p>
        </div>

        {/* ── FOOTER ───────────────────────────────────── */}
        <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
          <label className="flex items-center justify-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <span className="text-[11px] font-bold text-muted-foreground">
              Não mostrar automaticamente
            </span>
          </label>

          <Button
            className="w-full h-12 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 gap-2"
            onClick={() => {
              if (dontShowAgain) markAsSeen();
              else setShowModal(false);
            }}
          >
            <Check className="w-4 h-4" />
            Já Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
