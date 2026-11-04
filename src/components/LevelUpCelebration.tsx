import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Flame, Share } from "lucide-react";
import { STAGE_ASSETS, STAGE_COLORS } from "@/components/FlamePet";
import { levelToStage } from "@/types/flame";
import { STREAK_LEVELS, getStreakLevel } from "@/features/streak/journeyLevels";
import { hapticCelebrate, hapticLight } from "@/lib/haptic";
import { centerIn, createParticles, prefersReducedMotion, type Particles } from "@/components/celebration/particles";
import "@/components/celebration/celebration.css";

// Texto emocional por fase — cria ligação com a progressão do casal
const LEVEL_SUBTITLE: Record<number, string> = {
  1: "A primeira faísca do vosso amor foi acesa.",
  2: "O vosso cuidado fez a chama crescer.",
  3: "A chama está mais viva do que nunca.",
  4: "O Guardião está a tornar-se mais forte convosco.",
  5: "A vossa dedicação criou algo especial.",
  6: "O amor de vocês está a transformar-se em lenda.",
  7: "Atingiram a forma suprema. O vosso amor é eterno.",
};

const SPARKS: [number, number][] = [[-96, -70], [92, -80], [-118, 18], [116, 6], [-72, 96], [74, 92], [-26, -120], [36, -116]];
const SPARKLE = "M12 1.5l2.4 7.1 7.1 2.4-7.1 2.4L12 20.5l-2.4-7.1L2.5 11l7.1-2.4z";

function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function darker(hex: string, k = 0.72) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

interface Props {
  show: boolean;
  /** Fase nova do Guardião (1–7). */
  newLevel: number;
  /** Última fase que esta pessoa já tinha celebrado. */
  prevLevel: number;
  /** Dias seguidos de streak agora. */
  days: number;
  /** Quem manteve a chama (um nome no modo solo, dois no casal). */
  names: string[];
  onClose: () => void;
}

/** "A vossa chama evoluiu!": a fase anterior carrega e transforma-se na nova. */
export function LevelUpCelebration({ show, newLevel, prevLevel, days, names, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fx = useRef<Particles | null>(null);
  const [phase, setPhase] = useState(0);
  const [shownDays, setShownDays] = useState(Math.max(0, days - 1));
  const [leaving, setLeaving] = useState(false);

  const prev = STREAK_LEVELS.find((l) => l.level === prevLevel) ?? STREAK_LEVELS[0];
  const next = STREAK_LEVELS.find((l) => l.level === newLevel) ?? STREAK_LEVELS[1];
  const fromStage = levelToStage(prev.level);
  const toStage = levelToStage(next.level);
  const fromColor = STAGE_COLORS[fromStage];
  const toColor = STAGE_COLORS[toStage];
  const progress = getStreakLevel(days);
  const solo = names.length < 2;

  // Anel: quanto do caminho até esta fase já estava feito antes de hoje
  const span = Math.max(1, next.minDays - prev.minDays);
  const startFrac = Math.min(0.92, Math.max(0.1, (days - 1 - prev.minDays) / span));

  // Bloqueia o scroll por trás
  useEffect(() => {
    if (!show) return;
    const html = document.documentElement.style.overflow;
    const body = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = html;
      document.body.style.overflow = body;
    };
  }, [show]);

  // A sequência
  useEffect(() => {
    if (!show) return;
    setLeaving(false);
    setPhase(0);
    setShownDays(Math.max(0, days - 1));
    if (prefersReducedMotion()) {
      setShownDays(days);
      setPhase(8);
      return;
    }
    const canvas = canvasRef.current;
    fx.current = canvas ? createParticles(canvas) : null;
    const center = () => (rootRef.current && stageRef.current ? centerIn(rootRef.current, stageRef.current) : [window.innerWidth / 2, window.innerHeight * 0.34]);
    const ids: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => ids.push(setTimeout(fn, ms));

    at(250, () => setPhase(1));                                   // a fase anterior aparece
    at(1000, () => { setPhase(2); setShownDays(days); hapticLight(); }); // o número sobe, o anel fecha
    at(1250, () => setPhase(3));                                  // visto no primeiro
    at(1450, () => setPhase(4));                                  // visto no segundo
    at(2000, () => {                                              // carga
      setPhase(5);
      const [x, y] = center();
      fx.current?.implode(x, y, { colors: [rgba(fromColor, 1), "#FFFFFF", rgba(fromColor, 0.6)] });
    });
    at(2900, () => {                                              // evolução
      setPhase(6);
      hapticCelebrate();
      const [x, y] = center();
      fx.current?.burst(x, y, { n: 70, colors: [toColor, rgba(toColor, 0.7), "#FFFFFF", "#FDE68A", "#FB7185"], speed: 9.5 });
    });
    at(3900, () => setPhase(7));                                  // o que mudou
    at(4700, () => setPhase(8));                                  // botões

    return () => {
      ids.forEach(clearTimeout);
      fx.current?.destroy();
      fx.current = null;
    };
  }, [show, days, fromColor, toColor]);

  if (!show) return null;

  const close = () => {
    setLeaving(true);
    setTimeout(onClose, 280);
  };

  const shareText = `A nossa chama evoluiu para ${next.name} no LoveNest. ${days} dias seguidos juntos.`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const cls = [
    "lu-root",
    phase >= 1 && "lu-p1",
    phase >= 2 && "lu-p2",
    phase === 5 && "lu-charge",
    phase >= 6 && "lu-evolve",
    phase >= 7 && "lu-text-on",
    phase >= 8 && "lu-btns-on",
    leaving && "lu-leaving",
  ].filter(Boolean).join(" ");

  const style = {
    "--lu-from": fromColor,
    "--lu-from-a": rgba(fromColor, 0.35),
    "--lu-to": toColor,
    "--lu-to-a": rgba(toColor, 0.45),
    "--lu-to-deep": darker(toColor),
    background: `radial-gradient(120% 70% at 50% 34%, ${rgba(phase >= 6 ? toColor : fromColor, phase >= 6 ? 0.22 : 0.16)}, transparent 62%), rgba(4,6,8,0.9)`,
  } as React.CSSProperties;

  return createPortal(
    <div ref={rootRef} className={cls} style={style} role="dialog" aria-modal="true" aria-label="A vossa chama evoluiu">
      <canvas ref={canvasRef} className="lu-fx" aria-hidden="true" />

      <div ref={stageRef} className="lu-stage">
        <div className="lu-halo" />
        <svg className="lu-ring" viewBox="0 0 220 220" aria-hidden="true">
          <circle className="lu-track" cx="110" cy="110" r="102" />
          <circle className="lu-fill" cx="110" cy="110" r="102" style={{ strokeDashoffset: 641 * (1 - startFrac) }} />
        </svg>
        <div className="lu-shock a" />
        <div className="lu-shock b" />
        <img className="lu-pet lu-old" src={STAGE_ASSETS[fromStage]} alt={`Guardião na fase ${prev.name}`} />
        <img className="lu-pet lu-new" src={STAGE_ASSETS[toStage]} alt={`Guardião na fase ${next.name}`} />
        {SPARKS.map(([x, y], i) => (
          <svg
            key={i}
            className="lu-spark"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{
              "--x": `${x}px`, "--y": `${y}px`,
              width: 12 + (i % 3) * 5, height: 12 + (i % 3) * 5,
              marginLeft: -(6 + (i % 3) * 2.5), marginTop: -(6 + (i % 3) * 2.5),
              animationDelay: `${0.15 + i * 0.05}s`,
              color: i % 2 ? "#fff" : toColor,
            } as React.CSSProperties}
          >
            <path fill="currentColor" d={SPARKLE} />
          </svg>
        ))}
      </div>

      <div className="lu-count" aria-hidden={phase >= 6}>
        <b key={shownDays} className={phase >= 2 ? "lu-tick" : undefined}>{shownDays}</b>
        <span>{solo ? "dias seguidos" : "dias seguidos juntos"}</span>
        <div className="lu-both">
          {names.map((n, i) => (
            <span key={n + i} className={`lu-who${phase >= 3 + i ? " lu-ok" : ""}`}>
              <i style={{ background: i === 0 ? "#FF4F7B" : "#60A5FA" }}>{n.trim().charAt(0).toUpperCase()}</i>
              {n}
              <Check strokeWidth={3.2} />
            </span>
          ))}
        </div>
      </div>

      <div className="lu-text" aria-live="polite">
        <p className="lu-title"><Flame className="w-[22px] h-[22px]" strokeWidth={2} />A vossa chama evoluiu!</p>
        <div>
          <span className="lu-from">
            <img src={STAGE_ASSETS[fromStage]} alt="" />{prev.name}
            <ArrowRight className="w-3.5 h-3.5" style={{ color: toColor }} strokeWidth={2.6} />
            <img src={STAGE_ASSETS[toStage]} alt="" /><b>{next.name}</b>
          </span>
        </div>
        <p className="lu-sub">
          {days} dias seguidos{solo ? "" : ", os dois"}. {LEVEL_SUBTITLE[newLevel] ?? "Continuem assim. O Guardião está a ficar mais forte."}
        </p>
        {progress.nextLevelName && progress.daysToNext !== null ? (
          <div className="lu-next">
            <div className="lu-next-row">
              <span>Próxima: <b>{progress.nextLevelName}</b></span>
              <span>{progress.daysToNext === 1 ? "falta 1 dia" : `faltam ${progress.daysToNext} dias`}</span>
            </div>
            <div className="lu-bar"><i style={{ width: phase >= 7 ? `${Math.max(4, progress.progressPct)}%` : 0 }} /></div>
          </div>
        ) : (
          <div className="lu-next"><div className="lu-next-row"><span>Chegaram à <b>forma suprema</b> do Guardião.</span></div></div>
        )}
      </div>

      <div className="lu-btns">
        {canShare && (
          <button
            type="button"
            className="lu-share"
            aria-label="Partilhar"
            onClick={() => navigator.share({ text: shareText }).catch(() => {})}
          >
            <Share className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
        )}
        <button type="button" className="lu-continue" onClick={close}>Continuar</button>
      </div>

      <div className="lu-white" />
    </div>,
    document.body,
  );
}
