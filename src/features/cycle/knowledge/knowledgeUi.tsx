// Peças do Centro de Conhecimento (maqueta docs/mockups/conhecimento-proposta.html).
import { FeatureGlyph, type GlyphKind } from "@/features/home/FeatureIcon";
import { cn } from "@/lib/utils";
import { CycleIcon } from "../CycleIcon";
import type { CycleIconKind } from "../cycleIconsSvg";

type TopicIcon = { glyph: GlyphKind } | { icon: CycleIconKind };

/** Nome curto, desenho e fundo suave de cada tema. */
export const TOPICS: Record<string, { short: string; art: TopicIcon; tint: string; chip: string }> = {
  ciclo:       { short: "O ciclo",         art: { icon: "ciclo" },       tint: "bg-[#F7F5F2] dark:bg-muted",         chip: "bg-[#F4F1EC] text-[#3A4150] dark:bg-muted dark:text-foreground/80" },
  menstruacao: { short: "Menstruação",     art: { glyph: "menstrual" },  tint: "bg-[#FDECEF] dark:bg-rose-950/40",   chip: "bg-[#FDECEF] text-[#C92D52] dark:bg-rose-950/40 dark:text-rose-300" },
  folicular:   { short: "Folicular",       art: { glyph: "folicular" },  tint: "bg-[#E9F5FC] dark:bg-sky-950/40",    chip: "bg-[#E9F5FC] text-[#176796] dark:bg-sky-950/40 dark:text-sky-300" },
  ovulacao:    { short: "Ovulação",        art: { glyph: "ovulacao" },   tint: "bg-[#FFF4DA] dark:bg-amber-950/40",  chip: "bg-[#FFF4DA] text-[#8A5A06] dark:bg-amber-950/40 dark:text-amber-300" },
  luteal:      { short: "Lútea e TPM",     art: { glyph: "lutea" },      tint: "bg-[#F1EDFE] dark:bg-violet-950/40", chip: "bg-[#F1EDFE] text-[#6B4FD8] dark:bg-violet-950/40 dark:text-violet-300" },
  fertilidade: { short: "Fertilidade",     art: { icon: "fertil" },      tint: "bg-[#EEF8F1] dark:bg-emerald-950/40", chip: "bg-[#EEF8F1] text-[#23733F] dark:bg-emerald-950/40 dark:text-emerald-300" },
  saude:       { short: "Saúde íntima",    art: { icon: "intima" },      tint: "bg-[#FDECEF] dark:bg-rose-950/40",   chip: "bg-[#FDECEF] text-[#C92D52] dark:bg-rose-950/40 dark:text-rose-300" },
  emocoes:     { short: "Emoções e humor", art: { icon: "sensivel" },    tint: "bg-[#E9F5FC] dark:bg-sky-950/40",    chip: "bg-[#E9F5FC] text-[#176796] dark:bg-sky-950/40 dark:text-sky-300" },
  gravidez:    { short: "Gravidez",        art: { icon: "gravidez" },    tint: "bg-[#F7F5F2] dark:bg-muted",         chip: "bg-[#F4F1EC] text-[#3A4150] dark:bg-muted dark:text-foreground/80" },
  faq:         { short: "Perguntas",       art: { icon: "pergunta" },    tint: "bg-[#F7F5F2] dark:bg-muted",         chip: "bg-[#F4F1EC] text-[#3A4150] dark:bg-muted dark:text-foreground/80" },
};

export const topicOf = (categoryId: string) => TOPICS[categoryId] ?? TOPICS.ciclo;

/** O desenho de um tema num quadrado suave. */
export function TopicTile({ categoryId, size = 40, tinted, className }: { categoryId: string; size?: number; tinted?: boolean; className?: string }) {
  const t = topicOf(categoryId);
  const inner = Math.round(size * 0.66);
  return (
    <span className={cn("grid shrink-0 place-items-center", tinted ? t.tint : "bg-[#F7F5F2] dark:bg-muted", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}>
      {"glyph" in t.art ? <FeatureGlyph kind={t.art.glyph} size={inner} /> : <CycleIcon kind={t.art.icon} size={inner} />}
    </span>
  );
}

// ── Guardados e lidos (só neste aparelho) ────────────────────────────────────
function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}
function writeSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch { /* sem armazenamento */ }
}
export const FAV_KEY = "kc_favs";
export const READ_KEY = "kc_read";
export const getFavs = () => readSet(FAV_KEY);
export const getRead = () => readSet(READ_KEY);
export function toggleFav(id: string): Set<string> {
  const s = getFavs();
  if (s.has(id)) s.delete(id); else s.add(id);
  writeSet(FAV_KEY, s);
  return s;
}
export function markRead(id: string) {
  const s = getRead();
  if (!s.has(id)) { s.add(id); writeSet(READ_KEY, s); }
}

/** Botão de guardar (marcador). */
export function SaveButton({ saved, onClick, size = 40 }: { saved: boolean; onClick: (e: React.MouseEvent) => void; size?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={saved} aria-label={saved ? "Tirar dos guardados" : "Guardar"}
      className="grid shrink-0 place-items-center rounded-full transition-transform active:scale-90"
      style={{ width: size, height: size }}>
      <CycleIcon kind={saved ? "guardado" : "guardar"} size={20} />
    </button>
  );
}
