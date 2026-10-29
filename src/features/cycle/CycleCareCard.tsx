import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { CycleIcon } from "./CycleIcon";
import { THANKS, ago, latestCare, type CareMessage, type ParsedCare } from "./cycleCare";

const SEEN = (id: string) => `care_done_${id}`;

/** Ela: o carinho que ele mandou nas últimas 24 h, até ela responder. */
export function CycleCareCard({ userId, spaceId, partnerId, partnerName }: {
  userId: string; spaceId: string; partnerId: string; partnerName: string;
}) {
  const navigate = useNavigate();
  const [care, setCare] = useState<{ msg: CareMessage; parsed: ParsedCare } | null>(null);
  const [thanked, setThanked] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    latestCare(spaceId, partnerId, userId).then((r) => {
      if (!alive || !r || r.reply) return;
      let done = false;
      try { done = !!localStorage.getItem(SEEN(r.msg.id)); } catch { /* sem armazenamento */ }
      if (!done) setCare({ msg: r.msg, parsed: r.parsed });
    });
    return () => { alive = false; };
  }, [spaceId, partnerId, userId]);

  if (!care) return null;
  const markDone = () => { try { localStorage.setItem(SEEN(care.msg.id), "1"); } catch { /* sem armazenamento */ } };

  const thank = async () => {
    if (sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ couple_space_id: spaceId, sender_user_id: userId, content: THANKS });
    setSending(false);
    if (error) return;
    markDone();
    setThanked(true);
    notifyPartner({ couple_space_id: spaceId, title: "Recebeste uma resposta", body: THANKS, url: "/ciclo", type: "chat" }).catch(() => {});
  };

  return (
    <section className="rounded-[24px] border border-[#F8D5DE] bg-gradient-to-b from-[#FFF1F4] to-[#FDE7EC] p-3.5 dark:border-rose-900/40 dark:from-rose-950/30 dark:to-rose-950/20">
      <div className="flex items-center gap-2.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-white dark:bg-card">
          <CycleIcon kind={care.parsed.care.icon} size={32} />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#B0244A] dark:text-rose-300">Carinho de {partnerName} · {ago(care.msg.created_at)}</p>
          <p className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">{care.parsed.care.text}</p>
        </div>
      </div>
      {care.parsed.note && <p className="mt-2 text-[13px] leading-snug text-[#3A4150] dark:text-foreground/80">“{care.parsed.note}”</p>}
      {thanked ? (
        <p className="mt-3 animate-fade-in text-[13px] font-semibold text-[#B0244A] dark:text-rose-300">Enviaste “{THANKS}” a {partnerName}.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={thank} disabled={sending}
            className="h-10 flex-1 rounded-[14px] bg-[#0B1324] text-[13.5px] font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-60 dark:bg-foreground dark:text-background">
            {THANKS}
          </button>
          <button type="button" onClick={() => { markDone(); navigate("/chat"); }}
            className="h-10 flex-1 rounded-[14px] border border-[#F3CCD6] bg-white/75 text-[13.5px] font-semibold text-foreground transition-transform active:scale-[0.97] dark:border-border dark:bg-card">
            Responder
          </button>
        </div>
      )}
    </section>
  );
}
