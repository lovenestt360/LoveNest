import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Flame, Send, UserRound, Loader2, CheckCircle2, Clock, XCircle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { UseFastingCoupleReturn } from "./useFastingCouple";
import type { CreatePlanInput, DayResult } from "./types";

const QUICK_MESSAGES = [
  "Força, consegues!",
  "Estou orgulhoso(a) de ti",
  "Cada dia é uma vitória",
  "Continua assim, vale a pena",
  "Juntos somos mais fortes",
];

function resultBadge(result: DayResult) {
  if (result === "cumprido") return { label: "Cumprido", cls: "bg-green-500 text-white", Icon: CheckCircle2 };
  if (result === "parcial")  return { label: "Parcial",  cls: "bg-orange-400 text-white", Icon: Clock };
  if (result === "falhei")   return { label: "Falhei",   cls: "bg-red-500 text-white",   Icon: XCircle };
  return { label: "Sem registo", cls: "bg-muted text-muted-foreground", Icon: Clock };
}

interface Props {
  coupleData: UseFastingCoupleReturn;
  createPlan: (input: CreatePlanInput) => Promise<void>;
  hasMyPlan: boolean;
}

export function FastingCouple({ coupleData, createPlan, hasMyPlan }: Props) {
  const { loading, partner, myUserId, messages, sendMessage, joinPartnerPlan } = coupleData;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sem par ligado
  if (!partner) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
          <UserRound className="h-6 w-6 text-rose-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-foreground">Nenhum par ligado</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Quando o teu par se juntar ao LoveNest, podes acompanhar o jejum juntos e enviar mensagens de motivação.
        </p>
      </div>
    );
  }

  const partnerName = partner.displayName ?? "O teu par";
  const { profile, todayLog, streak, completionRate, loggedDays } = partner;

  return (
    <div className="space-y-4">

      {/* ── Card do par ─────────────────────────────────────────── */}
      {profile ? (
        <div className="glass-card rounded-2xl p-4 space-y-4">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">Plano de</p>
              <p className="text-sm font-bold text-foreground">{partnerName}</p>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              (() => { const b = resultBadge(todayLog?.result ?? null); return b.cls; })()
            )}>
              {(() => {
                const b = resultBadge(todayLog?.result ?? null);
                return <><b.Icon className="h-3 w-3" />{b.label}</>;
              })()}
            </div>
          </div>

          {/* Nome do plano + datas */}
          <div>
            <p className="text-base font-bold text-foreground">{profile.plan_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(profile.start_date + "T12:00:00"), "d MMM", { locale: pt })}
              {" — "}
              {format(new Date(profile.end_date + "T12:00:00"), "d MMM yyyy", { locale: pt })}
            </p>
          </div>

          {/* Progresso */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{loggedDays} dias registados</span>
              <span className="font-bold text-foreground">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/40 p-2.5 flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-extrabold text-foreground">{streak}</p>
                <p className="text-[10px] text-muted-foreground">dias seguidos</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-2.5 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-extrabold text-foreground">{profile.total_days}</p>
                <p className="text-[10px] text-muted-foreground">dias de plano</p>
              </div>
            </div>
          </div>

          {/* Botão juntar */}
          {!hasMyPlan && (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="w-full h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {joining
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <UserRound className="h-4 w-4" strokeWidth={1.5} />
              }
              {joining ? "A juntar..." : `Juntar-me ao plano de ${partnerName}`}
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">{partnerName} ainda não tem plano ativo</p>
          <p className="text-xs text-muted-foreground">Quando iniciarem um jejum, o progresso aparece aqui.</p>
        </div>
      )}

      {/* ── Mensagens de motivação ───────────────────────────────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Motivação</p>
        </div>

        {/* Thread */}
        <div className="px-4 space-y-2 max-h-72 overflow-y-auto pb-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
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
          <div ref={messagesEndRef} />
        </div>

        {/* Quick chips */}
        <div className="px-4 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
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
        <div className="px-4 pb-4 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escreve uma mensagem..."
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
