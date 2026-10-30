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

    // Raios suaves: cada fio é uma curva por N pontos que derivam devagar até
    // um alvo aleatório; nas pontas o desvio vai a zero.
    const N = 22;
    const FIOS = [
      { amp: 10, width: 1.3, alpha: 0.5 },
      { amp: 7.5, width: 1.4, alpha: 0.7 },
      { amp: 5, width: 1.5, alpha: 0.9 },
      { amp: 3, width: 1.1, alpha: 1, core: true },
    ];
    const fios = FIOS.map(() => Array.from({ length: N }, () => ({ v: Math.random() * 2 - 1, to: Math.random() * 2 - 1 })));
    const draw = (pts: { v: number }[], w: number, amp: number) => {
      const xy = pts.map((p, i) => {
        const t = i / (N - 1);
        return [t * w, MID + p.v * amp * Math.sin(Math.PI * t)] as const;
      });
      ctx.beginPath();
      ctx.moveTo(xy[0][0], xy[0][1]);
      for (let i = 1; i < N - 1; i++) {
        const mx = (xy[i][0] + xy[i + 1][0]) / 2, my = (xy[i][1] + xy[i + 1][1]) / 2;
        ctx.quadraticCurveTo(xy[i][0], xy[i][1], mx, my);
      }
      ctx.lineTo(xy[N - 1][0], xy[N - 1][1]);
      ctx.stroke();
    };

    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const s = live.current;
      const W = wrap.clientWidth, dpr = window.devicePixelRatio || 1;
      s.shown += (s.pos - s.shown) * 0.12;
      const w = W * s.shown;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = H * dpr; canvas.style.width = `${W}px`; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (w < 4) return;
      const boost = 1 + s.storm * 1.4;
      const speed = 0.035 + s.storm * 0.08;
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.shadowColor = s.color;
      FIOS.forEach((f, k) => {
        for (const p of fios[k]) {
          p.v += (p.to - p.v) * speed;
          if (Math.abs(p.to - p.v) < 0.08) p.to = Math.random() * 2 - 1;
        }
        ctx.globalAlpha = f.alpha;
        ctx.lineWidth = f.width;
        ctx.strokeStyle = f.core ? "#fff" : s.color;
        ctx.shadowBlur = f.core ? 4 : 8;
        draw(fios[k], w, f.amp * boost);
      });
      ctx.globalAlpha = 1;
      s.storm = Math.max(0, s.storm - 0.01);
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
      {/* Marcas de fase: um pontinho dentro da barra, sem a cortar. */}
      {Array.from({ length: SPANS - 1 }, (_, k) => {
        const at = (k + 1) / SPANS;
        return (
          <span key={k} className={at < pos ? "absolute top-[11px] -ml-[2px] h-1 w-1 rounded-full bg-white/80" : "absolute top-[11px] -ml-[2px] h-1 w-1 rounded-full bg-[#CFC9C1] dark:bg-white/25"}
            style={{ left: `${at * 100}%` }} />
        );
      })}
      <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0" style={{ height: H }} aria-hidden="true" />
      <span className="absolute top-[13px] -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-white transition-[left,box-shadow] duration-700 ease-out"
        style={{ left: pct, boxShadow: `0 0 0 3px ${color}, 0 0 14px 3px ${color}` }} aria-hidden="true" />
    </div>
  );
}
