import { useEffect, useState } from "react";
import { useTierAccess } from "@/hooks/useTierAccess";
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
import { Loader2, LogOut, Download, Camera, Bell, BellOff, Image as ImageIcon, Trash2, ChevronLeft, User, Heart, Palette, Shield, ShieldCheck, Moon, Sun, Monitor, Copy, Sparkles, Globe, Users } from "lucide-react";
import { CountryPicker } from "@/components/onboarding/CountryPicker";
import { COUNTRIES } from "@/data/countries";
import { VerificationSection } from "@/features/verification/VerificationSection";
import { NotificationPrePermissionModal } from "@/components/NotificationPrePermissionModal";
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

const RELIGION_OPTIONS = [
  { value: "christian", label: "Cristão" },
  { value: "muslim", label: "Muçulmano" },
  { value: "hindu", label: "Hindu" },
  { value: "jewish", label: "Judaico" },
  { value: "other", label: "Outra" },
  { value: "none", label: "Nenhuma" },
  { value: "unspecified", label: "Prefiro não dizer" },
];

const PRIMARY_GOAL_OPTIONS = [
  { value: "relationship", label: "Melhorar o meu relacionamento" },
  { value: "books", label: "Ler livros" },
  { value: "wellbeing", label: "Bem-estar emocional" },
  { value: "growth", label: "Crescimento pessoal" },
  { value: "explore", label: "Explorar a aplicação" },
];

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
  const { allowed: wallpaperAllowed } = useTierAccess("wallpapers");

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

  // Personalização (Onboarding V2)
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [religion, setReligion] = useState<string | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [usageMode, setUsageMode] = useState<"solo" | "couple" | null>(null);
  const [savingPersonalization, setSavingPersonalization] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [showPrePermission, setShowPrePermission] = useState(false);
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

  const [currentCategory, setCurrentCategory] = useState<'menu' | 'profile' | 'house' | 'personalization' | 'notifications' | 'customization' | 'verification' | 'data'>('menu');

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
      if (["profile", "house", "personalization", "notifications", "customization", "verification", "data"].includes(hash)) {
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
        setCountryCode((data as any).country_code ?? null);
        setReligion((data as any).religion ?? null);
        setPrimaryGoal((data as any).primary_goal ?? null);
        setUsageMode((data as any).usage_mode ?? null);
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
    window.dispatchEvent(new CustomEvent("onboarding-refresh"));
  };

  const handleSavePersonalization = async () => {
    if (!user) return;
    setSavingPersonalization(true);
    const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? null;
    await supabase.from("profiles").update({
      country: countryName,
      country_code: countryCode,
      religion,
      primary_goal: primaryGoal,
    } as any).eq("user_id", user.id);
    setSavingPersonalization(false);
    toast({ title: "Personalização atualizada! ✨" });
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
        toast({ title: "Notificações ativadas" });
        window.dispatchEvent(new CustomEvent("onboarding-refresh"));
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

  const [leaveConfirming, setLeaveConfirming] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão inválida.");

      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;

      // Clear local state and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.assign("/inicio");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao eliminar conta", description: err.message });
      setDeleteLoading(false);
      setDeleteConfirming(false);
    }
  };

  const handleLeaveHouse = async () => {
    if (!user || !spaceId) return;
    setLeaveLoading(true);
    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("user_id", user.id)
        .eq("couple_space_id", spaceId);
      if (error) throw error;
      // Clear any local state tied to this couple space
      sessionStorage.removeItem("lovenest_ref");
      window.location.assign("/casa");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao sair", description: err.message });
      setLeaveLoading(false);
      setLeaveConfirming(false);
    }
  };

  if (loading) return <section className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></section>;

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  const menuItems = [
    { id: 'profile',       label: 'Meu Perfil',           sub: 'Dados e foto de perfil',       icon: <User className="h-5 w-5" strokeWidth={1.5} /> },
    { id: 'house',         label: 'Nossa Casa',            sub: 'Dados do parceiro e namoro',   icon: <Heart className="h-5 w-5" strokeWidth={1.5} /> },
    { id: 'personalization', label: 'Sobre Ti',            sub: 'País, espiritualidade e objetivo', icon: <Globe className="h-5 w-5" strokeWidth={1.5} /> },
    { id: 'notifications', label: 'Notificações',          sub: 'Alertas e avisos do app',      icon: <Bell className="h-5 w-5" strokeWidth={1.5} /> },
    { id: 'verification',  label: 'Verificar Identidade',  sub: 'Segurança e confiança',        icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.5} /> },
    { id: 'customization', label: 'Personalização',        sub: 'Fundo do chat e opacidade',    icon: <Palette className="h-5 w-5" strokeWidth={1.5} /> },
    { id: 'data',          label: 'Segurança e Dados',     sub: 'Exportação e conta',           icon: <Shield className="h-5 w-5" strokeWidth={1.5} /> },
  ] as const;

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      {currentCategory === 'menu' ? (
        <section className="space-y-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Definições</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personalizem o vosso espaço.</p>
          </header>

          {/* Profile summary */}
          <div className="glass-card p-5 flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16 ring-2 ring-card shadow-sm">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="text-lg bg-rose-50 dark:bg-rose-950/30 text-rose-400 font-semibold border border-rose-100 dark:border-rose-900/40">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">{displayName || "Utilizador"}</h3>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentCategory(item.id)}
                className="glass-card glass-card-hover w-full p-4 flex items-center gap-4 text-left active:scale-[0.98]"
              >
                <div className="h-10 w-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-rose-400 shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/60 rotate-180 shrink-0" strokeWidth={1.5} />
              </button>
            ))}
          </div>

          <button
            onClick={() => signOut()}
            className="w-full mt-6 h-12 rounded-2xl border border-border text-sm font-medium text-rose-500 flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Terminar Sessão
          </button>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setCurrentCategory('menu')}
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" strokeWidth={1.5} />
            </button>
            <h2 className="text-xl font-bold text-foreground">{menuItems.find(m => m.id === currentCategory)?.label}</h2>
          </div>

          {currentCategory === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 shadow-lg">{avatarUrl && <AvatarImage src={avatarUrl} />}<AvatarFallback className="text-2xl">{initials}</AvatarFallback></Avatar>
                  <label htmlFor="av-up" className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</label>
                  <input id="av-up" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                </div>
                {avatarUrl && (
                  <Button variant="ghost" size="sm" className="h-8 text-destructive font-bold text-xs rounded-full hover:bg-destructive/5" onClick={handleRemoveAvatar}>Remover Foto</Button>
                )}
              </div>
              <div className="space-y-4 glass-card p-6">
                <div className="space-y-2"><Label className="font-bold text-sm">Teu Nome</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl" /></div>
                <div className="space-y-2"><Label className="font-bold text-sm">Aniversário</Label><Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl" /></div>
                <div className="space-y-2">
                  <Label className="ml-1 font-bold text-sm">Género</Label>
                  <Select value={gender || "none"} onValueChange={(v: any) => setGender(v === "none" ? null : v)}>
                    <SelectTrigger className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl"><SelectItem value="none">Preferir não dizer</SelectItem><SelectItem value="female">Mulher</SelectItem><SelectItem value="male">Homem</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-12 font-semibold rounded-2xl bg-rose-500 text-white hover:bg-rose-600 border-0">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
                </Button>

                {referralCode && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Teu Código LoveNest (Amigos)</Label>
                    <div className="flex gap-2">
                      <Input value={referralCode} readOnly className="h-12 bg-primary/5 border-primary/20 text-center font-black tracking-widest text-primary text-lg rounded-xl" />
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border" onClick={() => copyToClipboard(referralCode, "Código de parceiro copiado!")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-black italic px-1">Ganha 50 pontos por cada amigo que entrar! 🎁</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentCategory === 'house' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="space-y-2"><Label className="font-bold text-sm">Apelido da Casa</Label><Input value={houseName} onChange={e => setHouseName(e.target.value)} className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="font-bold text-sm">Tu (Iniciais)</Label><Input value={partner1Name} onChange={e => setPartner1Name(e.target.value)} className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl" /></div>
                  <div className="space-y-2"><Label className="font-bold text-sm">Par (Iniciais)</Label><Input value={partner2Name} onChange={e => setPartner2Name(e.target.value)} className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl" /></div>
                </div>
                <div className="space-y-2"><Label className="font-bold text-sm">Início do Namoro</Label><Input type="date" value={relationshipDate} onChange={e => setRelationshipDate(e.target.value)} className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl" /></div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-12 font-semibold rounded-2xl bg-rose-500 text-white hover:bg-rose-600 border-0">Guardar Dados</Button>

                {houseInviteCode && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Código da Casa (Parceiro)</Label>
                    <div className="flex gap-2">
                      <Input value={houseInviteCode} readOnly className="h-12 bg-primary/5 border-primary/20 text-center font-black tracking-widest text-primary text-lg rounded-xl" />
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border" onClick={() => copyToClipboard(houseInviteCode, "Código da casa copiado!")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-black italic px-1">Usa este código para convidar o teu par. 🏠</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentCategory === 'personalization' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="ml-1 font-bold text-sm">País</Label>
                  <CountryPicker value={countryCode} onSelect={setCountryCode} />
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 font-bold text-sm">Espiritualidade</Label>
                  <Select value={religion || "unspecified"} onValueChange={(v) => setReligion(v)}>
                    <SelectTrigger className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {RELIGION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 font-bold text-sm">O que te trouxe ao LoveNest</Label>
                  <Select value={primaryGoal || ""} onValueChange={(v) => setPrimaryGoal(v)}>
                    <SelectTrigger className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl"><SelectValue placeholder="Escolhe um objetivo" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {PRIMARY_GOAL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSavePersonalization} disabled={savingPersonalization} className="w-full h-12 font-semibold rounded-2xl bg-rose-500 text-white hover:bg-rose-600 border-0">
                  {savingPersonalization && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
                </Button>
              </div>

              {usageMode === "solo" && (
                <div className="glass-card p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 shrink-0">
                      <Users className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Queres viver o LoveNest em casal?</h3>
                      <p className="text-xs text-muted-foreground">Partilha o código abaixo com o teu par.</p>
                    </div>
                  </div>
                  {houseInviteCode && (
                    <div className="flex gap-2">
                      <Input value={houseInviteCode} readOnly className="h-12 bg-primary/5 border-primary/20 text-center font-black tracking-widest text-primary text-lg rounded-xl" />
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border" onClick={() => copyToClipboard(houseInviteCode, "Código copiado!")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground font-black italic px-1">Quando o teu par entrar com este código, as funcionalidades de casal são desbloqueadas automaticamente.</p>
                </div>
              )}
            </div>
          )}

          {currentCategory === 'notifications' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Notificações Push</h3>
                    <p className="text-xs text-muted-foreground">Alertas no telemóvel.</p>
                  </div>
                  {pushSubscribed ? <Bell className="text-green-500" /> : <BellOff className="text-muted-foreground" />}
                </div>
                {pushPermission === "unsupported" ? (
                  <div className="bg-muted border border-border rounded-2xl p-4">
                    <p className="text-[12px] font-semibold text-foreground leading-snug mb-1">
                      Notificações indisponíveis neste dispositivo.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      A Apple requer iOS 16.4 ou superior com a app instalada no ecrã inicial para suportar notificações push.
                    </p>
                  </div>
                ) : pushSubscribed ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleDisablePush} disabled={pushLoading} className="flex-1 rounded-xl">Desativar</Button>
                      <Button variant="outline" size="sm" onClick={handleTestNotification} disabled={testLoading} className="flex-1 rounded-xl">Testar</Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/65 text-center">Notificações ativas neste dispositivo.</p>
                  </div>
                ) : pushPermission === "denied" ? (
                  <div className="bg-muted border border-border rounded-2xl p-4">
                    <p className="text-[12px] font-semibold text-foreground leading-snug mb-1">
                      Permissão bloqueada.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      Para ativar, vai às Definições do teu dispositivo e permite notificações para o LoveNest.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPrePermission(true)}
                    disabled={pushLoading}
                    className="w-full h-12 rounded-2xl bg-rose-500/90 text-white font-semibold text-[14px] disabled:opacity-40 active:scale-[0.98] transition-all shadow-[0_2px_12px_rgba(244,63,94,0.15)]"
                  >
                    {pushLoading ? "A ativar..." : "Ativar notificações"}
                  </button>
                )}
              </div>
              {/* Smart notifications */}
              <div className="glass-card p-5 space-y-0">
                <div className="pb-4 border-b border-border">
                  <p className="text-[13px] font-semibold text-foreground">Lembretes automáticos</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-relaxed">Enviados nos momentos certos, com base no vosso ritmo.</p>
                </div>
                {[
                  { id: 'engagement', label: 'Presença e conexão',  desc: 'Quando o espaço está silencioso' },
                  { id: 'emotion',    label: 'Cuidado emocional',   desc: 'Lembretes para partilhares como te sentes' },
                  { id: 'partner',    label: 'Atividade do par',    desc: 'Quando o teu par aparece no espaço' },
                  { id: 'system',     label: 'Agenda e tarefas',    desc: 'Alertas sobre tarefas e eventos' },
                ].map((cat, i, arr) => (
                  <div key={cat.id} className={cn('flex items-center justify-between py-3.5', i < arr.length - 1 && 'border-b border-border')}>
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-medium text-foreground">{cat.label}</p>
                      <p className="text-[11px] text-muted-foreground/65">{cat.desc}</p>
                    </div>
                    <Switch checked={smartSettings.find(s => s.category === cat.id)?.enabled !== false} onCheckedChange={() => toggleSmartNotif(cat.id)} />
                  </div>
                ))}
                <div className="pt-4 border-t border-border">
                  <p className="text-[11px] font-medium text-muted-foreground/80 mb-2">Horário preferido para lembretes</p>
                  <Select value={preferredHour.toString()} onValueChange={updatePreferredHour} disabled={savingSmart}>
                    <SelectTrigger className="h-11 bg-white dark:bg-white/5 border border-border rounded-xl text-[13px]">
                      <SelectValue placeholder="Escolhe uma hora..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Real-time activity notifications */}
              <div className="glass-card p-5 space-y-0">
                <div className="pb-4 border-b border-border">
                  <p className="text-[13px] font-semibold text-foreground">Avisos em tempo real</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-relaxed">Alertas imediatos quando há atividade no vosso espaço.</p>
                </div>
                {([
                  { key: 'chat',      label: 'Mensagens',  desc: 'Nova mensagem do teu par' },
                  { key: 'humor',     label: 'Humor',      desc: 'Quando o par partilha como se sente' },
                  { key: 'tarefas',   label: 'Agenda',     desc: 'Tarefas e eventos pendentes' },
                  { key: 'memorias',  label: 'Memórias',   desc: 'Novas memórias adicionadas' },
                  { key: 'oracao',    label: 'Oração',     desc: 'Momento de oração em conjunto' },
                  { key: 'conflitos', label: 'Desabafos',  desc: 'Novos desabafos para resolver' },
                ] as const).map((item, i, arr) => (
                  <div key={item.key} className={cn('flex items-center justify-between py-3.5', i < arr.length - 1 && 'border-b border-border')}>
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground/65">{item.desc}</p>
                    </div>
                    <Switch checked={notifPrefs[item.key] ?? true} onCheckedChange={() => toggleNotif(item.key)} />
                  </div>
                ))}
                <div className="pt-4 border-t border-border">
                  <p className="text-[11px] font-medium text-muted-foreground/65 pb-2">Ciclo menstrual</p>
                  {([
                    { key: 'ciclo_lembrete',    label: 'Lembretes gerais', desc: 'Avisos sobre o ciclo' },
                    { key: 'ciclo_menstruacao', label: 'Menstruação',      desc: 'Início do período' },
                    { key: 'ciclo_fertil',      label: 'Período fértil',   desc: 'Janela de fertilidade' },
                    { key: 'ciclo_par',         label: 'Partilha do par',  desc: 'Quando o par partilha dados' },
                  ] as const).map((item, i, arr) => (
                    <div key={item.key} className={cn('flex items-center justify-between py-3.5', i < arr.length - 1 && 'border-b border-border')}>
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-medium text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground/65">{item.desc}</p>
                      </div>
                      <Switch checked={notifPrefs[item.key] ?? false} onCheckedChange={() => toggleNotif(item.key)} />
                    </div>
                  ))}
                </div>
              </div>

                            <Button variant="ghost" size="sm" className="w-full text-[9px] opacity-10" onClick={() => setShowDebug(!showDebug)}>{showDebug ? "Fechar Logs" : "Abrir Logs"}</Button>
              {showDebug && (
                <div className="p-4 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-mono text-zinc-500">SYSTEM_LOGS</span><Button onClick={handlePingRaw} size="sm" className="h-6">Ping</Button></div>
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

                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <Label className="text-base font-bold mb-1 block">Papel de Parede do Chat</Label>
                    <p className="text-xs text-muted-foreground mb-4">Escolha uma foto para o fundo das conversas.</p>
                  </div>

                  {!wallpaperAllowed ? (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 flex flex-col items-center gap-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Funcionalidade Premium</p>
                        <p className="text-xs text-muted-foreground mt-1">O papel de parede do chat requer um plano ativo.</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-9 px-5 font-bold text-xs rounded-xl"
                        onClick={() => window.location.href = "/subscricao"}
                      >
                        Ver Planos
                      </Button>
                    </div>
                  ) : (
                  <>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-16 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                      {wallpaperUrl ? (
                        <img src={wallpaperUrl} className="h-full w-full object-cover" style={{ opacity: wallpaperOpacity }} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30"><Palette className="h-6 w-6" /></div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Button variant="outline" size="sm" className="w-full text-xs font-bold h-9" asChild disabled={savingWallpaper}>
                        <label className="cursor-pointer flex items-center justify-center">
                          {savingWallpaper ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {savingWallpaper ? "Carregando..." : "Mudar Foto"}
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
                          className="w-full text-xs font-bold h-9 text-destructive"
                          onClick={async () => {
                            setSavingWallpaper(true);
                            await removeWallpaper();
                            setSavingWallpaper(false);
                            toast({ title: "Wallpaper removido" });
                          }}
                          disabled={savingWallpaper}
                        >
                          Remover Fundo
                        </Button>
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
                        className="w-full accent-primary h-2 bg-zinc-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentCategory === 'verification' && user && (
            <VerificationSection userId={user.id} />
          )}

          {currentCategory === 'data' && (
            <div className="space-y-4">
              <div className="glass-card p-4 flex items-center justify-between"><div><p className="text-sm font-bold">Exportar Dados</p><p className="text-[10px] text-muted-foreground">JSON format.</p></div><Button variant="ghost" onClick={handleExport} disabled={exporting}>Exportar</Button></div>
              {!leaveConfirming ? (
                <button
                  onClick={() => setLeaveConfirming(true)}
                  className="glass-card p-4 flex items-center justify-between w-full text-rose-500 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5" strokeWidth={1.5} />
                    <div className="text-left">
                      <p className="text-sm font-semibold">Sair do espaço partilhado</p>
                      <p className="text-[11px] text-muted-foreground/65 font-normal">Deixar este ninho</p>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground/55" strokeWidth={1.5} />
                </button>
              ) : (
                <div className="glass-card border-rose-100 dark:border-rose-900/40 p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Header */}
                  <div className="space-y-1">
                    <p className="text-[15px] font-bold text-foreground">Sair do espaço partilhado?</p>
                    <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                      Esta ação não pode ser desfeita.
                    </p>
                  </div>

                  {/* Consequences */}
                  <div className="space-y-2.5">
                    {[
                      "Perderás acesso a todas as memórias e conversas deste espaço.",
                      "O teu par continuará no espaço e poderá convidar outra pessoa.",
                      "Poderás criar ou entrar noutro espaço no futuro.",
                    ].map((text) => (
                      <div key={text} className="flex items-start gap-2.5">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                        <p className="text-[12px] text-muted-foreground/90 leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setLeaveConfirming(false)}
                      className="flex-1 h-11 rounded-xl bg-muted text-[13px] font-semibold text-foreground active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleLeaveHouse}
                      disabled={leaveLoading}
                      className="flex-1 h-11 rounded-xl bg-rose-500/90 text-white text-[13px] font-semibold disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      {leaveLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : "Confirmar saída"
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* ── Delete account ── */}
              <div className="pt-2">
                {!deleteConfirming ? (
                  <button
                    onClick={() => setDeleteConfirming(true)}
                    className="w-full text-left px-1 py-2 flex items-center gap-2"
                  >
                    <span className="text-[12px] text-muted-foreground/55 hover:text-rose-400 transition-colors">
                      Eliminar conta permanentemente
                    </span>
                  </button>
                ) : (
                  <div className="glass-card border-rose-200/60 dark:border-rose-900/50 p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-1">
                      <p className="text-[15px] font-bold text-foreground">Eliminar conta?</p>
                      <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                        Esta ação é permanente e não pode ser revertida.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground/65 uppercase tracking-wide">O que será eliminado</p>
                      {[
                        "O teu perfil e dados pessoais",
                        "As tuas subscrições de notificações",
                        "Os teus registos de atividade e humor",
                        "O teu acesso ao espaço partilhado",
                        "A tua conta de autenticação",
                      ].map((text) => (
                        <div key={text} className="flex items-start gap-2.5">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                          <p className="text-[12px] text-muted-foreground/90 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-3">
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                        As mensagens e memórias partilhadas permanecem no espaço do teu par.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setDeleteConfirming(false)}
                        className="flex-1 h-11 rounded-xl bg-muted text-[13px] font-semibold text-foreground active:scale-95 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[13px] font-semibold disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        {deleteLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : "Eliminar conta"
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      )}

      {/* Pre-permission modal — shows before triggering browser prompt */}
      {showPrePermission && (
        <NotificationPrePermissionModal
          onConfirm={() => { setShowPrePermission(false); handleEnablePush(); }}
          onDismiss={() => setShowPrePermission(false)}
        />
      )}
    </div>
  );
}
