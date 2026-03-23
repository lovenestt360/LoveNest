import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { notifyPartner } from "@/lib/notifyPartner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useLoveStreak } from "@/hooks/useLoveStreak";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Send,
  Loader2,
  Image as ImageIcon,
  Mic,
  MicOff,
  Pin,
  PinOff,
  Reply,
  Pencil,
  Trash2,
  X,
  Check,
  CornerDownRight,
  Settings,
  Palette,
  ShieldCheck,
  Heart,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

/* ── Types ── */

interface Message {
  id: string;
  couple_space_id: string;
  sender_user_id: string;
  content: string;
  reply_to_id: string | null;
  image_url: string | null;
  audio_url: string | null;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 50;

/* ── Long Press Hook (mobile-friendly) ── */

function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const movedRef = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        e.preventDefault?.();
        onLongPress();
      }
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback(() => {
    movedRef.current = true;
    clearTimeout(timerRef.current);
  }, []);

  const end = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
  };
}

/* ── Audio Recorder Hook ── */

function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try different mimeTypes for mobile compatibility
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/ogg";

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100); // collect data every 100ms for better mobile support
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error("Audio recording error:", err);
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const clear = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
  }, []);

  return { recording, audioBlob, duration, start, stop, clear };
}

/* ── Image Picker ── */

function ImagePickerButton({ onPick }: { onPick: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { onPick(f); e.target.value = ""; }
        }}
      />
      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground h-9 w-9"
        onClick={() => inputRef.current?.click()}>
        <ImageIcon className="h-5 w-5" />
      </Button>
    </>
  );
}

/* ── Pinned Messages Bar ── */

function PinnedBar({ messages, onJump }: { messages: Message[]; onJump: (id: string) => void }) {
  const pinned = messages.filter(m => m.is_pinned && !m.is_deleted);
  if (pinned.length === 0) return null;
  const last = pinned[pinned.length - 1];
  return (
    <button
      type="button"
      onClick={() => onJump(last.id)}
      className="flex w-full items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-2 text-left transition-colors hover:bg-amber-100 shrink-0"
    >
      <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium line-clamp-1">
          {last.content || (last.image_url ? "📷 Foto" : last.audio_url ? "🎤 Áudio" : "")}
        </p>
      </div>
      <span className="text-[10px] text-amber-600">
        {pinned.length > 1 ? `${pinned.length} fixadas` : "Fixada"}
      </span>
    </button>
  );
}

/* ── Date Separator ── */

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) label = "Hoje";
  else if (d.toDateString() === yesterday.toDateString()) label = "Ontem";
  else label = format(d, "d 'de' MMMM", { locale: pt });

  return (
    <div className="flex justify-center py-3">
      <span className="text-[11px] font-semibold text-foreground/70 bg-background/80 backdrop-blur-sm px-4 py-1 rounded-full shadow-sm">
        {label}
      </span>
    </div>
  );
}

/* ── Audio Player ── */

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => { });
      setPlaying(true);
    }
  }, [playing]);

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onEnded={() => setPlaying(false)}
      />
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={toggle}>
        {playing ? "⏸️ Parar" : "▶️ Ouvir"}
      </Button>
    </div>
  );
}

/* ── Action Sheet (Mobile-friendly context menu) ── */

function ActionSheet({
  msg,
  isMine,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onClose,
}: {
  msg: Message;
  isMine: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-4" />

        {/* Preview */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 px-1">
          {msg.content || (msg.image_url ? "📷 Foto" : msg.audio_url ? "🎤 Áudio" : "")}
        </p>

        <div className="grid gap-1">
          <Button variant="ghost" className="w-full justify-start h-12 text-base gap-3" onClick={onReply}>
            <Reply className="h-5 w-5 text-primary" /> Responder
          </Button>
          {isMine && (
            <Button variant="ghost" className="w-full justify-start h-12 text-base gap-3" onClick={onEdit}>
              <Pencil className="h-5 w-5 text-amber-500" /> Editar
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start h-12 text-base gap-3" onClick={onPin}>
            {msg.is_pinned ? <PinOff className="h-5 w-5 text-muted-foreground" /> : <Pin className="h-5 w-5 text-amber-500" />}
            {msg.is_pinned ? "Desafixar" : "Fixar"}
          </Button>
          {isMine && (
            <Button variant="ghost" className="w-full justify-start h-12 text-base gap-3 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-5 w-5" /> Apagar
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start h-12 text-base gap-3 text-muted-foreground" onClick={onClose}>
            <X className="h-5 w-5" /> Cancelar
          </Button>
        </div>
      </div>
    </>
  );
}

/* ── Main Chat Component ── */

export default function Chat() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const { resetChatUnread } = useAppNotifContext();
  const { recordInteraction } = useLoveStreak();
  const { toast } = useToast();
  const { wallpaperUrl, wallpaperOpacity, updateSettings: updateWallpaper } = useUserSettings();
  const [openSettings, setOpenSettings] = useState(false);
  const [tempWallpaperUrl, setTempWallpaperUrl] = useState("");
  const [tempOpacity, setTempOpacity] = useState(30);

  const { partner, loading: loadingPartner } = usePartnerProfile();

  // Sync temp state when opening dialog
  useEffect(() => {
    if (openSettings) {
      setTempWallpaperUrl(wallpaperUrl || "");
      setTempOpacity(wallpaperOpacity * 100);
    }
  }, [openSettings, wallpaperUrl, wallpaperOpacity]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reply / Edit state
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");

  // Image preview before send
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Audio
  const audio = useAudioRecorder();

  // Action sheet
  const [sheetMsg, setSheetMsg] = useState<Message | null>(null);

  // Carinho/Love animation state
  const [showCarinhoAnim, setShowCarinhoAnim] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ── Load messages ── */
  useEffect(() => {
    resetChatUnread();
    if (!spaceId) {
      console.log("Chat: No spaceId available yet, skipping message load.");
      setLoading(false);
      return;
    }
    
    console.log("Chat: Loading messages for spaceId:", spaceId);
    setLoading(true);
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("couple_space_id", spaceId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (error) {
          console.error("Chat: Error loading messages:", error.message);
          toast({ title: "Erro ao carregar mensagens", description: error.message, variant: "destructive" });
        } else if (data) {
          console.log("Chat: Loaded", data.length, "messages.");
          setMessages((data as Message[]).reverse());
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error("Chat: Unexpected error loading messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [spaceId, resetChatUnread, toast]);

  const loadMore = useCallback(async () => {
    if (!spaceId || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("couple_space_id", spaceId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (data) {
      setMessages((prev) => [...(data as Message[]).reverse(), ...prev]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [spaceId, loadingMore, messages]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("chat-room")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `couple_space_id=eq.${spaceId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
        } else if (payload.eventType === "UPDATE") {
          setMessages((prev) => prev.map(m =>
            m.id === (payload.new as Message).id ? (payload.new as Message) : m
          ));
        } else if (payload.eventType === "DELETE") {
          setMessages((prev) => prev.filter(m => m.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  /* ── Auto scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Image preview ── */
  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  /* ── Upload helpers ── */
  const uploadMedia = useCallback(async (file: Blob, ext: string): Promise<string | null> => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, [user]);

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    if (!spaceId || !user || sending) return;
    const text = input.trim();
    if (!text && !imageFile && !audio.audioBlob) return;

    setSending(true);
    try {
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        imageUrl = await uploadMedia(imageFile, ext);
      }
      if (audio.audioBlob) {
        const ext = audio.audioBlob.type.includes("mp4") ? "mp4" : "webm";
        audioUrl = await uploadMedia(audio.audioBlob, ext);
      }

      const { error: insertError } = await supabase.from("messages").insert({
        couple_space_id: spaceId,
        sender_user_id: user.id,
        content: text,
        reply_to_id: replyTo?.id ?? null,
        image_url: imageUrl,
        audio_url: audioUrl,
      });

      if (insertError) {
        console.error("Chat: Insert error:", insertError.message);
        toast({ title: "Erro ao enviar", description: insertError.message, variant: "destructive" });
        setSending(false);
        return;
      }

      // Record interaction for LoveStreak (all messages count now)
      recordInteraction("chat_message");

      // Notify partner
      let body = text;
      if (!body && imageUrl) body = "📷 Enviou uma foto";
      if (!body && audioUrl) body = "🎤 Enviou um áudio";
      notifyPartner({
        couple_space_id: spaceId,
        title: "💬 Nova mensagem no Chat",
        body: body.length > 100 ? body.slice(0, 100) + "…" : body,
        url: "/chat",
        type: "chat",
      });

      setInput("");
      setReplyTo(null);
      setImageFile(null);
      audio.clear();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, spaceId, user, sending, imageFile, audio, replyTo, uploadMedia, toast]);

  /* ── Send Carinho ── */
  const handleSendCarinho = useCallback(async () => {
    if (!spaceId || !user || sending) return;
    
    setSending(true);
    setShowCarinhoAnim(true);
    
    try {
      const { error: insertError } = await supabase.from("messages").insert({
        couple_space_id: spaceId,
        sender_user_id: user.id,
        content: "Só para te lembrar que te amo 💛",
      });

      if (insertError) throw insertError;

      // Interaction for LoveStreak
      recordInteraction("chat_message");

      // Notify partner
      notifyPartner({
        couple_space_id: spaceId,
        title: "💖 Recebeste carinho!",
        body: "Só para te lembrar que te amo 💛",
        url: "/chat",
        type: "chat",
      });

      // Animation timeout
      setTimeout(() => setShowCarinhoAnim(false), 2000);
      
    } catch (err: any) {
      toast({ title: "Erro ao enviar carinho", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [spaceId, user, sending, recordInteraction, toast]);

  /* ── Edit message ── */
  const handleEditSave = useCallback(async () => {
    if (!editingMsg || !editText.trim()) return;
    setSending(true);
    await supabase.from("messages")
      .update({ content: editText.trim(), is_edited: true, updated_at: new Date().toISOString() })
      .eq("id", editingMsg.id);
    setEditingMsg(null);
    setEditText("");
    setSending(false);
  }, [editingMsg, editText]);

  /* ── Delete message ── */
  const handleDelete = useCallback(async (msg: Message) => {
    await supabase.from("messages")
      .update({ is_deleted: true, content: "", image_url: null, audio_url: null, updated_at: new Date().toISOString() })
      .eq("id", msg.id);
    setSheetMsg(null);
  }, []);

  /* ── Pin/Unpin ── */
  const handlePin = useCallback(async (msg: Message) => {
    await supabase.from("messages")
      .update({ is_pinned: !msg.is_pinned, updated_at: new Date().toISOString() })
      .eq("id", msg.id);
    setSheetMsg(null);
  }, []);

  /* ── Scroll to message ── */
  const jumpToMsg = useCallback((id: string) => {
    const el = msgRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
    }
  }, []);

  /* ── Get replied message content ── */
  const getReplyPreview = useCallback((id: string | null) => {
    if (!id) return null;
    const msg = messages.find(m => m.id === id);
    if (!msg) return null;
    if (msg.is_deleted) return "Mensagem apagada";
    if (msg.image_url) return "📷 Foto";
    if (msg.audio_url) return "🎤 Áudio";
    return msg.content.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content;
  }, [messages]);

  /* ── Format time ── */
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  /* ── Group messages by date ── */
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const date = msg.created_at.slice(0, 10);
      if (date !== lastDate) {
        groups.push({ date: msg.created_at, msgs: [] });
        lastDate = date;
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [messages]);

  return (
    <section className="relative flex flex-col overflow-hidden h-[100dvh]">

      {/* ── Header ── */}
      <header className="relative z-20 shrink-0 px-4 pt-4 pb-2 bg-background/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-2xl mr-1 hover:bg-white/10" 
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/20 backdrop-blur-lg flex items-center justify-center shadow-inner border border-white/20">
                <span className="text-xl">💬</span>
              </div>
            <div className="min-w-0">
              <h1 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/80 uppercase mb-0.5">Chat</h1>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-foreground truncate max-w-[150px]">
                  {partner?.display_name || "Amor"}
                </span>
                {partner?.verification_status === 'verified' && (
                  <ShieldCheck className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                )}
              </div>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 transition-all active:scale-90"
              onClick={() => setOpenSettings(true)}
            >
              <Palette className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Pinned bar ── */}
      <div className="relative z-20 shrink-0 px-1">
        <PinnedBar messages={messages} onJump={jumpToMsg} />
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 relative z-10 overflow-y-auto px-2 select-none" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col gap-1.5 py-4 pb-32 min-h-full justify-end">
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button variant="secondary" size="sm" className="rounded-full shadow-sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Carregar mais
              </Button>
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-4xl">👋</span>
              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Diz olá!</p>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              <DateSeparator date={group.date} />
              {group.msgs.map((msg) => {
                const isMine = msg.sender_user_id === user?.id;
                const isDeleted = msg.is_deleted;
                const replyPreview = getReplyPreview(msg.reply_to_id);

                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={isMine}
                    isDeleted={isDeleted}
                    replyPreview={replyPreview}
                    formatTime={formatTime}
                    jumpToMsg={jumpToMsg}
                    onLongPress={() => { if (!isDeleted) setSheetMsg(msg); }}
                    refCallback={(el) => { msgRefs.current[msg.id] = el; }}
                  />
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Action Sheet ── */}
      {sheetMsg && (
        <ActionSheet
          msg={sheetMsg}
          isMine={sheetMsg.sender_user_id === user?.id}
          onReply={() => {
            setReplyTo(sheetMsg);
            setSheetMsg(null);
            inputRef.current?.focus();
          }}
          onEdit={() => {
            setEditingMsg(sheetMsg);
            setEditText(sheetMsg.content);
            setSheetMsg(null);
          }}
          onDelete={() => handleDelete(sheetMsg)}
          onPin={() => handlePin(sheetMsg)}
          onClose={() => setSheetMsg(null)}
        />
      )}

      {/* ── Bottom bar area (Floating Pill) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div className="mx-auto max-w-lg bg-background/80 backdrop-blur-xl border border-white/20 shadow-lg p-1 rounded-full pointer-events-auto">
          {/* Edit overlay */}
          {editingMsg && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 px-3 py-2 mb-2 mx-1 mt-1">
              <Pencil className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 h-8 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 px-0"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingMsg(null); }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={handleEditSave} disabled={sending}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-muted-foreground" onClick={() => setEditingMsg(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-3 py-2 mb-2 mx-1 mt-1">
              <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="flex-1 text-xs text-muted-foreground line-clamp-1 pr-2">
                {replyTo.content || (replyTo.image_url ? "📷 Foto" : replyTo.audio_url ? "🎤 Áudio" : "")}
              </p>
              <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-background/50" onClick={() => setReplyTo(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/50 border border-border/50 px-2 py-2 mb-2 mx-1 mt-1">
              <img src={imagePreview} alt="preview" className="h-10 w-10 rounded-[10px] object-cover shadow-sm" />
              <p className="flex-1 text-xs text-muted-foreground font-medium truncate">{imageFile?.name}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-background/50" onClick={() => setImageFile(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Audio preview */}
          {audio.audioBlob && !audio.recording && (
            <div className="flex items-center gap-2 rounded-2xl bg-muted/50 border border-border px-3 py-2 mb-2 mx-1 mt-1">
              <Mic className="h-4 w-4 text-primary shrink-0" />
              <p className="flex-1 text-xs font-medium text-foreground">Áudio gravado ({audio.duration}s)</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-background/50" onClick={audio.clear}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Recording indicator */}
          {audio.recording && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 px-3 py-2 mb-2 mx-1 mt-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0 align-middle">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <p className="flex-1 text-xs text-red-600 dark:text-red-400 font-semibold tracking-wide">A GRAVAR • {audio.duration}s</p>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-red-500/20" onClick={audio.stop}>
                <MicOff className="h-4 w-4 text-red-600 dark:text-red-400" />
              </Button>
            </div>
          )}

          {/* Input bar */}
          {!editingMsg && (
            <form
              className="flex items-center gap-1 pl-1 pr-1.5"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <ImagePickerButton onPick={setImageFile} />
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={(replyTo || imageFile || audio.audioBlob) 
                  ? "Adicionar texto..." 
                  : (new Date().getHours() > 18 ? "Diz algo bonito hoje..." : "Escreve algo que aqueça o coração 💛")}
                className="flex-1 h-10 border-0 bg-transparent shadow-none px-2 focus-visible:ring-0 placeholder:text-muted-foreground/60 text-[14px]"
                autoComplete="off"
              />
              <div className="flex items-center gap-1 shrink-0">
                {(!input.trim() && !imageFile && !audio.audioBlob) ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full text-primary hover:bg-primary/10 transition-transform active:scale-[1.3] duration-300"
                      onClick={handleSendCarinho}
                      disabled={sending}
                      title="Enviar Carinho"
                    >
                      <Heart className="h-5 w-5 fill-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("h-10 w-10 rounded-full transition-colors", audio.recording ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted/50")}
                      onClick={() => audio.recording ? audio.stop() : audio.start()}
                    >
                      {audio.recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-95"
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-[16px] w-[16px] ml-0.5" />}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
      {/* Heart Animation Overlay - Positioned more centrally */}
      {showCarinhoAnim && (
        <div className="absolute top-1/3 left-0 right-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="relative">
            <div className="animate-bounce p-5 bg-primary/20 rounded-full backdrop-blur-md shadow-glow">
              <Heart className="h-20 w-20 text-primary fill-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 16 }).map((_, i) => (
                <div 
                  key={i} 
                  className="absolute animate-in fade-out zoom-out duration-1000 fill-mode-forwards"
                  style={{ 
                    transform: `rotate(${i * 22.5}deg) translateY(-140px)`,
                    animationDelay: `${i * 0.04}s`
                  }}
                >
                  <Heart className="h-8 w-8 text-primary/30 fill-primary/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Message Bubble (extracted for long press support) ── */

function MessageBubble({
  msg,
  isMine,
  isDeleted,
  replyPreview,
  formatTime,
  jumpToMsg,
  onLongPress,
  refCallback,
}: {
  msg: Message;
  isMine: boolean;
  isDeleted: boolean;
  replyPreview: string | null;
  formatTime: (iso: string) => string;
  jumpToMsg: (id: string) => void;
  onLongPress: () => void;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  const longPressHandlers = useLongPress(onLongPress, 400);

  return (
    <div
      ref={refCallback}
      className={cn("flex mb-1.5 transition-all rounded-xl animate-fade-slide-up", isMine ? "justify-end" : "justify-start")}
    >
      <div className="relative max-w-[80%]">
        {/* Pin indicator */}
        {msg.is_pinned && !isDeleted && (
          <div className="absolute -top-2 right-2 z-10">
            <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
          </div>
        )}

        {/* Message bubble with long press */}
        <div
          {...longPressHandlers}
          className={cn(
            "px-4 py-2.5 text-[15px] select-none transition-all shadow-sm max-w-full",
            isMine
              ? "rounded-[22px] rounded-br-[6px] bg-primary text-primary-foreground font-medium bg-gradient-to-br from-primary to-primary/95 shadow-primary/20"
              : "rounded-[22px] rounded-bl-[6px] bg-background border border-border/50 text-foreground font-medium shadow-border/10",
            isDeleted && "opacity-50 italic",
          )}
          style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        >
          {/* Reply preview */}
          {replyPreview && !isDeleted && (
            <button
              type="button"
              onClick={() => msg.reply_to_id && jumpToMsg(msg.reply_to_id)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 mb-1 text-[10px] border-l-2",
                isMine
                  ? "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground/70"
                  : "bg-foreground/5 border-foreground/20 text-muted-foreground"
              )}
            >
              <CornerDownRight className="h-2.5 w-2.5 shrink-0" />
              <span className="line-clamp-1">{replyPreview}</span>
            </button>
          )}

          {/* Image */}
          {msg.image_url && !isDeleted && (
            <img
              src={msg.image_url}
              alt="Foto"
              className="rounded-xl max-w-full max-h-60 object-cover mb-1"
              onClick={() => window.open(msg.image_url!, "_blank")}
            />
          )}

          {/* Audio */}
          {msg.audio_url && !isDeleted && (
            <div className="mb-1">
              <AudioPlayer url={msg.audio_url} />
            </div>
          )}

          {/* Content */}
          {isDeleted ? (
            <p className="text-xs">🚫 Mensagem apagada</p>
          ) : (
            msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          {/* Time + edited badge */}
          <div className={cn(
            "mt-0.5 flex items-center gap-1 text-[10px] leading-none",
            isMine ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {msg.is_edited && !isDeleted && <span>editada •</span>}
            <span>{formatTime(msg.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
