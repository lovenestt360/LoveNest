import { Heart } from "lucide-react";

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center bg-background px-6 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mb-6 animate-scale-in">
                <Heart className="w-9 h-9 text-rose-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Bem-vindo ao LoveNest</h1>
            <p className="text-[15px] text-muted-foreground mt-3 max-w-xs">Vamos personalizar a tua experiência.</p>

            <button
                type="button"
                onClick={onContinue}
                className="w-full max-w-sm h-14 rounded-2xl font-bold text-[15px] bg-rose-500 hover:bg-rose-600 text-white shadow-lg active:scale-[0.98] transition-all mt-10"
            >
                Continuar
            </button>
        </div>
    );
}
