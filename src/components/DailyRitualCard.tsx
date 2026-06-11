import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ritual {
  question: string;
  emoji: string;
  to: string;
  label: string;
  bg: string;
  border: string;
  accent: string;
}

const RITUALS: Ritual[] = [
  {
    question: "O que te fez sorrir hoje?",
    emoji: "😊",
    to: "/humor",
    label: "Partilhar o meu humor",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-100 dark:border-amber-800/40",
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    question: "O que mais aprecia no teu par neste momento?",
    emoji: "🙏",
    to: "/oracao",
    label: "Gratidão de casal",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-100 dark:border-purple-800/40",
    accent: "text-purple-700 dark:text-purple-300",
  },
  {
    question: "Como está o teu coração hoje?",
    emoji: "💛",
    to: "/humor",
    label: "Registar o meu estado",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-100 dark:border-rose-800/40",
    accent: "text-rose-700 dark:text-rose-300",
  },
  {
    question: "Que memória queres guardar desta semana?",
    emoji: "📸",
    to: "/memorias",
    label: "Ver as nossas memórias",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-100 dark:border-violet-800/40",
    accent: "text-violet-700 dark:text-violet-300",
  },
  {
    question: "Que gesto pequeno podes fazer hoje pelo teu par?",
    emoji: "❤️",
    to: "/desafios",
    label: "Ver desafios de casal",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-100 dark:border-rose-800/40",
    accent: "text-rose-600 dark:text-rose-300",
  },
  {
    question: "O que sentes que o teu par precisa hoje?",
    emoji: "✨",
    to: "/chat",
    label: "Enviar uma mensagem",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-100 dark:border-sky-800/40",
    accent: "text-sky-700 dark:text-sky-300",
  },
  {
    question: "Como podem surpreender-se um ao outro hoje?",
    emoji: "🎁",
    to: "/descobrir",
    label: "Explorar juntos",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-100 dark:border-emerald-800/40",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
];

function getTodayRitual(): Ritual {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return RITUALS[dayOfYear % RITUALS.length];
}

export function DailyRitualCard() {
  const navigate = useNavigate();
  const ritual = getTodayRitual();

  return (
    <button
      onClick={() => navigate(ritual.to)}
      className={cn(
        "w-full text-left p-4 rounded-[1.5rem] border transition-all active:scale-[0.98]",
        "animate-in fade-in slide-in-from-bottom-2 duration-700",
        ritual.bg,
        ritual.border
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5 shrink-0">{ritual.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/65 mb-1">
            Ritual do dia
          </p>
          <p className={cn("text-[13px] font-semibold leading-snug", ritual.accent)}>
            {ritual.question}
          </p>
        </div>
        <div className={cn(
          "shrink-0 mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center",
          "bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10"
        )}>
          <ArrowRight className={cn("w-3.5 h-3.5", ritual.accent)} strokeWidth={2} />
        </div>
      </div>
      <p className={cn(
        "text-[11px] font-medium mt-2.5 pl-[calc(2rem+12px)]",
        ritual.accent, "opacity-70"
      )}>
        {ritual.label}
      </p>
    </button>
  );
}
