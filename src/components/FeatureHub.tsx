import type { ComponentType, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export type HubItem = {
  to: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: "rose" | "indigo" | "orange" | "emerald" | "slate";
  meta?: string;
};

export type HubSection = {
  title: string;
  description?: string;
  items: HubItem[];
};

const toneClass: Record<NonNullable<HubItem["tone"]>, string> = {
  rose: "bg-rose-50 text-rose-500 dark:bg-rose-950/25 dark:text-rose-300",
  indigo: "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/25 dark:text-indigo-300",
  orange: "bg-orange-50 text-orange-500 dark:bg-orange-950/25 dark:text-orange-300",
  emerald: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/25 dark:text-emerald-300",
  slate: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300",
};

export function FeatureHub({
  eyebrow,
  title,
  subtitle,
  sections,
  headerAction,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: HubSection[];
  headerAction?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="pb-24 animate-in fade-in duration-300">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500/70">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.04em] text-foreground">
              {title}
            </h1>
            <p className="mt-2 max-w-sm text-[13px] leading-5 text-muted-foreground">
              {subtitle}
            </p>
          </div>
          {headerAction}
        </div>
      </header>

      <div className="space-y-8">
        {sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <section key={section.title}>
              <div className="mb-3 px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground/70">
                    {section.description}
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-[0_10px_35px_rgba(15,23,42,0.035)]">
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  const tone = item.tone ?? "slate";

                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => navigate(item.to)}
                      className={cn(
                        "flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors active:bg-muted/70",
                        index > 0 && "border-t border-border/60",
                      )}
                    >
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", toneClass[tone])}>
                        <Icon className="h-5 w-5" strokeWidth={1.6} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] font-bold text-foreground">
                            {item.title}
                          </p>
                          {item.meta && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                              {item.meta}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>

                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/45" strokeWidth={1.6} />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
