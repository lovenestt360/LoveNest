export const REALTIME_NOTIFICATION_KEYS = [
  "chat",
  "humor",
  "plano",
  "memorias",
  "oracao",
  "conflitos",
  "ciclo_par",
  "biblioteca",
  "location",
] as const;

export const CYCLE_NOTIFICATION_KEYS = [
  "ciclo_lembrete",
  "ciclo_menstruacao",
  "ciclo_fertil",
  "ciclo_par",
] as const;

export type RealtimeNotificationKey = typeof REALTIME_NOTIFICATION_KEYS[number];

export type NotificationPreferenceMap = Record<string, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferenceMap = {
  chat: true,
  humor: true,
  plano: true,
  memorias: true,
  oracao: true,
  conflitos: true,
  biblioteca: true,
  location: true,
  ciclo_lembrete: false,
  ciclo_menstruacao: false,
  ciclo_fertil: false,
  ciclo_par: false,
};

export const NOTIFICATION_PREFS_STORAGE_KEY = "lovenest_notif_prefs";

export function normalizeLegacyNotificationPrefs(
  raw: NotificationPreferenceMap | null | undefined,
): NotificationPreferenceMap {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(raw ?? {}) };

  // Before UX V2, Plano was split between "tarefas" and "agenda".
  // Preserve an explicit opt-out from either legacy switch during migration.
  if (raw && raw.plano === undefined) {
    const legacyTask = raw.tarefas;
    const legacyAgenda = raw.agenda;
    if (legacyTask === false || legacyAgenda === false) prefs.plano = false;
  }

  return prefs;
}

export function loadCachedNotificationPrefs(): NotificationPreferenceMap {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    return normalizeLegacyNotificationPrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function cacheNotificationPrefs(prefs: NotificationPreferenceMap) {
  try {
    localStorage.setItem(
      NOTIFICATION_PREFS_STORAGE_KEY,
      JSON.stringify(normalizeLegacyNotificationPrefs(prefs)),
    );
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function mergeServerNotificationPrefs(
  current: NotificationPreferenceMap,
  rows: Array<{ category: string; enabled: boolean }> | null | undefined,
): NotificationPreferenceMap {
  const next = normalizeLegacyNotificationPrefs(current);

  for (const row of rows ?? []) {
    if (
      REALTIME_NOTIFICATION_KEYS.includes(row.category as RealtimeNotificationKey) ||
      CYCLE_NOTIFICATION_KEYS.includes(row.category as any)
    ) {
      next[row.category] = row.enabled !== false;
    }
  }

  return next;
}

export function pushTypeToPreferenceCategory(type: string | null | undefined): string | null {
  switch (type) {
    case "chat":
      return "chat";
    case "humor":
      return "humor";
    case "tarefas":
    case "agenda":
    case "routine":
    case "plano":
      return "plano";
    case "memorias":
      return "memorias";
    case "oracao":
      return "oracao";
    case "conflitos":
      return "conflitos";
    case "ciclo_par":
      return "ciclo_par";
    case "biblioteca":
      return "biblioteca";
    case "location":
      return "location";
    default:
      return null;
  }
}
