import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PARTICLES = [
  { color: "bg-rose-400",    dx:  0,    dy: -1.0, delay: 0   },
  { color: "bg-primary",     dx:  0.7,  dy: -0.8, delay: 60  },
  { color: "bg-rose-300",    dx: -0.7,  dy: -0.8, delay: 120 },
  { color: "bg-rose-500",    dx:  1.0,  dy: -0.3, delay: 30  },
  { color: "bg-primary/70",  dx: -1.0,  dy: -0.3, delay: 90  },
  { color: "bg-rose-200",    dx:  0.4,  dy: -1.0, delay: 150 },
  { color: "bg-rose-600",    dx: -0.4,  dy: -1.0, delay: 45  },
];

const SPREAD = 55;

interface Props {
  active: boolean;
}

export function CelebrationBurst({ active }: Props) {
  const [visible, setVisible] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!active) return;
    setGeneration(g => g + 1);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div
      key={generation}
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-50"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={cn("absolute w-2.5 h-2.5 rounded-full select-none", p.color)}
          style={{
            left: `calc(50% + ${p.dx * SPREAD}px)`,
            top:  `calc(50% + ${p.dy * 20}px)`,
            animation: `particle-float ${0.75 + i * 0.07}s ease-out forwards`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
