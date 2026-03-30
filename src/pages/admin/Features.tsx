import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, Hash, RefreshCw, ArrowLeft, Plus, 
  User, Users, Globe, Trash2, Power, Zap
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_FEATURE_KEYS = [
  "home_memories",
  "home_capsula",
  "home_desafios",
  "home_oracao",
  "home_wrapped",
  "home_jejum",
  "home_conversas",
  "home_humor",
  "home_ciclo",
  "home_rotina",
  "home_conflitos",
  "home_ranking",
  "system_premium"
];

export default function FeaturesControl() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [houses, setHouses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTarget, setSearchTarget] = useState("");
  const [isAddingForFeature, setIsAddingForFeature] = useState<string | null>(null);
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState("");
  
  const [featureKeys, setFeatureKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_feature_keys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...DEFAULT_FEATURE_KEYS, ...parsed]));
      } catch (e) {
        return DEFAULT_FEATURE_KEYS;
      }
    }
    return DEFAULT_FEATURE_KEYS;
  });

  const [defaultTestTarget, setDefaultTestTarget] = useState<{ id: string, scope: 'user' | 'couple' } | null>(() => {
    const stored = localStorage.getItem("lovenest_default_test_target");
    return stored ? JSON.parse(stored) : null;
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const adminToken = localStorage.getItem("lovenest_admin_token");
  const adminClient = useMemo(() => {
    if (!adminToken) return supabase;
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: { 'x-admin-id': adminToken }
        }
      }
    );
  }, [adminToken]);

  useEffect(() => {
    localStorage.setItem('admin_feature_keys', JSON.stringify(featureKeys));
  }, [featureKeys]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: flagsData, error: flagsError } = await adminClient.from("feature_flags").select("*").order("key");
      if (flagsError) throw flagsError;
      setFlags(flagsData || []);

      const { data: housesData } = await adminClient.from("couple_spaces").select("id, house_name, partner1_name, partner2_name").order("house_name");
      setHouses(housesData || []);

      const { data: usersData } = await adminClient.from("profiles").select("user_id, display_name").order("display_name");
      setUsers(usersData || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    if (!adminToken) {
      navigate("/admin-login");
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase.from("profiles").select("*").or(`id.eq.${authUser.id},user_id.eq.${authUser.id}`).maybeSingle();
      setUserProfile({
        ...profile,
        user_id: authUser.id,
        display_name: profile?.display_name || authUser.email || "Admin"
      });
    }
  };

  useEffect(() => {
    checkAdmin();
    fetchData();
  }, []);

  const getGlobalStatus = (key: string) => {
    const flag = flags.find(f => f.key === key && f.scope === "global");
    return flag ? flag.enabled : true;
  };

  const getOverrides = (key: string) => {
    return flags.filter(f => f.key === key && f.scope !== "global");
  };

  const getTargetName = (id: string, scope: string) => {
    if (scope === "couple") {
      const h = houses.find(house => house.id === id);
      return h ? h.house_name || `${h.partner1_name} & ${h.partner2_name}` : id.slice(0, 8);
    }
    const u = users.find(user => user.user_id === id);
    return u ? u.display_name : id.slice(0, 8);
  };

  const toggleGlobal = async (key: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // 1. Optimistic UI Update (Immediate visual feedback)
    setFlags(prev => {
      const existingIdx = prev.findIndex(f => f.key === key && f.scope === "global");
      if (existingIdx > -1) {
        const newFlags = [...prev];
        newFlags[existingIdx] = { ...newFlags[existingIdx], enabled: newStatus };
        return newFlags;
      }
      return [...prev, { id: `temp-${key}`, key, scope: 'global', enabled: newStatus }];
    });

    try {
      // 2. Perform Database Operation
      const existing = flags.find(f => f.key === key && f.scope === "global");
      
      if (existing) {
        const { error } = await adminClient.from("feature_flags").update({ enabled: newStatus }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await adminClient.from("feature_flags").insert({ 
          key, 
          scope: "global", 
          enabled: newStatus 
        });
        if (error) throw error;
      }
      
      // 3. Notify success (Don't call fetchData immediately to avoid race conditions with stale Selects)
      toast({ title: "Atualizado", description: `Estado de ${key} alterado para ${newStatus ? 'ATIVO' : 'DESLIGADO'}.` });
      
      // Sync back after a short delay to ensure DB propagation
      setTimeout(fetchData, 1000);
      
    } catch (err: any) {
      // Revert if error
      fetchData();
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleOverride = async (flag: any, newStatus: boolean) => {
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: newStatus } : f));

    try {
      const { error } = await adminClient.from("feature_flags").update({ enabled: newStatus }).eq("id", flag.id);
      if (error) throw error;
      
      setTimeout(fetchData, 1000);
    } catch (err: any) {
      fetchData();
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const deleteFlag = async (id: string) => {
    if (!confirm("Remover esta regra?")) return;
    try {
      const { error } = await adminClient.from("feature_flags").delete().eq("id", id);
      if (error) throw error;
      setFlags(prev => prev.filter(f => f.id !== id));
      toast({ title: "Removido", description: "Regra eliminada." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleFastAdd = async (key: string) => {
    const target = defaultTestTarget || { id: userProfile?.user_id, scope: 'user' };
    if (!target.id) return;
    
    try {
      const { error } = await adminClient.from("feature_flags").insert({
        key,
        scope: target.scope,
        target_id: target.id,
        enabled: true
      });
      if (error && error.code !== '23505') throw error;
      fetchData();
      toast({ title: "Teste Ativado", description: `Liberado para ${getTargetName(target.id, target.scope)}` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const addFeatureKey = () => {
    if (!newFeatureKey) return;
    const cleanKey = newFeatureKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!featureKeys.includes(cleanKey)) {
      setFeatureKeys([...featureKeys, cleanKey]);
      toast({ title: "Sucesso", description: `Funcionalidade "${cleanKey}" registada.` });
    }
    setNewFeatureKey("");
    setIsAddingFeature(false);
  };

  const filteredHouses = useMemo(() => houses.filter(h => 
    (h.house_name || "").toLowerCase().includes(searchTarget.toLowerCase()) ||
    (h.partner1_name || "").toLowerCase().includes(searchTarget.toLowerCase())
  ), [houses, searchTarget]);

  const filteredUsers = useMemo(() => users.filter(u => 
    (u.display_name || "").toLowerCase().includes(searchTarget.toLowerCase())
  ), [users, searchTarget]);

  const isSystemEnabled = useMemo(() => {
    const master = flags.find(f => f.key === "system_enabled" && f.scope === "global");
    return master ? master.enabled !== false : true;
  }, [flags]);

  const createFlag = async (key: string, scope: string, target_id: string) => {
    try {
      const { error } = await adminClient.from("feature_flags").insert({ key, scope, target_id, enabled: true });
      if (error && error.code !== '23505') throw error;
      fetchData();
      setIsAddingForFeature(null);
      toast({ title: "Sucesso", description: "Regra criada." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white border-b p-6 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black flex items-center gap-2 text-slate-900">
                <Hash className="w-6 h-6 text-primary" />
                Feature Manager
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Painel de Controlo Simplificado</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="rounded-xl border-2">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Top Control Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className={cn(
            "lg:col-span-2 bg-white border-2 rounded-[2.5rem] p-6 shadow-xl flex items-center justify-between transition-all",
            isSystemEnabled ? "border-emerald-500/20 bg-emerald-50/30" : "border-rose-500/40 bg-rose-50/30"
          )}>
            <div className="flex items-center gap-5">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", isSystemEnabled ? "bg-emerald-500" : "bg-rose-500")}>
                <Power className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Master Switch</h2>
                <p className="text-xs text-muted-foreground">{isSystemEnabled ? "FLAGS INDIVIDUAIS ATIVAS" : "BYPASS ATIVO: TUDO ABERTO"}</p>
              </div>
            </div>
            <Switch checked={isSystemEnabled} onCheckedChange={async () => {
              const newStatus = !isSystemEnabled;
              
              // Optimistic Update
              setFlags(prev => {
                const existingIdx = prev.findIndex(f => f.key === "system_enabled" && f.scope === "global");
                if (existingIdx > -1) {
                  const newFlags = [...prev];
                  newFlags[existingIdx] = { ...newFlags[existingIdx], enabled: newStatus };
                  return newFlags;
                }
                return [...prev, { id: 'temp-master', key: 'system_enabled', scope: 'global', enabled: newStatus }];
              });

              try {
                const existing = flags.find(f => f.key === "system_enabled" && f.scope === "global");
                if (existing && existing.id !== 'temp-master') {
                  await adminClient.from("feature_flags").update({ enabled: newStatus }).eq("id", existing.id);
                } else {
                  await adminClient.from("feature_flags").insert({ key: "system_enabled", scope: "global", enabled: newStatus });
                }
                fetchData();
                toast({ title: "Master Switch", description: `Sistema agora está ${newStatus ? 'ONLINE' : 'EM BYPASS'}.` });
              } catch (err: any) {
                fetchData();
                toast({ title: "Erro", description: err.message, variant: "destructive" });
              }
            }} className="scale-125 data-[state=checked]:bg-emerald-500" />
          </section>

          <section className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-6 shadow-xl flex flex-col justify-center gap-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destaque de Teste</Label>
            <select 
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none text-sm font-bold outline-none ring-primary/20 focus:ring-2"
              value={defaultTestTarget ? `${defaultTestTarget.scope}:${defaultTestTarget.id}` : ""}
              onChange={(e) => {
                const [scope, id] = e.target.value.split(":");
                if (id) {
                  const target = { id, scope: scope as any };
                  setDefaultTestTarget(target);
                  localStorage.setItem("lovenest_default_test_target", JSON.stringify(target));
                } else {
                  setDefaultTestTarget(null);
                  localStorage.removeItem("lovenest_default_test_target");
                }
              }}
            >
              <option value="">👤 Admin (Eu)</option>
              <optgroup label="Casas">
                {houses.map(h => <option key={h.id} value={`couple:${h.id}`}>🏠 {h.house_name || "Sem nome"}</option>)}
              </optgroup>
              <optgroup label="Utilizadores">
                {users.map(u => <option key={u.user_id} value={`user:${u.user_id}`}>👤 {u.display_name}</option>)}
              </optgroup>
            </select>
          </section>
        </div>

        {/* Dynamic Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {featureKeys.map(key => (
            <div key={key} className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">
                    {key.replace(/^home_/, '').replace('_', ' ')}
                  </h3>
                  <code className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded uppercase">
                    {key}
                  </code>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    getGlobalStatus(key) ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {getGlobalStatus(key) ? "Ativo em Todos" : "Privado"}
                  </div>
                  <Switch checked={getGlobalStatus(key)} onCheckedChange={(c) => toggleGlobal(key, c)} className="data-[state=checked]:bg-emerald-500" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Excepções</span>
                  <span className="bg-muted px-2 rounded-full font-mono">{getOverrides(key).length}</span>
                </div>
                
                <div className="min-h-[100px] flex flex-col gap-2 p-4 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                  {getOverrides(key).map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border/50 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{getTargetName(f.target_id, f.scope)}</span>
                        <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-tighter">{f.target_id.slice(0, 10)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={f.enabled} onCheckedChange={(c) => toggleOverride(f, c)} className="scale-75" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => deleteFlag(f.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {getOverrides(key).length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[10px] font-bold italic text-muted-foreground opacity-40">Nenhuma excepção</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                   <Button variant="outline" className="rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border-rose-100 hover:bg-rose-50 text-rose-500" onClick={() => handleFastAdd(key)}>
                     <Zap className="h-3.5 w-3.5 mr-2 fill-rose-500" /> Teste Rápido
                   </Button>
                   <Button variant="outline" className="rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border-emerald-100 hover:bg-emerald-50 text-emerald-500" onClick={() => setIsAddingForFeature(key)}>
                     <Plus className="h-3.5 w-3.5 mr-2" /> Novo Alvo
                   </Button>
                </div>
              </div>

              {/* Add Override Modal Overlay */}
              {isAddingForFeature === key && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col p-8 animate-in zoom-in-95">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-black uppercase italic italic tracking-tighter">Novo Alvo para {key.split('_').pop()}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingForFeature(null)} className="rounded-full h-8 w-8 p-0">X</Button>
                  </div>
                  <div className="space-y-4">
                    <Input placeholder="Filtrar..." value={searchTarget} onChange={(e) => setSearchTarget(e.target.value)} className="h-10 rounded-xl" />
                    <select id={`target-${key}`} className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-sm">
                      <option value="">Selecionar...</option>
                      <optgroup label="Casas">
                        {filteredHouses.map(h => <option key={h.id} value={`couple:${h.id}`}>🏠 {h.house_name}</option>)}
                      </optgroup>
                      <optgroup label="Utilizadores">
                        {filteredUsers.map(u => <option key={u.user_id} value={`user:${u.user_id}`}>👤 {u.display_name}</option>)}
                      </optgroup>
                    </select>
                    <Button className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/25" onClick={() => {
                      const sel = document.getElementById(`target-${key}`) as HTMLSelectElement;
                      if (!sel.value) return;
                      const [scope, id] = sel.value.split(":");
                      createFlag(key, scope, id);
                    }}>Confirmar Regra</Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Manual Feature Card */}
          <div className="bg-slate-200/30 rounded-[2.5rem] border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 transition-all hover:bg-slate-200/50">
            {isAddingFeature ? (
              <div className="w-full space-y-4 animate-in fade-in zoom-in-95">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Feature Key (ID)</Label>
                  <Input placeholder="ex: home_new_module" value={newFeatureKey} onChange={(e) => setNewFeatureKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFeatureKey()} className="h-12 rounded-xl border-none shadow-sm focus-visible:ring-primary" autoFocus />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 rounded-xl font-black uppercase tracking-tighter" onClick={addFeatureKey}>Adicionar</Button>
                  <Button variant="ghost" className="rounded-xl font-black" onClick={() => setIsAddingFeature(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="h-full w-full flex flex-col gap-4 rounded-[2.5rem]" onClick={() => setIsAddingFeature(true)}>
                <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-md"><Plus className="w-8 h-8 text-emerald-500" /></div>
                <div className="text-center">
                  <span className="block text-2xl font-black italic tracking-tighter uppercase">Adicionar</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nova Funcionalidade</span>
                </div>
              </Button>
            )}
          </div>
        </div>

        {/* Global Hierarchy Legend */}
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
             <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><Globe className="w-8 h-8 text-white" /></div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">Arquitetura de Controlo</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">
                  As regras aplicam-se em cascata. <br/>
                  Clica em <span className="text-rose-400">Teste Rápido</span> para libertar funcionalidades para ti sem abrir ao público.
                </p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3 font-black text-[11px] uppercase tracking-widest">
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-emerald-400">1. Individual (User)</span><span className="text-slate-500">MAX</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-indigo-400">2. Casa (Couple)</span><span className="text-slate-500">MID</span></div>
                <div className="flex justify-between"><span className="text-slate-200">3. Aplicação (Global)</span><span className="text-slate-500">BASE</span></div>
             </div>
          </div>
        </section>
      </main>
    </div>
  );
}
