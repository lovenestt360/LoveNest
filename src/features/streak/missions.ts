import { MessageCircle, Zap, Smile, BookHeart, Library, CalendarDays, type LucideIcon } from "lucide-react";

// Fonte única das 4 missões diárias da Chama — usada pelo widget
// "Faísca" da Home e pela aba "Gestos" de /lovestreak. Antes cada um
// mantinha a sua própria lista à mão e divergiam (ex: um casal com
// religião via "Leitura" num sítio e "Oração" no outro). A missão
// social varia com isSolo (sem parceiro para conversar, troca para
// Plano); a missão espiritual varia com hasSpiritual (sem religião,
// troca para Leitura).
export type MissionId = "message" | "plano" | "checkin" | "mood" | "prayer" | "leitura";

export interface MissionDef {
  id: MissionId;
  title: string;
  description: string;
  points: number;
  Icon: LucideIcon;
  doneColor: string;
}

function getSocialMission(isSolo: boolean): MissionDef {
  return isSolo
    ? { id: "plano", title: "Plano", description: "Marca a tua rotina de hoje", points: 10, Icon: CalendarDays, doneColor: "text-blue-500" }
    : { id: "message", title: "Chat", description: "Enviem uma mensagem hoje", points: 10, Icon: MessageCircle, doneColor: "text-sky-500" };
}

function getSpiritualMission(isSolo: boolean, hasSpiritual: boolean): MissionDef {
  if (hasSpiritual) {
    return { id: "prayer", title: "Oração", description: "Dedica um momento à oração hoje", points: 5, Icon: BookHeart, doneColor: "text-purple-500" };
  }
  return {
    id: "leitura", title: "Leitura",
    description: isSolo ? "Lê um pouco de um livro na Biblioteca" : "Leiam um pouco de um livro na Biblioteca",
    points: 5, Icon: Library, doneColor: "text-violet-500",
  };
}

export function getDailyMissions(opts: { isSolo: boolean; hasSpiritual: boolean }): MissionDef[] {
  const { isSolo, hasSpiritual } = opts;
  return [
    getSocialMission(isSolo),
    {
      id: "checkin", title: "Presença",
      description: isSolo ? "Diz que estás presente hoje" : "Digam ao outro que estão presentes hoje",
      points: 10, Icon: Zap, doneColor: "text-rose-500",
    },
    {
      id: "mood", title: "Sentimento",
      description: isSolo ? "Regista como estás, de coração" : "Partilhem como estão, de coração",
      points: 5, Icon: Smile, doneColor: "text-pink-400",
    },
    getSpiritualMission(isSolo, hasSpiritual),
  ];
}
