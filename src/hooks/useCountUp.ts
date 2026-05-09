import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to the new target.
 * Returns the current display value and a `popped` flag (true for 1 frame on change).
 */
export function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const [popped, setPopped] = useState(false);
  const prevRef = useRef(target);
  const rafRef  = useRef<number>();

  useEffect(() => {
    const start = prevRef.current;
    const end   = target;

    if (start === end) return;

    // Trigger pop animation
    setPopped(true);
    const popTimer = setTimeout(() => setPopped(false), 500);

    prevRef.current = end;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(popTimer);
    };
  }, [target, duration]);

  return { display, popped };
}
