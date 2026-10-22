import { useEffect, useRef } from "react";
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

  return <div ref={ref} className="wf" role="dialog" aria-label={`LoveWrapped de ${data.month}`} />;
}
