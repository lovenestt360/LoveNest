import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import guardiao from "@/features/entry/assets/guardiao.webp";
import "./epay.css";

/* Oferta do teste grátis, logo depois de criarem a casa. O prazo é o mesmo do RPC activate_trial. */

const TRIAL_DAYS = 15;
const MONTHS: Record<string, number> = { monthly: 1, semiannual: 6, annual: 12 };

const amountOf = (price: unknown) => {
  const n = parseFloat(String(price ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function TrialOffer({ saving, onStart, onPlans }: { saving: boolean; onStart: () => void; onPlans: () => void }) {
  const [fromPrice, setFromPrice] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("subscription_plans").select("price, billing_type").eq("is_active", true).then(({ data }) => {
      const perMonth = (data ?? [])
        .map(p => (MONTHS[p.billing_type ?? ""] ? amountOf(p.price) / MONTHS[p.billing_type ?? ""] : 0))
        .filter(n => n > 0);
      if (perMonth.length) setFromPrice(Math.round(Math.min(...perMonth)));
    });
  }, []);

  const until = format(addDays(new Date(), TRIAL_DAYS), "d 'de' MMMM", { locale: pt });

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-background px-6 pb-6 pt-8 text-center">
      <div className="flex-1" />
      <img src={guardiao} alt="" className="ep-bob h-auto w-[172px]" />
      <h1 className="mt-3.5 max-w-sm text-[34px] font-extrabold leading-[1.06] tracking-[-0.04em] text-foreground">
        {TRIAL_DAYS} dias grátis, para os dois
      </h1>
      <p className="mt-3 max-w-[30ch] text-[16px] leading-[1.45] text-muted-foreground">
        A vossa LoveNest está pronta. Tudo aberto até {until}.
      </p>
      <div className="flex-1" />
      <div className="w-full max-w-sm">
        <button type="button" onClick={onStart} disabled={saving}
          className="flex h-[54px] w-full items-center justify-center rounded-[17px] bg-[#0B1324] text-[16px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-60 dark:bg-foreground dark:text-background">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Começar o teste grátis"}
        </button>
        <p className="mx-auto mt-3 max-w-[30ch] text-[13px] leading-[1.45] text-muted-foreground">
          Sem pagamento para começar. No fim, não cobramos nada.
        </p>
        <button type="button" onClick={onPlans} className="mt-3 py-1.5 text-[14px] font-semibold text-foreground">
          Ver planos
          {fromPrice !== null && <span className="font-medium text-muted-foreground"> · desde {fromPrice} MT por mês</span>}
        </button>
      </div>
    </div>
  );
}
