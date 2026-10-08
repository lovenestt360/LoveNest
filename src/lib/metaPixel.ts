// Meta Pixel — só em páginas públicas/de conversão.
//
// O LoveNest guarda dados íntimos (ciclo, intimidade, humor, conflitos,
// localização). O snippet padrão da Meta dispara PageView automaticamente em
// todas as mudanças de rota de uma SPA e recolhe metadados/cliques da página
// ("autoConfig") — isso enviaria URLs como /ciclo ou /localizacao ao Facebook.
// Aqui o script só é carregado quando o utilizador está numa rota pública, e
// tanto o rastreio automático de rotas como o autoConfig ficam desligados:
// nada é enviado a não ser pelas chamadas explícitas abaixo.

const PIXEL_ID = "1615753683325249";

// Rotas onde o Pixel pode registar PageView.
const PUBLIC_PATHS = new Set([
  "/landing",
  "/inicio",
  "/onboarding",
  "/entrar",
  "/criar-conta",
  "/signup",
  "/confirmar-email",
  "/subscricao",
]);

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;

function ensurePixel() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }

  // Sem PageView automático em pushState e sem recolha automática de
  // metadados/cliques — só enviamos o que chamamos explicitamente.
  window.fbq.disablePushState = true;
  window.fbq("set", "autoConfig", false, PIXEL_ID);
  window.fbq("init", PIXEL_ID);
}

export function isPixelTrackedPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname.replace(/\/+$/, "") || "/");
}

export function trackPageView(pathname: string) {
  if (!isPixelTrackedPath(pathname)) return;
  ensurePixel();
  window.fbq?.("track", "PageView");
}

export function trackPixelEvent(event: "InitiateCheckout" | "CompleteRegistration" | "Lead", params?: Record<string, unknown>) {
  ensurePixel();
  window.fbq?.("track", event, params ?? {});
}
