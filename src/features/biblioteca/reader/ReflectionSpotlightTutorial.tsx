import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";

export function ReflectionSpotlightTutorial({ targetRef, onDismiss }: {
    targetRef: RefObject<HTMLElement>;
    onDismiss: () => void;
}) {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const update = () => {
            if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [targetRef]);

    if (!rect) return null;

    const padding = 8;

    return (
        <div className="fixed inset-0 z-[9999]" onClick={e => e.stopPropagation()}>
            {/* Bloqueia qualquer interação com o resto do ecrã até confirmar. */}
            <div className="absolute inset-0" />

            {/* Recorte luminoso sobre o botão, com pulsação suave a chamar a atenção. */}
            <div
                className="absolute rounded-2xl pointer-events-none animate-pulse"
                style={{
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
                }}
            />

            <div
                className="absolute left-4 right-4 bg-card rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2"
                style={{ top: rect.bottom + 16 }}
            >
                <p className="text-[13px] font-bold text-foreground leading-relaxed">
                    Usa este botão sempre que quiseres escrever uma nota sobre o que estás a ler — não vai voltar a aparecer automaticamente a cada capítulo.
                </p>
                <Button
                    onClick={onDismiss}
                    className="w-full h-10 rounded-xl font-bold text-[13px] bg-rose-500 hover:bg-rose-600 text-white"
                >
                    Entendi
                </Button>
            </div>
        </div>
    );
}
