import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { MotionConfig } from "framer-motion";
import { VariantUmDia } from "./VariantUmDia";
import { VariantEntreOsDois } from "./VariantEntreOsDois";
import { VariantPlanoAPlano } from "./VariantPlanoAPlano";

/**
 * Harness do protótipo. Mostra uma direção de cada vez, em tamanho real.
 * O picker segue PICKER.md à letra (markup, estilos e comportamento).
 */

const VARIANTS: { name: string; Component: ComponentType }[] = [
  { name: "Um dia", Component: VariantUmDia },
  { name: "Entre os dois", Component: VariantEntreOsDois },
  { name: "Plano a plano", Component: VariantPlanoAPlano },
];

function initialIndex() {
  const v = parseInt(new URLSearchParams(location.search).get("v") ?? "", 10);
  return v >= 1 && v <= VARIANTS.length ? v - 1 : 0;
}

export function Harness() {
  const [current, setCurrent] = useState(initialIndex);
  // Muda a key para re-montar a variante (as entradas voltam a correr).
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);

  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveHighlight = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = highlightRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  const setActive = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setMountKey((k) => k + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }, []);

  const replay = useCallback(() => {
    setMountKey((k) => k + 1);
    window.scrollTo({ top: 0 });
  }, []);

  useLayoutEffect(() => {
    moveHighlight();
  }, [moveHighlight]);

  useEffect(() => {
    window.addEventListener("resize", moveHighlight);
    return () => window.removeEventListener("resize", moveHighlight);
  }, [moveHighlight]);

  // Ativa o deslize só depois do primeiro paint, para o carregamento não animar.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) setActive(num - 1);
      else if (e.key === "ArrowRight") setActive((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, setActive, replay]);

  const Active = VARIANTS[current].Component;

  return (
    <MotionConfig reducedMotion="user">
      <main id="stage" key={`${current}-${mountKey}`}>
        <Active />
      </main>

      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants" data-ready={ready ? "" : undefined}>
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => setActive(i)}
          >
            {v.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={replay}>
          ↻
        </button>
      </nav>
    </MotionConfig>
  );
}
