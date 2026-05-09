import { useEffect, useState } from "react";

const PARTICLES = [
  { emoji: "🔥", dx:  0,  dy: -1.0, delay: 0   },
  { emoji: "✨", dx:  0.7,dy: -0.8, delay: 60  },
  { emoji: "💛", dx: -0.7,dy: -0.8, delay: 120 },
  { emoji: "❤️", dx:  1.0,dy: -0.3, delay: 30  },
  { emoji: "✨", dx: -1.0,dy: -0.3, delay: 90  },
  { emoji: "🌟", dx:  0.4,dy: -1.0, delay: 150 },
  { emoji: "💫", dx: -0.4,dy: -1.0, delay: 45  },
  { emoji: "🔥", dx:  0.9,dy: -0.7, delay: 180 },
];

interface Props {
  active: boolean;
  /** Center position relative to nearest positioned parent */
  className?: string;
}

/**
 * Renders a burst of emoji particles when `active` flips to true.
 * Auto-cleans after the animation completes.
 * Wrap the trigger element in `position: relative` to anchor the burst.
 */
export function CelebrationBurst({ active, className = "" }: Props) {
  const [visible, setVisible] = useState(false);
  const [key, setKey]         = useState(0);

  useEffect(() => {
    if (!active) return;
    setKey(k => k + 1);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div
      key={key}
      aria-hidden
      className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-50 ${className}`}
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute text-xl select-none"
          style={{
            left: "50%",
            top:  "50%",
            transform: "translate(-50%, -50%)",
            animation: `particle-float 1s ease-out forwards`,
            animationDelay: `${p.delay}ms`,
            // Spread particles in different directions using CSS variables
            "--dx": p.dx,
            "--dy": p.dy,
            // Inline override since tailwind can't do dynamic keyframe offsets
            willChange: "transform, opacity",
            // Each particle goes in its own direction via inline style overrides
            transformOrigin: "center",
          } as React.CSSProperties}
          // Manually override animation to spread particles differently
          data-dx={p.dx}
          data-dy={p.dy}
          ref={el => {
            if (!el) return;
            const spread = 55;
            el.style.cssText += `
              animation: none;
              left: calc(50% + ${p.dx * spread}px);
              top: calc(50% + ${p.dy * 30}px);
              animation: particle-float ${0.7 + p.delay / 400}s ease-out forwards;
              animation-delay: ${p.delay}ms;
            `;
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
