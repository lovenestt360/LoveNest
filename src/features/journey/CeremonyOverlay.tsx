import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Clock, Loader2, Share2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import type { CeremonyContent } from "@/lib/ceremonies";
import { HEART_PATH } from "./moments/faceArt";
import { MomentMascot, type MomentMascotHandle } from "./moments/MomentMascot";
import raysImg from "@/assets/moments/rays.webp";
import "./moments/moments.css";

/* Momentos do casal: cada um tem o seu mundo, a sua história e a cara do Guardião. */

const FRAME_W = 330;
const FRAME_H = 640;
const FRAME_MARGIN = 28; // barra de estado e gesto do telemóvel
const MAX_SCALE = 1.3;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const heartSvg = <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={HEART_PATH} /></svg>;
const longDate = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

function useReducedMotion() {
  return useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

function useFrameScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / FRAME_W, window.innerHeight / (FRAME_H + FRAME_MARGIN), MAX_SCALE));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return scale;
}

function MomentScreen({ content, onClose }: { content: CeremonyContent; onClose: () => void }) {
  const { profile } = useProfile();
  const { partner } = usePartnerProfile();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const scale = useFrameScale();
  const isSolo = profile?.usage_mode === "solo";

  const screenRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<MomentMascotHandle>(null);
  const pairRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<MomentMascotHandle>(null);
  const [leaving, setLeaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { type } = content;
  const days = content.value ?? 0;
  const dotCount = Math.min(Math.max(days, 1), 30);
  const names = [profile?.display_name, isSolo ? null : partner?.display_name]
    .map((n) => n?.trim().split(" ")[0])
    .filter(Boolean)
    .join(" e ");

  const fx = useMemo(() => Array.from({ length: type === "capsula" ? 30 : type === "aniversario" ? 8 : type === "streak_milestone" ? 12 : 0 }, (_, i) => ({
    left: rnd(2, 98), top: rnd(1, 52), size: rnd(1.5, 3.5), big: rnd(9, 17), delay: rnd(-9, 0), wait: rnd(0, 4),
    dur: rnd(3.4, 6), slow: rnd(6, 10), drift: rnd(-50, 50), glow: rnd(0.3, 0.9), twinkle: i < 7,
  })), [type]);

  // A história de cada momento. Sem movimento pedido, mostra logo o fim.
  useEffect(() => {
    const root = screenRef.current;
    if (!root) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const add = (...c: string[]) => root.classList.add(...c);
    const remove = (...c: string[]) => root.classList.remove(...c);
    const main = mainRef.current;
    const left = leftRef.current;
    let frame = 0;

    if (type === "streak_milestone") {
      const dots = [...root.querySelectorAll(".mo-dot")];
      if (reduced) {
        add("mo-lit");
        dots.forEach((d) => d.classList.add("mo-on"));
        main?.setExpression("joy", true);
      } else {
        add("mo-pre");
        main?.setExpression("up", true);
        if (numRef.current) numRef.current.textContent = "0";
        const step = Math.min(90, 2250 / dots.length);
        dots.forEach((d, i) => at(350 + i * step, () => {
          d.classList.add("mo-on");
          if (numRef.current) numRef.current.textContent = String(Math.round(((i + 1) / dots.length) * days));
          if ((i + 1) % 10 === 0) main?.hop();
        }));
        const end = 350 + dots.length * step;
        at(end, () => { add("mo-lit"); main?.setExpression("joy"); main?.hop(true); });
        at(end + 580, () => remove("mo-pre"));
      }
    }

    if (type === "livro_concluido") {
      if (reduced) {
        main?.setBookOpen(false);
        main?.setExpression("proud", true);
      } else {
        add("mo-pre");
        main?.setBookOpen(true);
        main?.setExpression("read", true);
        at(2700, () => { main?.setExpression("wow"); add("mo-say"); main?.hop(); });
        at(4300, () => { main?.setBookOpen(false); main?.setExpression("proud"); main?.hop(); remove("mo-say"); });
        at(4800, () => remove("mo-pre"));
      }
    }

    if (type === "aniversario") {
      const pair = pairRef.current;
      const l = pair?.querySelector<HTMLElement>(".mo-pair-l");
      const r = pair?.querySelector<HTMLElement>(".mo-pair-r");
      const together = () => {
        if (l) l.style.transform = "rotate(5deg)";
        if (r) r.style.transform = "rotate(-5deg)";
      };
      const countTo = content.date ? Math.max(0, Math.floor((Date.now() - new Date(content.date).getTime()) / 86400000)) : 0;
      if (reduced || !l) {
        add("mo-joined");
        together();
        main?.setExpression("love", true);
        left?.setExpression("love", true);
        if (numRef.current) numRef.current.textContent = countTo.toLocaleString("pt-PT");
      } else {
        add("mo-pre");
        l.style.transition = "none";
        if (r) r.style.transition = "none";
        l.style.transform = "translate3d(-58px,0,0)";
        if (r) r.style.transform = "translate3d(58px,0,0)";
        void l.offsetWidth;
        l.style.transition = "";
        if (r) r.style.transition = "";
        main?.setExpression("smile", true);
        left?.setExpression("smile", true);
        at(500, together);
        at(1650, () => {
          add("mo-joined");
          main?.setExpression("love"); left?.setExpression("love");
          main?.hop(); left?.hop();
        });
        at(2050, () => {
          remove("mo-pre");
          const t0 = performance.now();
          const tick = (t: number) => {
            const k = Math.min(1, (t - t0) / 1300);
            if (numRef.current) numRef.current.textContent = Math.round(countTo * (1 - Math.pow(1 - k, 3))).toLocaleString("pt-PT");
            if (k < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        });
      }
    }

    if (type === "capsula") {
      if (reduced) {
        add("mo-up", "mo-sealed");
        main?.setExpression("wink", true);
      } else {
        add("mo-pre");
        main?.setExpression("gaze", true);
        at(1300, () => add("mo-sealed"));
        at(2100, () => { add("mo-up"); main?.setExpression("up"); main?.hop(); });
        at(3700, () => main?.setExpression("wink"));
        at(4000, () => remove("mo-pre"));
      }
    }

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
  }, [type, reduced, days, content.date]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dismiss = (then?: () => void) => {
    setLeaving(true);
    window.setTimeout(() => { onClose(); then?.(); }, 260);
  };

  const handleShare = async () => {
    if (!screenRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(screenRef.current, {
        pixelRatio: 2,
        filter: (node) => !(node as HTMLElement).dataset?.noShare,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "lovenest-momento.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: content.title ?? "LoveNest" });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("[Momento] partilhar:", err?.message);
    } finally {
      setExporting(false);
    }
  };

  const THEME = { streak_milestone: "mo-marco", livro_concluido: "mo-livro", aniversario: "mo-aniv", capsula: "mo-capsula" } as const;
  const capsuleDays = content.date ? Math.ceil((new Date(content.date).getTime() - Date.now()) / 86400000) : 0;
  const years = content.value ?? 0;

  return (
    <div
      ref={screenRef}
      className={`mo-screen ${THEME[type]} ${leaving ? "mo-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={content.title ?? "Momento"}
    >
      <div className="mo-fx" aria-hidden="true">
        {type === "streak_milestone" && fx.map((e, i) => (
          <span key={i} className="mo-ember" style={{ left: `${e.left}%`, "--s": `${e.big}px`, "--d": `${e.dur}s`, "--w": `${e.wait}s`, "--x": `${e.drift}px` } as React.CSSProperties} />
        ))}
        {type === "aniversario" && fx.map((e, i) => (
          <span key={i} className="mo-petal" style={{ left: `${e.left}%`, "--s": `${e.big}px`, "--d": `${e.slow}s`, "--w": `${e.delay}s`, "--x": `${e.drift}px` } as React.CSSProperties}>{heartSvg}</span>
        ))}
        {type === "capsula" && fx.map((e, i) => (
          <span key={i} className={e.twinkle ? "mo-star mo-tw" : "mo-star"} style={{ left: `${e.left}%`, top: `${e.top}%`, "--s": `${e.size}px`, "--o": e.glow, "--d": `${e.dur}s`, "--w": `${e.delay}s` } as React.CSSProperties} />
        ))}
      </div>

      <button type="button" className="mo-close" data-no-share="1" aria-label="Fechar" onClick={() => dismiss()}>
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      <div className="mo-frame" style={{ transform: `scale(${scale})` }}>
        <div className="mo-brand">{names ? `LoveNest · ${names}` : "LoveNest"}</div>

        <div className="mo-stage">
          {type === "streak_milestone" && (
            <>
              <img className="mo-rays" src={raysImg} alt="" />
              <div className="mo-ring" aria-hidden="true">
                {Array.from({ length: dotCount }, (_, i) => {
                  const a = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
                  return <span key={i} className="mo-dot" style={{ left: `${50 + Math.cos(a) * 46}%`, top: `${50 + Math.sin(a) * 46}%` }} />;
                })}
              </div>
              <div className="mo-num"><span ref={numRef}>{days}</span><small>dias seguidos</small></div>
              <div className="mo-shadow" style={{ left: "50%", top: 338, width: 136, height: 20, marginLeft: -68 }} />
              <MomentMascot ref={mainRef} kind="G" label="Guardião" reduced={reduced} style={{ left: "50%", top: 78, width: 320, height: 320, marginLeft: -164 }} />
            </>
          )}

          {type === "livro_concluido" && (
            <>
              {([["escutar", -96, -150, 0], ["perdoar", 92, -176, 180], ["ficar", -34, -210, 360], ["juntos", 70, -110, 520]] as const).map(([word, x, y, w]) => (
                <span key={word} className="mo-word" style={{ "--x": `${x}px`, "--y": `${y}px`, "--w": `${w}ms` } as React.CSSProperties}>{word}</span>
              ))}
              <div className="mo-shadow" style={{ left: "50%", top: 330, width: 150, height: 20, marginLeft: -75 }} />
              <MomentMascot ref={mainRef} kind="G" label="Guardião" withBook reduced={reduced} style={{ left: "50%", top: 22, width: 360, height: 360, marginLeft: -184 }} />
            </>
          )}

          {type === "aniversario" && (
            <>
              {years > 0 && <div className="mo-huge" style={years > 9 ? { fontSize: 210, top: 0 } : undefined}>{years}</div>}
              <div className="mo-bigheart"><span>{heartSvg}</span></div>
              <div className="mo-shadow" style={{ left: "50%", top: 330, width: isSolo ? 150 : 250, height: 22, marginLeft: isSolo ? -75 : -125 }} />
              <div ref={pairRef}>
                {isSolo ? (
                  <MomentMascot ref={mainRef} kind="G" label="Guardião" reduced={reduced} style={{ left: "50%", top: 94, width: 290, height: 290, marginLeft: -149 }} />
                ) : (
                  <>
                    <MomentMascot ref={leftRef} kind="F" label="Faísca" reduced={reduced} className="mo-pair mo-pair-l" style={{ left: -28, top: 94, width: 280, height: 280 }} />
                    <MomentMascot ref={mainRef} kind="G" label="Guardião" reduced={reduced} className="mo-pair mo-pair-r" style={{ right: -38, top: 94, width: 290, height: 290 }} />
                  </>
                )}
              </div>
            </>
          )}

          {type === "capsula" && (
            <>
              <div className="mo-trail" />
              <div className="mo-orb" aria-hidden="true">
                <div className="mo-halo" />
                <svg viewBox="0 0 100 100">
                  <defs>
                    <radialGradient id="mo-glass" cx="38%" cy="30%" r="80%">
                      <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
                      <stop offset="0.45" stopColor="#FFE3A3" stopOpacity="0.65" />
                      <stop offset="1" stopColor="#FF9E5E" stopOpacity="0.55" />
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="44" fill="url(#mo-glass)" stroke="#FFF1CF" strokeWidth="2.5" />
                  <rect x="29" y="35" width="42" height="31" rx="5" fill="#FFF8EC" />
                  <path d="M30 38l20 16 20-16" fill="none" stroke="#D9A25E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path className="mo-seal" d="M50 62s-9-5.5-9-11.5c0-3.300 2.200-5.300 5-5.300 1.700 0 3 .9 4 2.300 1-1.400 2.300-2.300 4-2.300 2.800 0 5 2 5 5.300 0 6-9 11.500-9 11.500z" fill="#E5334F" />
                  <ellipse cx="35" cy="26" rx="10" ry="5" fill="#fff" opacity="0.8" transform="rotate(-28 35 26)" />
                </svg>
              </div>
              <div className="mo-shadow" style={{ left: "50%", top: 326, width: 150, height: 20, marginLeft: -75 }} />
              <MomentMascot ref={mainRef} kind="G" label="Guardião" reduced={reduced} style={{ left: "50%", top: 44, width: 340, height: 340, marginLeft: -174 }} />
            </>
          )}
        </div>

        <div className="mo-words">
          {type === "streak_milestone" && (
            <>
              <h2 style={{ fontSize: 28 }}>{content.title}</h2>
              {content.subtitle && <p>{content.subtitle}</p>}
            </>
          )}
          {type === "livro_concluido" && (
            <>
              <h2>Última página.</h2>
              <p>Terminaste «{content.title}».</p>
            </>
          )}
          {type === "aniversario" && (
            <>
              {years > 0 && content.date ? (
                <>
                  <h2>{years} {years === 1 ? "ano" : "anos"}{isSolo ? "." : " a escolherem-se."}</h2>
                  <p>«{content.title}». <span ref={numRef}>0</span> dias, desde {longDate(content.date)}.</p>
                </>
              ) : (
                <>
                  <h2>{content.title}</h2>
                  <p>{isSolo ? "Hoje é um dia só teu." : "Hoje é um dia só vosso."}</p>
                </>
              )}
            </>
          )}
          {type === "capsula" && (
            <>
              <h2>Só o futuro vai saber.</h2>
              <p>{content.date ? `Memória do teu par. Abre a ${longDate(content.date)}.` : "O teu par guardou uma memória para o futuro."}</p>
              {capsuleDays > 0 && (
                <span className="mo-stat">
                  <Clock className="mr-1 inline h-3 w-3" strokeWidth={2.4} />
                  {capsuleDays === 1 ? "Falta 1 dia" : `Faltam ${capsuleDays} dias`}
                </span>
              )}
            </>
          )}
        </div>

        <div className="mo-actions" data-no-share="1">
          {type === "capsula" ? (
            <button type="button" className="mo-cta" onClick={() => dismiss(() => navigate("/capsula"))}>Ver as cápsulas</button>
          ) : (
            <button type="button" className="mo-cta" onClick={() => dismiss()}>Continuar</button>
          )}
          <button type="button" className="mo-share" disabled={exporting} onClick={handleShare}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" strokeWidth={1.8} />}
            Partilhar este momento
          </button>
        </div>
      </div>

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <radialGradient id="mo-iris-b" cx="50%" cy="72%" r="72%"><stop offset="0" stopColor="#57B7FF" /><stop offset="0.55" stopColor="#1F55D6" /><stop offset="1" stopColor="#0B1B6B" /></radialGradient>
          <radialGradient id="mo-iris-r" cx="50%" cy="72%" r="72%"><stop offset="0" stopColor="#FF7E9B" /><stop offset="0.55" stopColor="#C8214F" /><stop offset="1" stopColor="#5B0B26" /></radialGradient>
          <radialGradient id="mo-blush"><stop offset="0" stopColor="#FF72B4" stopOpacity="0.85" /><stop offset="1" stopColor="#FF72B4" stopOpacity="0" /></radialGradient>
          <radialGradient id="mo-fore-g"><stop offset="0" stopColor="#3AA0FA" stopOpacity="0.9" /><stop offset="1" stopColor="#3AA0FA" stopOpacity="0" /></radialGradient>
          <radialGradient id="mo-fore-f"><stop offset="0" stopColor="#FFB0BE" stopOpacity="0.9" /><stop offset="1" stopColor="#FFB0BE" stopOpacity="0" /></radialGradient>
          <linearGradient id="mo-cover" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8A3FF0" /><stop offset="1" stopColor="#4A1AA8" /></linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function CeremonyOverlay() {
  const [content, setContent] = useState<CeremonyContent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CeremonyContent>).detail;
      if (detail) setContent(detail);
    };
    window.addEventListener("lovenest-ceremony", handler);
    return () => window.removeEventListener("lovenest-ceremony", handler);
  }, []);

  if (!content) return null;
  return <MomentScreen key={`${content.type}-${content.title ?? ""}`} content={content} onClose={() => setContent(null)} />;
}
