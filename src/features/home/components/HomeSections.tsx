import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Cabeçalho de secção — rótulo mono, como nos cards de dados ──────────────

export function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground active:opacity-60"
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
  badge?: number;
}

export function DailyDock({ items }: { items: DailyShortcut[] }) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "grid gap-1 rounded-[1.75rem] border border-border/70 bg-card px-2 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.10)]",
        items.length >= 5 ? "grid-cols-5" : "grid-cols-4",
      )}
    >
      {items.map(({ to, label, hint, icon: Icon, badge = 0 }) => {
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
                hot ? "bg-foreground text-background" : "bg-muted/80 text-foreground",
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
            <span className="h-3 w-full truncate text-center font-mono text-[8.5px] uppercase leading-3 tracking-[0.06em] text-muted-foreground/80">
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
}

export function AdventuresBento({ featured, tiles }: { featured: AdventureTile; tiles: AdventureTile[] }) {
  const navigate = useNavigate();
  const FeaturedIcon = featured.icon;

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => navigate(featured.to)}
        className="relative row-span-2 flex min-h-[236px] flex-col overflow-hidden rounded-[1.75rem] bg-foreground p-4 text-left text-background active:scale-[0.985] transition-transform"
      >
        {/* Polaroids empilhadas */}
        <div className="relative mx-auto mt-3 h-[108px] w-[112px]" aria-hidden="true">
          <span className="absolute left-1 top-3 h-[86px] w-[72px] -rotate-[10deg] rounded-xl bg-background/15" />
          <span className="absolute right-1 top-1 h-[86px] w-[72px] rotate-[8deg] rounded-xl bg-background/25" />
          <span className="absolute left-1/2 top-2 flex h-[92px] w-[78px] -translate-x-1/2 flex-col rounded-xl bg-background p-1.5 shadow-lg">
            <span className="flex flex-1 items-center justify-center rounded-lg bg-rose-500/90">
              <FeaturedIcon className="h-6 w-6 text-white" strokeWidth={1.6} />
            </span>
            <span className="mt-1.5 h-1 w-8 rounded-full bg-foreground/15" />
          </span>
        </div>

        <div className="mt-auto">
          <p className="text-[17px] font-semibold tracking-[-0.01em]">{featured.title}</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-background/60">{featured.caption}</p>
        </div>
        <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-background/60" strokeWidth={1.8} />
      </button>

      {tiles.map(({ to, title, caption, icon: Icon }) => (
        <button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          className="relative flex min-h-[112px] flex-col justify-between rounded-[1.5rem] border border-border/70 bg-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] active:scale-[0.98] transition-transform"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-foreground">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 truncate font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">{caption}</p>
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
      className="flex w-full items-center gap-3.5 rounded-[1.5rem] border border-border/70 bg-card p-3.5 pr-4 text-left active:scale-[0.99] transition-transform"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-300">
        <Share2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">Partilha o amor</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Convida outro casal e ganhem pontos juntos</p>
      </div>
      <span className="rounded-full bg-foreground px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-background">+50 pts</span>
    </button>
  );
}
