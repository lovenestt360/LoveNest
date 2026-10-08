export type AppRuntimePlatform = "web" | "ios" | "android" | "native";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function capacitorBridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  return ((window as any).Capacitor as CapacitorBridge | undefined) ?? null;
}

export function isNativeRuntime(): boolean {
  const bridge = capacitorBridge();
  return bridge?.isNativePlatform?.() === true;
}

export function getRuntimePlatform(): AppRuntimePlatform {
  const bridge = capacitorBridge();
  if (!bridge?.isNativePlatform?.()) return "web";

  const platform = bridge.getPlatform?.();
  if (platform === "ios" || platform === "android") return platform;
  return "native";
}

export function isStandaloneWebApp(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function shouldShowPwaInstallUi(): boolean {
  return !isNativeRuntime() && !isStandaloneWebApp();
}
