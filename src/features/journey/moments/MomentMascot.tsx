import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import gBase from "@/assets/moments/guardiao_base.webp";
import gTip from "@/assets/moments/guardiao_tip.webp";
import gCape from "@/assets/moments/guardiao_cape.webp";
import fBase from "@/assets/moments/faisca_base.webp";
import fTip from "@/assets/moments/faisca_tip.webp";
import { BOOK_SVG, faceSvg, type Expression, type MascotKey } from "./faceArt";

/* A mascote em camadas: só transform e opacity, para ser leve no telemóvel. */

interface Box { x: number; y: number; w: number; h: number }
const place = ({ x, y, w, h }: Box) => ({ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });

const ART: Record<MascotKey, { base: [string, Box]; tip: [string, Box]; cape?: [string, Box]; glow: Box }> = {
  G: {
    base: [gBase, { x: 26.95, y: 39.16, w: 42.77, h: 42.48 }],
    tip: [gTip, { x: 31.64, y: 15.43, w: 35.84, h: 24.02 }],
    cape: [gCape, { x: 61.82, y: 59.86, w: 21, h: 16.89 }],
    glow: { x: 39.5, y: 62.5, w: 11, h: 11 },
  },
  F: {
    base: [fBase, { x: 26.95, y: 39.16, w: 46.29, h: 48.34 }],
    tip: [fTip, { x: 27.25, y: 21.68, w: 44.34, h: 17.77 }],
    glow: { x: 42.5, y: 69, w: 13, h: 13 },
  },
};

export interface MomentMascotHandle {
  setExpression: (name: Expression, instant?: boolean) => void;
  hop: (twice?: boolean) => void;
  setBookOpen: (open: boolean) => void;
}

interface Props {
  kind: MascotKey;
  label: string;
  withBook?: boolean;
  reduced: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const MomentMascot = forwardRef<MomentMascotHandle, Props>(function MomentMascot(
  { kind, label, withBook, reduced, className, style },
  ref,
) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const jumpRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<SVGSVGElement>(null);
  const bookRef = useRef<SVGSVGElement>(null);
  const current = useRef<Expression | null>(null);
  const swapTimer = useRef<number>();

  const hop = (twice = false) => {
    const el = jumpRef.current;
    if (!el) return;
    el.classList.remove("mo-hop", "mo-hop2");
    void el.offsetWidth;
    el.classList.add(twice ? "mo-hop2" : "mo-hop");
  };

  useImperativeHandle(ref, () => ({
    setExpression(name, instant) {
      const face = faceRef.current;
      if (!face || current.current === name) return;
      current.current = name;
      window.clearTimeout(swapTimer.current);
      if (instant || reduced) {
        face.classList.remove("mo-swap");
        face.innerHTML = faceSvg(kind, name);
        return;
      }
      face.classList.add("mo-swap");
      swapTimer.current = window.setTimeout(() => {
        face.innerHTML = faceSvg(kind, name);
        face.classList.remove("mo-swap");
      }, 110);
    },
    hop,
    setBookOpen(open) {
      const svg = bookRef.current;
      if (!svg) return;
      svg.querySelector<SVGGElement>(".mo-book-open")!.style.display = open ? "" : "none";
      svg.querySelector<SVGGElement>(".mo-book-shut")!.style.display = open ? "none" : "";
    },
  }), [kind, reduced]);

  // Piscar por temporizador: entre piscadelas não se gasta nada.
  useEffect(() => {
    if (reduced) return;
    const timers: number[] = [];
    const setShut = (shut: boolean) =>
      faceRef.current?.querySelectorAll(".mo-eye").forEach((e) => e.classList.toggle("mo-shut", shut));
    const blink = () => {
      setShut(true);
      timers.push(window.setTimeout(() => setShut(false), 110));
      if (Math.random() < 0.18) {
        timers.push(window.setTimeout(() => setShut(true), 260));
        timers.push(window.setTimeout(() => setShut(false), 370));
      }
      schedule();
    };
    const schedule = () => { timers.push(window.setTimeout(blink, 2400 + Math.random() * 3200)); };
    schedule();
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  const art = ART[kind];
  return (
    <button ref={rootRef} type="button" className={`mo-mascot ${className ?? ""}`} style={style} aria-label={label} onClick={() => hop()}>
      <div ref={jumpRef} className="mo-jump">
        <div className="mo-breath">
          <img className="mo-layer" src={art.base[0]} alt="" style={place(art.base[1])} />
          {art.cape && (
            <div className="mo-layer mo-cape" style={place(art.cape[1])}>
              <img src={art.cape[0]} alt="" />
            </div>
          )}
          <img className="mo-layer mo-tip" src={art.tip[0]} alt="" style={place(art.tip[1])} />
          <div className="mo-glow" style={place(art.glow)} />
          <svg ref={faceRef} className="mo-face" viewBox="0 0 1024 1024" aria-hidden="true" />
          {withBook && <svg ref={bookRef} className="mo-face mo-book" viewBox="0 0 1024 1024" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BOOK_SVG }} />}
        </div>
      </div>
    </button>
  );
});
