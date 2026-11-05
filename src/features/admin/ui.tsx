import { ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Peças partilhadas do painel admin, na linguagem branca da app. */

export const CARD = "rounded-[20px] border border-[#ECE8E3] bg-white dark:border-border dark:bg-card";
export const ROW = "flex flex-wrap items-center gap-3 border-t border-[#F0EDE9] px-4 py-3 first:border-t-0 dark:border-border/60";
export const BTN = "h-[34px] shrink-0 whitespace-nowrap rounded-full bg-[#0B1324] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60 dark:bg-foreground dark:text-background";
export const GHOST = "h-[34px] shrink-0 whitespace-nowrap rounded-full bg-[#F7F5F2] px-3.5 text-[13px] font-semibold text-[#0B1324] disabled:opacity-60 dark:bg-muted dark:text-foreground";
export const INPUT = "h-11 w-full rounded-xl border border-[#ECE8E3] bg-white px-3 text-[14px] outline-none focus:border-[#0B1324] disabled:opacity-50 dark:border-border dark:bg-card";
export const TEXTAREA = "w-full rounded-xl border border-[#ECE8E3] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#0B1324] dark:border-border dark:bg-card";
export const LABEL = "mb-1.5 block text-[12.5px] font-semibold text-[#7A7F8C]";
export const MUTED = "text-[#7A7F8C]";
export const RED = "bg-[#B91C1C] text-white dark:bg-[#B91C1C] dark:text-white";

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap rounded-xl bg-[#F2F0ED] p-[3px] dark:bg-muted">
      {options.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={cn("h-8 rounded-[9px] px-3 text-[13px] font-semibold", value === k ? "bg-white text-[#0B1324] shadow-sm dark:bg-card dark:text-foreground" : "text-[#7A7F8C]")}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={cn("h-[34px] rounded-full border px-3 text-[13px] font-semibold",
            value === k ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border")}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-[#0B1324] dark:bg-foreground" : "bg-[#D9D5CF] dark:bg-muted")}>
      <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left]", on ? "left-[19px]" : "left-[3px]")} />
    </button>
  );
}

export function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1324]/35 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={cn("max-h-[90vh] w-full overflow-y-auto rounded-[22px] bg-white p-[18px] dark:bg-card", wide ? "max-w-2xl" : "max-w-md")} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[18px] font-bold tracking-[-0.02em]">{title}</p>
            {subtitle && <p className={cn("mt-0.5 text-[12.5px]", MUTED)}>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#7A7F8C] dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Confirmação para ações sem volta (apagar). `danger=false` para confirmações neutras (ex.: enviar notificação). */
export function Confirm({ title, children, action, busy, onCancel, onConfirm, danger = true }: {
  title: string; children: ReactNode; action: string; busy: boolean; onCancel: () => void; onConfirm: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1324]/35 p-4" onClick={() => !busy && onCancel()}>
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-[22px] bg-white p-[18px] dark:bg-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[18px] font-bold tracking-[-0.02em]">{title}</p>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#7A7F8C] dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className={cn("mt-3 rounded-[14px] px-3.5 py-3 text-[13px] leading-relaxed", danger ? "bg-[#FDF3F2] text-[#8A1C1C]" : "bg-[#F7F5F2] text-[#4A5060] dark:bg-muted dark:text-muted-foreground")}>{children}</div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={cn(BTN, danger && RED, "h-11 flex-1 rounded-[14px]")}>
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : action}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#7A7F8C]" /></div>;
}
