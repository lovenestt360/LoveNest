import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, LogOut, Download, Camera, Bell, BellOff, Image as ImageIcon, Trash2, ChevronLeft, User, Heart, Palette, Shield, Moon, Sun, Monitor } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import { generateInitials } from "@/utils/initials";
import { cn } from "@/lib/utils";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  birthday: string | null;
  gender: "male" | "female" | null;
}

const NOTIF_KEY = "lovenest_notif_prefs";
const defaultPrefs = {
  chat: true,
  humor: true,
  tarefas: true,
  memorias: true,
  oracao: true,
  conflitos: true,
  ciclo_lembrete: false,
  ciclo_menstruacao: false,
  ciclo_fertil: false,
  ciclo_par: false,
};

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : { ...defaultPrefs };
  } catch {
    return { ...defaultPrefs };
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { wallpaperUrl, wallpaperOpacity, updateSettings: updateWallpaper, uploadWallpaper, removeWallpaper } = useUserSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // House State
  const [houseId, setHouseId] = useState<string | null>(null);
  const [houseName, setHouseName] = useState("");
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [relationshipDate, setRelationshipDate] = useState("");

  const [notifPrefs, setNotifPrefs] = useState(loadPrefs);

  const [exporting, setExporting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [dbSubscription, setDbSubscription] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<'menu' | 'profile' | 'house' | 'notifications' | 'customization' | 'data'>('menu');

  useEffect(() => {
    if (!("Notification" in window) || !("PushManager" in window)) {
      setPushPermission("unsupported");
    } else {
      setPushPermission(Notification.permission);
      navigator.serviceWorker?.ready.then((reg) => {
        (reg as any).pushManager.getSubscription().then((sub: any) => {
          setPushSubscribed(!!sub);
          if (sub && user) {
            checkSubscriptionInDB(sub.endpoint);
          }
        });
      });
    }
  }, [user]);

  const checkSubscriptionInDB = async (endpoint: string) => {
    const { data } = await supabase.from('push_subscriptions').select('*').eq('endpoint', endpoint).maybeSingle();
    setDbSubscription(data);
  };

  const fetchDebugLogs = async () => {
    const { data, error } = await supabase
      .from('edge_function_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) setDebugLogs(data);
  };

  const handlePingRaw = async () => {
    setPushLoading(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session?.access_token}`
        },
        body: JSON.stringify({ ping: true, user: user?.id })
      });
      fetchDebugLogs();
      setShowDebug(true);
      toast({ title: "Ping enviado!" });
    } catch {
      toast({ title: "Erro no ping", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user || !spaceId) return;
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          couple_space_id: spaceId,
          title: "🔔 Teste LoveNest",
          body: "As tuas notificações estão a funcionar! ✨",
          url: "/configuracoes",
          type: "chat",
          is_test: true
        }
      });
      if (error) throw error;
      toast({ title: "Notificação enviada! 🚀" });
    } catch (err: any) {
      toast({ title: "Erro no push", description: err.message, variant: "destructive" });
    } finally {
      setTestLoading(false);
      fetchDebugLogs();
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setBirthday(data.birthday ?? "");
        setGender(data.gender as any);
        setAvatarUrl(data.avatar_url);
      }
      if (spaceId) {
        const { data: spaceData } = await supabase.from("couple_spaces").select("*").eq("id", spaceId).maybeSingle();
        if (spaceData) {
          setRelationshipDate(spaceData.relationship_start_date ?? "");
          setHouseId(spaceData.id);
          setHouseName(spaceData.house_name || "");
          setPartner1Name(spaceData.partner1_name || "");
          setPartner2Name(spaceData.partner2_name || "");
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, [user, spaceId]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      display_name: displayName || null,
      birthday: birthday || null,
      gender: gender || null,
      avatar_url: avatarUrl,
    }).eq("user_id", user.id);

    if (spaceId) {
      await supabase.from("couple_spaces").update({
        relationship_start_date: relationshipDate || null,
        house_name: houseName,
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        initials: generateInitials(partner1Name, partner2Name)
      } as any).eq("id", spaceId);
    }
    setSaving(false);
    toast({ title: "Perfil atualizado! ✨" });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O limite é de 5MB por foto.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrl);
      
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (profileError) throw profileError;

      toast({ title: "Avatar atualizado! ✨", description: "A tua nova foto de perfil já está visível." });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({ 
        title: "Erro no upload", 
        description: error.message || "Tenta novamente ou usa uma foto mais pequena.", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleNotif = (key: string) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleEnablePush = async () => {
    if (!user || !spaceId) return;
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === "granted") {
        const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const reg = await navigator.serviceWorker.register("/sw.js");
        const subscription = await (reg as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer,
        });
        const subJson = subscription.toJSON();
        await supabase.from("push_subscriptions").upsert({
          couple_space_id: spaceId,
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
          user_agent: navigator.userAgent,
        }, { onConflict: "user_id,endpoint" });
        setPushSubscribed(true);
        toast({ title: "Notificações ativadas! 🔔" });
      }
    } catch (err: any) {
      toast({ title: "Erro no push", description: err.message, variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await (reg as any).pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase.from("push_subscriptions").delete().eq("user_id", user!.id).eq("endpoint", sub.endpoint);
        }
      }
      setPushSubscribed(false);
      toast({ title: "Notificações desativadas" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  const handleExport = async () => {
    if (!spaceId) return;
    setExporting(true);
    try {
      const results: any = {};
      const tables = ["messages", "mood_checkins", "tasks", "photos", "events", "routine_items"];
      for (const t of tables) {
        const { data } = await supabase.from(t).select("*").eq("couple_space_id", spaceId).limit(1000);
        results[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lovenest-export.json`;
      a.click();
      toast({ title: "Dados exportados" });
    } catch {
      toast({ title: "Erro na exportação", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleLeaveHouse = async () => {
    if (!user || !spaceId) return;
    setLeaving(true);
    const { error } = await supabase.from("members").delete().eq("user_id", user.id).eq("couple_space_id", spaceId);
    if (!error) window.location.assign("/casa");
    setLeaving(false);
  };

  if (loading) return <section className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></section>;

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  const menuItems = [
    { id: 'profile', label: 'Meu Perfil', sub: 'Dados e foto de perfil', icon: <User className="h-5 w-5" />, color: 'bg-rose-100 text-rose-600' },
    { id: 'house', label: 'Nossa Casa', sub: 'Dados do parceiro e namoro', icon: <Heart className="h-5 w-5" />, color: 'bg-rose-100 text-rose-600' },
    { id: 'notifications', label: 'Notificações', sub: 'Alertas e avisos do app', icon: <Bell className="h-5 w-5" />, color: 'bg-indigo-100 text-indigo-600' },
    { id: 'customization', label: 'Personalização', sub: 'Fundo do chat e opacidade', icon: <Palette className="h-5 w-5" />, color: 'bg-purple-100 text-purple-600' },
    { id: 'data', label: 'Segurança e Dados', sub: 'Exportação e conta', icon: <Shield className="h-5 w-5" />, color: 'bg-slate-100 text-slate-600' },
  ] as const;

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      {currentCategory === 'menu' ? (
        <section className="space-y-6">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Definições</h1>
            <p className="text-muted-foreground">Personaliza o teu ninho de amor.</p>
          </header>

          <div className="glass-card p-6 flex items-center gap-4 mb-8">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="text-2xl bg-gradient-to-br from-rose-400 to-orange-400 text-white border-none">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold truncate">{displayName || "Utilizador"}</h3>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">PREMIUM ✨</div>
            </div>
          </div>

          <div className="grid gap-4">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => setCurrentCategory(item.id)} className="glass-card glass-card-hover p-4 flex items-center gap-4 text-left w-full group">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>{item.icon}</div>
                <div className="flex-1">
                  <p className="font-bold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
              </button>
            ))}
          </div>

          <Button variant="ghost" className="w-full text-destructive mt-8 h-12 font-bold" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Terminar Sessão
          </Button>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentCategory('menu')} className="rounded-full hover:bg-rose-50"><ChevronLeft className="h-5 w-5" /></Button>
            <h2 className="text-xl font-bold gradient-text">{menuItems.find(m => m.id === currentCategory)?.label}</h2>
          </div>

          {currentCategory === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 shadow-lg">{avatarUrl && <AvatarImage src={avatarUrl} />}<AvatarFallback className="text-2xl">{initials}</AvatarFallback></Avatar>
                  <label htmlFor="av-up" className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</label>
                  <input id="av-up" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                </div>
              </div>
              <div className="space-y-4 glass-card p-6">
                <div className="space-y-2"><Label>Teu Nome</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-12 bg-background/50 border-none" /></div>
                <div className="space-y-2"><Label>Aniversário</Label><Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="h-12 bg-background/50 border-none" /></div>
                <div className="space-y-2">
                  <Label>Género</Label>
                  <Select value={gender || "none"} onValueChange={(v: any) => setGender(v === "none" ? null : v)}>
                    <SelectTrigger className="h-12 bg-background/50 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Preferir não dizer</SelectItem><SelectItem value="female">Mulher</SelectItem><SelectItem value="male">Homem</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-12 font-bold glow-primary">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
              </div>
            </div>
          )}

          {currentCategory === 'house' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="space-y-2"><Label>Apelido da Casa</Label><Input value={houseName} onChange={e => setHouseName(e.target.value)} className="h-12 bg-background/50 border-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Tu (Iniciais)</Label><Input value={partner1Name} onChange={e => setPartner1Name(e.target.value)} className="h-12 bg-background/50 border-none" /></div>
                  <div className="space-y-2"><Label>Par (Iniciais)</Label><Input value={partner2Name} onChange={e => setPartner2Name(e.target.value)} className="h-12 bg-background/50 border-none" /></div>
                </div>
                <div className="space-y-2"><Label>Início do Namoro</Label><Input type="date" value={relationshipDate} onChange={e => setRelationshipDate(e.target.value)} className="h-12 bg-background/50 border-none" /></div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-12 font-bold glow-primary">Guardar Dados</Button>
              </div>
            </div>
          )}

          {currentCategory === 'notifications' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between"><div><h3 className="font-bold">Notificações Push</h3><p className="text-xs text-muted-foreground">Alertas no telemóvel.</p></div>{pushSubscribed ? <Bell className="text-green-500" /> : <BellOff className="text-muted-foreground" />}</div>
                {pushSubscribed ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={handleDisablePush} disabled={pushLoading}>Desativar</Button>
                    <Button variant="outline" size="sm" onClick={handleTestNotification} disabled={testLoading}>Testar</Button>
                  </div>
                ) : <Button onClick={handleEnablePush} disabled={pushLoading} className="w-full h-12 font-bold glow-primary">Ativar</Button>}
              </div>
              <div className="glass-card p-6 space-y-4">
                <h3 className="font-bold text-sm uppercase text-muted-foreground">Módulos</h3>
                <div className="space-y-3">
                  {Object.entries(notifPrefs).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between"><span className="text-sm capitalize">{k.replace('_', ' ')}</span><Switch checked={v} onCheckedChange={() => toggleNotif(k)} /></div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-[9px] opacity-10" onClick={() => setShowDebug(!showDebug)}>{showDebug ? "Fechar Logs" : "Abrir Logs"}</Button>
              {showDebug && (
                <div className="p-4 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-mono text-zinc-500">SYSTEM_LOGS</span><Button onClick={handlePingRaw} size="xs" className="h-6">Ping</Button></div>
                  <div className="max-h-60 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1">
                    {debugLogs.map((log, i) => <div key={i} className="border-b border-zinc-800 pb-1">[{new Date(log.created_at).toLocaleTimeString()}] {log.event_type}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentCategory === 'customization' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <div>
                  <Label className="text-base font-bold mb-4 block">Modo do Aplicativo</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        theme === "light" ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-background/50"
                      )}
                    >
                      <Sun className={cn("h-6 w-6", theme === "light" ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-bold">Claro</span>
                    </button>
                    <button 
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        theme === "dark" ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-background/50"
                      )}
                    >
                      <Moon className={cn("h-6 w-6", theme === "dark" ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-bold">Escuro</span>
                    </button>
                    <button 
                      onClick={() => setTheme("system")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        theme === "system" ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-background/50"
                      )}
                    >
                      <Monitor className={cn("h-6 w-6", theme === "system" ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-bold">Sistema</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div>
                    <Label className="text-base font-bold mb-1 block">Papel de Parede do Chat</Label>
                    <p className="text-xs text-muted-foreground mb-4">Escolha uma foto para o fundo das conversas.</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-16 rounded-lg overflow-hidden border border-white/20 bg-muted shrink-0">
                      {wallpaperUrl ? (
                        <img src={wallpaperUrl} className="h-full w-full object-cover" style={{ opacity: wallpaperOpacity }} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30"><Palette className="h-6 w-6" /></div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Button variant="outline" size="sm" className="w-full text-xs font-bold h-9" asChild>
                        <label>
                          Mudar Foto
                          <input type="file" accept="image/*" hidden onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadWallpaper(file);
                            if (url) updateWallpaper({ url });
                          }} />
                        </label>
                      </Button>
                      {wallpaperUrl && (
                        <Button variant="ghost" size="sm" className="w-full text-xs font-bold h-9 text-destructive" onClick={removeWallpaper}>Remover</Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold">Opacidade do Fundo</Label>
                      <span className="text-xs font-bold text-primary">{Math.round(wallpaperOpacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={wallpaperOpacity} 
                      onChange={(e) => updateWallpaper({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-primary h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentCategory === 'data' && (
            <div className="space-y-4">
              <div className="glass-card p-4 flex items-center justify-between"><div><p className="text-sm font-bold">Exportar Dados</p><p className="text-[10px] text-muted-foreground">JSON format.</p></div><Button variant="ghost" onClick={handleExport} disabled={exporting}>Exportar</Button></div>
              <AlertDialog open={leaving} onOpenChange={setLeaving}>
                <AlertDialogTrigger asChild><button className="glass-card p-4 flex items-center justify-between w-full text-destructive hover:bg-destructive/5 transition-colors"><div className="flex items-center gap-3"><LogOut className="h-5 w-5" /><p className="text-sm font-bold">Sair da Casa</p></div><ChevronLeft className="h-4 w-4 rotate-180 opacity-50" /></button></AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem]"><AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Irás perder acesso a este ninho.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleLeaveHouse} className="bg-destructive rounded-full">Sim, sair</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
