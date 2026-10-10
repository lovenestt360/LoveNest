import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Tons suaves por funcionalidade — dão vida sem perder a base neutra.
export type Tone = "rose" | "blue" | "violet" | "orange" | "green" | "pink";

const TONE: Record<Tone, string> = {
  rose: "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300",
  pink: "bg-pink-50 text-pink-500 dark:bg-pink-950/40 dark:text-pink-300",
  blue: "bg-[#EDF2FF] text-[#3F68E6] dark:bg-blue-950/40 dark:text-blue-300",
  violet: "bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300",
  orange: "bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-300",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
};

// ── Cabeçalho de secção — rótulo mono, como nos cards de dados ──────────────

export function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between px-1">
      <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-0.5 text-[12.5px] font-medium text-muted-foreground active:opacity-60"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

// ── O vosso dia a dia — ícones compactos; com novidade, o ícone fica escuro ─

export interface DailyShortcut {
  to: string;
  label: string;
  hint?: string | null;
  icon: LucideIcon;
  tone: Tone;
  badge?: number;
}

export function DailyDock({ items }: { items: DailyShortcut[] }) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "grid gap-1 rounded-[1.6rem] bg-card px-2 py-3 shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border dark:border-border/60",
        items.length >= 5 ? "grid-cols-5" : "grid-cols-4",
      )}
    >
      {items.map(({ to, label, hint, icon: Icon, tone, badge = 0 }) => {
        const hot = badge > 0;
        return (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="group flex min-w-0 flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-[1.1rem] transition-colors",
                hot ? "bg-foreground text-background shadow-[0_8px_18px_-8px_rgba(11,19,36,0.6)]" : TONE[tone],
              )}
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={1.6} />
              {hot && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[9px] font-medium leading-none text-white ring-2 ring-card">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            <span className="w-full truncate text-center text-[11px] font-semibold leading-none text-foreground">{label}</span>
            <span className="h-3 w-full truncate text-center text-[10px] leading-3 text-muted-foreground">
              {hint ?? ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Memórias & aventuras — bento: Memórias em destaque, resto compacto ─────

export interface AdventureTile {
  to: string;
  title: string;
  caption: string;
  icon: LucideIcon;
  tone?: Tone;
}

export function AdventuresBento({ featured, tiles }: { featured: AdventureTile; tiles: AdventureTile[] }) {
  const navigate = useNavigate();
  const FeaturedIcon = featured.icon;

  return (
    <div className="grid grid-cols-[1.15fr_1fr] gap-2.5">
      <button
        type="button"
        onClick={() => navigate(featured.to)}
        className="relative row-span-2 flex min-h-[208px] flex-col overflow-hidden rounded-[1.6rem] p-4 text-left text-white active:scale-[0.985] transition-transform"
        style={{ background: "linear-gradient(165deg,#F7C9A8 0%,#E99A8E 38%,#A6728F 72%,#4B4766 100%)" }}
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 60% at 70% 22%, rgba(255,240,215,0.55), transparent 60%), linear-gradient(transparent 45%, rgba(11,19,36,0.5))" }}
          aria-hidden="true"
        />

        {/* Polaroids empilhadas */}
        <div className="relative mx-auto mt-1 h-[96px] w-[104px]" aria-hidden="true">
          <span className="absolute left-1 top-3 h-[76px] w-[64px] -rotate-[10deg] rounded-xl bg-white/25" />
          <span className="absolute right-1 top-1 h-[76px] w-[64px] rotate-[8deg] rounded-xl bg-white/35" />
          <span className="absolute left-1/2 top-2 flex h-[82px] w-[70px] -translate-x-1/2 flex-col rounded-xl bg-white p-1.5 shadow-lg">
            <span className="flex flex-1 items-center justify-center rounded-lg bg-gradient-to-br from-[#F7B58F] to-[#D9466B]">
              <FeaturedIcon className="h-5 w-5 text-white" strokeWidth={1.8} />
            </span>
            <span className="mt-1.5 h-1 w-7 rounded-full bg-black/10" />
          </span>
        </div>

        <div className="relative mt-auto">
          <p className="text-[17px] font-semibold tracking-[-0.015em]">{featured.title}</p>
          <p className="mt-0.5 text-[12px] text-white/85">{featured.caption}</p>
        </div>
        <ArrowUpRight className="absolute right-3.5 top-3.5 h-4 w-4 text-white/80" strokeWidth={1.8} />
      </button>

      {tiles.map(({ to, title, caption, icon: Icon, tone = "rose" }) => (
        <button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          className="relative flex min-h-[98px] flex-col justify-between gap-2 rounded-[1.35rem] bg-card p-3.5 text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] active:scale-[0.98] transition-transform dark:border dark:border-border/60"
        >
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-[10px]", TONE[tone])}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{caption}</p>
          </div>
          <ArrowUpRight className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}

// ── Partilha o amor — linha compacta de convite ─────────────────────────────

export function ShareLoveRow({ onShare }: { onShare: () => void }) {
  return (
    <button
      type="button"
      onClick={onShare}
      className="flex w-full items-center gap-3 rounded-[1.35rem] bg-card p-3 pr-3.5 text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] active:scale-[0.99] transition-transform dark:border dark:border-border/60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-300">
        <Share2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">Partilha o amor</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Convida outro casal e ganhem pontos juntos</p>
      </div>
      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-500 dark:bg-rose-950/40">+50 pts</span>
    </button>
  );
}
