import { cn } from "@/lib/utils";
import { Check, X, Salad, Dumbbell, Heart } from "lucide-react";
import type { CyclePhase } from "./engine";

// ── Conteúdo por fase ────────────────────────────────────────────────────────

interface GuideData {
  what: string;
  feelTags: string[];
  doItems: string[];
  avoidItems: string[];
  nutrition: string[];
  exercise: string;
  partnerTips: string[];
  partnerNote: string;
}

const GUIDE: Partial<Record<CyclePhase, GuideData>> = {
  menstrual: {
    what: "O revestimento do útero é eliminado e os níveis de estrogénio e progesterona atingem o mínimo. É um processo natural de renovação — o corpo faz um reset completo para recomeçar um novo ciclo.",
    feelTags: ["Fadiga", "Cólicas", "Dor lombar", "Sensibilidade emocional", "Introspecção"],
    doItems: [
      "Prioriza o descanso — o corpo está a trabalhar intensamente",
      "Usa calor local na zona abdominal (almofada térmica ou botija)",
      "Bebe chá quente: gengibre, camomila ou canela",
      "Faz movimentos suaves: ioga restaurativo ou caminhada curta",
      "Permite-te ser quieta sem culpa — é o que o corpo pede",
    ],
    avoidItems: [
      "Exercício de alta intensidade",
      "Cafeína e álcool em excesso — agravam as cólicas",
      "Sal em excesso — aumenta a retenção de líquidos",
      "Decisões importantes sob pressão ou stresse desnecessário",
    ],
    nutrition: [
      "Ferro: espinafres, feijão, grão, carne vermelha magra",
      "Magnésio: chocolate escuro, banana, nozes",
      "Anti-inflamatórios: gengibre, cúrcuma, salmão",
      "Muita água e tisanas quentes ao longo do dia",
    ],
    exercise: "Ioga restaurativo, alongamentos suaves ou caminhada leve. O descanso activo conta — ouve o corpo.",
    partnerTips: [
      "Oferece presença sem precisar de resolver nada — a tua companhia já ajuda",
      "Traz chá quente, manta ou almofada térmica sem que ela precise de pedir",
      "Evita discussões ou decisões grandes nesta semana",
      "Pergunta o que ela precisa em vez de assumir",
      "Pequenos gestos (comida favorita, filme, silêncio juntos) fazem muita diferença",
    ],
    partnerNote: "O teu par pode não perceber completamente o que sentes — é normal. Partilha o que precisas, mesmo que seja só estar quietos juntos. A presença dele é o maior apoio.",
  },

  folicular: {
    what: "Os folículos ovarianos desenvolvem-se e o estrogénio aumenta gradualmente. O corpo está em modo de construção — a energia regressa, o humor clarifica e a disposição para o mundo aumenta a cada dia.",
    feelTags: ["Energia crescente", "Optimismo", "Foco", "Criatividade", "Abertura social"],
    doItems: [
      "Começa novos projectos ou retoma o que adiaste",
      "Aproveita para exercício mais intenso — o corpo aguenta bem",
      "Faz planos e toma decisões com clareza",
      "Socializa e conecta-te — estás mais receptiva a tudo",
      "Experimenta coisas novas: lugares, receitas, actividades a dois",
    ],
    avoidItems: [
      "Sobrecarregar a agenda só porque a energia está de volta",
      "Saltar refeições — o metabolismo está mais activo",
      "Ignorar sinais de cansaço na pressa de aproveitar o pico",
    ],
    nutrition: [
      "Proteínas magras: frango, peixe, ovos, tofu",
      "Vegetais crucíferos: brócolos, couve-flor, rúcula",
      "Sementes de linhaça — suportam o equilíbrio hormonal",
      "Alimentos fermentados: iogurte natural, kefir",
    ],
    exercise: "Corrida, musculação, HIIT, dança, desporto. É a fase ideal para desafios e progressão física.",
    partnerTips: [
      "É uma óptima fase para planos a dois e novas experiências juntos",
      "Ela está mais receptiva a conversas e ligação emocional",
      "Propõe actividades que gostem de fazer juntos",
      "A energia dela está a crescer — acompanha-a nessa disposição",
    ],
    partnerNote: "Estás numa das melhores fases do ciclo. A tua energia cresce a cada dia. É um bom momento para investir na vossa ligação e fazer planos juntos.",
  },

  ovulacao: {
    what: "O óvulo é libertado pelo ovário numa janela de 12 a 24 horas. É o pico do estrogénio e do hormônio LH. A janela fértil total abrange alguns dias antes e depois da ovulação.",
    feelTags: ["Energia máxima", "Confiança", "Libido elevada", "Extroversão", "Vitalidade"],
    doItems: [
      "Aproveita a clareza mental para decisões e conversas importantes",
      "Investe na conexão com o teu par — é o melhor momento para intimidade",
      "Exercício de alta intensidade — o corpo está no pico",
      "Socializa, apresenta ideias, lidera projectos",
      "Aprecia este momento de pico — dura apenas alguns dias",
    ],
    avoidItems: [
      "Se não queres engravidar, não descuides a contracepção — é a fase mais fértil",
      "Comprometeres-te a demasiadas coisas (a energia vai baixar depois desta fase)",
    ],
    nutrition: [
      "Vegetais frescos e coloridos de todos os tipos",
      "Antioxidantes: frutos vermelhos, citrinos, tomate",
      "Fibra e alimentos anti-inflamatórios",
      "Sementes de abóbora e girassol",
    ],
    exercise: "Qualquer intensidade — HIIT, corrida, desporto, dança. O corpo aguenta e responde muito bem.",
    partnerTips: [
      "É o melhor momento para intimidade e ligação profunda",
      "A confiança e abertura dela estão no pico — aproveita para estar presente",
      "Propõe conversas importantes — ela está mais disponível emocionalmente",
      "Faz planos, sonhem juntos, planeia algo especial",
    ],
    partnerNote: "Estás no teu pico de energia e vitalidade. É um momento especial para partilhar com o teu par — conexão, intimidade e conversas que importam.",
  },

  luteal: {
    what: "A progesterona sobe para preparar o corpo para uma possível gravidez. Se não há fertilização, os níveis hormonais caem gradualmente, o que pode intensificar a sensibilidade emocional e física nos últimos dias desta fase.",
    feelTags: ["Sensibilidade emocional", "Cansaço crescente", "Desejos alimentares", "Inchaço leve", "Necessidade de calma"],
    doItems: [
      "Pratica actividades relaxantes: ioga, meditação ou banhos quentes",
      "Escreve num diário — ajuda a processar as emoções desta fase",
      "Dorme mais do que o habitual se o corpo pedir",
      "Actividades criativas e calmas: cozinhar, ler, caminhar ao ar livre",
      "Cuida especialmente da alimentação — o que comes afecta directamente como te sentes",
    ],
    avoidItems: [
      "Sal em excesso — piora a retenção de líquidos e o inchaço",
      "Álcool — amplifica a ansiedade e a irritabilidade desta fase",
      "Açúcar refinado — os crashes de energia são mais intensos agora",
      "Conflitos desnecessários nos dias mais próximos da menstruação",
    ],
    nutrition: [
      "Magnésio: chocolate escuro, banana, amêndoas, espinafres",
      "Cálcio: laticínios, brócolos — reduz os sintomas de TPM",
      "Sementes de sésamo e girassol",
      "Evita sal, álcool e açúcar refinado nesta fase",
    ],
    exercise: "Pilates, yoga, natação, caminhadas. Intensidade moderada — actividades que libertem tensão sem esgotar.",
    partnerTips: [
      "Mais paciência e compreensão, especialmente nos dias mais próximos da menstruação",
      "Pergunta o que ela precisa — não assumas o que é melhor",
      "Pequenos gestos de carinho valem muito nesta fase",
      "Evita críticas ou discussões nos dias de maior sensibilidade",
      "As emoções que ela sente são reais, mesmo que intensificadas pelos hormônios — leva-as a sério",
    ],
    partnerNote: "As emoções podem sentir-se mais intensas — é fisiológico, não fraqueza. Comunica ao teu par o que precisas. A compreensão dele é o teu melhor aliado nesta fase.",
  },
};

// ── Estilos por fase ─────────────────────────────────────────────────────────

const PHASE_STYLE: Record<string, {
  dotBg: string;
  tagBg: string;
  checkColor: string;
  xColor: string;
  partnerBg: string;
  partnerBorder: string;
}> = {
  menstrual: {
    dotBg: "bg-rose-500",
    tagBg: "bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
    checkColor: "text-rose-500",
    xColor: "text-muted-foreground/50",
    partnerBg: "bg-rose-50/60 dark:bg-rose-950/20",
    partnerBorder: "border-rose-200/50 dark:border-rose-800/40",
  },
  folicular: {
    dotBg: "bg-sky-400",
    tagBg: "bg-sky-100/80 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300",
    checkColor: "text-sky-500",
    xColor: "text-muted-foreground/50",
    partnerBg: "bg-sky-50/60 dark:bg-sky-950/20",
    partnerBorder: "border-sky-200/50 dark:border-sky-800/40",
  },
  ovulacao: {
    dotBg: "bg-emerald-400",
    tagBg: "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
    checkColor: "text-emerald-500",
    xColor: "text-muted-foreground/50",
    partnerBg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    partnerBorder: "border-emerald-200/50 dark:border-emerald-800/40",
  },
  luteal: {
    dotBg: "bg-violet-400",
    tagBg: "bg-violet-100/80 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300",
    checkColor: "text-violet-500",
    xColor: "text-muted-foreground/50",
    partnerBg: "bg-violet-50/60 dark:bg-violet-950/20",
    partnerBorder: "border-violet-200/50 dark:border-violet-800/40",
  },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  phase: CyclePhase;
  isMale: boolean;
}

export function CyclePhaseGuide({ phase, isMale }: Props) {
  const data = GUIDE[phase];
  if (!data) return null;

  const style = PHASE_STYLE[phase] ?? PHASE_STYLE.menstrual;

  return (
    <div className="space-y-4">

      {/* ── O que está a acontecer ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center gap-2.5">
          <span className={cn("w-2 h-2 rounded-full shrink-0", style.dotBg)} />
          <SectionLabel>
            {isMale ? "O que está a acontecer com ela" : "O que está a acontecer"}
          </SectionLabel>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{data.what}</p>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
              {isMale ? "Como ela pode sentir-se" : "Como podes sentir-te"}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.feelTags.map((tag) => (
                <span
                  key={tag}
                  className={cn("px-3 py-1 rounded-full text-[11px] font-medium", style.tagBg)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── O que fazer ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <SectionLabel>{isMale ? "O que ela pode fazer para se sentir melhor" : "O que fazer"}</SectionLabel>
        </div>
        <div className="p-5">
          <ul className="space-y-3">
            {data.doItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className={cn("h-4 w-4 shrink-0 mt-0.5", style.checkColor)} strokeWidth={2} />
                <span className="text-sm text-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── O que evitar ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <SectionLabel>{isMale ? "O que ela deve evitar" : "O que evitar"}</SectionLabel>
        </div>
        <div className="p-5">
          <ul className="space-y-3">
            {data.avoidItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <X className={cn("h-4 w-4 shrink-0 mt-0.5", style.xColor)} strokeWidth={2} />
                <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Alimentação & Movimento ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <SectionLabel>Alimentação & Movimento</SectionLabel>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Salad className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Alimentação
              </p>
            </div>
            <ul className="space-y-2">
              {data.nutrition.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Movimento
              </p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{data.exercise}</p>
          </div>
        </div>
      </div>

      {/* ── Para o par ── */}
      <div className={cn("glass-card overflow-hidden border", style.partnerBorder)}>
        <div className={cn("px-5 pt-5 pb-3 border-b border-border flex items-center gap-2", style.partnerBg)}>
          <Heart className="h-4 w-4 text-rose-400" strokeWidth={1.5} />
          <SectionLabel>{isMale ? "Como apoiar" : "Para o teu par"}</SectionLabel>
        </div>
        <div className={cn("p-5", style.partnerBg)}>
          {isMale ? (
            <ul className="space-y-3">
              {data.partnerTips.map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{data.partnerNote}</p>
          )}
        </div>
      </div>

    </div>
  );
}
