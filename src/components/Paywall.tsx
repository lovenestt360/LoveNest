import { Lock, Star, HeartHandshake, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Paywall() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background p-6 text-center animate-in fade-in duration-500 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-3xl opacity-50" />

            <div className="relative z-10 w-full max-w-sm">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/30 to-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-primary/20 animate-pulse">
                    <Lock className="w-10 h-10 text-primary" />
                </div>

                <h2 className="text-3xl font-black mb-2 tracking-tight">Conteúdo Premium</h2>
                <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
                    Esta funcionalidade é exclusiva para casais LoveNest. Desbloqueia <strong className="text-primary">todas as ferramentas avançadas</strong> para elevar a vossa relação.
                </p>

                <div className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left mb-8">
                    <h3 className="font-bold flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> O que irás ganhar:</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>Desafios e Rotinas exclusivas de casal</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>Controlo total sobre Agendas e Tarefas Partilhadas</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>Cápsulas do Tempo e gestão de memórias completas</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>Zero limites. Feito para crescerem juntos.</span>
                        </li>
                    </ul>
                </div>

                <Button
                    className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg hover:scroll-m-1 transition-all"
                    onClick={() => navigate("/subscricao")}
                >
                    <HeartHandshake className="w-5 h-5 mr-2" />
                    Ver Planos LoveNest
                </Button>
            </div>
        </div>
    );
}
