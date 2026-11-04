/**
 * Faíscas, corações e pontos de luz desenhados num <canvas> (celebrações).
 * Caem com peso e desaparecem; "implode" puxa luzes para um ponto (carga).
 */

const HEART = "M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.6a4.3 4.3 0 017.5 2.9c0 5.4-7.5 10-7.5 10z";

type Shape = "heart" | "spark" | "dot";

interface Particle {
  x: number; y: number; vx: number; vy: number; g: number;
  rot: number; vr: number; size: number; color: string; shape: Shape;
  life: number; glow: boolean; to?: { x: number; y: number };
}

export interface BurstOptions {
  n?: number;
  colors: string[];
  speed?: number;
  shapes?: Shape[];
  gravity?: number;
  size?: [number, number];
}

export interface Particles {
  burst(x: number, y: number, o: BurstOptions): void;
  implode(x: number, y: number, o: { n?: number; colors: string[] }): void;
  clear(): void;
  destroy(): void;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function createParticles(canvas: HTMLCanvasElement): Particles {
  const ctx = canvas.getContext("2d");
  const heart = typeof Path2D !== "undefined" ? new Path2D(HEART) : null;
  const reduce = prefersReducedMotion();
  let parts: Particle[] = [];
  let raf: number | null = null;

  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * d);
    canvas.height = Math.round(r.height * d);
    ctx?.setTransform(d, 0, 0, d, 0, 0);
  };
  fit();
  window.addEventListener("resize", fit);

  const draw = (p: Particle) => {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 25);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 10; }
    if (p.shape === "heart" && heart) {
      ctx.scale(p.size / 24, p.size / 24);
      ctx.translate(-12, -13);
      ctx.fill(heart);
    } else if (p.shape === "spark") {
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.25, -s * 0.25); ctx.lineTo(s, 0); ctx.lineTo(s * 0.25, s * 0.25);
      ctx.lineTo(0, s); ctx.lineTo(-s * 0.25, s * 0.25); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.25, -s * 0.25);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const loop = () => {
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      if (p.to) {
        p.x += (p.to.x - p.x) * 0.09;
        p.y += (p.to.y - p.y) * 0.09;
        p.life = Math.hypot(p.to.x - p.x, p.to.y - p.y) < 6 ? 0 : p.life - 1;
      } else {
        p.vx *= 0.975;
        p.vy = p.vy * 0.975 + p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life--;
      }
      draw(p);
    }
    raf = parts.length ? requestAnimationFrame(loop) : null;
  };
  const kick = () => { if (raf === null) raf = requestAnimationFrame(loop); };

  return {
    burst(x, y, { n = 40, colors, speed = 7, shapes = ["heart", "spark", "dot"], gravity = 0.13, size = [6, 15] }) {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.75);
        parts.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5, g: gravity,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, glow: i % 4 === 0,
          size: size[0] + Math.random() * (size[1] - size[0]),
          color: colors[i % colors.length], shape: shapes[i % shapes.length], life: 80 + Math.random() * 50,
        });
      }
      kick();
    },
    implode(x, y, { n = 26, colors }) {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 120 + Math.random() * 90;
        parts.push({
          x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, to: { x, y }, vx: 0, vy: 0, g: 0,
          rot: 0, vr: 0, size: 3 + Math.random() * 4, color: colors[i % colors.length], shape: "dot", glow: true, life: 200,
        });
      }
      kick();
    },
    clear() { parts = []; },
    destroy() {
      parts = [];
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      window.removeEventListener("resize", fit);
    },
  };
}

/** Centro de um elemento, em coordenadas de outro (o canvas). */
export function centerIn(container: Element, el: Element): [number, number] {
  const r = container.getBoundingClientRect();
  const s = el.getBoundingClientRect();
  return [s.left - r.left + s.width / 2, s.top - r.top + s.height / 2];
}
