import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGlyph } from "@/features/home/FeatureIcon";
import guardiao from "@/features/entry/assets/guardiao.webp";
import { notifyPartner } from "@/lib/notifyPartner";
import { cn } from "@/lib/utils";
import type { CyclePhase } from "./engine";
import type { CycleData } from "./useCycleData";
import { CycleIcon } from "./CycleIcon";
import type { CycleIconKind } from "./cycleIconsSvg";
import { CycleRing } from "./CycleRing";
import { btnGhost, btnInk, picked } from "./CycleSheet";
import { CARD, CARD_TITLE, PHASE_CHIP, PHASE_GLYPH, PMS_CHIP, SymptomTile, fmtDay } from "./cycleUi";
import { CARE, NOTE_MAX, ago, careMessage, latestCare, type CareMessage, type ParsedCare } from "./cycleCare";

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

/** Ecrã de quem acompanha o ciclo da parceira. */
export function CyclePartnerView({ data, herName, myName }: { data: CycleData; herName: string; myName?: string }) {
  const navigate = useNavigate();
  const { engine: e, profile, todaySymptoms: s, openPeriod, lastPeriod, today } = data;

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
        <button type="button" onClick={() => navigate("/chat")} className={cn(btnGhost, "mt-5 max-w-[280px]")}>Ir para o Chat</button>
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
    if (s.cramps || s.headache || s.back_pain || s.leg_pain) signals.push({ icon: "colicas", label: "Com dores" });
    if (s.fatigue || s.weakness) signals.push({ icon: "cansaco", label: "Cansada" });
    if (s.sensitivity || s.anxiety || s.irritability || s.sadness || s.crying || s.mood_swings) signals.push({ icon: "sensivel", label: "Sensível" });
    if ((s.energy_level ?? 5) >= 8) signals.push({ icon: "radiante", label: "Com energia" });
  }

  return (
    <div className="space-y-3.5">
      <CycleRing engine={e} lastPeriodDate={lastPeriod.start_date} today={today}
        periodDays={openPeriod ? Math.max(e.cycleDay, e.periodLength) : undefined}
        below={(
          <>
            <p className="mt-1.5 text-center text-[17px] font-semibold tracking-[-0.02em] text-foreground">{headline}</p>
            {!openPeriod && n >= 0 && <p className="mt-0.5 text-center text-[13px] text-muted-foreground">Previsto para {fmtDay(e.nextPeriodStr)}</p>}
          </>
        )}>
        <FeatureGlyph kind={PHASE_GLYPH[phase]} size={30} />
        <span className="mt-1 text-[46px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">Dia {e.cycleDay}</span>
        <span className={cn("mt-2 rounded-full px-3 py-1 text-[13px] font-semibold", chip.cls)}>{chip.label}</span>
      </CycleRing>

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

      <SendCare data={data} herName={herName} myName={myName} />

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
    </div>
  );
}

/** Ele escolhe um gesto (e uma frase, se quiser); ela recebe no Ciclo e no Chat. */
function SendCare({ data, herName, myName }: { data: CycleData; herName: string; myName?: string }) {
  const navigate = useNavigate();
  const { user, spaceId, targetUserId } = data;
  const [choice, setChoice] = useState(CARE[0].id);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [last, setLast] = useState<{ msg: CareMessage; parsed: ParsedCare; reply: CareMessage | null } | null>(null);
  const [another, setAnother] = useState(false);

  // O último carinho de hoje e a resposta dela; volta a ver quando a app regressa ao ecrã.
  useEffect(() => {
    if (!user || !spaceId || !targetUserId) return;
    let alive = true;
    const load = () => latestCare(spaceId, user.id, targetUserId).then((r) => { if (alive) setLast(r); });
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVisible); };
  }, [user, spaceId, targetUserId]);

  const chosen = CARE.find((c) => c.id === choice)!;

  const send = async () => {
    if (!user || !spaceId || !targetUserId || sending) return;
    setSending(true);
    const content = careMessage(chosen.text, note);
    const { data: row, error } = await supabase.from("messages")
      .insert({ couple_space_id: spaceId, sender_user_id: user.id, content })
      .select("id, created_at, sender_user_id, content").single();
    setSending(false);
    if (error || !row) return;
    notifyPartner({
      couple_space_id: spaceId, title: myName ? `Carinho de ${myName}` : "Recebeste um carinho",
      body: chosen.text, url: "/ciclo", type: "chat",
    }).catch(() => {});
    setLast({ msg: row as CareMessage, parsed: { care: chosen, note: note.trim() || null }, reply: null });
    setNote("");
    setAnother(false);
  };

  if (last && !another) {
    return (
      <section className={cn(CARD, "space-y-3")}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-[#FDECEF] dark:bg-rose-950/40">
            <CycleIcon kind={last.parsed.care.icon} size={30} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[12.5px] font-semibold text-[#23733F]">
              <Check className="h-3.5 w-3.5" strokeWidth={2.6} />Carinho enviado · {ago(last.msg.created_at)}
            </p>
            <p className="text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">{last.parsed.care.text}</p>
          </div>
        </div>
        {last.reply ? (
          <div className="rounded-[16px] bg-[#FDECEF] px-3.5 py-2.5 dark:bg-rose-950/30">
            <p className="text-[12px] text-[#B0244A] dark:text-rose-300">A {herName} respondeu · {ago(last.reply.created_at)}</p>
            <p className="text-[14px] font-semibold text-foreground">{last.reply.content}</p>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">A {herName} recebeu um aviso e vê-o no Ciclo e no Chat.</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => setAnother(true)} className={cn(btnGhost, "h-11 flex-1 text-[14px]")}>Mandar outro</button>
          <button type="button" onClick={() => navigate("/chat")} className={cn(btnGhost, "h-11 flex-1 text-[14px]")}>Ir para o Chat</button>
        </div>
      </section>
    );
  }

  return (
    <section className={CARD}>
      <h3 className={CARD_TITLE}>Mandar um carinho</h3>
      <p className="mb-3 mt-0.5 text-[12.5px] text-muted-foreground">A {herName} recebe no Ciclo e no Chat.</p>
      <div role="radiogroup" aria-label="Escolhe um carinho" className="grid grid-cols-3 gap-2">
        {CARE.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={choice === c.id} onClick={() => setChoice(c.id)}
            className={cn("flex flex-col items-center gap-1.5 rounded-[18px] border border-[#ECE8E3] px-1 pb-2.5 pt-3 text-center text-[11.5px] font-semibold leading-tight text-[#3A4150] transition-[border-color,box-shadow,transform] duration-200 active:scale-95 dark:border-border dark:text-foreground/80",
              choice === c.id && cn(picked, "-translate-y-0.5 text-[#0B1324] dark:text-foreground"))}>
            <CycleIcon kind={c.icon} size={32} />{c.label}
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-[16px] bg-[#F7F5F2] px-3.5 py-2.5 text-[13px] leading-snug text-[#3A4150] dark:bg-muted dark:text-foreground/80">
        Ela vai receber: <span className="font-semibold text-foreground">{chosen.text}</span>
      </p>
      <input value={note} onChange={(ev) => setNote(ev.target.value.slice(0, NOTE_MAX))} placeholder="Juntar uma frase tua (opcional)"
        className="mt-2 h-11 w-full rounded-[14px] border border-[#ECE8E3] bg-white px-3.5 text-[14px] text-foreground outline-none placeholder:text-[#77736C] focus:border-[#0B1324] dark:border-border dark:bg-card" />
      <button type="button" onClick={send} disabled={sending} className={cn(btnInk, "mt-3")}>
        {sending ? "A enviar…" : "Enviar carinho"}
      </button>
      {last && <button type="button" onClick={() => setAnother(false)} className="mt-2 w-full text-center text-[13px] font-semibold text-muted-foreground">Cancelar</button>}
    </section>
  );
}
