import { useId } from "react";
import { cn } from "@/lib/utils";
import { moodFaceSvg, sleepMoonSvg, ACTIVITY_ART } from "./moodArtSvg";

// Os SVG usam gradientes com id; cada instância precisa do seu prefixo.
const prefix = (id: string) => "m" + id.replace(/[^a-zA-Z0-9]/g, "");

/** A Faísca a sentir o humor `mood` (feliz, tranquilo, apaixonado…). */
export function MoodFace({ mood, size = 40, className }: { mood: string; size?: number; className?: string }) {
  const id = useId();
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: moodFaceSvg(mood, size, prefix(id)) }}
    />
  );
}

const SLEEP_LEVEL: Record<string, 0 | 1 | 2 | 3> = { mau: 0, ok: 1, bom: 2, excelente: 3 };

/** Céu noturno: mais claro e estrelado quanto melhor o sono. */
export function SleepMoon({ quality, size = 40, className }: { quality: string; size?: number; className?: string }) {
  const id = useId();
  const level = SLEEP_LEVEL[quality] ?? 1;
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: sleepMoonSvg(level, size, prefix(id)) }}
    />
  );
}

/** Glifo branco num quadradinho colorido, como os ícones do iPhone. */
export function ActivityTile({ activity, size = 22 }: { activity: string; size?: number }) {
  const art = ACTIVITY_ART[activity];
  if (!art) return null;
  const [from, to] = art.colors;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_5px_-2px_rgba(0,0,0,0.35)]"
      style={{ width: size, height: size, background: `linear-gradient(160deg, ${from}, ${to})` }}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        fill="none"
        stroke="#fff"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: art.path }}
      />
    </span>
  );
}
