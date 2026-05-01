import { Lock, Star, CheckCircle, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Paywall({ title, description }: { title?: string, description?: string }) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background px-6 py-10 text-center animate-in fade-in duration-300">
            <div className="w-full max-w-sm">
                {/* Icon — sem fundo colorido */}
                <Lock className="w-12 h-12 text-primary mx-auto mb-6" strokeWidth={1.5} />

                <h2 className="text-2xl font-bold mb-2 tracking-tight">{title || "Conteúdo Premium"}</h2>
                <p className="text-[14px] text-muted-foreground mb-8 leading-relaxed">
                    {description || "Esta funcionalidade é exclusiva para casais LoveNest. Desbloqueia todas as ferramentas avançadas para elevar a vossa relação."}
                </p>

                {/* Benefits card */}
                <div className="glass-card p-5 text-left mb-6">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4 text-foreground">
                        <Star className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                        O que irás ganhar:
                    </h3>
                    <ul className="space-y-3">
                        {[
                            "Desafios e Rotinas exclusivas de casal",
                            "Controlo total sobre Agendas e Tarefas",
                            "Cápsulas do Tempo e Memórias completas",
                            "Zero limites. Feito para crescerem juntos.",
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-2.5 text-[13px] text-foreground">
                                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <Button
                    className="w-full h-12 rounded-2xl font-semibold text-[15px]"
                    onClick={() => navigate("/subscricao")}
                >
                    <HeartHandshake className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Ver Planos LoveNest
                </Button>
            </div>
        </div>
    );
}
