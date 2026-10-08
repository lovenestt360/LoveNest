import {
  BookOpen,
  CalendarDays,
  Flower2,
  Library,
  MapPinned,
} from "lucide-react";
import { FeatureHub, type HubSection } from "@/components/FeatureHub";
import { useProfile } from "@/hooks/useProfile";

export default function VidaHub() {
  const { profile, loading } = useProfile();

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[1.6rem] bg-muted/60" />;
  }

  const isSolo = profile?.usage_mode === "solo";
  const hideCycle = isSolo && profile?.gender === "male";
  const hasSpiritual = profile?.religion !== "none";

  const sections: HubSection[] = [
    {
      title: "Organizar",
      description: "O que precisam coordenar sem transformar a relação em produtividade.",
      items: [
        {
          to: "/plano",
          title: "Plano",
          description: "Agenda, rotinas e coisas que querem fazer juntos.",
          icon: CalendarDays,
          tone: "indigo",
        },
        ...(!isSolo
          ? [{
              to: "/localizacao",
              title: "Localização",
              description: "Partilha de localização quando fizer sentido para vocês.",
              icon: MapPinned,
              tone: "emerald" as const,
            }]
          : []),
      ],
    },
    {
      title: "Cuidar",
      items: [
        ...(!hideCycle
          ? [{
              to: "/ciclo",
              title: "Ciclo",
              description: "Informação e contexto para viver esta fase com mais compreensão.",
              icon: Flower2,
              tone: "rose" as const,
            }]
          : []),
        ...(hasSpiritual
          ? [{
              to: "/jornada-espiritual",
              title: "Jornada Espiritual",
              description: "Oração, jejum e práticas alinhadas com a vossa fé.",
              icon: BookOpen,
              tone: "orange" as const,
            }]
          : []),
      ],
    },
    {
      title: "Descobrir",
      items: [
        {
          to: "/biblioteca",
          title: "Biblioteca",
          description: "Leituras e reflexões para aprofundar conversas importantes.",
          icon: Library,
          tone: "slate",
        },
      ],
    },
  ];

  return (
    <FeatureHub
      eyebrow="Vida real"
      title="Vida"
      subtitle={
        isSolo
          ? "Organização, conhecimento e cuidado num só lugar."
          : "Organização, contexto e ferramentas práticas para a vida que vocês partilham."
      }
      sections={sections}
    />
  );
}
