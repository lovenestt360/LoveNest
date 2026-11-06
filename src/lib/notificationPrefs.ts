import { supabase } from "@/integrations/supabase/client";

/* Interruptores de notificações. A conta manda (push_preferences); o aparelho guarda
   uma cópia para os avisos dentro da app. Os ciclo_lembrete/menstruacao/fertil vão
   para notification_settings, porque são lidos pela smart-notifications. */

export type NotifPrefs = Record<string, boolean>;

const NOTIF_KEY = "lovenest_notif_prefs";
const migratedKey = (userId: string) => `lovenest_notif_prefs_migrated_${userId}`;

export const defaultNotifPrefs: NotifPrefs = {
  chat: true,
  humor: true,
  tarefas: true,
  agenda: true,
  memorias: true,
  oracao: true,
  conflitos: true,
  ciclo_lembrete: false,
  ciclo_menstruacao: false,
  ciclo_fertil: false,
  ciclo_par: true,
};

// Os que a função send-push respeita.
export const PUSH_PREF_KEYS = ["chat", "humor", "tarefas", "agenda", "memorias", "oracao", "conflitos", "ciclo_par"];

export function readNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return { ...defaultNotifPrefs, ...JSON.parse(raw) };
  } catch { /* cópia local inválida: usa os valores por omissão */ }
  return { ...defaultNotifPrefs };
}

export function writeNotifPrefs(prefs: NotifPrefs) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
  } catch { /* sem armazenamento: a conta continua certa */ }
}

export function mutedFromPrefs(prefs: NotifPrefs): string[] {
  return PUSH_PREF_KEYS.filter((key) => prefs[key] === false);
}

export function prefsWithMuted(prefs: NotifPrefs, muted: string[]): NotifPrefs {
  const next = { ...prefs };
  for (const key of PUSH_PREF_KEYS) next[key] = !muted.includes(key);
  return next;
}

export async function saveNotifPrefs(userId: string, prefs: NotifPrefs): Promise<boolean> {
  const { error } = await supabase.from("push_preferences" as any).upsert({
    user_id: userId,
    muted: mutedFromPrefs(prefs),
    updated_at: new Date().toISOString(),
  });
  return !error;
}

// Na primeira vez, junta o que estava desligado neste aparelho ao que já está na conta:
// ninguém volta a receber o que tinha desligado. Depois, a conta atualiza o aparelho.
export async function syncNotifPrefs(userId: string): Promise<NotifPrefs | null> {
  const { data, error } = await supabase
    .from("push_preferences" as any)
    .select("muted")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;

  const local = readNotifPrefs();
  let muted: string[] = (data as any)?.muted ?? [];

  if (localStorage.getItem(migratedKey(userId)) !== "1") {
    muted = [...new Set([...muted, ...mutedFromPrefs(local)])];
    if (!(await saveNotifPrefs(userId, prefsWithMuted(local, muted)))) return null;
    localStorage.setItem(migratedKey(userId), "1");
  }

  const next = prefsWithMuted(local, muted);
  writeNotifPrefs(next);
  return next;
}
