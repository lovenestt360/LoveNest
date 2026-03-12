import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
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
import { Loader2, LogOut, UserMinus, Download, Camera, Bell, BellOff, Image as ImageIcon, Trash2 } from "lucide-react";
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
  const { wallpaperUrl, wallpaperOpacity, updateSettings: updateWallpaper, uploadWallpaper, removeWallpaper } = useUserSettings();

  const [profile, setProfile] = useState<Profile | null>(null);
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
  const [pushStatusMsg, setPushStatusMsg] = useState("");

  useEffect(() => {
    if (!("Notification" in window) || !("PushManager" in window)) {
      setPushPermission("unsupported");
    } else {
      setPushPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker?.ready.then((reg) => {
        (reg as any).pushManager.getSubscription().then((sub: any) => {
          setPushSubscribed(!!sub);
        });
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, birthday, gender")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setDisplayName(data.display_name ?? "");
        setBirthday(data.birthday ?? "");
        setGender(data.gender as "male" | "female" | null);
        setAvatarUrl(data.avatar_url);
      }
      // Load relationship date from couple_spaces
      if (spaceId) {
        const { data: spaceData } = await supabase
          .from("couple_spaces")
          .select("relationship_start_date")
          .eq("id", spaceId)
          .maybeSingle();
        if (spaceData) {
          setRelationshipDate((spaceData as any).relationship_start_date ?? "");
        }
      }

      // Load House Data
      const { data: member } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
      if (member?.couple_space_id) {
        setHouseId(member.couple_space_id);
        const { data: house } = await supabase.from("couple_spaces").select("*").eq("id", member.couple_space_id).maybeSingle();
        if (house) {
          setHouseName(house.house_name || "");
          setPartner1Name(house.partner1_name || "");
          setPartner2Name(house.partner2_name || "");
        }
      }

      setLoading(false);
    };
    loadProfile();
  }, [user, spaceId]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        birthday: birthday || null,
        gender: gender || null,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    // Save relationship date to couple_spaces
    if (spaceId) {
      await supabase
        .from("couple_spaces")
        .update({ relationship_start_date: relationshipDate || null } as any)
        .eq("id", spaceId);
    }

    // Save House Data
    if (houseId) {
      await supabase.from("couple_spaces").update({
        house_name: houseName,
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        initials: generateInitials(partner1Name, partner2Name)
      }).eq("id", houseId);
    } else {
      const { data: newHouse } = await supabase.from("couple_spaces").insert({
        invite_code: "LN" + Math.random().toString(36).substring(2, 6).toUpperCase(),
        house_name: houseName,
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        initials: generateInitials(partner1Name, partner2Name)
      }).select().single();

      if (newHouse) {
        setHouseId(newHouse.id);
        await supabase.from("members").insert({ user_id: user.id, couple_space_id: newHouse.id });
      }
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado" });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Usa JPG, PNG ou WebP. Se tiraste a foto no iPhone, converte de HEIC para JPG primeiro.", variant: "destructive" });
      return;
    }

    // Compress if > 2MB
    let uploadFile: File | Blob = file;
    if (file.size > 2 * 1024 * 1024) {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const MAX = 1024;
        const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        uploadFile = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
        );
      } catch {
        // fallback: upload original
      }
    }

    setUploading(true);
    setUploadProgress(10);

    const timestamp = Date.now();
    const path = `${user.id}/${timestamp}.jpg`;

    setUploadProgress(30);
    const { error } = await supabase.storage.from("avatars").upload(path, uploadFile, {
      upsert: true,
      contentType: "image/jpeg",
    });
    setUploadProgress(70);

    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = urlData.publicUrl;
    setAvatarUrl(newUrl);

    const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
    setUploadProgress(100);

    if (updateErr) {
      toast({ title: "Erro ao guardar URL", description: updateErr.message, variant: "destructive" });
    } else {
      toast({ title: "Foto atualizada ✨" });
    }

    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 500);
  };

  const toggleNotif = (key: string) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Push notification subscription
  const handleEnablePush = async () => {
    if (!user || !spaceId) return;
    setPushLoading(true);
    setPushStatusMsg("A pedir permissão...");
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        toast({ title: "Permissão negada", description: "Ativa as notificações nas definições do browser.", variant: "destructive" });
        setPushLoading(false);
        setPushStatusMsg("");
        return;
      }

      setPushStatusMsg("A obter chave de segurança...");
      const vapidRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
        { headers: { "Content-Type": "text/plain" } }
      );
      if (!vapidRes.ok) {
        throw new Error(`Servidor retornou erro ${vapidRes.status} ao obter VAPID`);
      }
      const publicKey = (await vapidRes.text()).trim();
      console.log("VAPID length:", publicKey.length);
      if (!publicKey || publicKey.startsWith("{") || publicKey.startsWith("<")) {
        toast({ title: "Erro na chave VAPID", description: "Formato inválido recebido do servidor.", variant: "destructive" });
        setPushLoading(false);
        setPushStatusMsg("");
        return;
      }

      let keyBytes;
      try {
        keyBytes = urlBase64ToUint8Array(publicKey);
      } catch (e) {
        toast({ title: "Erro base64 VAPID", description: "Chave mal formatada no Edge Function.", variant: "destructive" });
        setPushLoading(false);
        setPushStatusMsg("");
        return;
      }

      console.log("Key bytes:", keyBytes.length);
      if (keyBytes.length !== 65) {
        toast({ title: "Chave VAPID inválida", description: `Expected 65 bytes, got ${keyBytes.length}`, variant: "destructive" });
        setPushLoading(false);
        setPushStatusMsg("");
        return;
      }

      setPushStatusMsg("A registar Service Worker...");
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Removed the wait for .ready as it can hang indefinitely on some iOS devices
      // We will loop/wait until reg.pushManager is available if it takes a moment
      let retries = 0;
      while (!reg.pushManager && retries < 10) {
        await new Promise(r => setTimeout(r, 500));
        retries++;
      }

      if (!reg.pushManager) {
        throw new Error("Push Manager não está disponível neste dispositivo/browser. Tens a certeza de que é um PWA?");
      }

      setPushStatusMsg("A subscrever no browser...");
      const subscription = await (reg as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer as ArrayBuffer,
      });

      const subJson = subscription.toJSON();

      setPushStatusMsg("A guardar subscrição...");
      // Save to database
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          couple_space_id: spaceId,
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
          user_agent: navigator.userAgent,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) {
        toast({ title: "Erro ao guardar subscrição", description: error.message, variant: "destructive" });
      } else {
        setPushSubscribed(true);
        toast({ title: "Notificações ativadas! 🔔" });
      }
    } catch (err: any) {
      console.error("Push subscription error:", err);
      toast({ title: "Erro ao ativar notificações", description: err?.message || "Tenta novamente.", variant: "destructive" });
    }
    setPushLoading(false);
    setPushStatusMsg("");
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const subscription = await (reg as any).pushManager.getSubscription();
        if (subscription) {
          try {
            await subscription.unsubscribe();
          } catch (unsubErr) {
            console.warn("Unsubscribe failed, proceeding anyway", unsubErr);
          }
          // Remove from DB
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user!.id)
            .eq("endpoint", subscription.endpoint);
        }
      } else {
        // Fallback cleanup if SW is missing but state says subscribed
        await supabase.from("push_subscriptions").delete().eq("user_id", user!.id);
      }
      setPushSubscribed(false);
      toast({ title: "Notificações desativadas" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err?.message || "Erro desconhecido", variant: "destructive" });
    }
    setPushLoading(false);
  };

  const handleExport = async () => {
    if (!spaceId) return;
    setExporting(true);
    try {
      const tables = [
        "messages", "mood_checkins", "tasks", "photos", "events",
        "schedule_blocks", "daily_prayers", "daily_spiritual_logs",
        "complaints", "complaint_messages",
        "cycle_profiles", "period_entries", "daily_symptoms",
      ] as const;

      const results: Record<string, unknown[]> = {};
      for (const t of tables) {
        const { data } = await supabase
          .from(t)
          .select("*")
          .eq("couple_space_id", spaceId)
          .limit(5000);
        results[t] = data ?? [];
      }

      const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dk-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Dados exportados" });
    } catch {
      toast({ title: "Erro na exportação", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleLeaveHouse = async () => {
    if (!user || !spaceId) return;
    setLeaving(true);
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("user_id", user.id)
      .eq("couple_space_id", spaceId);
    setLeaving(false);
    if (error) {
      toast({ title: "Erro ao sair", description: error.message, variant: "destructive" });
      return;
    }
    window.location.assign("/casa-dk");
  };

  if (loading) {
    return (
      <section className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </section>
    );
  }

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Definições</h1>
        <p className="text-sm text-muted-foreground">Perfil, notificações e dados.</p>
      </header>

      {/* Profile section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Perfil</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </label>
            <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName || "Sem nome"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            {uploading && <Progress value={uploadProgress} className="mt-2 h-1.5" />}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="display-name">Nome</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthday">Data de nascimento</Label>
            <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>O meu género</Label>
            <Select value={gender || "none"} onValueChange={(v) => setGender(v === "none" ? null : v as "male" | "female")}>
              <SelectTrigger>
                <SelectValue placeholder="Prevenir dizer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Prefiro não dizer</SelectItem>
                <SelectItem value="female">Mulher</SelectItem>
                <SelectItem value="male">Homem</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Se fores "Homem", o módulo Ciclo mostrará os dados da tua parceira.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="relationship-date">Início do namoro</Label>
            <Input id="relationship-date" type="date" value={relationshipDate} onChange={(e) => setRelationshipDate(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Usado no contador "Tempo Juntos" da Home.</p>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar perfil
          </Button>
        </div>
      </div>

      <Separator />

      {/* House section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Dados da Casa</h2>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="house-name">Nome da Casa</Label>
            <Input id="house-name" value={houseName} onChange={(e) => setHouseName(e.target.value)} placeholder="A Nossa Casa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="partner1">Teu Nome (Iniciais)</Label>
              <Input id="partner1" value={partner1Name} onChange={(e) => setPartner1Name(e.target.value)} placeholder="Ex: João" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="partner2">Nome do Par</Label>
              <Input id="partner2" value={partner2Name} onChange={(e) => setPartner2Name(e.target.value)} placeholder="Ex: Maria" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Usado para gerar as iniciais no Splash Screen (ex: J & M).</p>
          <Button onClick={handleSaveProfile} disabled={saving} variant="secondary" className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Dados da Casa
          </Button>
        </div>
      </div>

      <Separator />

      {/* Push notifications */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Notificações push</h2>
        {pushPermission === "unsupported" ? (
          <p className="text-sm text-muted-foreground">O teu browser não suporta notificações push.</p>
        ) : pushPermission === "denied" ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              <BellOff className="mr-1 inline h-4 w-4" />
              Notificações bloqueadas. Ativa nas definições do browser/dispositivo.
            </p>
          </div>
        ) : pushSubscribed ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <Bell className="mr-1 inline h-4 w-4 text-primary" />
              Notificações ativadas neste dispositivo.
            </p>
            <Button variant="outline" size="sm" onClick={handleDisablePush} disabled={pushLoading}>
              {pushLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button onClick={handleEnablePush} disabled={pushLoading} className="w-full">
              {pushLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              Ativar notificações no dispositivo
            </Button>
            {pushLoading && pushStatusMsg && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">
                {pushStatusMsg}
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* In-app notification preferences */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Notificações in-app</h2>
        {[
          { key: "chat", label: "Chat" },
          { key: "humor", label: "Humor" },
          { key: "tarefas", label: "Tarefas" },
          { key: "memorias", label: "Memórias" },
          { key: "oracao", label: "Oração" },
          { key: "conflitos", label: "Conflitos" },
          { key: "ciclo_lembrete", label: "Ciclo: Lembrete diário" },
          { key: "ciclo_menstruacao", label: "Ciclo: Menstruação prevista" },
          { key: "ciclo_fertil", label: "Ciclo: Janela fértil" },
          { key: "ciclo_par", label: "Ciclo: Atualizações do par" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={`notif-${key}`}>{label}</Label>
            <Switch id={`notif-${key}`} checked={notifPrefs[key]} onCheckedChange={() => toggleNotif(key)} />
          </div>
        ))}
      </div>

      <Separator />

      {/* Dkay Zap wallpaper */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Chat — Wallpaper</h2>

        {/* Preview */}
        {wallpaperUrl && (
          <div className="relative rounded-2xl overflow-hidden h-40 border">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${wallpaperUrl})` }}
            />
            <div
              className="absolute inset-0 bg-background"
              style={{ opacity: 1 - wallpaperOpacity }}
            />
            <div className="relative z-10 flex items-end justify-center h-full pb-2">
              <span className="text-xs bg-background/80 px-3 py-1 rounded-lg font-medium">✅ Wallpaper aplicado</span>
            </div>
          </div>
        )}

        {/* Upload */}
        <div>
          <Label>Escolher imagem</Label>
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              toast({ title: "A enviar wallpaper…" });
              const publicUrl = await uploadWallpaper(file);
              if (publicUrl) {
                await updateWallpaper({ url: publicUrl });
                toast({ title: "Wallpaper partilhado ✓" });
              } else {
                toast({ title: "Erro ao enviar imagem", variant: "destructive" });
              }
              e.target.value = "";
            }}
          />
        </div>

        {/* Opacity slider */}
        <div className="space-y-2">
          <Label>Visibilidade da imagem: {Math.round(wallpaperOpacity * 100)}%</Label>
          <Slider
            value={[wallpaperOpacity * 100]}
            min={10}
            max={90}
            step={5}
            onValueChange={([v]) => updateWallpaper({ opacity: v / 100 })}
          />
        </div>

        {/* Remove */}
        {wallpaperUrl && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              removeWallpaper();
              toast({ title: "Wallpaper removido" });
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remover wallpaper
          </Button>
        )}
      </div>

      <Separator />

      {/* Export */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Dados</h2>
        <Button variant="outline" className="w-full" onClick={handleExport} disabled={exporting || !spaceId}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Exportar dados (JSON)
        </Button>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-3 pb-4">
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Terminar sessão
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={!spaceId}>
              <UserMinus className="mr-2 h-4 w-4" />
              Sair da Casa
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao sair da Casa, você perderá acesso aos dados compartilhados. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveHouse} disabled={leaving}>
                {leaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sim, sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
