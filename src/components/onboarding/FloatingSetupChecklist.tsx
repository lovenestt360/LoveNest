import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding, isPushCapable } from "@/hooks/useOnboarding";
import {
  User, Heart, Bell, CheckCircle2, ChevronRight,
  Lock, Sparkles, X
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Task definitions ──────────────────────────────────────────────────────────

type TaskStatus = "done" | "active" | "locked";

function getTaskStatus(step: string, taskId: string): TaskStatus {
  const order = ["profile", "house", "notifications"];
  const stepIdx = order.indexOf(step);
  const taskIdx = order.indexOf(taskId);

  if (step === "complete") return "done";
  if (taskIdx < stepIdx) return "done";
  if (taskIdx === stepIdx) return "active";
  return "locked";
}

// ── Individual task row ───────────────────────────────────────────────────────

function TaskRow({
  id, icon: Icon, label, desc, status, onClick,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  status: TaskStatus;
  onClick: () => void;
}) {
  return (
    <button
      onClick={status === "active" ? onClick : undefined}
      disabled={status !== "active"}
      className={cn(
        "w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors",
        "border-b border-border last:border-0",
        status === "active" && "hover:bg-rose-50/40 dark:hover:bg-rose-950/30 active:bg-rose-50/60 dark:active:bg-rose-950/40 cursor-pointer",
        status !== "active" && "cursor-default"
      )}
    >
      {/* Status icon */}
      <div className={cn(
        "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0",
        status === "done"   && "bg-rose-50 dark:bg-rose-950/30",
        status === "active" && "bg-rose-50 dark:bg-rose-950/30",
        status === "locked" && "bg-muted",
      )}>
        {status === "done" && <CheckCircle2 className="w-4.5 h-4.5 w-[18px] h-[18px] text-rose-400" strokeWidth={1.5} />}
        {status === "active" && <Icon className="w-[18px] h-[18px] text-rose-400" strokeWidth={1.5} />}
        {status === "locked" && <Lock className="w-[14px] h-[14px] text-muted-foreground/60" strokeWidth={1.5} />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn(
          "text-[13px] font-semibold leading-snug",
          status === "done"   && "text-muted-foreground line-through",
          status === "active" && "text-foreground",
          status === "locked" && "text-muted-foreground/60",
        )}>
          {label}
        </p>
        <p className={cn(
          "text-[11px] leading-snug",
          status === "locked" ? "text-muted-foreground/40" : "text-muted-foreground"
        )}>
          {desc}
        </p>
      </div>

      {/* Arrow — only on active */}
      {status === "active" && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FloatingSetupChecklist() {
  const { step, loading, userId } = useOnboarding();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen]   = useState(false);
  const [pulse, setPulse] = useState(false);

  // Close panel on navigation
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Begin pulsing after 15s — gently draws attention without being intrusive
  useEffect(() => {
    if (loading || step === "complete") return;
    const t = setTimeout(() => setPulse(true), 15_000);
    return () => clearTimeout(t);
  }, [loading, step]);

  if (loading || step === "complete") return null;

  const pendingCount = ["profile", "house", "notifications"]
    .filter(id => getTaskStatus(step, id) !== "done").length;

  const tasks = [
    {
      id: "profile",
      icon: User,
      label: "Completar o teu perfil",
      desc: "Nome, género e data de nascimento",
      action: () => { navigate("/configuracoes#profile"); setOpen(false); },
    },
    {
      id: "house",
      icon: Heart,
      label: "Configurar a vossa casa",
      desc: "Nome do espaço e datas especiais",
      action: () => { navigate("/configuracoes#house"); setOpen(false); },
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Ativar notificações",
      desc: isPushCapable()
        ? "Lembretes suaves para o vosso espaço"
        : "Disponível ao instalar a app",
      action: () => { navigate("/configuracoes#notifications"); setOpen(false); },
    },
  ];

  return createPortal(
    <>
      {/* Backdrop (only when panel open) */}
      {open && (
        <div
          className="fixed inset-0 z-[9990]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Checklist panel */}
      {open && (
        <div
          className="fixed z-[9995] bottom-[88px] right-4 w-[290px] bg-card rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-border overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-[14px] font-bold text-foreground">Configurar o espaço</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pendingCount === 1 ? "1 passo em falta" : `${pendingCount} passos em falta`}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            </button>
          </div>

          {/* Tasks */}
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              {...task}
              status={getTaskStatus(step, task.id)}
              onClick={task.action}
            />
          ))}

          {/* Footer */}
          <div className="px-5 py-3 bg-muted border-t border-border">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed text-center">
              Completa cada passo pela ordem indicada.
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(o => !o); setPulse(false); }}
        className={cn(
          "fixed z-[9999] bottom-[76px] right-4",
          "w-14 h-14 rounded-full bg-rose-500 text-white",
          "shadow-[0_4px_20px_rgba(244,63,94,0.40)]",
          "flex items-center justify-center",
          "active:scale-95 transition-transform",
          pulse && !open && "animate-ritual-invite"
        )}
        aria-label="Configurar espaço"
      >
        {/* Pending badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-rose-400 flex items-center justify-center shadow-sm">
          <span className="text-[9px] font-black text-rose-500 leading-none">{pendingCount}</span>
        </div>
        <Sparkles className="w-6 h-6" strokeWidth={1.5} />
      </button>
    </>,
    document.body
  );
}
