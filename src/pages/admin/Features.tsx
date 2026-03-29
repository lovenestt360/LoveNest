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
  const [selectedScope, setSelectedScope] = useState("global");
  const [searchTarget, setSearchTarget] = useState("");
  const [isAddingForFeature, setIsAddingForFeature] = useState<string | null>(null);
  const [defaultTestUserId, setDefaultTestUserId] = useState<string | null>(localStorage.getItem("lovenest_default_test_user"));
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

  const saveDefaultTestUser = (id: string) => {
    setDefaultTestUserId(id || null);
    if (id) localStorage.setItem("lovenest_default_test_user", id);
    else localStorage.removeItem("lovenest_default_test_user");
    toast({ title: "Configuração Salva", description: "Usuário de teste padrão atualizado." });
  };

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

  const checkAdmin = async () => {
    // ... (checkAdmin stays same)
  };

  const fetchData = async () => {
    // ... (fetchData stays same)
  };

  const getNameById = (id: string, scope: string) => {
    // ... (getNameById stays same)
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // ... (handleToggle stays same)
  };

  const handleUpdate = async (id: string, updates: any) => {
    // ... (handleUpdate stays same)
  };

  const handleDelete = async (id: string) => {
    // ... (handleDelete stays same)
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const key = formData.get("key") as string;
    const scope = formData.get("scope") as string;
    const target_id = formData.get("target_id") as string;

    await createFlag(key, scope, target_id);
    e.target.reset();
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
      toast({ title: "Sucesso", description: `Nova flag para ${key} criada.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const enableOnlyForMe = async (key: string) => {
    // Priority: Default Test User ID > Profile ID > Auth ID
    const targetUserId = defaultTestUserId || userProfile?.user_id || userProfile?.id;
    
    if (!targetUserId) {
      toast({ title: "Erro de Perfil", description: "Não foi possível identificar o teu ID de utilizador ou usuário padrão.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await adminClient.from("feature_flags").insert({
        key,
        scope: "user",
        target_id: targetUserId,
        enabled: true
      });
      
      if (error) {
        if (error.code === '23505') {
          toast({ title: "Já Ativado", description: "O usuário selecionado já tem uma regra para esta funcionalidade." });
          return;
        }
        throw error;
      }
      
      fetchData();
      const targetName = defaultTestUserId ? users.find(u => u.user_id === defaultTestUserId)?.display_name : (userProfile?.display_name || 'Admin');
      toast({ title: "Modo Teste Ativado", description: `Ativado para o utilizador ${targetName}.` });
    } catch (err: any) {
      console.error("Error setting test mode:", err);
      toast({ title: "Erro no Banco de Dados", description: err.message, variant: "destructive" });
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
      toast({ 
        title: newStatus ? "Sistema Ativado" : "Sistema Desativado", 
        description: newStatus ? "O controlo de funcionalidades está agora ativo." : "Todas as funcionalidades estão agora abertas para todos.",
        variant: newStatus ? "default" : "destructive" 
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="bg-card border-b p-6 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-card/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black flex items-center gap-2">
                <Hash className="w-6 h-6 text-primary" />
                Feature Control Panel
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Internal Management v1.0</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="rounded-xl border-2">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* MASTER SWITCH */}
        <section className={cn(
          "bg-card border-2 rounded-[2.5rem] p-6 shadow-xl transition-all duration-500",
          isSystemEnabled ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-rose-500/40 bg-rose-500/[0.02]"
        )}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform duration-500",
                isSystemEnabled ? "bg-emerald-500 text-white rotate-0" : "bg-rose-500 text-white rotate-180"
              )}>
                <Power className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight italic">Master Switch</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {isSystemEnabled 
                    ? "O sistema de controlo está ATIVO. As flags individuais serão respeitadas." 
                    : "O sistema está DESATIVADO. Todas as funcionalidades estão abertas a todos."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col items-end gap-1 mb-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Destaque p/ Teste</Label>
                 <select 
                   className="h-8 px-2 rounded-lg bg-muted border-none text-[10px] font-bold outline-none ring-primary/20 focus:ring-2 max-w-[150px]"
                   value={defaultTestUserId || ""}
                   onChange={(e) => saveDefaultTestUser(e.target.value)}
                 >
                    <option value="">Meu Login (Admin)</option>
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>{u.display_name || u.user_id}</option>
                    ))}
                 </select>
              </div>
              <div className="flex flex-col items-center gap-2 border-t pt-4 w-full">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isSystemEnabled ? "text-emerald-600" : "text-rose-600"
                )}>
                  {isSystemEnabled ? "Sistema Online" : "Bypass Ativo"}
                </span>
                <Switch 
                  checked={isSystemEnabled} 
                  onCheckedChange={toggleMasterSwitch}
                  className="scale-150 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* NEW FLAG QUICK ACCESS */}
        <section className="bg-card border-2 border-primary/20 rounded-[2.5rem] p-6 shadow-lg shadow-primary/5">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Criar Novo Override
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Chave (Feature Key)</Label>
              <Input list="keys-list" name="key" required placeholder="ex: home_memories" className="h-11 rounded-xl bg-muted/30 border-none shadow-inner" />
              <datalist id="keys-list">
                {FEATURE_KEYS.map(k => <option key={k} value={k} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Escopo (Scope)</Label>
              <select 
                name="scope" 
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-muted/30 border-none shadow-inner text-sm font-bold appearance-none outline-none ring-primary/20 focus:ring-2"
              >
                <option value="global">Global</option>
                <option value="couple">Couple</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Target (Alvo)</Label>
              {selectedScope === "global" ? (
                <Input disabled placeholder="Todos" className="h-11 rounded-xl bg-muted/20 border-none opacity-50" />
              ) : (
                <div className="space-y-2">
                  <Input 
                    placeholder={selectedScope === "couple" ? "Pesquisar Casal..." : "Pesquisar User..."} 
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30 border-none shadow-inner text-xs italic"
                  />
                  <select name="target_id" required className="w-full h-11 px-3 rounded-xl bg-muted/30 border-none shadow-inner text-sm font-bold appearance-none outline-none ring-primary/20 focus:ring-2">
                    <option value="">{selectedScope === "couple" ? "Selecionar Casal..." : "Selecionar Utilizador..."}</option>
                    {(selectedScope === "couple" ? filteredHouses : filteredUsers).map(item => (
                      <option key={item.id || item.user_id} value={item.id || item.user_id}>
                        {item.house_name || item.display_name || item.id || item.user_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <Button type="submit" className="h-11 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
              Salvar Flag
            </Button>
          </form>
        </section>

        {/* FLAGS LIST */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold">Configurações Atuais</h2>
            <span className="text-[10px] font-black text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full">{flags.length} Ativas</span>
          </div>

          <div className="grid gap-4">
            {flags.filter(f => f.key !== "system_enabled").length === 0 && !loading && (
              <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed">
                <p className="text-muted-foreground italic">Nenhuma configuração encontrada.</p>
              </div>
            )}

            {flags
              .filter(f => f.key !== "system_enabled")
              .map((flag) => (
              <div 
                key={flag.id} 
                className={cn(
                  "bg-card border-2 rounded-[2rem] p-6 shadow-sm transition-all group",
                  flag.enabled ? "border-primary/20" : "border-border opacity-70"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* LEFT: INFO */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2",
                      flag.enabled ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                    )}>
                      <Power className={cn("w-6 h-6", !flag.enabled && "opacity-40")} />
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                        <code>{flag.key}</code>
                        <div className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest flex items-center gap-1",
                          flag.scope === "global" ? "bg-indigo-500/10 text-indigo-600" : 
                          flag.scope === "couple" ? "bg-rose-500/10 text-rose-600" : 
                          "bg-sky-500/10 text-sky-600"
                        )}>
                          {flag.scope === "global" ? <Globe className="w-3 h-3" /> : 
                           flag.scope === "couple" ? <Users className="w-3 h-3" /> : 
                           <User className="w-3 h-3" />}
                          {flag.scope}
                        </div>
                      </h3>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-primary tracking-tight">
                          {getNameById(flag.target_id, flag.scope)}
                        </p>
                        <time className="text-[9px] text-muted-foreground opacity-50 font-bold uppercase">Criado em: {new Date(flag.created_at).toLocaleDateString()}</time>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: EDITABLE (SCOPE & TARGET) */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                       <Label className="text-[9px] font-black uppercase opacity-40 px-1">Scope</Label>
                       <select 
                        value={flag.scope}
                        onChange={(e) => handleUpdate(flag.id, { scope: e.target.value })}
                        className="h-9 px-3 rounded-xl bg-muted border-none text-[11px] font-bold outline-none ring-primary/20 focus:ring-2"
                       >
                         <option value="global">Global</option>
                         <option value="couple">Couple</option>
                         <option value="user">User</option>
                       </select>
                    </div>

                    <div className="flex flex-col gap-2 flex-1 w-full sm:min-w-[180px]">
                      <Label className="text-[9px] font-black uppercase opacity-40 px-1">Target (Alvo)</Label>
                      {flag.scope === "global" ? (
                        <div className="h-9 rounded-xl bg-muted flex items-center px-4 text-[10px] text-muted-foreground opacity-50 font-black">
                          TODOS
                        </div>
                      ) : flag.scope === "couple" ? (
                        <select 
                          value={flag.target_id || ""}
                          onChange={(e) => handleUpdate(flag.id, { target_id: e.target.value || null })}
                          className="h-9 px-3 rounded-xl bg-muted border-none text-[11px] font-bold outline-none ring-primary/20 focus:ring-2"
                        >
                          <option value="">Selecionar Casal...</option>
                          {houses.map(h => (
                             <option key={h.id} value={h.id}>{h.house_name || `${h.partner1_name} & ${h.partner2_name}`}</option>
                          ))}
                        </select>
                      ) : (
                        <select 
                          value={flag.target_id || ""}
                          onChange={(e) => handleUpdate(flag.id, { target_id: e.target.value || null })}
                          className="h-9 px-3 rounded-xl bg-muted border-none text-[11px] font-bold outline-none ring-primary/20 focus:ring-2"
                        >
                          <option value="">Selecionar Utilizador...</option>
                          {users.map(u => (
                             <option key={u.user_id} value={u.user_id}>{u.display_name || u.user_id}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: ACTIONS */}
                  <div className="flex items-center justify-end gap-3 pl-4 border-l border-dashed border-border py-1">
                    <div className="flex flex-col items-center gap-1">
                      <Label className="text-[9px] font-black uppercase opacity-40">Status</Label>
                      <Switch 
                        checked={flag.enabled} 
                        onCheckedChange={() => handleToggle(flag.id, flag.enabled)} 
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(flag.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                </div>

                {/* TEST MODE SHORTCUT & QUICK ADD */}
                <div className="mt-4 pt-4 border-t border-dashed border-border flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {flag.scope !== "user" && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg h-7 gap-2 border border-primary/20"
                        onClick={() => enableOnlyForMe(flag.key)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Teste (Mim)
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest rounded-lg h-7 gap-2 border",
                        isAddingForFeature === flag.key ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "text-muted-foreground hover:bg-muted border-border"
                      )}
                      onClick={() => setIsAddingForFeature(isAddingForFeature === flag.key ? null : flag.key)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Alvo
                    </Button>
                  </div>
                  
                  {isAddingForFeature === flag.key && (
                    <div className="w-full bg-muted/30 p-4 rounded-2xl animate-in zoom-in-95 duration-200 space-y-3">
                       <h4 className="text-[10px] font-black uppercase opacity-60 flex items-center gap-2">
                         <Plus className="w-3 h-3" /> Configurar Novo Alvo para {flag.key}
                       </h4>
                       <div className="flex flex-col sm:flex-row items-end gap-3">
                          <div className="flex-1 space-y-1 w-full">
                            <Label className="text-[9px] font-black uppercase opacity-40">Escopo</Label>
                            <select 
                              className="w-full h-9 px-3 rounded-xl bg-card border-none text-[11px] font-bold outline-none ring-primary/20 focus:ring-2"
                              value={selectedScope}
                              onChange={(e) => setSelectedScope(e.target.value)}
                            >
                               <option value="couple">Couple</option>
                               <option value="user">User</option>
                            </select>
                          </div>
                          <div className="flex-[2] space-y-1 w-full">
                             <Label className="text-[9px] font-black uppercase opacity-40">Pesquisar e Selecionar {selectedScope === 'couple' ? 'Casal' : 'Utilizador'}</Label>
                             <div className="flex flex-col gap-2">
                                <Input 
                                  placeholder="Filtrar..." 
                                  value={searchTarget}
                                  onChange={(e) => setSearchTarget(e.target.value)}
                                  className="h-9 rounded-xl bg-card border-none text-[10px] italic"
                                />
                                <select 
                                  id={`target-select-${flag.key}`}
                                  className="w-full h-9 px-3 rounded-xl bg-card border-none text-[11px] font-bold outline-none ring-primary/20 focus:ring-2"
                                >
                                   <option value="">Escolher...</option>
                                   {(selectedScope === "couple" ? filteredHouses : filteredUsers).map(item => (
                                     <option key={item.id || item.user_id} value={item.id || item.user_id}>
                                       {item.house_name || item.display_name || item.id || item.user_id}
                                     </option>
                                   ))}
                                </select>
                             </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="h-9 rounded-xl font-bold bg-primary px-4"
                            onClick={() => {
                              const sel = document.getElementById(`target-select-${flag.key}`) as HTMLSelectElement;
                              if (sel.value) createFlag(flag.key, selectedScope, sel.value);
                              else toast({ title: "Atenção", description: "Seleciona um alvo primeiro.", variant: "destructive" });
                            }}
                          >
                            Salvar
                          </Button>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DOCS / HELP */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
             <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center shrink-0">
                <Globe className="w-10 h-10 text-white" />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-bold">Hierarquia de Resolução</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  O sistema resolve as permissões seguindo a ordem de prioridade: <br/>
                  <span className="text-sky-400 font-bold">1. User</span> (mais específico) → <span className="text-rose-400 font-bold">2. Couple</span> → <span className="text-indigo-400 font-bold">3. Global</span> (padrão).
                </p>
                <div className="flex gap-4 pt-2">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-sky-500" /> Teste Seguro
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-rose-500" /> A/B Testing
                   </div>
                </div>
             </div>
          </div>
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        </section>

      </main>
    </div>
  );
}
