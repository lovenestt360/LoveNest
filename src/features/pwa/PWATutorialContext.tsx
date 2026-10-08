import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { isNativeRuntime, isStandaloneWebApp } from "@/lib/appRuntime";

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

  const nativeRuntime = isNativeRuntime();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isStandalone = isStandaloneWebApp();

  const fetchSettings = useCallback(async () => {
    if (nativeRuntime) {
      setSettings(null);
      setLoading(false);
      setShowModal(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pwa_tutorial_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (!error && data) {
        setSettings(data);
        
        // Auto-show only for authenticated users — never on landing/public pages
        const hasSeen = localStorage.getItem("pwa_tutorial_seen") === "true";
        if (data.is_enabled && !hasSeen && !isStandalone && user) {
          setTimeout(() => setShowModal(true), 3500);
        }
      }
    } catch (err) {
      console.error("Error fetching PWA settings:", err);
    } finally {
      setLoading(false);
    }
  }, [isStandalone, nativeRuntime, user]);

  useEffect(() => {
    fetchSettings();

    if (nativeRuntime) {
      setInstallPrompt(null);
      return;
    }

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [fetchSettings, nativeRuntime]);

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
