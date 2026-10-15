import { isNativeRuntime } from "@/lib/appRuntime";

/**
 * A app instalada (PWA) pode ficar dias aberta em segundo plano com o código
 * antigo. Quando volta ao ecrã, compara o bundle que está a correr com o que o
 * site serve agora e, se mudou, recarrega para mostrar a versão publicada.
 */
export function watchForNewVersion(): void {
  if (import.meta.env.DEV || isNativeRuntime()) return;

  const running = document
    .querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')
    ?.getAttribute("src");
  if (!running) return;

  let checking = false;
  let lastCheck = 0;

  const check = async () => {
    if (checking || document.visibilityState !== "visible") return;
    // No máximo uma verificação por minuto.
    if (Date.now() - lastCheck < 60_000) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const res = await fetch("/", { cache: "no-store" });
      if (!res.ok) return;
      const latest = (await res.text()).match(/\/assets\/index-[\w-]+\.js/)?.[0];
      if (latest && !running.endsWith(latest)) window.location.reload();
    } catch {
      // Sem rede: fica com a versão atual.
    } finally {
      checking = false;
    }
  };

  document.addEventListener("visibilitychange", check);
}
