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
import { Loader2, LogOut, Download, Camera, Bell, BellOff, Image as ImageIcon, Trash2, ChevronLeft, User, Heart, Palette, Shield, ShieldCheck, Moon, Sun, Monitor, Copy, Sparkles } from "lucide-react";
import { VerificationSection } from "@/features/verification/VerificationSection";
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
  const [savingWallpaper, setSavingWallpaper] = useState(false);
  const [uploading, setUploading] = useState(false);

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
  const [referralCode, setReferralCode] = useState("");
  const [houseInviteCode, setHouseInviteCode] = useState("");

  const [notifPrefs, setNotifPrefs] = useState(loadPrefs);

  const [exporting, setExporting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [dbSubscription, setDbSubscription] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [hidePushWarning, setHidePushWarning] = useState(() => localStorage.getItem("hide_push_warning") === "true");
  
  const toggleHidePushWarning = (val: boolean) => {
    setHidePushWarning(val);
    localStorage.setItem("hide_push_warning", String(val));
    if (val) toast({ title: "Aviso de iOS escondido" });
  };
  
  // Smart Notifications State
  const [smartSettings, setSmartSettings] = useState<any[]>([]);
  const [preferredHour, setPreferredHour] = useState(10);
  const [savingSmart, setSavingSmart] = useState(false);

  const [currentCategory, setCurrentCategory] = useState<'menu' | 'profile' | 'house' | 'notifications' | 'customization' | 'verification' | 'data'>('menu');

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado!", description: message });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (["profile", "house", "notifications", "customization", "verification", "data"].includes(hash)) {
        setCurrentCategory(hash as any);
      }
    };

    handleHashChange(); // Initial check
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const isNotificationSupported = typeof Notification !== "undefined";
    const isPushSupported = "PushManager" in window;

    if (!isNotificationSupported || !isPushSupported) {
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
        setReferralCode(data.referral_code ?? "");
      }
      
      // Load Smart Notif Settings
      const { data: sNotifs } = await supabase
        .from("notification_settings" as any)
        .select("*")
        .eq("user_id", user.id);
      
      if (sNotifs && sNotifs.length > 0) {
        setSmartSettings(sNotifs);
        setPreferredHour(sNotifs[0].preferred_hour);
      } else {
        // Initialize default categories if none exist
        const defaultCats = ['engagement', 'emotion', 'partner', 'system'];
        setSmartSettings(defaultCats.map(c => ({ category: c, enabled: true })));
      }

      if (spaceId) {
        const { data: spaceData } = await supabase.from("couple_spaces").select("*").eq("id", spaceId).maybeSingle();
        if (spaceData) {
          setRelationshipDate(spaceData.relationship_start_date ?? "");
          setHouseId(spaceData.id);
          setHouseName(spaceData.house_name || "");
          setPartner1Name(spaceData.partner1_name || "");
          setPartner2Name(spaceData.partner2_name || "");
          setHouseInviteCode(spaceData.invite_code || "");
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

  const toggleSmartNotif = async (category: string) => {
    if (!user) return;
    const existing = smartSettings.find(s => s.category === category);
    const newState = existing ? !existing.enabled : false;

    // Optimistic update
    setSmartSettings(prev => {
      const idx = prev.findIndex(s => s.category === category);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], enabled: newState };
        return next;
      }
      return [...prev, { category, enabled: newState }];
    });

    try {
      await supabase.from("notification_settings" as any).upsert({
        user_id: user.id,
        category,
        enabled: newState,
        preferred_hour: preferredHour
      }, { onConflict: 'user_id,category' });
    } catch (e) {
      console.error("Error updating smart settings:", e);
    }
  };

  const updatePreferredHour = async (hour: string) => {
    if (!user) return;
    const h = parseInt(hour);
    setPreferredHour(h);
    
    try {
      setSavingSmart(true);
      // Update all categories with the new preferred hour
      const updates = smartSettings.map(s => ({
        user_id: user.id,
        category: s.category,
        enabled: s.enabled,
        preferred_hour: h
      }));
      
      if (updates.length > 0) {
        await supabase.from("notification_settings" as any).upsert(updates, { onConflict: 'user_id,category' });
      } else {
        // Just create one to store the hour if nothing exists
        await supabase.from("notification_settings" as any).upsert({
          user_id: user.id,
          category: 'system',
          enabled: true,
          preferred_hour: h
        }, { onConflict: 'user_id,category' });
      }
      toast({ title: "Horário atualizado!" });
    } catch (e) {
      console.error("Error updating hour:", e);
    } finally {
      setSavingSmart(false);
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
      if (typeof Notification === "undefined") {
        throw new Error("API de Notificações não suportada neste dispositivo.");
      }
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

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      toast({ title: "Foto de perfil removida! ✨" });
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
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
    { id: 'verification', label: 'Verificar Identidade', sub: 'Segurança e confiança (KYC)', icon: <ShieldCheck className="h-5 w-5" />, color: 'bg-emerald-100 text-emerald-600' },
    { id: 'customization', label: 'Personalização', sub: 'Fundo do chat e opacidade', icon: <Palette className="h-5 w-5" />, color: 'bg-purple-100 text-purple-600' },
    { id: 'data', label: 'Segurança e Dados', sub: 'Exportação e conta', icon: <Shield className="h-5 w-5" />, color: 'bg-slate-100 text-slate-600' },
  ] as const;

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-8 max-w-2xl mx-auto overflow-x-hidden animate-fade-in">
      {currentCategory === 'menu' ? (
        <section className="space-y-8">
          {/* Header Estilo iPhone */}
          <header className="space-y-4 pt-4 px-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">Definições</h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400">Este é o vosso espaço 💛</span>
                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Conta</span>
                </div>
              </div>
            </div>
          </header>

          <Card className="p-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <Avatar className="h-16 w-16 ring-4 ring-slate-50 shadow-apple">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="text-xl bg-slate-900 text-white font-black border-none">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-slate-900 tracking-tight truncate">{displayName || "Utilizador"}</h3>
              <p className="text-xs font-bold text-slate-400 truncate">{user?.email}</p>
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20">PREMIUM ✨</div>
            </div>
          </Card>

          <div className="grid gap-3">
            {menuItems.map((item, idx) => (
              <button 
                key={item.id} 
                onClick={() => setCurrentCategory(item.id)} 
                className={cn(
                  "bg-white shadow-apple rounded-[2rem] p-5 flex items-center gap-4 text-left w-full group transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500",
                  `stagger-${(idx % 6) + 1}`
                )}
              >
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", item.color)}>{item.icon}</div>
                <div className="flex-1">
                  <p className="font-black text-[14px] text-slate-900 tracking-tight">{item.label}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sub}</p>
                </div>
                <ChevronLeft className="h-4 w-4 text-slate-300 rotate-180 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>

          <Button variant="ghost" className="w-full text-slate-400 hover:text-destructive mt-4 h-14 font-black uppercase tracking-widest text-[10px] transition-all" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Terminar Sessão
          </Button>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentCategory('menu')} className="rounded-full hover:bg-primary/5"><ChevronLeft className="h-5 w-5" /></Button>
            <h2 className="text-xl font-bold gradient-text">{menuItems.find(m => m.id === currentCategory)?.label}</h2>
          </div>

          {currentCategory === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="relative">
                  <Avatar className="h-28 w-28 ring-4 ring-white shadow-apple">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="text-3xl font-black bg-slate-900 text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <label htmlFor="av-up" className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white shadow-xl hover:scale-110 transition-transform">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  </label>
                  <input id="av-up" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                </div>
                {avatarUrl && (
                  <Button variant="ghost" size="sm" className="h-9 text-destructive font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-destructive/5" onClick={handleRemoveAvatar}>Remover Foto</Button>
                )}
              </div>

              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teu Nome de Exibição</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Como queres ser chamado?" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data de Aniversário</Label>
                  <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Género</Label>
                  <Select value={gender || "none"} onValueChange={(v: any) => setGender(v === "none" ? null : v)}>
                    <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="none">Preferir não dizer</SelectItem>
                      <SelectItem value="female">Mulher</SelectItem>
                      <SelectItem value="male">Homem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} variant="apple" className="w-full h-14">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Alterações
                </Button>

                {referralCode && (
                  <div className="pt-6 border-t border-slate-50 space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">O Teu Código LoveNest</Label>
                    <div className="flex gap-2">
                      <Input value={referralCode} readOnly className="flex-1 text-center font-black tracking-[0.3em] text-primary text-lg" />
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-slate-100 text-slate-400" onClick={() => copyToClipboard(referralCode, "Código copiado!")}>
                        <Copy className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold italic px-1 text-center">Convida amigos e ganha 50 pontos por cada um! 🎁</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {currentCategory === 'house' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="p-6 space-y-6">
                <div className="space-y-1 pb-2">
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">O Vosso Ninho</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personaliza os detalhes da vossa casa</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome da Casa</Label>
                  <Input value={houseName} onChange={e => setHouseName(e.target.value)} placeholder="Ex: Casa do Amor" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tu (Iniciais)</Label>
                    <Input value={partner1Name} onChange={e => setPartner1Name(e.target.value)} maxLength={5} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Par (Iniciais)</Label>
                    <Input value={partner2Name} onChange={e => setPartner2Name(e.target.value)} maxLength={5} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Início do Relacionamento</Label>
                  <Input type="date" value={relationshipDate} onChange={e => setRelationshipDate(e.target.value)} />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} variant="apple" className="w-full h-14">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Dados da Casa
                </Button>

                {houseInviteCode && (
                  <div className="pt-6 border-t border-slate-50 space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Código de Convite da Casa</Label>
                    <div className="flex gap-2">
                      <Input value={houseInviteCode} readOnly className="flex-1 text-center font-black tracking-[0.3em] text-primary text-lg" />
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-slate-100 text-slate-400" onClick={() => copyToClipboard(houseInviteCode, "Código da casa copiado!")}>
                        <Copy className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold italic px-1 text-center">Partilha este código com o teu par para entrarem na mesma casa. 🏠</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {currentCategory === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Notificações Push</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas em tempo real no teu telemóvel</p>
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-apple",
                    pushSubscribed ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-300"
                  )}>
                    {pushSubscribed ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
                  </div>
                </div>

                {pushPermission === "unsupported" && !hidePushWarning ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 relative space-y-3">
                    <div className="flex items-center gap-2">
                       <Shield className="h-4 w-4 text-amber-600" />
                       <p className="text-[11px] text-amber-900 font-extrabold uppercase tracking-widest">Aviso de Compatibilidade iOS</p>
                    </div>
                    <p className="text-[12px] text-amber-700 font-medium leading-relaxed pr-8">
                      A Apple só permite notificações em apps Web (PWA) no <b>iOS 16.4</b> ou superior. 
                      Atualiza o teu iPhone para ativares esta funcionalidade! ✨
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-4 right-4 h-8 w-8 text-amber-900/40 hover:text-amber-900 hover:bg-amber-100/50 rounded-full"
                      onClick={() => toggleHidePushWarning(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : pushPermission === "unsupported" && hidePushWarning ? (
                  <div className="flex items-center justify-between p-2">
                    <div className="space-y-0.5">
                      <p className="text-[12px] font-black text-slate-900">Mostrar aviso de suporte iOS</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Reativar o alerta de versão 16.4+</p>
                    </div>
                    <Switch 
                      checked={!hidePushWarning} 
                      onCheckedChange={(checked) => toggleHidePushWarning(!checked)} 
                    />
                  </div>
                ) : pushSubscribed ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" onClick={handleDisablePush} disabled={pushLoading} className="h-12 rounded-2xl border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">Desativar</Button>
                    <Button variant="outline" size="sm" onClick={handleTestNotification} disabled={testLoading} className="h-12 rounded-2xl border-slate-100 font-black text-[10px] uppercase tracking-widest text-primary">Testar Push</Button>
                  </div>
                ) : (
                  <Button onClick={handleEnablePush} disabled={pushLoading} variant="apple" className="w-full h-14">
                    {pushLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ativar Notificações
                  </Button>
                )}
              </Card>

              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-[1.25rem] bg-indigo-50 flex items-center justify-center shadow-apple shadow-indigo-100/50">
                    <Sparkles className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Dicas Inteligentes</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lembretes personalizados por IA</p>
                  </div>
                </div>
                
                <p className="text-[12px] text-slate-500 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-50 italic">
                  O LoveNest analisa o vosso ritmo para enviar mensagens de carinho e incentivos nos momentos certos. ✨
                </p>

                <div className="space-y-5 pt-2">
                  {[
                    { id: 'engagement', label: 'Conexão Positiva', desc: 'Incentivos quando estão distantes' },
                    { id: 'emotion', label: 'Cuidado Emocional', desc: 'Lembretes para registar o humor' },
                    { id: 'partner', label: 'Estado do Par', desc: 'Saber quando o par está ativo' },
                    { id: 'system', label: 'Gestão de Rotina', desc: 'Alertas de tarefas pendentes' }
                  ].map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between group transition-all">
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-black text-slate-900 group-hover:text-primary transition-colors">{cat.label}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{cat.desc}</p>
                      </div>
                      <Switch 
                        checked={smartSettings.find(s => s.category === cat.id)?.enabled !== false} 
                        onCheckedChange={() => toggleSmartNotif(cat.id)} 
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-50 space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Horário Preferido para Alertas</Label>
                  <Select value={preferredHour.toString()} onValueChange={updatePreferredHour} disabled={savingSmart}>
                    <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl">
                      <SelectValue placeholder="Escolhe uma hora..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()} className="rounded-xl">{i.toString().padStart(2, '0')}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-slate-400 font-black italic mt-2 text-center uppercase tracking-tight">Dica: Escolhe um horário em que costumas estar livre. 💛</p>
                </div>
              </Card>

              <Card className="p-6 space-y-6">
                <div className="space-y-1">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Canais em Tempo Real</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(notifPrefs).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1 transition-all">
                       <span className="text-[13px] font-black text-slate-700 capitalize tracking-tight">{k.replace('_', ' ')}</span>
                       <Switch checked={v} onCheckedChange={() => toggleNotif(k)} />
                    </div>
                  ))}
                </div>
              </Card>

              <Button variant="ghost" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest text-slate-200 hover:text-slate-400 transition-all opacity-30 hover:opacity-100" onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? "Ocultar Sistema de Logs" : "Visualizar Logs de Sistema"}
              </Button>
              {showDebug && (
                <div className="p-6 bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Developer Debug Logs</span>
                    <Button onClick={handlePingRaw} size="sm" variant="outline" className="h-8 rounded-full border-slate-800 text-slate-400 hover:bg-slate-800 font-black text-[9px] uppercase tracking-widest px-4">Ping System</Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-2 pr-2 scrollbar-thin">
                    {debugLogs.map((log, i) => (
                      <div key={i} className="border-b border-slate-800 pb-2 flex flex-col gap-1">
                        <span className="text-primary/70">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                        <span className="break-all">{log.event_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentCategory === 'customization' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="p-6 space-y-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Cores e Tema</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Adapta o LoveNest ao teu estilo</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Claro', icon: Sun },
                      { id: 'dark', label: 'Escuro', icon: Moon },
                      { id: 'system', label: 'Sistema', icon: Monitor },
                    ].map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => setTheme(item.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-[1.75rem] border-2 transition-all active:scale-95",
                          theme === item.id 
                            ? "border-primary bg-primary/5 shadow-apple shadow-primary/10" 
                            : "border-slate-50 bg-slate-50/50 hover:bg-slate-50"
                        )}
                      >
                        <item.icon className={cn("h-7 w-7", theme === item.id ? "text-primary transition-transform scale-110" : "text-slate-300")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", theme === item.id ? "text-primary" : "text-slate-400")}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-50">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Fundo Dinâmico</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Escolhe uma foto especial para o fundo do vosso chat.</p>
                  </div>
                  
                  <div className="flex items-center gap-5">
                    <div className="relative h-32 w-24 rounded-[1.5rem] overflow-hidden border-4 border-white shadow-apple bg-slate-50 shrink-0">
                      {wallpaperUrl ? (
                        <img src={wallpaperUrl} className="h-full w-full object-cover transition-opacity duration-300" style={{ opacity: wallpaperOpacity }} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-200"><ImageIcon className="h-8 w-8" /></div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <Button variant="outline" size="sm" className="w-full h-11 rounded-2xl border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-600 shadow-sm" asChild disabled={savingWallpaper}>
                        <label className="cursor-pointer flex items-center justify-center gap-2">
                          {savingWallpaper ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                          {savingWallpaper ? "A Carregar..." : "Alterar Foto"}
                          <input type="file" accept="image/*" hidden onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSavingWallpaper(true);
                            try {
                              const url = await uploadWallpaper(file);
                              if (url) {
                                await updateWallpaper({ url });
                                toast({ title: "Wallpaper atualizado! ✨" });
                              } else {
                                toast({ title: "Erro ao fazer upload", variant: "destructive" });
                              }
                            } catch (err: any) {
                              toast({ title: "Erro", description: err.message, variant: "destructive" });
                            } finally {
                              setSavingWallpaper(false);
                            }
                          }} />
                        </label>
                      </Button>
                      {wallpaperUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full h-11 rounded-2xl text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive/5" 
                          onClick={async () => {
                            setSavingWallpaper(true);
                            await removeWallpaper();
                            setSavingWallpaper(false);
                            toast({ title: "Wallpaper removido" });
                          }}
                          disabled={savingWallpaper}
                        >
                          Limpar Fundo
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center px-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opacidade do Fundo</Label>
                      <span className="text-base font-black text-primary tracking-tighter">{Math.round(wallpaperOpacity * 100)}%</span>
                    </div>
                      <Slider 
                        value={[wallpaperOpacity]} 
                        min={0} 
                        max={1} 
                        step={0.01}
                        onValueChange={([v]) => updateWallpaper({ opacity: v })}
                        className="py-4"
                      />
                      <p className="text-[9px] text-slate-400 font-bold italic text-center uppercase tracking-tight">Dica: Reduz a opacidade para facilitar a leitura das mensagens. 📝</p>
                    </div>
                </div>
              </Card>
            </div>
          )}

          {currentCategory === 'verification' && user && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <VerificationSection userId={user.id} />
            </div>
          )}

          {currentCategory === 'data' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="p-6 flex items-center justify-between group transition-all">
                <div className="space-y-1">
                  <p className="text-lg font-black text-slate-900 tracking-tight">Exportar os Meus Dados</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descarrega uma cópia em formato JSON</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleExport} disabled={exporting} className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-primary transition-all">
                   {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                </Button>
              </Card>

              <AlertDialog open={leaving} onOpenChange={setLeaving}>
                <AlertDialogTrigger asChild>
                  <button className="bg-white shadow-apple rounded-[2rem] p-6 flex items-center justify-between w-full text-destructive hover:bg-rose-50/50 transition-all active:scale-95 group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center transition-transform group-hover:scale-110">
                        <LogOut className="h-5 w-5 text-rose-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-black tracking-tight">Sair da Casa</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Abandonar este ninho permanentemente</p>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 rotate-180 opacity-30 group-hover:opacity-100 transition-opacity" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm mx-auto">
                  <AlertDialogHeader className="space-y-4">
                    <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-2">
                       <LogOut className="h-10 w-10 text-rose-500" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tighter text-center">Tens a certeza?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium text-slate-500 text-center leading-relaxed">
                      Se saíres desta casa, irás perder acesso a todas as memórias, chat e planos partilhados. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
                    <AlertDialogAction onClick={handleLeaveHouse} className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] shadow-xl shadow-rose-200 order-1 sm:order-2">Sair Definitivamente</AlertDialogAction>
                    <AlertDialogCancel className="w-full h-14 bg-slate-50 border-none text-slate-400 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] order-2 sm:order-1">Cancelar</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50 border-dashed border-2 border-slate-100 rounded-[2.5rem]">
                 <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <Shield className="h-8 w-8" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Privacidade e Segurança</p>
                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed px-4">Os teus dados são encriptados e nunca partilhados com terceiros. O LoveNest é um espaço seguro apenas para vocês dois.</p>
                 </div>
              </Card>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
