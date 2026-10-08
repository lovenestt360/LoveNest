import { describe, it, expect, beforeEach, vi } from "vitest";

const pixelScripts = () =>
  Array.from(document.querySelectorAll("script")).filter((s) => s.src.includes("connect.facebook.net"));

describe("metaPixel", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    delete window.fbq;
    delete window._fbq;
  });

  it("só considera rastreáveis as rotas públicas", async () => {
    const { isPixelTrackedPath } = await import("./metaPixel");
    expect(isPixelTrackedPath("/landing")).toBe(true);
    expect(isPixelTrackedPath("/inicio")).toBe(true);
    expect(isPixelTrackedPath("/subscricao/")).toBe(true);
    for (const p of ["/", "/ciclo", "/chat", "/humor", "/conflitos", "/localizacao", "/memorias", "/admin"]) {
      expect(isPixelTrackedPath(p)).toBe(false);
    }
  });

  it("não carrega o script nem envia nada em páginas privadas", async () => {
    const { trackPageView } = await import("./metaPixel");
    trackPageView("/ciclo");
    trackPageView("/localizacao/historico");
    expect(window.fbq).toBeUndefined();
    expect(pixelScripts()).toHaveLength(0);
  });

  it("carrega uma vez e regista PageView em página pública, com autoConfig e pushState desligados", async () => {
    const { trackPageView } = await import("./metaPixel");
    trackPageView("/landing");
    trackPageView("/inicio");
    expect(pixelScripts()).toHaveLength(1);
    expect(window.fbq?.disablePushState).toBe(true);

    const calls = (window.fbq!.queue as unknown[][]).map((c) => Array.from(c));
    expect(calls[0]).toEqual(["set", "autoConfig", false, "1615753683325249"]);
    expect(calls[1]).toEqual(["init", "1615753683325249"]);
    expect(calls.filter((c) => c[0] === "track" && c[1] === "PageView")).toHaveLength(2);
  });
});
