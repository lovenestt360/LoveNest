import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { cn } from "@/lib/utils";
import { CycleIcon } from "./CycleIcon";
import {
  CARE_EVENT, THANKS, ago, isCareDone, markCareDone, markCareSeen, pendingCare, type CareMessage, type ParsedCare,
} from "./cycleCare";

/** Ela: o carinho que ele mandou nas últimas 24 h, até ela responder ou fechar. */
export function CycleCareCard({ userId, spaceId, partnerName }: { userId: string; spaceId: string; partnerName: string }) {
  const navigate = useNavigate();
  const [care, setCare] = useState<{ msg: CareMessage; parsed: ParsedCare } | null>(null);
  const [thanked, setThanked] = useState(false);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Procura ao abrir e sempre que chega um carinho novo em tempo real.
  useEffect(() => {
    let alive = true;
    const load = () => pendingCare(spaceId, userId).then((r) => {
      if (!alive || !r || isCareDone(r.msg.id)) return;
      markCareSeen(r.msg.id);
      setThanked(false);
      setLeaving(false);
      setCare(r);
    });
    load();
    window.addEventListener(CARE_EVENT, load);
    return () => { alive = false; window.removeEventListener(CARE_EVENT, load); };
  }, [spaceId, userId]);

  if (!care) return null;

  const close = () => {
    markCareDone(care.msg.id);
    setLeaving(true);
    window.setTimeout(() => setCare(null), 260);
  };

  const thank = async () => {
    if (sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ couple_space_id: spaceId, sender_user_id: userId, content: THANKS });
    setSending(false);
    if (error) return;
    markCareDone(care.msg.id);
    setThanked(true);
    notifyPartner({ couple_space_id: spaceId, title: "Recebeste uma resposta", body: THANKS, url: "/ciclo", type: "chat" }).catch(() => {});
  };

  return (
    <section key={care.msg.id}
      className={cn("relative rounded-[24px] border border-[#F8D5DE] bg-gradient-to-b from-[#FFF1F4] to-[#FDE7EC] p-3.5 dark:border-rose-900/40 dark:from-rose-950/30 dark:to-rose-950/20",
        leaving ? "animate-care-out" : "motion-safe:animate-care-in")}>
      <button type="button" onClick={close} aria-label="Fechar"
        className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full text-[#B0244A]/70 transition-colors hover:bg-white/70 active:scale-90 dark:text-rose-300/80 dark:hover:bg-card">
        <X className="h-4 w-4" strokeWidth={2.2} />
      </button>
      <div className="flex items-center gap-2.5 pr-8">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-white motion-safe:animate-[mood-pop_0.6s_cubic-bezier(.34,1.56,.64,1)_0.25s_both] dark:bg-card">
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
          <button type="button" onClick={() => { markCareDone(care.msg.id); navigate("/chat"); }}
            className="h-10 flex-1 rounded-[14px] border border-[#F3CCD6] bg-white/75 text-[13.5px] font-semibold text-foreground transition-transform active:scale-[0.97] dark:border-border dark:bg-card">
            Responder
          </button>
        </div>
      )}
    </section>
  );
}
