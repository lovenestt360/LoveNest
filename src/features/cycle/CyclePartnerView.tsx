import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import guardiao from "@/features/entry/assets/guardiao.webp";
import { notifyPartner } from "@/lib/notifyPartner";
import { cn } from "@/lib/utils";
import type { CyclePhase } from "./engine";
import type { CycleData } from "./useCycleData";
import { CycleIcon } from "./CycleIcon";
import type { CycleIconKind } from "./cycleIconsSvg";
import { CycleRing } from "./CycleRing";
import { btnGhost, btnInk } from "./CycleSheet";
import { CARD, CARD_TITLE, PHASE_CHIP, PMS_CHIP, SymptomTile, fmtDay } from "./cycleUi";

// O que ajuda nesta fase — gestos concretos, sem jargão.
const TIPS: Record<CyclePhase, { icon: CycleIconKind; text: string }[]> = {
  menstrual: [
    { icon: "cha", text: "Um chá quente e uma botija para as cólicas" },
    { icon: "cansaco", text: "Trata tu das tarefas de hoje para ela descansar" },
    { icon: "intimidade", text: "Pergunta como ela está e ouve com calma" },
  ],
  folicular: [
    { icon: "radiante", text: "Costuma ter mais energia: bom momento para planos a dois" },
    { icon: "calendario", text: "Marca aquele passeio que têm adiado" },
    { icon: "intimidade", text: "Um elogio sem razão especial" },
  ],
  ovulacao: [
    { icon: "radiante", text: "Fase de mais confiança e energia" },
    { icon: "desejo", text: "Um encontro especial, só os dois" },
    { icon: "intimidade", text: "Tempo juntos, sem telemóveis" },
  ],
  luteal: [
    { icon: "cha", text: "Um chá quente e um serão calmo em casa" },
    { icon: "desejos", text: "Aquele doce de que ela gosta" },
    { icon: "sensivel", text: "Paciência extra e ouvir sem resolver" },
  ],
  sem_dados: [],
};

const CARINHO = "Estou aqui contigo. Se precisares de alguma coisa, é só dizeres.";

/** Ecrã de quem acompanha o ciclo da parceira. `preview` é a pré-visualização dela. */
export function CyclePartnerView({ data, herName, preview }: { data: CycleData; herName: string; preview?: boolean }) {
  const navigate = useNavigate();
  const { engine: e, profile, todaySymptoms: s, openPeriod, lastPeriod, user, spaceId } = data;
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const isPrivate = !profile || profile.share_level === "private" || !e || !lastPeriod;
  if (isPrivate) {
    // Partilhado mas ainda sem nenhum período registado conta como "ainda não começou".
    const notStarted = !profile || (profile.share_level !== "private" && (!e || !lastPeriod));
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
        <img src={guardiao} alt="" className="h-28 w-28 object-contain drop-shadow-[0_10px_16px_rgba(59,130,246,0.2)]" />
        <h2 className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-foreground">
          {notStarted ? `A ${herName} ainda não começou` : `O ciclo da ${herName} é só dela`}
        </h2>
        <p className="mx-auto mt-1.5 max-w-[32ch] text-[14px] leading-normal text-muted-foreground">
          {notStarted
            ? "Quando ela começar a acompanhar o ciclo e quiser partilhar, vais ver aqui como ela está."
            : "Ela preferiu não partilhar. E está tudo bem. Se quiseres saber como ela está, pergunta-lhe com carinho."}
        </p>
        {!preview && <button type="button" onClick={() => navigate("/chat")} className={cn(btnGhost, "mt-5 max-w-[280px]")}>Ir para o Chat</button>}
      </div>
    );
  }

  const phase: CyclePhase = openPeriod ? "menstrual" : e.phase;
  const chip = e.isInPmsWindow && !openPeriod ? PMS_CHIP : PHASE_CHIP[phase];
  const n = e.daysUntilNextPeriod;
  const headline = openPeriod ? "Está com o período"
    : n > 1 ? `Período daqui a ${n} dias` : n === 1 ? "Período previsto para amanhã" : n === 0 ? "Período previsto para hoje" : "O período está atrasado";

  // Só um resumo do dia, e só se ela escolheu partilhar "como estou".
  const signals: { icon: CycleIconKind; label: string }[] = [];
  if (profile.share_level === "summary_signals" && s) {
    if (s.cramps || s.headache || s.back_pain) signals.push({ icon: "colicas", label: "Com dores" });
    if (s.fatigue) signals.push({ icon: "cansaco", label: "Cansada" });
    if (s.sensitivity || s.anxiety || s.irritability || s.sadness) signals.push({ icon: "sensivel", label: "Sensível" });
    if ((s.energy_level ?? 5) >= 8) signals.push({ icon: "radiante", label: "Com energia" });
  }

  const sendCare = async () => {
    if (preview || !user || !spaceId || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ couple_space_id: spaceId, sender_user_id: user.id, content: CARINHO });
    if (!error) {
      notifyPartner({ couple_space_id: spaceId, title: "Recebeste carinho!", body: CARINHO, url: "/chat", type: "chat" }).catch(() => {});
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="space-y-3.5">
      <section className={cn(CARD, "flex items-center gap-4")}>
        <CycleRing engine={e} lastPeriodDate={lastPeriod.start_date} size={110}>
          <span className="text-[12px] font-semibold text-muted-foreground">Dia</span>
          <span className="text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">{e.cycleDay}</span>
        </CycleRing>
        <div className="min-w-0">
          <span className={cn("inline-block rounded-full px-2.5 py-1 text-[12.5px] font-semibold", chip.cls)}>{chip.label}</span>
          <p className="mt-2 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-foreground">{headline}</p>
          {!openPeriod && n >= 0 && <p className="mt-0.5 text-[12.5px] text-muted-foreground">Previsto para {fmtDay(e.nextPeriodStr)}</p>}
        </div>
      </section>

      {profile.share_level === "summary_signals" && (
        <section className={CARD}>
          <h3 className={cn(CARD_TITLE, "mb-3")}>Como ela está hoje</h3>
          {signals.length ? (
            <div className="flex flex-wrap gap-3">
              {signals.map((x) => <SymptomTile key={x.label} icon={x.icon} label={x.label} />)}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Ela ainda não registou como está hoje.</p>
          )}
        </section>
      )}

      {TIPS[phase].length > 0 && (
        <section className="rounded-[24px] border border-[#E1EAF9] bg-[#F3F7FE] p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D4FA8] dark:text-sky-300">O que pode ajudar agora</h3>
          <ul className="mt-2.5 grid gap-2">
            {TIPS[phase].map((t) => (
              <li key={t.text} className="flex items-center gap-2.5 text-[13.5px] text-[#3A4150] dark:text-foreground/80">
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] bg-white dark:bg-card"><CycleIcon kind={t.icon} size={22} /></span>
                {t.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" disabled={preview || sending || sent} onClick={sendCare} className={btnInk}>
        {sent ? "Carinho enviado" : "Mandar um carinho →"}
      </button>
      {sent && <p className="text-center text-[12.5px] text-muted-foreground">Enviado para o Chat: “{CARINHO}”</p>}
    </div>
  );
}
