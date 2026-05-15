import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { notifyPartner } from "@/lib/notifyPartner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { logActivity } from "@/lib/logActivity";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Loader2, Image as ImageIcon, Mic, Pin, PinOff, Reply,
  Pencil, Trash2, X, Check, CornerDownRight, Palette, ShieldCheck,
  Heart, ChevronLeft, Play, Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

/* ── Types ─────────────────────────────────────────────────────────────────── */

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

/* ── Long Press ─────────────────────────────────────────────────────────────── */

function useLongPress(onLongPress: () => void, delay = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const movedRef = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) { e.preventDefault?.(); onLongPress(); }
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback(() => { movedRef.current = true; clearTimeout(timerRef.current); }, []);
  const end  = useCallback(() => { clearTimeout(timerRef.current); }, []);

  return { onTouchStart: start, onTouchMove: move, onTouchEnd: end, onMouseDown: start, onMouseMove: move, onMouseUp: end };
}

/* ── Audio Recorder (iOS-compatible) ───────────────────────────────────────── */

function useAudioRecorder() {
  const [recording, setRecording]   = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [audioBlob, setAudioBlob]   = useState<Blob | null>(null);
  const [duration, setDuration]     = useState(0);
  const recRef   = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // iOS detection: ALL iOS browsers (Safari, Chrome, Firefox) use WebKit
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      let mimeType = "";
      if (isIOS) {
        mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      } else {
        for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"]) {
          if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
        }
      }

      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recRef.current = rec;
      rec.start(200);
      setAudioBlob(null);
      setRecording(true);
      setIsPaused(false);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      alert("Permissão de microfone negada ou erro ao iniciar gravação.");
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => new Promise((resolve) => {
    if (!recRef.current || recRef.current.state === "inactive") { resolve(null); return; }
    recRef.current.onstop = () => {
      const type = recRef.current?.mimeType || "audio/mp4";
      const blob = new Blob(chunksRef.current, { type });
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const final = blob.size > 0 ? blob : null;
      setAudioBlob(final);
      resolve(final);
    };
    if (recRef.current.state === "recording") recRef.current.requestData();
    recRef.current.stop();
    setRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
  }), []);

  const pause = useCallback(() => {
    if (recRef.current?.state === "recording") {
      try { recRef.current.pause(); setIsPaused(true); clearInterval(timerRef.current); } catch {}
    }
  }, []);

  const resume = useCallback(() => {
    if (recRef.current?.state === "paused") {
      try {
        recRef.current.resume(); setIsPaused(false);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      } catch {}
    }
  }, []);

  const cancel = useCallback(() => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.onstop = null;
      recRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setRecording(false); setIsPaused(false); setAudioBlob(null);
    clearInterval(timerRef.current); chunksRef.current = [];
  }, []);

  const clear = useCallback(() => {
    setAudioBlob(null); setDuration(0); setIsPaused(false); chunksRef.current = [];
  }, []);

  return { recording, isPaused, audioBlob, duration, start, stop, pause, resume, cancel, clear };
}

/* ── Waveform Bars (decorative, WhatsApp style) ─────────────────────────────── */

const WH = [3, 5, 9, 6, 11, 7, 13, 10, 15, 12, 9, 6, 11, 8, 5, 4, 9, 6, 10, 13, 11, 7, 5, 8];

function WaveformBars({ progress, isMine }: { progress: number; isMine: boolean }) {
  return (
    <div className="flex items-center gap-[1.5px]" style={{ height: 28 }}>
      {WH.map((h, i) => (
        <div
          key={i}
          className={cn("w-[2px] rounded-full transition-colors",
            i / WH.length <= progress
              ? isMine ? "bg-white" : "bg-rose-500"
              : isMine ? "bg-white/35" : "bg-[#ccc]"
          )}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

/* ── Audio Player (WhatsApp style) ─────────────────────────────────────────── */

function AudioPlayer({ url, isMine }: { url: string; isMine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [dur, setDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => setPlaying(false));
  }, [playing]);

  const fmt = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
  const progress = dur > 0 ? currentTime / dur : 0;

  return (
    <div className="flex items-center gap-2 min-w-[190px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDur(audioRef.current.duration)}
      />

      <button
        onClick={toggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90",
          isMine ? "bg-white/25 text-white" : "bg-rose-50 text-rose-500"
        )}
      >
        {playing
          ? <Pause className="h-4 w-4 fill-current" />
          : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      <div className="flex flex-col gap-1">
        <WaveformBars progress={progress} isMine={isMine} />
        <span className={cn("text-[10px] font-mono tabular-nums",
          isMine ? "text-white/65" : "text-[#999]")}>
          {fmt(playing ? currentTime : dur)}
        </span>
      </div>
    </div>
  );
}

/* ── Image Picker ───────────────────────────────────────────────────────────── */

function ImagePickerButton({ onPick }: { onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { onPick(f); e.target.value = ""; } }} />
      <button type="button" onClick={() => ref.current?.click()}
        className="w-9 h-9 flex items-center justify-center text-[#999] hover:text-[#666] shrink-0 transition-colors">
        <ImageIcon className="h-5 w-5" />
      </button>
    </>
  );
}

/* ── Date Separator ─────────────────────────────────────────────────────────── */

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
      <span className="text-[11px] font-medium text-[#666] bg-white/85 backdrop-blur-sm px-4 py-1 rounded-full shadow-sm">
        {label}
      </span>
    </div>
  );
}

/* ── Pinned Bar ─────────────────────────────────────────────────────────────── */

function PinnedBar({ messages, onJump }: { messages: Message[]; onJump: (id: string) => void }) {
  const pinned = messages.filter(m => m.is_pinned && !m.is_deleted);
  if (pinned.length === 0) return null;
  const last = pinned[pinned.length - 1];
  return (
    <button type="button" onClick={() => onJump(last.id)}
      className="flex w-full items-center gap-2 px-4 py-2 bg-rose-50 border-b border-rose-100/80 text-left">
      <Pin className="h-3 w-3 text-rose-400 shrink-0" />
      <p className="flex-1 text-xs text-rose-600 font-medium line-clamp-1">
        {last.content || (last.image_url ? "Foto" : last.audio_url ? "Áudio" : "")}
      </p>
      <span className="text-[10px] text-rose-400 shrink-0">
        {pinned.length > 1 ? `${pinned.length} fixadas` : "Fixada"}
      </span>
    </button>
  );
}

/* ── Action Sheet ───────────────────────────────────────────────────────────── */

function ActionSheet({
  msg, isMine, onReply, onEdit, onDelete, onPin, onClose,
}: {
  msg: Message; isMine: boolean;
  onReply: () => void; onEdit: () => void; onDelete: () => void; onPin: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-4" />
        <p className="text-xs text-[#aaa] mb-3 line-clamp-2 px-1">
          {msg.content || (msg.image_url ? "Foto" : msg.audio_url ? "Áudio" : "")}
        </p>
        <div className="grid gap-0.5">
          <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#f5f5f5] text-left transition-colors" onClick={onReply}>
            <Reply className="h-5 w-5 text-rose-500" /><span className="text-[15px]">Responder</span>
          </button>
          {isMine && (
            <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#f5f5f5] text-left transition-colors" onClick={onEdit}>
              <Pencil className="h-5 w-5 text-[#717171]" /><span className="text-[15px]">Editar</span>
            </button>
          )}
          <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#f5f5f5] text-left transition-colors" onClick={onPin}>
            {msg.is_pinned
              ? <><PinOff className="h-5 w-5 text-[#717171]" /><span className="text-[15px]">Desafixar</span></>
              : <><Pin className="h-5 w-5 text-[#717171]" /><span className="text-[15px]">Fixar</span></>}
          </button>
          {isMine && (
            <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#f5f5f5] text-left text-red-500 transition-colors" onClick={onDelete}>
              <Trash2 className="h-5 w-5" /><span className="text-[15px]">Apagar</span>
            </button>
          )}
          <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#f5f5f5] text-left text-[#aaa] transition-colors" onClick={onClose}>
            <X className="h-5 w-5" /><span className="text-[15px]">Cancelar</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Message Bubble ─────────────────────────────────────────────────────────── */

function MessageBubble({
  msg, isMine, isDeleted, replyPreview, formatTime, jumpToMsg, onLongPress, refCallback,
}: {
  msg: Message; isMine: boolean; isDeleted: boolean; replyPreview: string | null;
  formatTime: (iso: string) => string; jumpToMsg: (id: string) => void;
  onLongPress: () => void; refCallback: (el: HTMLDivElement | null) => void;
}) {
  const lp = useLongPress(onLongPress, 450);

  return (
    <div ref={refCallback} className={cn("flex px-2 mb-[3px]", isMine ? "justify-end" : "justify-start")}>
      <div className="relative max-w-[78%]">
        {msg.is_pinned && !isDeleted && (
          <div className="absolute -top-1.5 right-2 z-10">
            <Pin className="h-2.5 w-2.5 text-rose-400 fill-rose-400" />
          </div>
        )}
        <div
          {...lp}
          className={cn(
            "px-3 py-[7px] text-[15px] select-none shadow-sm",
            isMine
              ? "bg-rose-500 text-white rounded-[18px] rounded-br-[4px]"
              : "bg-white text-[#1a1a1a] rounded-[18px] rounded-bl-[4px]",
            isDeleted && "opacity-60",
            msg.id.startsWith("temp-") && "opacity-70 animate-pulse"
          )}
          style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        >
          {/* Reply preview */}
          {replyPreview && !isDeleted && (
            <button type="button"
              onClick={() => msg.reply_to_id && jumpToMsg(msg.reply_to_id)}
              className={cn(
                "flex items-start gap-1 rounded-lg px-2 py-1.5 mb-1.5 text-[11px] border-l-2 w-full text-left",
                isMine ? "bg-white/20 border-white/50 text-white/80" : "bg-[#f5f5f5] border-rose-300 text-[#717171]"
              )}
            >
              <CornerDownRight className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2 break-words">{replyPreview}</span>
            </button>
          )}

          {/* Image */}
          {msg.image_url && !isDeleted && (
            <img src={msg.image_url} alt="Foto"
              className="rounded-[14px] max-w-full max-h-64 object-cover mb-1 cursor-pointer"
              onClick={() => window.open(msg.image_url!, "_blank")} />
          )}

          {/* Audio */}
          {msg.audio_url && !isDeleted && (
            <div className="py-1">
              {msg.audio_url === "pending"
                ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-[11px] opacity-60">A processar...</span></div>
                : <AudioPlayer url={msg.audio_url} isMine={isMine} />}
            </div>
          )}

          {/* Text */}
          {isDeleted
            ? <p className="text-sm italic opacity-70">Mensagem apagada</p>
            : msg.content && <p className="whitespace-pre-wrap break-words leading-snug">{msg.content}</p>
          }

          {/* Time + status */}
          <div className={cn("flex items-center justify-end gap-1 mt-[3px]",
            isMine ? "text-white/55" : "text-[#aaa]")}>
            {msg.is_edited && !isDeleted && <span className="text-[10px]">editada ·</span>}
            <span className="text-[10px] tabular-nums">{formatTime(msg.created_at)}</span>
            {isMine && !msg.id.startsWith("temp-") && <Check className="h-[11px] w-[11px]" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Chat ──────────────────────────────────────────────────────────────── */

export default function Chat() {
  const { user }                                   = useAuth();
  const spaceId                                    = useCoupleSpaceId();
  const navigate                                   = useNavigate();
  const { resetChatUnread }                        = useAppNotifContext();
  const { toast }                                  = useToast();
  const { wallpaperUrl, wallpaperOpacity }         = useUserSettings();
  const { partner }                                = usePartnerProfile();

  const [isReady, setIsReady]       = useState(false);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [replyTo, setReplyTo]       = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText]     = useState("");
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg]     = useState<Message | null>(null);
  const [showCarinhoAnim, setShowCarinhoAnim] = useState(false);

  const audio     = useAudioRecorder();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const msgRefs   = useRef<Record<string, HTMLDivElement | null>>({});

  /* ready flag */
  useEffect(() => {
    if (spaceId) setIsReady(true);
  }, [spaceId]);

  /* load messages */
  useEffect(() => {
    resetChatUnread();
    if (!spaceId) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("messages").select("*")
          .eq("couple_space_id", spaceId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (error) toast({ title: "Erro ao carregar mensagens", description: error.message, variant: "destructive" });
        else if (data) { setMessages((data as Message[]).reverse()); setHasMore(data.length === PAGE_SIZE); }
      } finally { setLoading(false); }
    })();
  }, [spaceId, resetChatUnread, toast]);

  const loadMore = useCallback(async () => {
    if (!spaceId || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const { data } = await supabase.from("messages").select("*")
      .eq("couple_space_id", spaceId).lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (data) { setMessages(prev => [...(data as Message[]).reverse(), ...prev]); setHasMore(data.length === PAGE_SIZE); }
    setLoadingMore(false);
  }, [spaceId, loadingMore, messages]);

  /* realtime */
  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase.channel("chat-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const m = payload.new as Message;
            setMessages(prev => {
              if (prev.some(x => x.id === m.id)) return prev;
              if (m.sender_user_id === user?.id) return [...prev.filter(x => !x.id.startsWith("temp-")), m];
              return [...prev, m];
            });
          } else if (payload.eventType === "UPDATE") {
            setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? (payload.new as Message) : m));
          } else if (payload.eventType === "DELETE") {
            setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, user?.id]);

  /* auto scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* image preview */
  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  /* upload helper */
  const uploadMedia = useCallback(async (file: Blob, ext: string): Promise<string | null> => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type || undefined });
    if (error) throw new Error(`Erro de storage: ${error.message}`);
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, [user]);

  /* send */
  const handleSend = useCallback(async (blobOverride?: Blob) => {
    if (!user || sending) return;
    if (!isReady && !spaceId) return;

    let sp = spaceId;
    if (!sp && user) {
      const { data: m } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).limit(1).maybeSingle();
      sp = m?.couple_space_id;
    }
    if (!sp) {
      toast({ title: "Dados em falta", description: "Não conseguimos identificar o teu espaço.", variant: "destructive" });
      return;
    }

    const text         = input.trim();
    const activeBlob   = blobOverride;
    const currentImage = imageFile;
    const currentReply = replyTo;

    if (!text && !currentImage && !activeBlob) return;

    setInput(""); setReplyTo(null); setImageFile(null); audio.clear(); setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, couple_space_id: sp!, sender_user_id: user.id,
      content: input, reply_to_id: currentReply?.id ?? null,
      image_url: currentImage ? URL.createObjectURL(currentImage) : null,
      audio_url: activeBlob ? "pending" : null,
      is_pinned: false, is_edited: false, is_deleted: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]);

    try {
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;

      if (currentImage) {
        const ext = currentImage.name.split(".").pop() ?? "jpg";
        imageUrl = await uploadMedia(currentImage, ext);
      }

      if (activeBlob) {
        if (activeBlob.size === 0) { setSending(false); return; }
        // Reliable extension from blob type (fallback to mp4 for iOS)
        const blobType = activeBlob.type || "audio/mp4";
        const ext = blobType.includes("mp4") ? "mp4" : blobType.includes("ogg") ? "ogg" : "webm";
        audioUrl = await uploadMedia(activeBlob, ext);
        if (!audioUrl) throw new Error("O servidor não devolveu o link do áudio.");
      }

      const { error: insertErr } = await supabase.from("messages").insert({
        couple_space_id: sp, sender_user_id: user.id, content: input,
        reply_to_id: currentReply?.id ?? null, image_url: imageUrl, audio_url: audioUrl,
      });
      if (insertErr) throw insertErr;

      if (sp) logActivity(sp, "message");

      let body = input;
      if (!body && imageUrl) body = "Enviou uma foto";
      if (!body && audioUrl) body = "Enviou um audio";
      if (sp) notifyPartner({ couple_space_id: sp, title: "Nova mensagem", body: body.slice(0, 50), url: "/chat", type: "chat" }).catch(() => {});
    } catch (err: any) {
      setMessages(prev => prev.filter(m => !m.id.startsWith("temp-")));
      toast({ title: "Erro ao enviar", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, spaceId, user, sending, imageFile, uploadMedia, toast, replyTo, isReady, audio]);

  /* carinho */
  const handleSendCarinho = useCallback(async () => {
    if (!user || sending) return;

    let sp = spaceId;
    if (!sp && user) {
      const { data: m } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).limit(1).maybeSingle();
      sp = m?.couple_space_id;
    }
    if (!sp) { toast({ title: "Dados em falta", variant: "destructive" }); return; }

    setSending(true);
    setShowCarinhoAnim(true);

    try {
      const { error } = await supabase.from("messages").insert({
        couple_space_id: sp, sender_user_id: user.id, content: "Só para te lembrar que te amo",
      });
      if (error) throw error;
      if (sp) logActivity(sp, "message");
      notifyPartner({ couple_space_id: sp, title: "Recebeste carinho!", body: "Só para te lembrar que te amo", url: "/chat", type: "chat" }).catch(() => {});
      setTimeout(() => setShowCarinhoAnim(false), 2000);
    } catch (err: any) {
      toast({ title: "Erro ao enviar carinho", description: err?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [spaceId, user, sending, toast]);

  /* edit */
  const handleEditSave = useCallback(async () => {
    if (!editingMsg || !editText.trim()) return;
    const id = editingMsg.id;
    const content = editText.trim();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, is_edited: true } : m));
    setEditingMsg(null); setEditText("");
    await supabase.from("messages").update({ content, is_edited: true, updated_at: new Date().toISOString() }).eq("id", id);
  }, [editingMsg, editText]);

  /* delete */
  const handleDelete = useCallback(async (msg: Message) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_deleted: true, content: "" } : m));
    setSheetMsg(null);
    const { error } = await supabase.from("messages")
      .update({ is_deleted: true, content: "", image_url: null, audio_url: null, updated_at: new Date().toISOString() })
      .eq("id", msg.id);
    if (error) toast({ title: "Erro ao apagar", description: error.message, variant: "destructive" });
  }, [toast]);

  /* pin */
  const handlePin = useCallback(async (msg: Message) => {
    await supabase.from("messages").update({ is_pinned: !msg.is_pinned, updated_at: new Date().toISOString() }).eq("id", msg.id);
    setSheetMsg(null);
  }, []);

  /* scroll to msg */
  const jumpToMsg = useCallback((id: string) => {
    const el = msgRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-rose-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-rose-400"), 1500);
    }
  }, []);

  /* reply preview text */
  const getReplyPreview = useCallback((id: string | null) => {
    if (!id) return null;
    const msg = messages.find(m => m.id === id);
    if (!msg) return null;
    if (msg.is_deleted) return "Mensagem apagada";
    if (msg.image_url) return "Foto";
    if (msg.audio_url) return "Audio";
    return msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
  }, [messages]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const date = msg.created_at.slice(0, 10);
      if (date !== lastDate) { groups.push({ date: msg.created_at, msgs: [] }); lastDate = date; }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [messages]);

  const hasText   = !!input.trim() || !!imageFile;
  const inRecMode = audio.recording || !!audio.audioBlob;

  /* ── Partner initials fallback ── */
  const partnerInitial = partner?.display_name?.[0]?.toUpperCase() ?? "?";

  return (
    <section className="relative flex flex-col overflow-hidden h-[100dvh]">

      {/* Wallpaper */}
      {wallpaperUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={wallpaperUrl} alt="" className="w-full h-full object-cover" style={{ opacity: wallpaperOpacity ?? 0.15 }} />
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative z-20 shrink-0 bg-white border-b border-[#e8e8e8]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Back */}
          <button onClick={() => navigate("/")}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors shrink-0">
            <ChevronLeft className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          </button>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0 overflow-hidden border border-rose-200">
            {partner?.avatar_url
              ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-sm font-semibold text-rose-500">{partnerInitial}</span>
            }
          </div>

          {/* Name + subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-semibold text-foreground truncate">
                {partner?.display_name || "Amor"}
              </span>
              {partner?.verification_status === "verified" && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-[11px] text-[#999]">Chat privado</p>
          </div>

          {/* Palette */}
          <button onClick={() => navigate("/configuracoes#customization")}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors shrink-0">
            <Palette className="h-4.5 w-4.5 text-[#999]" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Pinned */}
      <div className="relative z-20 shrink-0">
        <PinnedBar messages={messages} onJump={jumpToMsg} />
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 relative z-10 overflow-y-auto"
        style={{ scrollbarWidth: "none", backgroundColor: wallpaperUrl ? undefined : "#ece5dd" }}
      >
        <div className="flex flex-col gap-0 py-3 pb-4 min-h-full justify-end">
          {hasMore && (
            <div className="flex justify-center py-2">
              <button onClick={loadMore} disabled={loadingMore}
                className="text-xs text-[#666] bg-white/80 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
                Carregar mais
              </button>
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#aaa]" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Heart className="h-10 w-10 text-rose-300" strokeWidth={1} />
              <p className="text-sm text-[#999]">Nenhuma mensagem ainda. Diz olá!</p>
            </div>
          )}

          {groupedMessages.map(group => (
            <div key={group.date}>
              <DateSeparator date={group.date} />
              {group.msgs.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.sender_user_id === user?.id}
                  isDeleted={msg.is_deleted}
                  replyPreview={getReplyPreview(msg.reply_to_id)}
                  formatTime={formatTime}
                  jumpToMsg={jumpToMsg}
                  onLongPress={() => { if (!msg.is_deleted) setSheetMsg(msg); }}
                  refCallback={el => { msgRefs.current[msg.id] = el; }}
                />
              ))}
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
          onReply={() => { setReplyTo(sheetMsg); setSheetMsg(null); inputRef.current?.focus(); }}
          onEdit={() => { setEditingMsg(sheetMsg); setEditText(sheetMsg.content); setSheetMsg(null); }}
          onDelete={() => handleDelete(sheetMsg)}
          onPin={() => handlePin(sheetMsg)}
          onClose={() => setSheetMsg(null)}
        />
      )}

      {/* ── Bottom Input Bar (WhatsApp style) ── */}
      <div className="relative z-50 shrink-0 bg-[#f0f0f0] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">

        {/* Edit mode banner */}
        {editingMsg && (
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 mb-1.5 border border-[#e0e0e0]">
            <Pencil className="h-3.5 w-3.5 text-[#717171] shrink-0" />
            <input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingMsg(null); }}
            />
            <button onClick={handleEditSave} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#f0f0f0]">
              <Check className="h-4 w-4 text-rose-500" />
            </button>
            <button onClick={() => setEditingMsg(null)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#f0f0f0]">
              <X className="h-4 w-4 text-[#999]" />
            </button>
          </div>
        )}

        {/* Reply banner */}
        {replyTo && !editingMsg && (
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 mb-1.5 border-l-2 border-rose-400">
            <Reply className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <p className="flex-1 text-xs text-[#717171] line-clamp-1">
              {replyTo.content || (replyTo.image_url ? "Foto" : replyTo.audio_url ? "Audio" : "")}
            </p>
            <button onClick={() => setReplyTo(null)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#f0f0f0]">
              <X className="h-3 w-3 text-[#999]" />
            </button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && !editingMsg && (
          <div className="flex items-center gap-2 bg-white rounded-2xl px-2 py-1.5 mb-1.5">
            <img src={imagePreview} alt="" className="h-9 w-9 rounded-xl object-cover shrink-0" />
            <p className="flex-1 text-xs text-[#717171] truncate">{imageFile?.name}</p>
            <button onClick={() => setImageFile(null)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#f0f0f0]">
              <X className="h-3 w-3 text-[#999]" />
            </button>
          </div>
        )}

        {/* Main input row */}
        {!editingMsg && (
          <div className="flex items-end gap-2">

            {/* Input area (white pill) */}
            <div className="flex-1 relative">
              {/* Recording / Preview overlay inside the pill */}
              {inRecMode ? (
                <div className="flex items-center gap-2 bg-white rounded-[24px] min-h-[48px] px-3 py-2">

                  {/* Delete */}
                  <button onClick={audio.cancel}
                    className="w-9 h-9 flex items-center justify-center text-[#bbb] hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </button>

                  {/* Center: timer (recording) OR audio preview (stopped) */}
                  <div className="flex-1 flex items-center min-w-0">
                    {audio.recording ? (
                      /* ── Recording state ── */
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        <div className={cn(
                          "h-2 w-2 rounded-full bg-red-500 shrink-0",
                          !audio.isPaused && "animate-pulse"
                        )} />
                        <span className="text-[16px] font-mono font-semibold text-[#333] tabular-nums">
                          {Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, "0")}
                        </span>
                        {/* Pause / Resume */}
                        {audio.isPaused ? (
                          <button onClick={audio.resume}
                            className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 transition-transform active:scale-90">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </button>
                        ) : (
                          <button onClick={audio.pause}
                            className="w-7 h-7 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#888] transition-transform active:scale-90">
                            <Pause className="h-3.5 w-3.5 fill-current" />
                          </button>
                        )}
                      </div>
                    ) : (
                      /* ── Preview state — listen before sending ── */
                      audio.audioBlob && (
                        <AudioPreviewInline blob={audio.audioBlob} duration={audio.duration} />
                      )
                    )}
                  </div>

                  {/* Stop to preview (only during recording) */}
                  {audio.recording && (
                    <button onClick={() => audio.stop()}
                      className="w-9 h-9 rounded-full bg-[#f0f0f0] flex items-center justify-center text-[#666] shrink-0 transition-transform active:scale-90">
                      <div className="h-4 w-4 bg-current rounded-[3px]" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-end bg-white rounded-[24px] min-h-[44px] px-2 py-1">
                  <ImagePickerButton onPick={setImageFile} />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Mensagem"
                    className="flex-1 min-h-[36px] bg-transparent outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#aaa] px-1 py-1.5 resize-none"
                    autoComplete="off"
                  />
                  {/* Carinho heart — only when no text */}
                  {!hasText && (
                    <button type="button" onClick={handleSendCarinho} disabled={sending}
                      className="w-9 h-9 flex items-center justify-center text-rose-500 hover:text-rose-600 transition-transform active:scale-125 duration-200 shrink-0">
                      <Heart className="h-5 w-5 fill-rose-500" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right button: send or mic */}
            <button
              type="button"
              disabled={!isReady || sending}
              onClick={async () => {
                if (inRecMode) {
                  if (audio.recording) {
                    const blob = await audio.stop();
                    if (blob) handleSend(blob);
                  } else if (audio.audioBlob) {
                    handleSend(audio.audioBlob);
                  }
                } else if (hasText) {
                  handleSend();
                } else {
                  audio.start();
                }
              }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95",
                "bg-rose-500 text-white",
                (!isReady || sending) && "opacity-60"
              )}
            >
              {sending
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : (inRecMode || hasText)
                  ? <Send className="h-5 w-5 ml-0.5" />
                  : <Mic className="h-5 w-5" />
              }
            </button>
          </div>
        )}
      </div>

      {/* Carinho animation */}
      {showCarinhoAnim && (
        <div className="absolute top-1/3 left-0 right-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="relative">
            <div className="animate-bounce p-5 bg-rose-500/15 rounded-full">
              <Heart className="h-20 w-20 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="absolute animate-in fade-out zoom-out duration-1000 fill-mode-forwards"
                  style={{ transform: `rotate(${i * 30}deg) translateY(-120px)`, animationDelay: `${i * 0.05}s` }}>
                  <Heart className="h-6 w-6 text-rose-400/40 fill-rose-400/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Audio Preview (inline, for recording state) ─────────────────────────────── */

function AudioPreviewInline({ blob, duration }: { blob: Blob; duration: number }) {
  const [playing, setPlaying]   = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [dur, setDur]           = useState(duration);
  // useState (not useRef) so the <audio> src attribute re-renders correctly
  const [blobUrl, setBlobUrl]   = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => setPlaying(false));
  };

  const fmt = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
  const progress = dur > 0 ? currentTime / dur : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      {blobUrl && (
        <audio ref={audioRef} src={blobUrl} preload="auto" playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setCurrent(0); }}
          onTimeUpdate={() => audioRef.current && setCurrent(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDur(audioRef.current.duration)}
        />
      )}
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90"
      >
        {playing
          ? <Pause className="h-4 w-4 fill-current" />
          : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <WaveformBars progress={progress} isMine={false} />
        <span className="text-[10px] font-mono text-[#999] tabular-nums">
          {fmt(playing ? currentTime : dur)}
        </span>
      </div>
    </div>
  );
}
