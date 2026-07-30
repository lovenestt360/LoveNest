import { LogoIcon } from "@/components/Logo";

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center bg-background px-6 animate-fade-in">
            <div className="mb-6 animate-scale-in">
                <LogoIcon size={80} />
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
