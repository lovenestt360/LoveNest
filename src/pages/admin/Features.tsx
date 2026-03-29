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
    checkAdmin();
    fetchData();
  }, []);

  const checkAdmin = async () => {
    if (!adminToken) {
      navigate("/admin-login");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setUserProfile(profile);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch flags
      const { data: flagsData, error: flagsError } = await adminClient.from("feature_flags").select("*").order("key");
      if (flagsError) throw flagsError;
      setFlags(flagsData || []);

      // Fetch Houses for selection
      const { data: housesData } = await adminClient.from("couple_spaces").select("id, house_name, partner1_name, partner2_name").order("house_name");
      setHouses(housesData || []);

      // Fetch Users for selection
      const { data: usersData } = await adminClient.from("profiles").select("user_id, display_name").order("display_name");
      setUsers(usersData || []);

    } catch (err: any) {
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
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

  const handleUpdate = async (id: string, updates: any) => {
    try {
      const { error } = await adminClient.from("feature_flags").update(updates).eq("id", id);
      if (error) throw error;
      setFlags(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      toast({ title: "Atualizado", description: "Configuração guardada com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta flag?")) return;
    try {
      const { error } = await adminClient.from("feature_flags").delete().eq("id", id);
      if (error) throw error;
      setFlags(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const key = formData.get("key") as string;
    const scope = formData.get("scope") as string;
    const target_id = formData.get("target_id") as string;

    try {
      const { error } = await adminClient.from("feature_flags").insert({
        key,
        scope,
        target_id: target_id || null,
        enabled: true
      });
      if (error) throw error;
      fetchData();
      e.target.reset();
      toast({ title: "Sucesso", description: "Nova flag criada." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const enableOnlyForMe = async (key: string) => {
    if (!userProfile?.user_id) return;
    try {
      const { error } = await adminClient.from("feature_flags").insert({
        key,
        scope: "user",
        target_id: userProfile.user_id,
        enabled: true
      });
      if (error) throw error;
      fetchData();
      toast({ title: "Modo Teste", description: `Ativado apenas para ti (${userProfile.display_name}).` });
    } catch (err: any) {
      toast({ title: "Erro", description: "Já existe uma configuração de teste para esta chave ou erro na BD.", variant: "destructive" });
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
              ) : selectedScope === "couple" ? (
                <select name="target_id" required className="w-full h-11 px-3 rounded-xl bg-muted/30 border-none shadow-inner text-sm font-bold appearance-none outline-none ring-primary/20 focus:ring-2">
                   <option value="">Selecionar Casal...</option>
                   {houses.map(h => (
                     <option key={h.id} value={h.id}>{h.house_name || `${h.partner1_name} & ${h.partner2_name}`}</option>
                   ))}
                </select>
              ) : (
                <select name="target_id" required className="w-full h-11 px-3 rounded-xl bg-muted/30 border-none shadow-inner text-sm font-bold appearance-none outline-none ring-primary/20 focus:ring-2">
                   <option value="">Selecionar Utilizador...</option>
                   {users.map(u => (
                     <option key={u.user_id} value={u.user_id}>{u.display_name || u.user_id}</option>
                   ))}
                </select>
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
            {flags.length === 0 && !loading && (
              <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed">
                <p className="text-muted-foreground italic">Nenhuma configuração encontrada.</p>
              </div>
            )}

            {flags.map((flag) => (
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

                  {/* CENTER: EDITABLE */}
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

                    <div className="flex-1 w-full sm:min-w-[180px]">
                      <Label className="text-[9px] font-black uppercase opacity-40 px-1">Target ID</Label>
                      <Input 
                        placeholder="N/A"
                        value={flag.target_id || ""}
                        onChange={(e) => handleUpdate(flag.id, { target_id: e.target.value || null })}
                        className="h-9 rounded-xl border-none bg-muted font-mono text-[10px]"
                      />
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

                {/* TEST MODE SHORTCUT */}
                {flag.scope !== "user" && (
                  <div className="mt-4 pt-4 border-t border-dashed border-border flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg h-7 gap-2"
                      onClick={() => enableOnlyForMe(flag.key)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ativar apenas para mim (Modo Teste)
                    </Button>
                  </div>
                )}
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
