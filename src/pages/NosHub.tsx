import {
  CalendarHeart,
  Clock3,
  Flame,
  HeartHandshake,
  Images,
  MessageCircleHeart,
  Sparkles,
  Trophy,
} from "lucide-react";
import { FeatureHub, type HubSection } from "@/components/FeatureHub";
import { useProfile } from "@/hooks/useProfile";

export default function NosHub() {
  const { profile, loading } = useProfile();
  const isSolo = profile?.usage_mode === "solo";

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[1.6rem] bg-muted/60" />;
  }

  if (isSolo) {
    const soloSections: HubSection[] = [
      {
        title: "O teu dia interior",
        items: [
          {
            to: "/humor",
            title: "Humor",
            description: "Regista como te sentes e acompanha os teus dias.",
            icon: MessageCircleHeart,
            tone: "rose",
          },
          {
            to: "/momentos",
            title: "Momentos",
            description: "Guarda pequenas coisas que não queres perder.",
            icon: Sparkles,
            tone: "indigo",
          },
          {
            to: "/jornada",
            title: "Jornada",
            description: "Acompanha a tua consistência e o caminho que estás a construir.",
            icon: Flame,
            tone: "orange",
          },
        ],
      },
    ];

    return (
      <FeatureHub
        eyebrow="O teu espaço"
        title="Eu"
        subtitle="Reflexão, momentos e consistência sem transformar autocuidado numa lista de tarefas."
        sections={soloSections}
      />
    );
  }

  const sections: HubSection[] = [
    {
      title: "A vossa história",
      description: "O que vivem e querem guardar.",
      items: [
        {
          to: "/momentos",
          title: "Momentos",
          description: "Pequenos registos do que aconteceu entre vocês.",
          icon: Sparkles,
          tone: "rose",
        },
        {
          to: "/memorias",
          title: "Memórias",
          description: "Fotos e recordações que merecem ficar.",
          icon: Images,
          tone: "indigo",
        },
        {
          to: "/historia",
          title: "Nossa História",
          description: "Datas, capítulos e acontecimentos importantes da relação.",
          icon: CalendarHeart,
          tone: "orange",
        },
      ],
    },
    {
      title: "Crescer juntos",
      description: "Ferramentas para cuidar da relação, não para a medir.",
      items: [
        {
          to: "/jornada",
          title: "Jornada",
          description: "A chama, os níveis e a presença que constroem juntos.",
          icon: Flame,
          tone: "orange",
        },
        {
          to: "/desafios",
          title: "Desafios",
          description: "Ideias simples para saírem da rotina a dois.",
          icon: Trophy,
          tone: "emerald",
        },
        {
          to: "/conflitos",
          title: "Conflitos",
          description: "Um espaço mais calmo para falar do que ficou por resolver.",
          icon: HeartHandshake,
          tone: "rose",
        },
      ],
    },
    {
      title: "Para mais tarde",
      items: [
        {
          to: "/capsula",
          title: "Cápsula do Tempo",
          description: "Guardem algo agora para voltarem a abrir no futuro.",
          icon: Clock3,
          tone: "indigo",
        },
        {
          to: "/wrapped",
          title: "LoveWrapped",
          description: "Revisitem um mês da vossa história em conjunto.",
          icon: Sparkles,
          tone: "rose",
        },
      ],
    },
  ];

  return (
    <FeatureHub
      eyebrow="O que é vosso"
      title="Nós"
      subtitle="Memórias, crescimento e história organizados como uma experiência — não como um menu de funções."
      sections={sections}
    />
  );
}
