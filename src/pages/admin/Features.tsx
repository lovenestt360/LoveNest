import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

/**
 * Funções — um só sítio para cada funcionalidade da app:
 *  - plano mínimo (feature_tiers.min_tier) decide quem tem acesso (PremiumGuard);
 *  - ligada/desligada (feature_flags global) — desligada mostra "Em breve" a todos;
 *  - testar numa casa (feature_flags scope "couple") — só essa casa a vê, sem olhar ao plano.
 * As chaves são as mesmas de feature_tiers.feature_id, que são as que a app usa.
 */

interface FeatureTier { feature_id: string; feature_label: string; min_tier: number }
interface Flag { id: string; key: string; scope: "global" | "couple" | "user"; target_id: string | null; enabled: boolean }
interface House { id: string; house_name: string | null; partner1_name?: string | null; partner2_name?: string | null }
interface Plan { id: string; name: string; price: string; tier_level: number; is_active: boolean }

const TIER_NAMES: Record<number, string> = { 0: "Grátis", 1: "Plus", 2: "Pro", 3: "Max" };

export default function FeaturesControl() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureTier[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<FeatureTier | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [ft, fl, hs, pl] = await Promise.all([
      (supabase as any).from("feature_tiers").select("feature_id, feature_label, min_tier").order("feature_label"),
      supabase.from("feature_flags" as any).select("*"),
      supabase.from("couple_spaces").select("id, house_name, partner1_name, partner2_name").order("house_name"),
      supabase.from("subscription_plans").select("id, name, price, tier_level, is_active").order("tier_level"),
    ]);
    if (ft.error) toast({ title: "Erro a carregar", description: ft.error.message, variant: "destructive" });
    setFeatures((ft.data ?? []) as FeatureTier[]);
    setFlags((fl.data ?? []) as unknown as Flag[]);
    setHouses((hs.data ?? []) as House[]);
    setPlans(((pl.data ?? []) as Plan[]).filter(p => p.is_active));
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data: admin } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
      if (!admin) { navigate("/admin-login"); return; }
      load();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const houseName = (id: string) => {
    const h = houses.find(x => x.id === id);
    if (!h) return "Casa removida";
    return h.house_name?.trim() || [h.partner1_name, h.partner2_name].filter(Boolean).join(" & ") || "Sem nome";
  };
  const globalOn = (key: string) => flags.find(f => f.key === key && f.scope === "global")?.enabled ?? true;
  const testHouses = (key: string) => flags.filter(f => f.key === key && f.scope === "couple" && f.enabled && f.target_id);
  const tiersInUse = useMemo(() => {
    const used = new Set<number>([0, 1, 2, ...plans.map(p => p.tier_level), ...features.map(f => f.min_tier)]);
    return [...used].filter(t => TIER_NAMES[t] !== undefined).sort();
  }, [plans, features]);

  const setTier = async (f: FeatureTier, tier: number) => {
    setSaving(f.feature_id);
    setFeatures(prev => prev.map(x => x.feature_id === f.feature_id ? { ...x, min_tier: tier } : x));
    const { error } = await (supabase as any).from("feature_tiers")
      .update({ min_tier: tier, updated_at: new Date().toISOString() }).eq("feature_id", f.feature_id);
    if (error) { toast({ title: "Não foi possível mudar o plano", description: error.message, variant: "destructive" }); load(); }
    setSaving(null);
  };

  const setGlobal = async (f: FeatureTier, on: boolean) => {
    setSaving(f.feature_id);
    const { error } = await supabase.rpc("upsert_feature_flag" as any, { p_key: f.feature_id, p_scope: "global", p_enabled: on, p_target_id: null });
    if (error) toast({ title: "Não foi possível mudar", description: error.message, variant: "destructive" });
    else toast({ title: on ? `${f.feature_label} ligada` : `${f.feature_label} desligada`, description: on ? "Volta a aparecer para quem tem o plano." : "Aparece \"Em breve\" para todos, menos casas em teste." });
    await load();
    setSaving(null);
  };

  const addTest = async (f: FeatureTier, houseId: string) => {
    const { error } = await supabase.rpc("upsert_feature_flag" as any, { p_key: f.feature_id, p_scope: "couple", p_enabled: true, p_target_id: houseId });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };
  const removeTest = async (flagId: string) => {
    const { error } = await supabase.from("feature_flags" as any).delete().eq("id", flagId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const filteredHouses = houses.filter(h => houseName(h.id).toLowerCase().includes(search.trim().toLowerCase())).slice(0, 30);

  return (
    <div className="min-h-[100dvh] bg-[#F2F0ED] px-4 pb-16 pt-6 text-[#0B1324] dark:bg-background dark:text-foreground">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => navigate("/admin")} className="mb-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#4A5060] dark:text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Painel
        </button>
        <h1 className="text-[24px] font-bold tracking-[-0.025em]">Funções</h1>
        <p className="mt-1 max-w-[60ch] text-[13.5px] leading-relaxed text-[#4A5060] dark:text-muted-foreground">
          O plano decide quem tem acesso. Desligar mostra "Em breve" a todos. "Testar numa casa" liga a função só para as casas que escolheres, mesmo sem o plano.
        </p>

        {plans.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#4A5060] ring-1 ring-[#ECE8E3] dark:bg-card dark:ring-border">Grátis · 0 MZN</span>
            {plans.map(p => (
              <span key={p.id} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#4A5060] ring-1 ring-[#ECE8E3] dark:bg-card dark:ring-border">
                {TIER_NAMES[p.tier_level] ?? "Plano"} · {p.name} · {p.price}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#7A7F8C]" /></div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[20px] border border-[#ECE8E3] bg-white dark:border-border dark:bg-card">
            {features.map(f => {
              const on = globalOn(f.feature_id);
              const tests = testHouses(f.feature_id);
              return (
                <div key={f.feature_id} className="flex flex-wrap items-center gap-3 border-b border-[#F0EDE9] px-4 py-3 last:border-b-0 dark:border-border/60">
                  <div className="min-w-[140px] flex-1">
                    <p className="text-[14.5px] font-semibold">{f.feature_label}</p>
                    <p className="text-[12.5px] text-[#7A7F8C]">
                      {!on ? "Desligada · \"Em breve\"" : f.min_tier === 0 ? "Para todos" : `Para quem tem ${TIER_NAMES[f.min_tier] ?? "o plano"}`}
                      {tests.length > 0 && ` · em teste em ${tests.length === 1 ? houseName(tests[0].target_id!) : `${tests.length} casas`}`}
                    </p>
                  </div>
                  <div className="inline-flex rounded-[10px] bg-[#F2F0ED] p-[3px] dark:bg-muted" role="group" aria-label={`Plano mínimo de ${f.feature_label}`}>
                    {tiersInUse.map(t => (
                      <button key={t} onClick={() => setTier(f, t)} disabled={saving === f.feature_id} aria-pressed={f.min_tier === t}
                        className={cn("h-7 rounded-lg px-2.5 text-[12px] font-semibold transition-colors",
                          f.min_tier === t ? "bg-white text-[#0B1324] shadow-sm dark:bg-card dark:text-foreground" : "text-[#7A7F8C]")}>
                        {TIER_NAMES[t]}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setTesting(f); setSearch(""); }}
                    className="h-8 rounded-full bg-[#F7F5F2] px-3 text-[12.5px] font-semibold text-[#4A5060] dark:bg-muted dark:text-muted-foreground">
                    {tests.length > 0 ? `Em teste (${tests.length})` : "Testar numa casa"}
                  </button>
                  <button role="switch" aria-checked={on} aria-label={`${f.feature_label} ${on ? "ligada" : "desligada"}`}
                    disabled={saving === f.feature_id} onClick={() => setGlobal(f, !on)}
                    className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors", on ? "bg-[#0B1324] dark:bg-foreground" : "bg-[#D9D5CF] dark:bg-muted")}>
                    <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left]", on ? "left-[19px]" : "left-[3px]")} />
                  </button>
                </div>
              );
            })}
            {features.length === 0 && <p className="px-4 py-8 text-center text-[13.5px] text-[#7A7F8C]">Ainda não há funções configuradas.</p>}
          </div>
        )}
      </div>

      {/* Testar numa casa */}
      {testing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1324]/35 p-4" onClick={() => setTesting(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Testar ${testing.feature_label}`}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-[18px] dark:bg-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[18px] font-bold tracking-[-0.02em]">Testar {testing.feature_label}</p>
                <p className="mt-0.5 text-[12.5px] text-[#7A7F8C]">Estas casas veem a função mesmo desligada ou sem o plano.</p>
              </div>
              <button onClick={() => setTesting(null)} aria-label="Fechar" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#7A7F8C] dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>

            {testHouses(testing.feature_id).length > 0 && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#ECE8E3] dark:border-border">
                {testHouses(testing.feature_id).map(fl => (
                  <div key={fl.id} className="flex items-center gap-3 border-b border-[#F0EDE9] px-3.5 py-2.5 last:border-b-0 dark:border-border/60">
                    <span className="flex-1 text-[14px] font-semibold">{houseName(fl.target_id!)}</span>
                    <button onClick={() => removeTest(fl.id)} className="h-8 rounded-full bg-[#F7F5F2] px-3 text-[12.5px] font-semibold dark:bg-muted">Tirar</button>
                  </div>
                ))}
              </div>
            )}

            <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-[#ECE8E3] px-3 dark:border-border">
              <Search className="h-4 w-4 text-[#9AA0AB]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Procurar casal" className="flex-1 bg-transparent text-[14px] outline-none" />
            </label>
            <div className="mt-2">
              {filteredHouses.filter(h => !testHouses(testing.feature_id).some(t => t.target_id === h.id)).map(h => (
                <div key={h.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1 truncate text-[14px]">{houseName(h.id)}</span>
                  <button onClick={() => addTest(testing, h.id)} className="h-8 rounded-full bg-[#0B1324] px-3 text-[12.5px] font-semibold text-white dark:bg-foreground dark:text-background">Adicionar</button>
                </div>
              ))}
            </div>
            <button onClick={() => setTesting(null)} className="mt-3 h-11 w-full rounded-2xl bg-[#0B1324] text-[14px] font-semibold text-white dark:bg-foreground dark:text-background">Feito</button>
          </div>
        </div>
      )}
    </div>
  );
}
