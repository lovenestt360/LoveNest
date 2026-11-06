import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";
import "./epay.css";

/* Ecrãs que bloqueiam a app: suspensão, subscrição terminada e teste terminado. */

const CTA = "flex h-[54px] w-full items-center justify-center rounded-[17px] bg-[#0B1324] text-[16px] font-semibold text-white transition-transform active:scale-[0.99] dark:bg-foreground dark:text-background";

function Frame({ figure, title, text, action, foot }: { figure: React.ReactNode; title: string; text: string; action?: React.ReactNode; foot?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-background px-6 pb-8 pt-8 text-center">
      <div className="flex-1" />
      {figure}
      <h1 className="mt-5 max-w-sm text-[28px] font-extrabold leading-[1.1] tracking-[-0.035em] text-foreground">{title}</h1>
      <p className="mt-3 max-w-[32ch] whitespace-pre-line text-[15.5px] leading-[1.5] text-muted-foreground">{text}</p>
      <div className="flex-1" />
      <div className="w-full max-w-sm">
        {action}
        {foot && <p className="mx-auto mt-3 max-w-[32ch] text-[13px] leading-[1.45] text-muted-foreground">{foot}</p>}
      </div>
    </div>
  );
}

const Mascot = () => <img src={faisca} alt="" className="ep-bob h-auto w-[112px]" />;
const toPlans = () => window.location.assign("/subscricao");

export function SuspendedForPayment() {
  return (
    <Frame
      figure={<Mascot />}
      title="A vossa casa está em pausa"
      text="Falta regularizar a subscrição. Assim que o pagamento for confirmado, tudo volta sozinho."
      action={<button type="button" onClick={toPlans} className={CTA}>Regularizar a subscrição</button>}
      foot="As vossas memórias continuam guardadas."
    />
  );
}

export function SuspendedIrregular({ note }: { note?: string | null }) {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).from("payment_settings").select("whatsapp_number").limit(1).maybeSingle()
      .then(({ data }: any) => setWhatsapp(data?.whatsapp_number?.replace(/\D/g, "") || null));
  }, []);

  return (
    <Frame
      figure={
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#F2F0ED] text-foreground dark:bg-muted">
          <ShieldAlert className="h-8 w-8" strokeWidth={1.6} />
        </span>
      }
      title="Esta casa foi suspensa"
      text={note?.trim() || "Encontrámos uma irregularidade nesta casa. Falem connosco para resolvermos."}
      action={whatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={CTA}>Falar com o suporte</a>
      )}
      foot="Esta suspensão não está ligada à subscrição."
    />
  );
}

export function SubscriptionEnded() {
  return (
    <Frame
      figure={<Mascot />}
      title="A vossa subscrição terminou"
      text="Renovem o plano para continuarem a usar todas as funções."
      action={<button type="button" onClick={toPlans} className={CTA}>Renovar subscrição</button>}
      foot="As vossas memórias continuam guardadas."
    />
  );
}

export function TrialEnded() {
  return (
    <Frame
      figure={<Mascot />}
      title="O vosso teste grátis terminou"
      text="Escolham um plano para continuarem a usar todas as funções juntos."
      action={<button type="button" onClick={toPlans} className={CTA}>Ver planos</button>}
      foot="As vossas memórias continuam guardadas."
    />
  );
}
