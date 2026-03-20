import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

interface PWASettings {
  android_video_url: string;
  ios_video_url: string;
  is_enabled: boolean;
}

interface PWATutorialContextType {
  settings: PWASettings | null;
  loading: boolean;
  installPrompt: any;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  markAsSeen: () => void;
  isIOS: boolean;
  isAndroid: boolean;
}

const PWATutorialContext = createContext<PWATutorialContextType | undefined>(undefined);

export function PWATutorialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PWASettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pwa_tutorial_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (!error && data) {
        setSettings(data);
        
        // Auto-show logic
        const hasSeen = localStorage.getItem("pwa_tutorial_seen") === "true";
        if (data.is_enabled && !hasSeen && user) {
          // Delay a bit to wait for splash/login transition
          setTimeout(() => setShowModal(true), 1500);
        }
      }
    } catch (err) {
      console.error("Error fetching PWA settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [fetchSettings]);

  const markAsSeen = () => {
    localStorage.setItem("pwa_tutorial_seen", "true");
    setShowModal(false);
  };

  return (
    <PWATutorialContext.Provider
      value={{
        settings,
        loading,
        installPrompt,
        showModal,
        setShowModal,
        markAsSeen,
        isIOS,
        isAndroid,
      }}
    >
      {children}
    </PWATutorialContext.Provider>
  );
}

export function usePWATutorial() {
  const context = useContext(PWATutorialContext);
  if (context === undefined) {
    throw new Error("usePWATutorial must be used within a PWATutorialProvider");
  }
  return context;
}
