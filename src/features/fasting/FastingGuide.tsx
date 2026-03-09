import { getWeek } from "date-fns";
import { BookOpen, Heart, Leaf, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKLY_THEMES: Record<number, { theme: string; verse: string; ref: string }> = {
    // Quaresma 2026 (sem ser exclusivo, cicla pelo número de semana)
    0: { theme: "Arrependimento", verse: "Tornai-vos a mim de todo o vosso coração.", ref: "Joel 2:12" },
    1: { theme: "Oração", verse: "Pedi e recebereis, buscai e encontrareis.", ref: "Mt 7:7" },
    2: { theme: "Humildade", verse: "Deus resiste ao soberbo, mas dá graça ao humilde.", ref: "Tg 4:6" },
    3: { theme: "Perdão", verse: "Perdoai e sereis perdoados.", ref: "Lc 6:37" },
    4: { theme: "Paciência", verse: "Com paciência correi a corrida que está diante de vós.", ref: "Hb 12:1" },
    5: { theme: "Amor", verse: "O amor édurável, é benigno; o amor não inveja.", ref: "1 Cor 13:4" },
    6: { theme: "Perseverança", verse: "Aquele que perseverar até ao fim será salvo.", ref: "Mt 24:13" },
};

const HEALTH_TIPS = [
    { icon: "💧", title: "Hidratação", body: "Bebe pelo menos 2L de água por dia. O jejum não exclui a água — ela é essencial para evitar tonturas e dores de cabeça." },
    { icon: "🥗", title: "Refeições leves", body: "Opta por sopas, legumes cozidos, arroz ou grão. Evita refeições pesadas que causam sonolência." },
    { icon: "🚶", title: "Caminhadas", body: "Uma caminhada de 20 min por dia ajuda na disciplina mental e no bem-estar durante o jejum." },
    { icon: "😴", title: "Descanso", body: "O jejum combinado com privação de sono é difícil. Prioriza 7-8 horas de sono para manter a concentração." },
    { icon: "⚠️", title: "Sinais de alerta", body: "Tonturas fortes, náuseas ou palpitações são sinal para comer ou consultar um médico. O jejum não deve prejudicar a saúde." },
];

const MINI_CHALLENGES = [
    { days: 3, label: "3 dias sem açúcar", emoji: "🍬", target: "alimentar" },
    { days: 2, label: "2 dias sem redes sociais", emoji: "📵", target: "digital" },
    { days: 5, label: "5 dias de oração diária", emoji: "🙏", target: "espiritual" },
    { days: 7, label: "1 semana sem reclamar", emoji: "🕊️", target: "comportamental" },
    { days: 3, label: "3 dias de silêncio pessoal", emoji: "🤫", target: "mente" },
    { days: 10, label: "10 dias sem carne", emoji: "🥦", target: "alimentar" },
];

export function FastingGuide() {
    const week = getWeek(new Date()) % 7;
    const weekTheme = WEEKLY_THEMES[week] ?? WEEKLY_THEMES[0];

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Tema semanal */}
            <div className="glass-card rounded-2xl p-4 space-y-2 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tema desta semana</p>
                </div>
                <h3 className="text-xl font-extrabold gradient-text">{weekTheme.theme}</h3>
                <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                    "{weekTheme.verse}"
                </blockquote>
                <p className="text-xs text-primary font-medium">— {weekTheme.ref}</p>
            </div>

            {/* Saúde */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Como jejuar com saúde</p>
                </div>
                <div className="space-y-3">
                    {HEALTH_TIPS.map(tip => (
                        <div key={tip.title} className="flex gap-3">
                            <span className="text-xl shrink-0">{tip.icon}</span>
                            <div>
                                <p className="text-sm font-bold">{tip.title}</p>
                                <p className="text-xs text-muted-foreground">{tip.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mini-desafios */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mini-desafios</p>
                </div>
                <p className="text-xs text-muted-foreground">Escolhe um desafio extra para enriquecer o teu jejum:</p>
                <div className="grid grid-cols-2 gap-2">
                    {MINI_CHALLENGES.map(c => (
                        <div key={c.label}
                            className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-1">
                            <span className="text-xl">{c.emoji}</span>
                            <p className="text-xs font-bold leading-tight">{c.label}</p>
                            <p className="text-[10px] text-muted-foreground">{c.days} dias</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sugestões de refeições */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sugestões de refeições</p>
                </div>
                <div className="space-y-1.5 text-sm">
                    {[
                        "🥣 Aveia com fruta e mel",
                        "🥗 Salada de grão com legumes",
                        "🍲 Sopa de legumes caseira",
                        "🥙 Wrap de atum e alface",
                        "🫘 Feijão com arroz e cenoura",
                        "🍌 Batido de banana e aveia",
                    ].map(item => (
                        <p key={item} className="text-muted-foreground">{item}</p>
                    ))}
                </div>
            </div>
        </div>
    );
}
