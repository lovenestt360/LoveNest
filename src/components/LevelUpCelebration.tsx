import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FlamePet } from "@/components/FlamePet";
import { levelToStage } from "@/types/flame";
import { Button } from "@/components/ui/button";

const LEVEL_COLOR: Record<number, string> = {
  1: "#fb7185", 2: "#fb923c", 3: "#2dd4bf",
  4: "#3b82f6", 5: "#8b5cf6", 6: "#facc15", 7: "#ec4899",
};

interface Props {
  show: boolean;
  newLevel: number;
  newName: string;
  prevName: string;
  onClose: () => void;
}

export function LevelUpCelebration({ show, newLevel, newName, prevName, onClose }: Props) {
  const color = LEVEL_COLOR[newLevel] ?? "#fb7185";
  const stage = levelToStage(newLevel);

  useEffect(() => {
    if (show) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [show]);

  // 20 partículas com ângulos e tamanhos variados
  const particles = Array.from({ length: 20 }).map((_, i) => {
    const angle = (i / 20) * 360;
    const rad   = (angle * Math.PI) / 180;
    const dist  = 90 + (i % 4) * 40;
    return {
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist - 30,
      size: 5 + (i % 5) * 3,
      delay: 0.4 + (i % 6) * 0.06,
      duration: 0.8 + (i % 3) * 0.3,
    };
  });

  // 8 estrelas em posições fixas à volta do mascote
  const stars = [
    { x: -80, y: -60 }, { x: 80, y: -70 }, { x: -95, y: 10 },
    { x: 95, y: 5 },    { x: -60, y: 80 }, { x: 60, y: 75 },
    { x: -30, y: -95 }, { x: 35, y: -90 },
  ];

  // Portal garante que o overlay é filho directo do document.body,
  // escapando a qualquer CSS transform de elementos pai (Framer Motion)
  // que quebraria o posicionamento fixed relativo ao viewport.
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            height: "100svh",
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(6px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* ── Onda de choque (shockwave) ─────────────────── */}
          <motion.div
            className="absolute rounded-full border-2 pointer-events-none"
            style={{ borderColor: color, width: 120, height: 120 }}
            initial={{ scale: 0.5, opacity: 0.9 }}
            animate={{ scale: 5.5, opacity: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
          />
          <motion.div
            className="absolute rounded-full border pointer-events-none"
            style={{ borderColor: color + "88", width: 80, height: 80 }}
            initial={{ scale: 0.5, opacity: 0.7 }}
            animate={{ scale: 6.5, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: "easeOut" }}
          />

          {/* ── 20 Partículas em explosão ────────────────────── */}
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                background: i % 3 === 0 ? "#fff" : color,
                boxShadow: `0 0 ${p.size + 4}px 2px ${color}99`,
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0], scale: [0, 1.4, 1, 0] }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            />
          ))}

          {/* ── Estrelas fixas ao redor ──────────────────────── */}
          {stars.map((s, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute pointer-events-none text-white"
              style={{ fontSize: 10 + (i % 3) * 4, color: i % 2 === 0 ? color : "#fff" }}
              initial={{ x: s.x * 0.3, y: s.y * 0.3, opacity: 0, scale: 0 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 1, 0.6], scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.07, ease: "backOut" }}
            >
              ✦
            </motion.div>
          ))}

          {/* ── Conteúdo central ─────────────────────────────── */}
          <div className="relative flex flex-col items-center text-center px-8 max-w-sm w-full">

            {/* Glow primário */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ width: 260, height: 260, background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`, filter: "blur(30px)" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.85] }}
              transition={{ duration: 0.7, delay: 0.15 }}
            />

            {/* Glow pulsante contínuo após aparecer */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ width: 200, height: 200, background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`, filter: "blur(20px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.5, 1, 0.5], scale: [1, 1, 1, 1.15, 1] }}
              transition={{ duration: 2, delay: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Mascote — bounce + wiggle + segundo pulso */}
            <motion.div style={{ width: 210, height: 210 }}>
              <motion.div
                style={{ width: "100%", height: "100%" }}
                initial={{ scale: 0.1, opacity: 0, rotate: -10 }}
                animate={{
                  scale:   [0.1, 1.25, 0.92, 1.08, 0.97, 1.04, 1],
                  opacity: [0, 1, 1, 1, 1, 1, 1],
                  rotate:  [0, 0, 8, -7, 5, -3, 0],
                }}
                transition={{ duration: 1.1, delay: 0.3, times: [0, 0.35, 0.5, 0.65, 0.78, 0.9, 1] }}
              >
                <FlamePet stage={stage} mood="empolgado" environment="suave" compact />
              </motion.div>
            </motion.div>

            {/* "Evolução!" */}
            <motion.p
              className="text-3xl font-extrabold mt-2"
              style={{ color, textShadow: `0 0 20px ${color}88` }}
              initial={{ opacity: 0, y: 24, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.0, ease: "backOut" }}
            >
              Evolução!
            </motion.p>

            {/* prevFase → novaFase */}
            <motion.div
              className="flex items-center gap-2 mt-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.2 }}
            >
              <span className="text-sm font-semibold text-white/60">{prevName}</span>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 0.8, delay: 1.4, repeat: 3, ease: "easeInOut" }}
              >
                <ArrowRight className="w-4 h-4" style={{ color }} />
              </motion.div>
              <span className="text-base font-bold text-white">{newName}</span>
            </motion.div>

            {/* Subtítulo */}
            <motion.p
              className="text-sm text-white/50 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.45 }}
            >
              O vosso amor ficou mais forte.
            </motion.p>

            {/* Botão Continuar */}
            <motion.div
              className="mt-8 w-full"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.75 }}
            >
              <Button
                className="w-full rounded-2xl h-12 text-base font-semibold"
                style={{ background: color, color: "#fff", border: "none" }}
                onClick={onClose}
              >
                Continuar
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
