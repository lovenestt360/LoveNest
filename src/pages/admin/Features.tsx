import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, Hash, RefreshCw, ArrowLeft, Plus, 
  User, Users, Globe, Smartphone, Trash2, Power
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FEATURE_KEYS = [
  "home_memories",
  "home_capsula",
  "home_desafios",
  "home_oracao",
  "home_wrapped",
  "home_jejum",
  "home_conversas"
];

export default function FeaturesControl() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [houses, setHouses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTarget, setSearchTarget] = useState("");
  const [isAddingForFeature, setIsAddingForFeature] = useState<string | null>(null);
  
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

  const features = useMemo(() => {
    return FEATURE_KEYS.map(key => {
      const keyFlags = flags.filter(f => f.key === key);
      const globalFlag = keyFlags.find(f => f.scope === "global");
      const overrides = keyFlags.filter(f => f.scope !== "global");
      
      return {
        key,
        globalEnabled: globalFlag ? globalFlag.enabled : true,
        globalId: globalFlag?.id,
        overrides
      };
    });
  }, [flags]);

  const saveDefaultTestTarget = (id: string, scope: 'user' | 'couple' | '') => {
    if (!id || !scope) {
      setDefaultTestTarget(null);
      localStorage.removeItem("lovenest_default_test_target");
      toast({ title: "Configuração Removida", description: "O sistema usará o teu utilizador admin." });
      return;
    }
    const target = { id, scope: scope as any };
    setDefaultTestTarget(target);
    localStorage.setItem("lovenest_default_test_target", JSON.stringify(target));
    toast({ title: "Destaque Salvo", description: `Alvo de teste padrão: ${scope === 'user' ? 'Utilizador' : 'Casa'}.` });
  };

  const toggleGlobal = async (key: string, currentId: string | undefined, currentStatus: boolean) => {
    try {
      if (currentId) {
        const { error } = await adminClient.from("feature_flags").update({ enabled: !currentStatus }).eq("id", currentId);
        if (error) throw error;
      } else {
        const { error } = await adminClient.from("feature_flags").insert({
          key,
          scope: "global",
          enabled: !currentStatus
        });
        if (error) throw error;
      }
      fetchData();
      toast({ title: "Atualizado", description: `Estado global de ${key} alterado.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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

  const getNameById = (id: string, scope: string) => {
    if (scope === "global") return "Todos";
    if (scope === "couple") {
      const house = houses.find(h => h.id === id);
      return house ? house.house_name || `${house.partner1_name} & ${house.partner2_name}` : id;
    }
    if (scope === "user") {
      const user = users.find(u => u.user_id === id);
      return user ? user.display_name : id;
    }
    return id;
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await adminClient.from("feature_flags").update({ enabled: !currentStatus }).eq("id", id);
      if (error) throw error;
      setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !currentStatus } : f));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta regra?")) return;
    try {
      const { error } = await adminClient.from("feature_flags").delete().eq("id", id);
      if (error) throw error;
      setFlags(prev => prev.filter(f => f.id !== id));
      toast({ title: "Removido", description: "Regra eliminada com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const createFlag = async (key: string, scope: string, target_id: string) => {
    try {
      const { error } = await adminClient.from("feature_flags").insert({
        key,
        scope,
        target_id: target_id || null,
        enabled: true
      });
      if (error) throw error;
      fetchData();
      setIsAddingForFeature(null);
      setSearchTarget("");
      toast({ title: "Sucesso", description: `Excepção criada para ${key}.` });
    } catch (err: any) {
      if (err.code === '23505') {
        toast({ title: "Conflito", description: "Já existe uma regra para este alvo.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    }
  };

  const enableOnlyForMe = async (key: string) => {
    const targetId = defaultTestTarget?.id || userProfile?.user_id || userProfile?.id;
    const scope = defaultTestTarget?.scope || "user";
    
    if (!targetId) {
      toast({ title: "Erro", description: "Define um alvo de teste no topo primeiro.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await adminClient.from("feature_flags").insert({
        key,
        scope,
        target_id: targetId,
        enabled: true
      });
      
      if (error) {
        if (error.code === '23505') {
          toast({ title: "Já Ativado", description: "Este alvo já tem uma regra ativa." });
          return;
        }
        throw error;
      }
      
      fetchData();
      toast({ title: "Modo Teste Ativado", description: `Ativado para ${getNameById(targetId, scope)}.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const isSystemEnabled = useMemo(() => {
    const master = flags.find(f => f.key === "system_enabled" && f.scope === "global");
    return master ? master.enabled !== false : true;
  }, [flags]);

  const toggleMasterSwitch = async () => {
    const master = flags.find(f => f.key === "system_enabled" && f.scope === "global");
    const newStatus = !isSystemEnabled;

    try {
      if (master) {
        const { error } = await adminClient.from("feature_flags").update({ enabled: newStatus }).eq("id", master.id);
        if (error) throw error;
      } else {
        const { error } = await adminClient.from("feature_flags").insert({
          key: "system_enabled",
          scope: "global",
          enabled: newStatus
        });
        if (error) throw error;
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    checkAdmin();
    fetchData();
  }, []);

  const filteredHouses = useMemo(() => {
    return houses.filter(h => 
      (h.house_name?.toLowerCase() || "").includes(searchTarget.toLowerCase()) ||
      (h.partner1_name?.toLowerCase() || "").includes(searchTarget.toLowerCase()) ||
      (h.partner2_name?.toLowerCase() || "").includes(searchTarget.toLowerCase())
    );
  }, [houses, searchTarget]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.display_name?.toLowerCase() || "").includes(searchTarget.toLowerCase()) ||
      (u.user_id?.toLowerCase() || "").includes(searchTarget.toLowerCase())
    );
  }, [users, searchTarget]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-white/80">
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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="rounded-xl border-2 hover:bg-slate-50">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className={cn(
            "lg:col-span-2 bg-white border-2 rounded-[2.5rem] p-6 shadow-xl transition-all duration-500 flex items-center justify-between",
            isSystemEnabled ? "border-emerald-500/20 bg-emerald-50/30" : "border-rose-500/40 bg-rose-50/30"
          )}>
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500",
                isSystemEnabled ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              )}>
                <Power className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black tracking-tight italic text-slate-900">Master Switch</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isSystemEnabled ? "Modo Ativo: Flags individuais funcionando." : "Bypass Ativo: Tudo aberto para todos."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className={cn("text-[9px] font-black uppercase tracking-widest", isSystemEnabled ? "text-emerald-600" : "text-rose-600")}>
                {isSystemEnabled ? "Online" : "Bypass"}
              </span>
              <Switch checked={isSystemEnabled} onCheckedChange={toggleMasterSwitch} className="scale-125" />
            </div>
          </section>

          <section className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-6 shadow-xl flex flex-col justify-center gap-3">
             <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destaque de Teste</Label>
                <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
             </div>
             <select 
               className="w-full h-10 px-3 rounded-xl bg-slate-50 border-none text-[12px] font-black outline-none ring-primary/20 focus:ring-2"
               value={defaultTestTarget ? `${defaultTestTarget.scope}:${defaultTestTarget.id}` : ""}
               onChange={(e) => {
                 const [scope, id] = e.target.value.split(":");
                 saveDefaultTestTarget(id, scope as any);
               }}
             >
                <option value="">👤 Admin (Eu)</option>
                {users.length > 0 && (
                  <optgroup label="Utilizadores">
                    {users.map(u => (
                      <option key={u.user_id} value={`user:${u.user_id}`}>👤 {u.display_name || u.user_id}</option>
                    ))}
                  </optgroup>
                )}
                {houses.length > 0 && (
                  <optgroup label="Casas (Casais)">
                    {houses.map(h => (
                      <option key={h.id} value={`couple:${h.id}`}>🏠 {h.house_name || `${h.partner1_name} & ${h.partner2_name}`}</option>
                    ))}
                  </optgroup>
                )}
             </select>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div key={feature.key} className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col gap-6 relative overflow-hidden group">
               <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 group-hover:text-primary transition-colors uppercase">
                       {feature.key.split('_').pop()}
                     </h3>
                     <p className="text-[11px] font-bold text-slate-400 font-mono tracking-tight">{feature.key}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className={cn(
                       "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                       feature.globalEnabled ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                     )}>
                       {feature.globalEnabled ? "Ativo em Todos" : "Privado/Restrito"}
                     </span>
                     <Switch 
                       checked={feature.globalEnabled} 
                       onCheckedChange={() => toggleGlobal(feature.key, feature.globalId, feature.globalEnabled)}
                     />
                  </div>
               </div>

               <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Excepções (Overrides)</h4>
                     <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{feature.overrides.length} Ativas</span>
                  </div>

                  {feature.overrides.length === 0 ? (
                    <div className="py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-4">
                       <p className="text-[10px] text-slate-400 font-bold italic">Sem excepções definidas para este módulo.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                       {feature.overrides.map(ov => (
                         <div key={ov.id} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-7 h-7 rounded-lg flex items-center justify-center",
                                 ov.scope === 'user' ? "bg-sky-50 text-sky-600" : "bg-rose-50 text-rose-600"
                               )}>
                                 {ov.scope === 'user' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800 leading-none">{getNameById(ov.target_id, ov.scope)}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{ov.scope}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <Switch 
                                 checked={ov.enabled} 
                                 onCheckedChange={() => handleToggle(ov.id, ov.enabled)}
                                 className="scale-75"
                               />
                               <Button variant="ghost" size="icon" onClick={() => handleDelete(ov.id)} className="h-7 w-7 text-slate-300 hover:text-rose-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                               </Button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 gap-2 shrink-0"
                    onClick={() => enableOnlyForMe(feature.key)}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Teste Rápido
                  </Button>
                  
                  <div className="flex-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "w-full h-9 rounded-xl text-[10px] font-black uppercase border-2 border-dashed transition-all gap-2",
                        isAddingForFeature === feature.key ? "border-primary text-primary bg-primary/5" : "border-slate-100 text-slate-400 hover:bg-slate-50"
                      )}
                      onClick={() => setIsAddingForFeature(isAddingForFeature === feature.key ? null : feature.key)}
                    >
                      <Plus className="w-4 h-4" />
                      Novo Alvo
                    </Button>
                  </div>
               </div>

               {isAddingForFeature === feature.key && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-8 z-20 flex flex-col justify-center animate-in zoom-in-95 duration-200">
                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h4 className="text-lg font-black uppercase text-slate-900 italic">Nova Excepção para {feature.key}</h4>
                           <Button variant="ghost" size="sm" onClick={() => setIsAddingForFeature(null)} className="rounded-full">X</Button>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase opacity-40">Escolher utilizador ou casa</Label>
                              <div className="flex flex-col gap-2">
                                 <Input 
                                   placeholder="Procurar..." 
                                   value={searchTarget}
                                   onChange={(e) => setSearchTarget(e.target.value)}
                                   className="h-10 rounded-xl bg-slate-50 border-none italic text-xs"
                                 />
                                 <select 
                                   id={`target-select-${feature.key}-new`}
                                   className="w-full h-10 px-3 rounded-xl bg-slate-50 border-none text-[12px] font-black"
                                 >
                                    <option value="">Escolher Alvo...</option>
                                    <optgroup label="Utilizadores">
                                       {filteredUsers.map(u => (
                                         <option key={u.user_id} value={`user:${u.user_id}`}>👤 {u.display_name || u.user_id}</option>
                                       ))}
                                    </optgroup>
                                    <optgroup label="Casas">
                                       {filteredHouses.map(h => (
                                         <option key={h.id} value={`couple:${h.id}`}>🏠 {h.house_name || `${h.partner1_name} & ${h.partner2_name}`}</option>
                                       ))}
                                    </optgroup>
                                 </select>
                              </div>
                           </div>
                           <Button 
                             className="w-full h-12 rounded-2xl font-black uppercase text-sm shadow-xl shadow-primary/20"
                             onClick={() => {
                               const sel = document.getElementById(`target-select-${feature.key}-new`) as HTMLSelectElement;
                               if (sel.value) {
                                  const [scope, id] = sel.value.split(":");
                                  createFlag(feature.key, scope, id);
                               } else {
                                  toast({ title: "Atenção", description: "Escolha um alvo.", variant: "destructive" });
                               }
                             }}
                           >
                             Ativar Excepção
                           </Button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
          ))}
        </div>

        <section className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
             <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                   <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter">Como Funciona?</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-bold">
                  O sistema prioriza permissões locais sobre globais. <br/>
                  Se queres testar uma feature nova sem ninguém ver, poe o <span className="text-rose-400">Global em OFF</span> e adiciona o teu <span className="text-emerald-400">Target como Excepção</span>.
                </p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">Hierarquia de Resolução</span>
                </div>
                <div className="space-y-2 text-xs font-black">
                   <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-emerald-400">1. Individual (User)</span>
                      <span className="text-slate-500">Prioridade Máxima</span>
                   </div>
                   <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-indigo-400">2. Casa (Casal)</span>
                      <span className="text-slate-500">Prioridade Média</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-300">3. App (Global)</span>
                      <span className="text-slate-500">Prioridade Base</span>
                   </div>
                </div>
             </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
        </section>

      </main>
    </div>
  );
}
