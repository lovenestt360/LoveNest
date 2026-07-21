import { Shield, Eye, PowerOff, MapPin } from "lucide-react";

const STEPS = [
  {
    Icon: MapPin,
    title: "Sente a presença um do outro",
    body: "Quando ativares, o teu par vê onde estás em tempo real. Tu vês onde ele está.",
  },
  {
    Icon: Eye,
    title: "Só vocês dois veem",
    body: "Nenhuma outra pessoa tem acesso à vossa localização. É só entre vocês.",
  },
  {
    Icon: Shield,
    title: "Controlo total",
    body: "Podes pausar ou desativar a qualquer momento, diretamente nesta página.",
  },
  {
    Icon: PowerOff,
    title: "Consentimento mútuo",
    body: "Cada um escolhe se quer partilhar. Só vês o par se ele também tiver ativado.",
  },
];

interface Props {
  onClose: () => void;
}

export function LocationOnboarding({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-rose-300 via-rose-400 to-rose-300" />

        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-[18px] font-bold text-foreground">Onde Estamos</p>
            <p className="text-[12px] text-muted-foreground/70">
              Ligados, mesmo quando estão longe.
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map(({ Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-foreground">{title}</p>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-rose-400 text-white text-[14px] font-semibold active:scale-95 transition-all shadow-sm shadow-rose-200 dark:shadow-rose-900/30"
          >
            Percebido, vamos lá
          </button>
        </div>
      </div>
    </div>
  );
}
