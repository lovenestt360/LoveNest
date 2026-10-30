import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { todayLocal } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { notifyPartner } from "@/lib/notifyPartner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { logActivity, fireMissionIfNotFired } from "@/lib/logActivity";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Loader2, Image as ImageIcon, Mic, Pin, PinOff, Reply,
  Pencil, Trash2, X, Check, CornerDownRight, Palette, ShieldCheck,
  Heart, ChevronLeft, Play, Pause, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CHAT_WALLPAPER } from "@/features/chat/components/defaultWallpaper";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useOnlinePresence } from "@/features/presence/onlinePresence";
import { useSignedMedia } from "@/lib/privateMedia";

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
  const { toast } = useToast();
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
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast({ title: "Microfone bloqueado", description: "Permite o acesso ao microfone nas definições do browser.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao iniciar gravação", description: "O teu dispositivo não suporta gravação de áudio neste browser.", variant: "destructive" });
      }
    }
  }, [toast]);

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
              ? "bg-[#1C2230] dark:bg-foreground"
              : "bg-[#1C2230]/20 dark:bg-white/25"
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
  const fixingDurRef = useRef(false);
  const src = useSignedMedia("chat-media", url);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => setPlaying(false));
  }, [playing]);

  const fmt = (t: number) => {
    if (!isFinite(t) || isNaN(t) || t < 0) return "--:--";
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
  };
  const progress = isFinite(dur) && dur > 0 ? currentTime / dur : 0;

  return (
    <div className="flex items-center gap-2 min-w-[190px]">
      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => { if (audioRef.current && !fixingDurRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => {
          if (!audioRef.current) return;
          if (isFinite(audioRef.current.duration)) {
            setDur(audioRef.current.duration);
          } else {
            // WebM from MediaRecorder has no duration in container;
            // seeking to a huge value forces the browser to scan the file.
            fixingDurRef.current = true;
            audioRef.current.currentTime = 1e101;
          }
        }}
        onDurationChange={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) setDur(audioRef.current.duration);
        }}
        onSeeked={() => {
          if (fixingDurRef.current && audioRef.current) {
            fixingDurRef.current = false;
            audioRef.current.currentTime = 0;
          }
        }}
      />

      <button
        onClick={toggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90",
          "bg-[#1C2230] text-white dark:bg-foreground dark:text-background"
        )}
      >
        {playing
          ? <Pause className="h-4 w-4 fill-current" />
          : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      <div className="flex flex-col gap-1">
        <WaveformBars progress={progress} isMine={isMine} />
        <span className={cn("text-[10px] font-mono tabular-nums",
          "text-[#8A8F98] dark:text-muted-foreground")}>
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
        className="w-9 h-9 flex items-center justify-center text-[#9A9DA6] hover:text-foreground shrink-0 transition-colors">
        <ImageIcon className="h-5 w-5" strokeWidth={1.8} />
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
      <span className="rounded-full bg-[#F4F2EF]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A8F98] backdrop-blur-sm dark:bg-card/85 dark:text-muted-foreground">
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
      className="flex w-full items-center gap-2.5 border-b border-[#ECE8E3] bg-white px-4 py-2 text-left dark:border-border dark:bg-card">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
        <Pin className="h-3 w-3 text-rose-500" />
      </span>
      <p className="flex-1 text-[12.5px] font-medium text-foreground line-clamp-1">
        {last.content || (last.image_url ? "Foto" : last.audio_url ? "Áudio" : "")}
      </p>
      <span className="text-[11px] font-medium text-[#9A9DA6] shrink-0">
        {pinned.length > 1 ? `${pinned.length} fixadas` : "Fixada"}
      </span>
    </button>
  );
}

/* ── Floating message menu ───────────────────────────────────────────────── */

const MENU_WIDTH = 220;

function FloatingMenu({
  msg, isMine, anchor, onReply, onCopy, onEdit, onDelete, onPin, onClose,
}: {
  msg: Message; isMine: boolean; anchor: DOMRect | null;
  onReply: () => void; onCopy: () => void; onEdit: () => void; onDelete: () => void; onPin: () => void; onClose: () => void;
}) {
  const items: { key: string; label: string; icon: ReactNode; onClick: () => void; danger?: boolean }[] = [
    { key: "reply", label: "Responder", icon: <Reply className="h-[17px] w-[17px]" />, onClick: onReply },
    ...(msg.content ? [{ key: "copy", label: "Copiar", icon: <Copy className="h-[17px] w-[17px]" />, onClick: onCopy }] : []),
    { key: "pin", label: msg.is_pinned ? "Desafixar" : "Fixar", icon: msg.is_pinned ? <PinOff className="h-[17px] w-[17px]" /> : <Pin className="h-[17px] w-[17px]" />, onClick: onPin },
    ...(isMine ? [{ key: "edit", label: msg.audio_url ? "Adicionar legenda" : "Editar", icon: <Pencil className="h-[17px] w-[17px]" />, onClick: onEdit }] : []),
    ...(isMine ? [{ key: "delete", label: "Apagar", icon: <Trash2 className="h-[17px] w-[17px]" />, onClick: onDelete, danger: true }] : []),
  ];

  // Junto da mensagem: por baixo se couber, senão por cima; alinhado ao lado dela.
  const menuHeight = items.length * 46 + 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;
  let top = anchor ? anchor.bottom + 8 : vh / 2 - menuHeight / 2;
  let placeAbove = false;
  if (anchor && top + menuHeight > vh - 96) {
    top = Math.max(76, anchor.top - menuHeight - 8);
    placeAbove = true;
  }
  const side = anchor
    ? isMine
      ? { right: Math.max(8, vw - anchor.right) }
      : { left: Math.max(8, Math.min(anchor.left, vw - MENU_WIDTH - 8)) }
    : { left: (vw - MENU_WIDTH) / 2 };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-[#0B1324]/[0.08] animate-in fade-in duration-150" onClick={onClose} />
      <div
        role="menu"
        className={cn(
          "fixed z-[70] overflow-hidden rounded-[18px] bg-white/95 p-1.5 shadow-[0_18px_44px_-14px_rgba(11,19,36,0.35),0_0_0_1px_rgba(11,19,36,0.05)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 dark:bg-card/95",
          placeAbove ? "slide-in-from-bottom-1" : "slide-in-from-top-1",
          isMine ? "origin-top-right" : "origin-top-left",
        )}
        style={{ top, width: MENU_WIDTH, ...side }}
      >
        {items.map(item => (
          <button
            key={item.key}
            role="menuitem"
            onClick={item.onClick}
            className={cn(
              "flex h-[46px] w-full items-center justify-between rounded-[12px] px-3 text-left text-[15px] transition-colors active:bg-[#F4F2EF] dark:active:bg-muted",
              item.danger ? "text-red-500" : "text-[#1C2230] dark:text-foreground",
            )}
          >
            {item.label}
            <span className={item.danger ? "text-red-500" : "text-[#8A8F98]"}>{item.icon}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Message Bubble ─────────────────────────────────────────────────────────── */

function MessageBubble({
  msg, isMine, isDeleted, replyPreview, formatTime, jumpToMsg, onLongPress, refCallback,
  lastInGroup, selected, animateIn,
}: {
  msg: Message; isMine: boolean; isDeleted: boolean; replyPreview: string | null;
  formatTime: (iso: string) => string; jumpToMsg: (id: string) => void;
  onLongPress: () => void; refCallback: (el: HTMLDivElement | null) => void;
  lastInGroup: boolean; selected: boolean; animateIn: boolean;
}) {
  const lp = useLongPress(onLongPress, 450);
  const imageSrc = useSignedMedia("chat-media", msg.image_url);

  return (
    <div
      ref={refCallback}
      className={cn(
        "flex px-3",
        lastInGroup ? "mb-2.5" : "mb-[3px]",
        isMine ? "justify-end" : "justify-start",
        animateIn && "animate-in fade-in slide-in-from-bottom-2 duration-300",
      )}
    >
      <div
        data-bubble
        className={cn(
          "relative max-w-[78%] transition-transform duration-200 ease-out",
          selected && "z-[65] scale-[1.03]",
        )}
      >
        {msg.is_pinned && !isDeleted && (
          <div className="absolute -top-1.5 right-2 z-10">
            <Pin className="h-2.5 w-2.5 text-rose-400 fill-rose-400" />
          </div>
        )}
        <div
          {...lp}
          className={cn(
            "px-3.5 py-2 text-[15px] leading-[1.35] select-none transition-shadow duration-200 active:brightness-[0.98]",
            isMine
              ? cn("bg-[#F1EBE3] text-[#1C2230] rounded-[20px] dark:bg-[#2A2F3A] dark:text-foreground", lastInGroup && "rounded-br-[6px]")
              : cn("bg-white text-[#1C2230] rounded-[20px] border border-[#ECE8E3] dark:bg-card dark:text-foreground dark:border-border", lastInGroup && "rounded-bl-[6px]"),
            selected
              ? "shadow-[0_14px_30px_-12px_rgba(11,19,36,0.35)]"
              : "shadow-[0_1px_2px_rgba(11,19,36,0.05)]",
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
                isMine ? "bg-white/60 border-[#B9AC99] text-[#5A5F6A] dark:bg-black/20 dark:text-muted-foreground" : "bg-[#F6F3EF] border-[#C9C4BD] text-[#5A5F6A] dark:bg-muted dark:text-muted-foreground"
              )}
            >
              <CornerDownRight className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2 break-words">{replyPreview}</span>
            </button>
          )}

          {/* Image */}
          {msg.image_url && !isDeleted && (
            imageSrc
              ? <img src={imageSrc} alt="Foto"
                  className="rounded-[14px] max-w-full max-h-64 object-cover mb-1 cursor-pointer"
                  onClick={() => window.open(imageSrc, "_blank")} />
              : <div className="mb-1 h-40 w-52 animate-pulse rounded-[14px] bg-black/5 dark:bg-white/10" />
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
            "text-[#8A8F98] dark:text-muted-foreground")}>
            {msg.is_edited && !isDeleted && <span className="text-[10px]">{msg.audio_url ? "legenda ·" : "editada ·"}</span>}
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
  const { partnerOnline }                          = useOnlinePresence();
  const { resetChatUnread }                        = useAppNotifContext();
  const { toast }                                  = useToast();
  const { wallpaperUrl, wallpaperOpacity }         = useUserSettings();
  const { partner, loading: partnerLoading }       = usePartnerProfile();
  const { profile: ownProfile }                    = useProfile();

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
  const [sheetAnchor, setSheetAnchor] = useState<DOMRect | null>(null);
  const [showCarinhoAnim, setShowCarinhoAnim] = useState(false);

  const [myMessageToday, setMyMessageToday]         = useState(false);
  const [partnerMessageToday, setPartnerMessageToday] = useState(false);

  const audio      = useAudioRecorder();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const msgRefs    = useRef<Record<string, HTMLDivElement | null>>({});
  // Ids presentes quando a conversa abriu: só o que chega depois entra animado.
  const initialIdsRef = useRef<Set<string> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const checkMissionRef = useRef<() => Promise<void>>(async () => {});

  /* ready flag */
  useEffect(() => {
    if (spaceId) setIsReady(true);
  }, [spaceId]);

  // Modo solo não tem com quem conversar — sem forma de aceder ao chat,
  // nem pelo URL direto.
  useEffect(() => {
    if (ownProfile?.usage_mode === "solo") navigate("/", { replace: true });
  }, [ownProfile?.usage_mode, navigate]);

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
        else if (data) {
          initialIdsRef.current = new Set((data as Message[]).map(m => m.id));
          setMessages((data as Message[]).reverse());
          setHasMore(data.length === PAGE_SIZE);
        }
      } finally {
        // Sem mensagens (ou erro) também conta como "já abriu".
        if (!initialIdsRef.current) initialIdsRef.current = new Set();
        setLoading(false);
      }
    })();
  }, [spaceId, resetChatUnread, toast]);

  /* mission "Conversar": verifica se ambos já enviaram mensagem hoje */
  const checkMessageMissionStatus = useCallback(async () => {
    if (!spaceId || !user) return;
    const today = todayLocal();
    const { data } = await supabase
      .from("daily_activity" as any)
      .select("user_id")
      .eq("couple_space_id", spaceId)
      .eq("activity_date", today)
      .eq("type", "message") as any;
    if (data) {
      setMyMessageToday(data.some((r: any) => r.user_id === user.id));
      setPartnerMessageToday(data.some((r: any) => r.user_id !== user.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, user?.id]);

  useEffect(() => { checkMissionRef.current = checkMessageMissionStatus; }, [checkMessageMissionStatus]);
  useEffect(() => { checkMessageMissionStatus(); }, [checkMessageMissionStatus]);

  // Dispara missão "Conversar" apenas quando AMBOS enviaram mensagem hoje
  useEffect(() => {
    if (myMessageToday && partnerMessageToday) {
      fireMissionIfNotFired("message");
    }
  }, [myMessageToday, partnerMessageToday]);

  const loadMore = useCallback(async () => {
    if (!spaceId || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const { data } = await supabase.from("messages").select("*")
      .eq("couple_space_id", spaceId).lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (data) {
      // Mensagens antigas não entram animadas.
      for (const m of data as Message[]) initialIdsRef.current?.add(m.id);
      setMessages(prev => [...(data as Message[]).reverse(), ...prev]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [spaceId, loadingMore, messages]);

  /* realtime — só recria o canal quando spaceId muda */
  useEffect(() => {
    if (!spaceId) return;
    const userId = user?.id;
    const ch = supabase.channel(`chat-${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const m = payload.new as Message;
            setMessages(prev => {
              if (prev.some(x => x.id === m.id)) return prev;
              if (m.sender_user_id === userId) return [...prev.filter(x => !x.id.startsWith("temp-")), m];
              return [...prev, m];
            });
            checkMissionRef.current();
          } else if (payload.eventType === "UPDATE") {
            setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? (payload.new as Message) : m));
          } else if (payload.eventType === "DELETE") {
            setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
          }
        })
      // Broadcast fallback: garantia de que o par vê edições/apagamentos em tempo real
      // mesmo quando os eventos postgres_changes UPDATE são lentos ou não chegam
      .on("broadcast", { event: "msg_edit" }, ({ payload }) => {
        setMessages(prev => prev.map(m => m.id === payload.id ? { ...m, content: payload.content, is_edited: true } : m));
      })
      .on("broadcast", { event: "msg_delete" }, ({ payload }) => {
        setMessages(prev => prev.map(m => m.id === payload.id ? { ...m, is_deleted: true, content: "" } : m));
      })
      .on("broadcast", { event: "msg_pin" }, ({ payload }) => {
        setMessages(prev => prev.map(m => m.id === payload.id ? { ...m, is_pinned: payload.is_pinned } : m));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

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

      if (sp) { logActivity(sp, "message", { skipMission: true }); setMyMessageToday(true); }

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
      if (sp) { logActivity(sp, "message", { skipMission: true }); setMyMessageToday(true); }
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
    const prevMsg = { ...editingMsg };
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, is_edited: true } : m));
    setEditingMsg(null); setEditText("");
    const { error } = await (supabase as any).rpc("edit_chat_message", { p_message_id: id, p_content: content });
    if (error) {
      setMessages(prev => prev.map(m => m.id === id ? prevMsg : m));
      toast({ title: "Erro ao guardar edição", description: error.message, variant: "destructive" });
      return;
    }
    channelRef.current?.send({ type: "broadcast", event: "msg_edit", payload: { id, content } });
  }, [editingMsg, editText, toast]);

  /* delete */
  const handleDelete = useCallback(async (msg: Message) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_deleted: true, content: "" } : m));
    setSheetMsg(null);
    const { error } = await (supabase as any).rpc("delete_chat_message", { p_message_id: msg.id });
    if (error) {
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      toast({ title: "Erro ao apagar", description: error.message, variant: "destructive" });
      return;
    }
    channelRef.current?.send({ type: "broadcast", event: "msg_delete", payload: { id: msg.id } });
  }, [toast]);

  /* pin */
  const handlePin = useCallback(async (msg: Message) => {
    const is_pinned = !msg.is_pinned;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned } : m));
    setSheetMsg(null);
    const { error } = await (supabase as any).rpc("pin_chat_message", { p_message_id: msg.id, p_is_pinned: is_pinned });
    if (error) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: !is_pinned } : m));
    } else {
      channelRef.current?.send({ type: "broadcast", event: "msg_pin", payload: { id: msg.id, is_pinned } });
    }
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
  const partnerInitial = partner?.display_name?.[0]?.toUpperCase() ?? "";

  return (
    <section className="relative flex flex-col overflow-hidden h-[100dvh]">

      {/* Wallpaper */}
      {wallpaperUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={wallpaperUrl} alt="" className="w-full h-full object-cover" style={{ opacity: wallpaperOpacity ?? 0.15 }} />
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative z-20 shrink-0 border-b border-[#ECE8E3] bg-white/[0.94] pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-border dark:bg-card/[0.94]">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {/* Back */}
          <button onClick={() => navigate("/")} aria-label="Voltar"
            className="h-10 w-10 flex items-center justify-center rounded-full border border-[#ECE8E3] bg-white transition-colors active:bg-[#F7F5F2] shrink-0 dark:border-border dark:bg-card">
            <ChevronLeft className="h-5 w-5 text-foreground" strokeWidth={2} />
          </button>

          {/* Avatar: o par, em azul como na Home */}
          <div className="relative ml-0.5 h-9 w-9 shrink-0">
            <span aria-hidden="true" className="absolute -inset-[3px] rounded-full border-2 border-[#4D7CFE]" />
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7D9DFF] to-[#3F68E6]">
              {partner?.avatar_url
                ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm font-semibold text-white">{partnerInitial}</span>
              }
            </div>
          </div>

          {/* Name + subtitle */}
          <div className="ml-1 flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-foreground truncate">
                {partner?.display_name || (partnerLoading ? "" : "Amor")}
              </span>
              {!partner && partnerLoading && <span className="h-3.5 w-24 animate-pulse rounded-full bg-[#ECE8E3] dark:bg-muted" aria-label="A carregar" />}
              {partner?.verification_status === "verified" && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={1.8} />
              )}
            </div>
            <p className="flex items-center gap-1.5 text-[12px] text-[#7A7F8C] dark:text-muted-foreground">
              {partnerOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
              {partnerOnline ? "Online agora" : "Só vocês os dois"}
            </p>
          </div>

          {/* Palette */}
          <button onClick={() => navigate("/configuracoes#customization")} aria-label="Personalizar o chat"
            className="h-10 w-10 flex items-center justify-center rounded-full border border-[#ECE8E3] bg-white transition-colors active:bg-[#F7F5F2] shrink-0 dark:border-border dark:bg-card">
            <Palette className="h-[18px] w-[18px] text-[#3A4150] dark:text-muted-foreground" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Pinned */}
      <div className="relative z-20 shrink-0">
        <PinnedBar messages={messages} onJump={jumpToMsg} />
      </div>

      {/* Fundo por defeito: branco como a Home, com desenhos de linha quase invisíveis */}
      {!wallpaperUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none bg-white dark:bg-background" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.45] dark:opacity-[0.05]"
            style={{ backgroundImage: DEFAULT_CHAT_WALLPAPER, backgroundSize: "300px 300px" }}
          />
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="flex-1 relative z-10 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex flex-col gap-0 py-3 pb-4 min-h-full justify-end">
          {hasMore && (
            <div className="flex justify-center py-2">
              <button onClick={loadMore} disabled={loadingMore}
                className="flex items-center gap-1 rounded-full border border-[#ECE8E3] bg-white px-4 py-1.5 text-[12px] font-medium text-[#3A4150] dark:border-border dark:bg-card dark:text-muted-foreground">
                {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
                Carregar mais
              </button>
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/65" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#ECE8E3] bg-white dark:border-border dark:bg-card">
                <Heart className="h-6 w-6 text-rose-500" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-foreground">Ainda não há mensagens</p>
                <p className="mt-0.5 text-[13px] text-[#7A7F8C] dark:text-muted-foreground">Diz olá, ou manda um carinho.</p>
              </div>
            </div>
          )}

          {groupedMessages.map(group => (
            <div key={group.date}>
              <DateSeparator date={group.date} />
              {group.msgs.map((msg, i) => {
                const isMine = msg.sender_user_id === user?.id;
                const next = group.msgs[i + 1];
                // Mensagens seguidas da mesma pessoa (até 3 min) ficam juntas.
                const lastInGroup =
                  !next ||
                  next.sender_user_id !== msg.sender_user_id ||
                  new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() > 3 * 60_000;
                // Só anima o que chega depois de a conversa abrir (e não a troca temp → real).
                const animateIn =
                  !!initialIdsRef.current && !initialIdsRef.current.has(msg.id) && (msg.id.startsWith("temp-") || !isMine);
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={isMine}
                    isDeleted={msg.is_deleted}
                    replyPreview={getReplyPreview(msg.reply_to_id)}
                    formatTime={formatTime}
                    jumpToMsg={jumpToMsg}
                    lastInGroup={lastInGroup}
                    selected={sheetMsg?.id === msg.id}
                    animateIn={animateIn}
                    onLongPress={() => {
                      if (msg.is_deleted) return;
                      const bubble = msgRefs.current[msg.id]?.querySelector("[data-bubble]");
                      setSheetAnchor(bubble ? bubble.getBoundingClientRect() : null);
                      try { navigator.vibrate?.(8); } catch { /* sem vibração */ }
                      setSheetMsg(msg);
                    }}
                    refCallback={el => { msgRefs.current[msg.id] = el; }}
                  />
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Menu flutuante da mensagem ── */}
      {sheetMsg && (
        <FloatingMenu
          msg={sheetMsg}
          isMine={sheetMsg.sender_user_id === user?.id}
          anchor={sheetAnchor}
          onCopy={() => {
            navigator.clipboard?.writeText(sheetMsg.content).then(() => toast({ title: "Mensagem copiada" }), () => {});
            setSheetMsg(null);
          }}
          onReply={() => { setReplyTo(sheetMsg); setSheetMsg(null); inputRef.current?.focus(); }}
          onEdit={() => { setEditingMsg(sheetMsg); setEditText(sheetMsg.content); setSheetMsg(null); }}
          onDelete={() => handleDelete(sheetMsg)}
          onPin={() => handlePin(sheetMsg)}
          onClose={() => setSheetMsg(null)}
        />
      )}

      {/* ── Bottom Input Bar (WhatsApp style) ── */}
      <div className="relative z-50 shrink-0 border-t border-[#ECE8E3] bg-white px-2.5 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] dark:border-border dark:bg-card">

        {/* Edit mode banner */}
        {editingMsg && (
          <div className="flex items-center gap-2 rounded-[18px] border border-[#ECE8E3] bg-[#F6F3EF] px-3 py-2 mb-2 dark:border-border dark:bg-muted">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingMsg(null); }}
            />
            <button onClick={handleEditSave} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted">
              <Check className="h-4 w-4 text-rose-500" />
            </button>
            <button onClick={() => setEditingMsg(null)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Reply banner */}
        {replyTo && !editingMsg && (
          <div className="flex items-center gap-2 rounded-[14px] border-l-[3px] border-[#B9AC99] bg-[#F6F3EF] px-3 py-2 mb-2 dark:bg-muted">
            <Reply className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <p className="flex-1 text-xs text-muted-foreground line-clamp-1">
              {replyTo.content || (replyTo.image_url ? "Foto" : replyTo.audio_url ? "Audio" : "")}
            </p>
            <button onClick={() => setReplyTo(null)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && !editingMsg && (
          <div className="flex items-center gap-2 rounded-[18px] bg-[#F6F3EF] px-2 py-1.5 mb-2 dark:bg-muted">
            <img src={imagePreview} alt="" className="h-9 w-9 rounded-xl object-cover shrink-0" />
            <p className="flex-1 text-xs text-muted-foreground truncate">{imageFile?.name}</p>
            <button onClick={() => setImageFile(null)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted">
              <X className="h-3 w-3 text-muted-foreground" />
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
                <div className="flex items-center gap-2 rounded-[24px] bg-[#F4F1EC] min-h-[48px] px-3 py-2 dark:bg-muted">

                  {/* Delete */}
                  <button onClick={audio.cancel}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground/65 hover:text-red-400 transition-colors shrink-0">
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
                        <span className="text-[16px] font-mono font-semibold text-foreground tabular-nums">
                          {Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, "0")}
                        </span>
                        {/* Pause / Resume */}
                        {audio.isPaused ? (
                          <button onClick={audio.resume}
                            className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 transition-transform active:scale-90">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </button>
                        ) : (
                          <button onClick={audio.pause}
                            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#3A4150] transition-transform active:scale-90 dark:bg-card dark:text-muted-foreground">
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
                      className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#3A4150] shrink-0 transition-transform active:scale-90 dark:bg-card dark:text-muted-foreground">
                      <div className="h-4 w-4 bg-current rounded-[3px]" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-end rounded-[24px] bg-[#F4F1EC] min-h-[46px] px-2 py-1 dark:bg-muted">
                  <ImagePickerButton onPick={setImageFile} />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Mensagem"
                    className="flex-1 min-h-[36px] bg-transparent outline-none text-[15px] text-foreground placeholder:text-[#9A9DA6] px-1 py-1.5 resize-none"
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
                "w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95",
                "bg-[#1C2230] text-white dark:bg-foreground dark:text-background",
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
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {fmt(playing ? currentTime : dur)}
        </span>
      </div>
    </div>
  );
}
