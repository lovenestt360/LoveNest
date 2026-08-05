import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Flame, UserRound, Loader2, Send, Plus, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { UseFastingCoupleReturn } from "./useFastingCouple";
import type { CreatePlanInput, DayResult } from "./types";

const QUICK_MESSAGES = [
  "Força, consegues!",
  "Estou orgulhoso(a) de ti",
  "Cada dia é uma vitória",
  "Continua assim!",
  "Juntos somos mais fortes",
];

function resultBadge(result: DayResult) {
  if (result === "cumprido") return { label: "Cumprido hoje", cls: "bg-green-500/15 text-green-600 dark:text-green-400" };
  if (result === "parcial")  return { label: "Parcial hoje",  cls: "bg-orange-400/15 text-orange-500" };
  if (result === "falhei")   return { label: "Falhei hoje",   cls: "bg-red-500/15 text-red-500" };
  return { label: "Sem registo hoje", cls: "bg-muted/60 text-muted-foreground" };
}

interface Props {
  coupleData: UseFastingCoupleReturn;
  createPlan: (input: CreatePlanInput) => Promise<void>;
  onCreateOwn: () => void;
}

export function FastingPartnerLanding({ coupleData, createPlan, onCreateOwn }: Props) {
  const { partner, myUserId, messages, sendMessage, joinPartnerPlan } = coupleData;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!partner?.profile) return null;

  const partnerName = partner.displayName ?? "O teu par";
  const { profile, todayLog, streak, completionRate, loggedDays } = partner;
  const badge = resultBadge(todayLog?.result ?? null);
  const progressPct = Math.min(100, Math.round((loggedDays / profile.total_days) * 100));

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await sendMessage(text);
    setText("");
    setSending(false);
  };

  const handleJoin = async () => {
    setJoining(true);
    await joinPartnerPlan(createPlan);
    setJoining(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Plano do par ─────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            {partnerName} está em jejum
          </p>
          <p className="text-lg font-bold text-foreground">{profile.plan_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(profile.start_date + "T12:00:00"), "d 'de' MMMM", { locale: pt })}
            {" — "}
            {format(new Date(profile.end_date + "T12:00:00"), "d 'de' MMMM yyyy", { locale: pt })}
          </p>
        </div>

        {/* Progresso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{loggedDays} dias registados</span>
            <span className="font-bold text-foreground">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-right">{profile.total_days} dias de plano</p>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2.5">
            <Flame className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-base font-extrabold text-foreground leading-none">{streak}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">dias seguidos</p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-base font-extrabold text-foreground leading-none">{completionRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">cumprimento</p>
            </div>
          </div>
        </div>

        {/* Estado de hoje */}
        <div className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", badge.cls)}>
          {badge.label}
        </div>
      </div>

      {/* ── Ações ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="h-12 rounded-2xl bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-rose-500/20"
        >
          {joining
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <UserRound className="h-4 w-4" strokeWidth={1.5} />
          }
          {joining ? "A juntar..." : "Juntar-me"}
        </button>
        <button
          type="button"
          onClick={onCreateOwn}
          className="h-12 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 active:bg-muted/30 transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Criar o meu
        </button>
      </div>

      {/* ── Mensagens de motivação ───────────────────────────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2.5 border-b border-border/40">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Motivação</p>
        </div>

        {/* Thread */}
        <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Sem mensagens ainda. Envia o primeiro incentivo!
            </p>
          ) : (
            messages.map(m => {
              const isMine = m.sender_id === myUserId;
              return (
                <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                    isMine
                      ? "bg-rose-500 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    <p>{m.message}</p>
                    <p className={cn("text-[10px] mt-0.5", isMine ? "text-white/60" : "text-muted-foreground/60")}>
                      {format(new Date(m.created_at), "d MMM, HH:mm", { locale: pt })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Quick chips */}
        <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-t border-border/40">
          {QUICK_MESSAGES.map(msg => (
            <button
              key={msg}
              type="button"
              onClick={() => setText(msg)}
              className="shrink-0 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs text-muted-foreground whitespace-nowrap active:bg-muted transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escreve uma mensagem de apoio..."
            className="flex-1 bg-muted/40 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 active:scale-90 transition-all disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </div>
  );
}
