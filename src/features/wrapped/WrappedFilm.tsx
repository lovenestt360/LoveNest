import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./wrappedFilm.css";
import { filmMarkup, type FilmData } from "./filmMarkup";
import { mountFilm } from "./filmRuntime";

/** O filme do mês do LoveWrapped, em ecrã inteiro: cenas, efeitos e som (liga-se no botão). */
export function WrappedFilm({ data, onClose, onShare }: { data: FilmData; onClose: () => void; onShare: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onClose, onShare });
  cb.current = { onClose, onShare };

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = filmMarkup(data);
    return mountFilm(root, { onClose: () => cb.current.onClose(), onShare: () => cb.current.onShare() });
  }, [data]);

  // Sem scroll da página por trás do filme
  useEffect(() => {
    const html = document.documentElement.style.overflow;
    const body = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = html;
      document.body.style.overflow = body;
    };
  }, []);

  // Portal: o filme ocupa sempre o ecrã inteiro, sem depender do layout da página.
  return createPortal(
    <div
      ref={ref}
      className="wf"
      role="dialog"
      aria-modal="true"
      aria-label={`LoveWrapped de ${data.month}`}
      style={{ position: "fixed", inset: 0, height: "100dvh", zIndex: 9990, background: "#000" }}
    />,
    document.body,
  );
}
