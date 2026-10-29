// O carinho que ele manda a partir do Ciclo. Vai como mensagem normal do Chat
// (fica na conversa); o Ciclo reconhece-a pela primeira linha para a mostrar
// a ela num cartão próprio, com resposta num toque.
import { supabase } from "@/integrations/supabase/client";
import type { CycleIconKind } from "./cycleIconsSvg";

export const CARE: { id: string; icon: CycleIconKind; label: string; text: string }[] = [
  { id: "cha", icon: "cha", label: "Chá quente", text: "Vou preparar-te um chá quente." },
  { id: "abraco", icon: "abraco", label: "Um abraço", text: "Um abraço apertado para ti." },
  { id: "chocolate", icon: "desejos", label: "Chocolate", text: "Tenho um chocolate guardado para ti." },
  { id: "jantar", icon: "jantar", label: "Eu faço o jantar", text: "Hoje eu trato do jantar. Descansa." },
  { id: "flor", icon: "flor", label: "Uma flor", text: "Uma flor para alegrar o teu dia." },
  { id: "aqui", icon: "casal", label: "Estou aqui", text: "Estou aqui contigo. Se precisares de alguma coisa, é só dizeres." },
];

export const THANKS = "Obrigada, amor";
export const NOTE_MAX = 120;

/** O gesto e, se houver, a frase dele na linha de baixo. */
export const careMessage = (text: string, note: string) => {
  const n = note.trim().slice(0, NOTE_MAX);
  return n ? `${text}\n“${n}”` : text;
};

export function parseCare(content: string) {
  const [first, ...rest] = content.split("\n");
  const care = CARE.find((c) => c.text === first.trim());
  if (!care) return null;
  const note = rest.join(" ").trim().replace(/^“|”$/g, "").trim();
  return { care, note: note || null };
}

export type ParsedCare = NonNullable<ReturnType<typeof parseCare>>;

export interface CareMessage { id: string; created_at: string; sender_user_id: string; content: string }

/** O último carinho de `fromUser` nas últimas 24 h e a primeira mensagem do outro depois dele. */
export async function latestCare(spaceId: string, fromUser: string, toUser: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase.from("messages").select("id, created_at, sender_user_id, content")
    .eq("couple_space_id", spaceId).eq("sender_user_id", fromUser).eq("is_deleted", false)
    .gte("created_at", since).order("created_at", { ascending: false }).limit(30);
  const msg = ((data as CareMessage[] | null) ?? []).find((m) => parseCare(m.content));
  if (!msg) return null;
  const { data: after } = await supabase.from("messages").select("id, created_at, sender_user_id, content")
    .eq("couple_space_id", spaceId).eq("sender_user_id", toUser).eq("is_deleted", false)
    .gt("created_at", msg.created_at).order("created_at", { ascending: true }).limit(1);
  return { msg, parsed: parseCare(msg.content)!, reply: ((after as CareMessage[] | null) ?? [])[0] ?? null };
}

/** "agora", "há 5 min", "há 3 h" */
export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  return `há ${Math.round(m / 60)} h`;
}
