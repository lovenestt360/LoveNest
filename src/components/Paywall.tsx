import { Lock, Star, CheckCircle, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureInfo {
    title: string;
    description: string;
    benefits: string[];
}

const FEATURE_INFO: Record<string, FeatureInfo> = {
    mood: {
        title: "Humor do Casal",
        description: "Acompanhem o estado emocional um do outro em tempo real e entendam melhor os padrões da vossa relação.",
        benefits: [
            "Registem o humor diário individualmente",
            "Vejam os padrões emocionais ao longo do tempo",
            "Saibam quando o vosso par precisa de atenção",
        ],
    },
    prayer: {
        title: "Jornada Espiritual",
        description: "Cresçam juntos na fé com oração, jejum e reflexão partilhados.",
        benefits: [
            "Orações e intenções partilhadas em casal",
            "Registo de jejuns e momentos de fé",
            "Acompanhem a jornada espiritual a dois",
        ],
    },
    conflicts: {
        title: "Gestão de Conflitos",
        description: "Resolvam desentendimentos com estrutura e saiam de cada conflito mais unidos.",
        benefits: [
            "Mediação estruturada para desentendimentos",
            "Acompanhamento de temas em aberto",
            "Histórico de resoluções e aprendizagens",
        ],
    },
    memories: {
        title: "Memórias",
        description: "Guardem e revivam os momentos mais especiais da vossa relação.",
        benefits: [
            "Álbuns de fotos e momentos especiais",
            "Linha do tempo das vossas memórias",
            "Revivam qualquer momento a qualquer altura",
        ],
    },
    historia: {
        title: "A Nossa História",
        description: "A linha do tempo completa do vosso casal, desde o primeiro dia.",
        benefits: [
            "Linha do tempo com todos os marcos do casal",
            "Datas especiais e aniversários nunca esquecidos",
            "Revejam de onde começaram e até onde chegaram",
        ],
    },
    cycle: {
        title: "Ciclo Menstrual",
        description: "Compreendam juntos o ciclo e adaptem os planos do casal com informação real.",
        benefits: [
            "Acompanhamento preciso do ciclo",
            "Previsão de fases e sintomas",
            "Centro de conhecimento sobre saúde íntima",
        ],
    },
    agenda: {
        title: "Agenda e Rotinas",
        description: "Sincronizem o vosso dia a dia e construam rotinas saudáveis juntos.",
        benefits: [
            "Rotinas diárias sincronizadas a dois",
            "Tarefas e missões de casal",
            "Planeiem os vossos dias lado a lado",
        ],
    },
    challenges: {
        title: "Desafios de Casal",
        description: "Mais de 100 desafios para fortalecerem o vínculo e a cumplicidade.",
        benefits: [
            "Desafios exclusivos para fortalecerem o vínculo",
            "Novos desafios semanais",
            "Façam crescer a intimidade e a cumplicidade",
        ],
    },
    time_capsules: {
        title: "Cápsulas do Tempo",
        description: "Escrevam mensagens para o futuro e surpreendam-se quando as abrirem.",
        benefits: [
            "Mensagens guardadas para uma data futura",
            "Surpreendam-se com o que escreveram meses atrás",
            "Um presente que o futuro-vós vai adorar",
        ],
    },
    wrapped: {
        title: "LoveWrapped",
        description: "Recapitulação anual personalizada de tudo o que viveram juntos este ano.",
        benefits: [
            "Resumo anual do vosso casal em estatísticas",
            "Memórias e momentos mais marcantes do ano",
            "Um presente que se renova todos os anos",
        ],
    },
    lovestreak: {
        title: "Jornada e Missões",
        description: "Mantenham a chama acesa com o streak diário, missões e recompensas.",
        benefits: [
            "Streak diário para manter a chama ativa",
            "Missões a completar juntos",
            "Recompensas pela vossa consistência",
        ],
    },
    descobrir: {
        title: "Descobrir",
        description: "Conteúdo e sugestões personalizadas para o vosso casal, renovadas cada semana.",
        benefits: [
            "Conteúdo personalizado para o vosso estilo de casal",
            "Artigos, dicas e sugestões à medida",
            "Novidades todas as semanas",
        ],
    },
    location_sharing: {
        title: "Partilha de Localização",
        description: "Saibam sempre onde está o vosso par, em tempo real e com total privacidade.",
        benefits: [
            "Localização em tempo real do vosso par",
            "Notificações de chegada a locais favoritos",
            "Histórico de encontros e deslocações",
        ],
    },
};

const GENERIC: FeatureInfo = {
    title: "Conteúdo Premium",
    description: "Esta funcionalidade é exclusiva para casais LoveNest. Desbloqueiem todas as ferramentas para elevarem a vossa relação.",
    benefits: [
        "Desafios e missões exclusivas de casal",
        "Agenda completa: rotinas, tarefas e missões",
        "Cápsulas do Tempo e Memórias sem limites",
        "Tudo o que precisam para crescerem juntos",
    ],
};

interface PaywallProps {
    feature?: string;
    title?: string;
    description?: string;
}

export default function Paywall({ feature, title, description }: PaywallProps) {
    const navigate = useNavigate();
    const info = (feature ? FEATURE_INFO[feature] : null) ?? GENERIC;

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background px-6 py-10 text-center animate-in fade-in duration-300">
            <div className="w-full max-w-sm">
                <Lock className="w-12 h-12 text-primary mx-auto mb-6" strokeWidth={1.5} />

                <h2 className="text-2xl font-bold mb-2 tracking-tight">
                    {title ?? info.title}
                </h2>
                <p className="text-[14px] text-muted-foreground mb-8 leading-relaxed">
                    {description ?? info.description}
                </p>

                <div className="glass-card p-5 text-left mb-6">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4 text-foreground">
                        <Star className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
                        O que irás ganhar:
                    </h3>
                    <ul className="space-y-3">
                        {info.benefits.map((item) => (
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
