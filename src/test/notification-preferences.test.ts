import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  mergeServerNotificationPrefs,
  normalizeLegacyNotificationPrefs,
  pushTypeToPreferenceCategory,
} from "@/lib/notificationPreferences";

describe("notification preferences", () => {
  it("migrates legacy tarefas/agenda opt-outs to Plano", () => {
    expect(normalizeLegacyNotificationPrefs({ tarefas: false }).plano).toBe(false);
    expect(normalizeLegacyNotificationPrefs({ agenda: false }).plano).toBe(false);
    expect(normalizeLegacyNotificationPrefs({ tarefas: true, agenda: true }).plano).toBe(true);
  });

  it("keeps an explicit V2 Plano preference authoritative", () => {
    expect(
      normalizeLegacyNotificationPrefs({
        plano: true,
        tarefas: false,
        agenda: false,
      }).plano,
    ).toBe(true);
  });

  it("merges account-level settings over the local defaults", () => {
    const merged = mergeServerNotificationPrefs(DEFAULT_NOTIFICATION_PREFS, [
      { category: "chat", enabled: false },
      { category: "plano", enabled: false },
      { category: "engagement", enabled: false },
    ]);

    expect(merged.chat).toBe(false);
    expect(merged.plano).toBe(false);
    expect(merged.humor).toBe(true);
    expect(merged.engagement).toBeUndefined();
  });

  it("maps old and new immediate push types to the same preference", () => {
    expect(pushTypeToPreferenceCategory("tarefas")).toBe("plano");
    expect(pushTypeToPreferenceCategory("agenda")).toBe("plano");
    expect(pushTypeToPreferenceCategory("routine")).toBe("plano");
    expect(pushTypeToPreferenceCategory("plano")).toBe("plano");
    expect(pushTypeToPreferenceCategory("chat")).toBe("chat");
    expect(pushTypeToPreferenceCategory("unknown")).toBeNull();
  });
});
