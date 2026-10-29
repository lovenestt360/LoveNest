import guardiao from "@/features/entry/assets/guardiao.webp";

const HEART = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";

const POINTS = [
  {
    tint: "bg-[#EAF1FF] dark:bg-sky-950/40",
    art: (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <defs><linearGradient id="lo-pin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7AA2FF" /><stop offset="1" stopColor="#3B6FF5" /></linearGradient></defs>
        <path d="M12 22s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12Z" fill="url(#lo-pin)" /><circle cx="12" cy="10" r="2.8" fill="#fff" />
      </svg>
    ),
    title: "Vejam-se no mapa",
    body: "Cada um vê onde o outro está, em tempo real.",
  },
  {
    tint: "bg-[#FFEFF3] dark:bg-rose-950/40",
    art: <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} fill="#E8456B" /></svg>,
    title: "Só vocês os dois",
    body: "Mais ninguém vê. E só vês o teu par se ele também partilhar.",
  },
  {
    tint: "bg-[#EEF8F1] dark:bg-emerald-950/40",
    art: <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="4.5" height="16" rx="2" fill="#23A15A" /><rect x="14.5" y="4" width="4.5" height="16" rx="2" fill="#23A15A" /></svg>,
    title: "Tu decides",
    body: "Pausa por uma hora, até amanhã, ou desliga quando quiseres.",
  },
];

/** Boas-vindas à localização (maqueta docs/mockups/localizacao-pagina-proposta.html). */
export function LocationOnboarding({ sharing, onActivate, onClose }: { sharing: boolean; onActivate: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1324]/40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]">
      <div className="w-full max-w-sm rounded-[30px] bg-white px-5 pb-5 text-center shadow-2xl animate-in slide-in-from-bottom-4 duration-300 dark:bg-card">
        <img src={guardiao} alt="" className="mx-auto -mt-12 h-[104px] w-[104px] object-contain drop-shadow-[0_12px_18px_rgba(59,130,246,0.25)]" />
        <h2 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-foreground">Onde estamos</h2>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Perto um do outro, mesmo quando estão longe.</p>

        <div className="mt-5 grid gap-3 text-left">
          {POINTS.map((pt) => (
            <div key={pt.title} className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${pt.tint}`}>{pt.art}</span>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{pt.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{pt.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={onActivate}
          className="mt-5 h-[50px] w-full rounded-[17px] bg-[#0B1324] text-[15px] font-semibold text-white transition-transform active:scale-[0.98] dark:bg-foreground dark:text-background">
          {sharing ? "Vamos lá" : "Ativar a partilha"}
        </button>
        {!sharing && (
          <button type="button" onClick={onClose} className="mt-3 text-[13.5px] font-semibold text-muted-foreground">
            Agora não
          </button>
        )}
      </div>
    </div>
  );
}
