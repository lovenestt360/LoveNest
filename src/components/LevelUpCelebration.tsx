import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { FlamePet } from "@/components/FlamePet";
import { levelToStage } from "@/types/flame";
import { Button } from "@/components/ui/button";

// Cor por nível (mesmo mapa do LEVEL_PALETTE do Guardian).
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

  const particles = Array.from({ length: 10 });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Partículas a subirem */}
          {particles.map((_, i) => {
            const x = (i % 2 === 0 ? -1 : 1) * (30 + (i * 23) % 80);
            const delay = 0.35 + i * 0.06;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 6 + (i % 3) * 4,
                  height: 6 + (i % 3) * 4,
                  background: color,
                  boxShadow: `0 0 8px 2px ${color}88`,
                  bottom: "38%",
                  left: "50%",
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ x, y: -(120 + (i % 3) * 60), opacity: [0, 1, 1, 0], scale: [0, 1.2, 0.8, 0] }}
                transition={{ duration: 0.9, delay, ease: "easeOut" }}
              />
            );
          })}

          {/* Conteúdo central */}
          <div className="flex flex-col items-center text-center px-8 max-w-sm w-full">
            {/* Glow atrás do mascote */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 240, height: 240, background: `radial-gradient(circle, ${color}55 0%, transparent 70%)`, filter: "blur(24px)" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />

            {/* Mascote com bounce + wiggle */}
            <motion.div
              style={{ width: 200, height: 200 }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.18, 0.95, 1.05, 1], opacity: 1, rotate: [0, 0, 6, -6, 3, 0] }}
              transition={{ duration: 0.85, delay: 0.2, times: [0, 0.45, 0.6, 0.75, 0.88, 1] }}
            >
              <FlamePet stage={stage} mood="empolgado" environment="suave" compact />
            </motion.div>

            {/* Texto "Evolução!" */}
            <motion.p
              className="text-2xl font-extrabold mt-4"
              style={{ color }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.65 }}
            >
              Evolução!
            </motion.p>

            {/* Faísca → Brasa */}
            <motion.div
              className="flex items-center gap-2 mt-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.8 }}
            >
              <span className="text-base font-semibold text-white/70">{prevName}</span>
              <ArrowRight className="w-4 h-4" style={{ color }} />
              <span className="text-base font-bold text-white">{newName}</span>
            </motion.div>

            {/* Subtítulo */}
            <motion.p
              className="text-sm text-white/55 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.95 }}
            >
              O vosso amor ficou mais forte.
            </motion.p>

            {/* Botão Continuar */}
            <motion.div
              className="mt-7 w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.1 }}
            >
              <Button
                className="w-full rounded-2xl h-12 text-base font-semibold"
                style={{ background: color, color: "#fff", border: "none" }}
                onClick={onClose}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Continuar
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
