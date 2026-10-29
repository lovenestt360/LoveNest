import { useEffect, useRef } from "react";
import { STREAK_LEVELS, getStreakLevel, type GuardianStage } from "./journeyLevels";

// Cor de cada fase do Guardião — a barra acende toda na cor da fase atual.
const STAGE_COLOR: Record<GuardianStage, string> = {
  faisca: "#FF5C93", brasa: "#FF8B3D", chama: "#14B8A6", guardiao: "#3B82E5",
  sentinela: "#9B5DE5", eterno: "#E0A915", soberano: "#9B5DE5",
};

// Faísca → Eterno, cada fase com a mesma largura (o Soberano é o fim da barra cheia).
const MARKS = STREAK_LEVELS.slice(0, 6);
const SPANS = MARKS.length - 1;
const SEEN_KEY = "ln_journey_level";
const H = 26;
const MID = 13;

function positionOf(days: number) {
  let i = 0;
  MARKS.forEach((m, k) => { if (days >= m.minDays) i = k; });
  const next = MARKS[i + 1];
  return next ? (i + (days - MARKS[i].minDays) / (next.minDays - MARKS[i].minDays)) / SPANS : 1;
}

/** Barra contínua da jornada: a parte feita acende na cor do Guardião, com raios a tremer. */
export function JourneyBar({ days }: { days: number }) {
  const phase = getStreakLevel(days);
  const color = STAGE_COLOR[phase.stage];
  const pos = positionOf(days);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ pos, color, shown: 0, storm: 0 });
  live.current.pos = pos;
  live.current.color = color;

  // Subida de nível: a primeira vez que a fase nova aparece, a tempestade de raios cresce.
  useEffect(() => {
    try {
      const seen = Number(localStorage.getItem(SEEN_KEY) ?? 0);
      if (seen && phase.level > seen) {
        live.current.storm = 1;
        try { navigator.vibrate?.([12, 40, 12]); } catch {}
      }
      localStorage.setItem(SEEN_KEY, String(phase.level));
    } catch {}
  }, [phase.level]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current, wrap = wrapRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !wrap || !ctx) return;

    const bolt = (w: number, amp: number, step: number) => {
      const pts: [number, number][] = [[0, MID]];
      for (let x = step; x < w; x += step * (0.6 + Math.random() * 0.8)) pts.push([x, MID + (Math.random() * 2 - 1) * amp]);
      pts.push([w, MID]);
      return pts;
    };
    const stroke = (pts: [number, number][], width: number, c: string, glow: string) => {
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineWidth = width; ctx.strokeStyle = c; ctx.shadowBlur = 7; ctx.shadowColor = glow; ctx.lineJoin = "round";
      ctx.stroke();
    };

    let raf = 0, last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 75 || document.hidden) return;
      last = t;
      const s = live.current;
      const W = wrap.clientWidth, dpr = window.devicePixelRatio || 1;
      s.shown += (s.pos - s.shown) * 0.35;
      const w = W * s.shown;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = H * dpr; canvas.style.width = `${W}px`; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (w < 4) return;
      const boost = 1 + s.storm * 1.6;
      const lines = 4 + Math.round(s.storm * 3);
      for (let k = 0; k < lines; k++) stroke(bolt(w, (3 + k * 1.6) * boost, 7 + k * 2), 1.6, s.color, s.color);
      stroke(bolt(w, 2.5 * boost, 6), 1.1, "#fff", s.color);
      // Faíscas a saltar da ponta.
      for (let k = 0; k < 2 + s.storm * 6; k++) {
        const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * (6 + s.storm * 10);
        stroke([[w, MID], [w + Math.cos(a) * r * 0.5 + (Math.random() - 0.5) * 3, MID + Math.sin(a) * r * 0.5], [w + Math.cos(a) * r, MID + Math.sin(a) * r]],
          1, k % 2 ? "#fff" : s.color, s.color);
      }
      s.storm = Math.max(0, s.storm - 0.04);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = `${pos * 100}%`;
  return (
    <div ref={wrapRef} className="relative mt-3" style={{ height: H }}
      role="progressbar" aria-label={`Jornada: ${phase.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos * 100)}>
      <div className="absolute inset-x-0 top-[10px] h-[6px] rounded-full bg-[#EEEAE5] dark:bg-white/10" />
      <div className="absolute left-0 top-[10px] h-[6px] rounded-full transition-[width,background-color,box-shadow] duration-700 ease-out"
        style={{ width: pct, background: color, boxShadow: `0 0 10px ${color}` }} />
      {/* Marcas de fase: pequenos cortes na barra. */}
      {Array.from({ length: SPANS - 1 }, (_, k) => (
        <span key={k} className="absolute top-[9px] -ml-[1.5px] h-2 w-[3px] rounded-sm bg-white dark:bg-card" style={{ left: `${((k + 1) / SPANS) * 100}%` }} />
      ))}
      <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0" style={{ height: H }} aria-hidden="true" />
      <span className="absolute top-[13px] -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-white transition-[left,box-shadow] duration-700 ease-out"
        style={{ left: pct, boxShadow: `0 0 0 3px ${color}, 0 0 14px 3px ${color}` }} aria-hidden="true" />
    </div>
  );
}
