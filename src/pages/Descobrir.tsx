import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";

export default function Descobrir() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="px-4 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-[#f0f0f0] flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-[#717171]">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    Descobrir <Compass className="w-4 h-4 text-emerald-500" />
                </h1>
            </header>

            <main className="flex flex-col items-center justify-center px-8 pt-24 text-center space-y-5">
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <Sparkles className="w-9 h-9 text-emerald-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Em breve</h2>
                    <p className="text-[14px] text-[#717171] max-w-xs leading-relaxed">
                        Estamos a preparar algo especial para vocês. Esta funcionalidade chegará em breve.
                    </p>
                </div>

                <div className="bg-white border border-[#f0f0f0] rounded-2xl px-5 py-4 shadow-sm w-full max-w-xs">
                    <p className="text-[12px] text-[#aaa] font-medium">🚀 A chegar em breve</p>
                </div>
            </main>
        </div>
    );
}
