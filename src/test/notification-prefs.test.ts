import { describe, expect, it } from "vitest";
import { defaultNotifPrefs, mutedFromPrefs, prefsWithMuted } from "@/lib/notificationPrefs";

describe("preferências de notificações", () => {
  it("por omissão não há nada desligado", () => {
    expect(mutedFromPrefs(defaultNotifPrefs)).toEqual([]);
  });

  it("os lembretes do ciclo não contam como avisos do par", () => {
    const muted = mutedFromPrefs({ ...defaultNotifPrefs, ciclo_lembrete: false, chat: false });
    expect(muted).toEqual(["chat"]);
  });

  it("aplicar a lista da conta mantém os lembretes do ciclo", () => {
    const next = prefsWithMuted({ ...defaultNotifPrefs, ciclo_fertil: true, humor: false }, ["chat"]);
    expect(next.chat).toBe(false);
    expect(next.humor).toBe(true);
    expect(next.ciclo_fertil).toBe(true);
  });
});
