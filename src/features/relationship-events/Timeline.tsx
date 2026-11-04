import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowRight, Heart, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_CONFIG, type RelationshipEvent } from "./types";
import {
  chapterNumbers,
  isSealedFor,
  isWaitingToBeOpened,
  milestonePhrase,
  nextMilestone,
  onThisDay,
  parseDateOnly,
  pastMilestones,
  sortChapters,
} from "./story";
import { usePhotoUrl } from "./usePhotoUrl";

export const ACCENT = "#FF4F7B";
export const ACCENT_INK = "#E8336A";

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#E8336A] dark:text-[#FF7A9B]", className)}>
      {children}
    </p>
  );
}

export function Author({ name, mine }: { name: string; mine: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
      <span
        className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[8.5px] font-extrabold text-white shrink-0"
        style={{ background: mine ? ACCENT : "#60A5FA" }}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      {name}
    </span>
  );
}

/** "Capítulo 3 · Viagem · 3 nov 2025" (o tipo "Outro" não aparece). */
export function chapterMeta(event: RelationshipEvent, n: number | undefined) {
  const type = event.event_type !== "custom" ? EVENT_TYPE_CONFIG[event.event_type]?.short : null;
  const date = format(parseDateOnly(event.event_date), "d MMM yyyy", { locale: pt });
  return { n, type, date };
}

// ── Toque longo (menu) sem abrir o capítulo ao largar ─────────────────────────
function useLongPress(onTrigger: () => void, ms = 650) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const cb = useRef(onTrigger);
  cb.current = onTrigger;
  const [pressing, setPressing] = useState(false);

  const start = () => {
    fired.current = false;
    setPressing(true);
    timer.current = setTimeout(() => {
      fired.current = true;
      setPressing(false);
      cb.current();
    }, ms);
  };
  const cancel = () => {
    setPressing(false);
    if (timer.current) clearTimeout(timer.current);
  };

  return {
    pressing,
    /** true se o toque acabou de abrir o menu (o clique a seguir é ignorado). */
    consumed: () => { const f = fired.current; fired.current = false; return f; },
    handlers: {
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: cancel,
      onTouchCancel: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

// ── Próximo marco ─────────────────────────────────────────────────────────────
function NextMilestoneCard({ startDate, onPlan }: { startDate: string; onPlan: () => void }) {
  const nm = useMemo(() => nextMilestone(startDate), [startDate]);
  if (!nm) return null;
  const today = nm.daysLeft === 0;

  return (
    <section className="rounded-[22px] border border-border/70 px-[18px] pt-[18px] pb-4">
      <div className="flex justify-between items-baseline gap-3">
        <Kicker>{today ? "Hoje é dia de festa" : "Próximo marco"}</Kicker>
        <span className="text-[12px] text-muted-foreground first-letter:uppercase">
          {format(nm.next.date, "EEE, d MMM", { locale: pt })}
        </span>
      </div>

      {today ? (
        <p className="font-serif text-[22px] font-bold leading-snug mt-3">
          Hoje fazem <span className="text-[#FF4F7B]">{nm.next.label}</span>
        </p>
      ) : (
        <div className="flex items-baseline gap-2.5 mt-2.5">
          <b className="font-serif text-[40px] font-bold leading-none text-[#FF4F7B] tabular-nums">{nm.daysLeft}</b>
          <span className="text-[13.5px] text-muted-foreground leading-snug">
            {nm.daysLeft === 1 ? "dia até" : "dias até"}
            <em className="block not-italic font-serif font-bold text-[15px] text-foreground">{nm.next.label}</em>
          </span>
        </div>
      )}

      {!today && (
        <>
          <div
            className="relative h-1 rounded-full bg-muted mt-4"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(nm.progress * 100)}
            aria-label={`Faltam ${nm.daysLeft} dias para ${nm.next.label}`}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-[#FF4F7B]" style={{ width: `${nm.progress * 100}%` }}>
              <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-[3px] border-[#FF4F7B]" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
            <span>{nm.prev?.short ?? "O início"}</span>
            <span>{nm.next.short}</span>
          </div>
        </>
      )}

      <div className="flex justify-between items-center mt-3.5 pt-3 border-t border-border/70">
        <p className="text-[12px] text-muted-foreground">Como vão celebrar?</p>
        <button type="button" onClick={onPlan} className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#E8336A] dark:text-[#FF7A9B] active:opacity-70">
          Planear juntos <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </section>
  );
}

// ── Neste dia ─────────────────────────────────────────────────────────────────
function OnThisDayRow({ event, years, onOpen }: { event: RelationshipEvent; years: number; onOpen: () => void }) {
  const url = usePhotoUrl(event.image_path);
  return (
    <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 mt-5 text-left active:opacity-70">
      <span className="w-12 h-12 rounded-[14px] overflow-hidden shrink-0 bg-[#FFF0F4] dark:bg-rose-500/15 flex items-center justify-center">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" />
             : <Heart className="w-4 h-4 text-[#FF4F7B]" fill="currentColor" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] text-muted-foreground">
          Há {years} {years === 1 ? "ano" : "anos"}, neste dia
        </span>
        <span className="block font-serif text-[14px] font-bold truncate">{event.title}</span>
      </span>
    </button>
  );
}

// ── Capítulo selado (surpresa por abrir) ──────────────────────────────────────
function SealedCard({ event, authorName, onOpen }: { event: RelationshipEvent; authorName: string; onOpen: () => void }) {
  const url = usePhotoUrl(event.image_path);
  const [breaking, setBreaking] = useState(false);
  return (
    <div className={cn("mt-5", breaking && "ns-breaking")}>
      <button
        type="button"
        aria-label="Abrir o capítulo surpresa"
        onClick={() => {
          if (breaking) return;
          setBreaking(true);
          setTimeout(onOpen, 850);
        }}
        className="relative block w-full h-[210px] rounded-[18px] overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFE3EA, #FFF6F8)" }}
      >
        {url && <img src={url} alt="" className="ns-sealed-photo absolute inset-0 w-full h-full object-cover" />}
        <span className="ns-veil absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center bg-white/40 transition-opacity duration-700">
          <span className="w-[52px] h-[52px] rounded-full bg-[#FF4F7B] text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(255,79,123,0.8)]">
            <Heart className="w-5 h-5" fill="currentColor" strokeWidth={0} />
          </span>
          <b className="font-serif text-[15px] font-bold mt-1 text-[#1C1A1D]">{authorName} escreveu-te um capítulo</b>
          <small className="text-[11.5px] text-[#55525A]">Toca para abrir</small>
        </span>
      </button>
    </div>
  );
}

// ── Um capítulo na lista ──────────────────────────────────────────────────────
function ChapterItem({
  event, number, author, mine, waiting, onOpen, onLongPress,
}: {
  event: RelationshipEvent;
  number: number | undefined;
  author: string;
  mine: boolean;
  waiting: boolean;
  onOpen: (e: RelationshipEvent) => void;
  onLongPress: (e: RelationshipEvent) => void;
}) {
  const url = usePhotoUrl(event.image_path);
  const { pressing, handlers, consumed } = useLongPress(() => onLongPress(event));
  const meta = chapterMeta(event, number);

  return (
    <article
      {...handlers}
      role="button"
      tabIndex={0}
      onClick={() => { if (!consumed()) onOpen(event); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(event); } }}
      className={cn(
        "py-[22px] border-b border-border/70 select-none cursor-pointer transition-[opacity,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:bg-muted/40",
        pressing && "opacity-70 scale-[0.985]",
      )}
    >
      {event.image_path && (
        <div className="h-[210px] rounded-[18px] overflow-hidden bg-muted mb-3.5">
          {url && <img src={url} alt="" className="w-full h-full object-cover animate-in fade-in duration-500" />}
        </div>
      )}
      <p className="text-[11.5px] text-muted-foreground">
        {meta.n && <span className="font-extrabold text-[#E8336A] dark:text-[#FF7A9B]">Capítulo {meta.n}</span>}
        {meta.type && <> · {meta.type}</>} · {meta.date}
      </p>
      <h3 className="font-serif text-[19px] font-bold leading-snug mt-1.5 text-foreground">{event.title}</h3>
      {event.description && (
        <p className="font-serif italic text-[13px] text-muted-foreground leading-relaxed mt-2 line-clamp-2">
          {event.description}
        </p>
      )}
      <div className="flex justify-between items-center mt-3">
        <Author name={author} mine={mine} />
        {waiting ? (
          <span className="text-[11.5px] font-bold text-muted-foreground">Surpresa · ainda por abrir</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#E8336A] dark:text-[#FF7A9B]">
            Abrir <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
          </span>
        )}
      </div>
    </article>
  );
}

/** Um marco de tempo juntos: centrado e em destaque, como uma página do livro. */
function MilestoneMark({ label, date, weight, kicker, phrase }: {
  label: string;
  date: Date;
  weight: "sm" | "md" | "xl";
  kicker?: string;
  phrase: string;
}) {
  const big = weight === "xl";
  return (
    <div className={cn("text-center px-4 border-b border-border/70", big ? "py-11" : weight === "md" ? "py-9" : "py-7")}>
      {kicker && <Kicker className="mb-3">{kicker}</Kicker>}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("h-px bg-[#FF4F7B]/25", big ? "w-14" : "w-10")} />
        <Heart className={cn("text-[#FF4F7B] shrink-0", big ? "w-4 h-4" : "w-3 h-3")} fill="currentColor" strokeWidth={0} />
        <span className={cn("h-px bg-[#FF4F7B]/25", big ? "w-14" : "w-10")} />
      </div>
      <p className={cn(
        "font-serif font-bold leading-tight mt-3.5 text-foreground",
        big ? "text-[28px]" : weight === "md" ? "text-[23px]" : "text-[19px]",
      )}>
        {label}
      </p>
      <p className="text-[11.5px] text-muted-foreground mt-2">{format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
      <p className={cn("font-serif italic text-muted-foreground leading-relaxed mt-3 mx-auto max-w-[280px]", big ? "text-[13.5px]" : "text-[12.5px]")}>
        "{phrase}"
      </p>
    </div>
  );
}

// ── A lista inteira ───────────────────────────────────────────────────────────
type Row =
  | { kind: "event"; event: RelationshipEvent; date: Date }
  | { kind: "mark"; label: string; date: Date; weight: "sm" | "md" | "xl"; kicker?: string; phrase: string };

export function BookChapters({
  events,
  startDate,
  userId,
  nameOf,
  onOpen,
  onOpenSurprise,
  onLongPress,
  onPlan,
}: {
  events: RelationshipEvent[];
  startDate: string | null;
  userId: string | undefined;
  nameOf: (userId: string) => string;
  onOpen: (event: RelationshipEvent) => void;
  onOpenSurprise: (event: RelationshipEvent) => void;
  onLongPress: (event: RelationshipEvent) => void;
  onPlan: () => void;
}) {
  const numbers = useMemo(() => chapterNumbers(events), [events]);
  const sealed = useMemo(() => sortChapters(events.filter((e) => isSealedFor(e, userId))), [events, userId]);
  const visible = useMemo(() => events.filter((e) => !isSealedFor(e, userId)), [events, userId]);
  const memory = useMemo(() => onThisDay(visible), [visible]);

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = visible.map((event) => ({ kind: "event", event, date: parseDateOnly(event.event_date) }));
    if (startDate) {
      list.push({
        kind: "mark", label: "O primeiro dia", date: parseDateOnly(startDate), weight: "xl",
        kicker: "Onde tudo começou", phrase: "O dia em que a vossa história começou.",
      });
      for (const m of pastMilestones(startDate)) {
        list.push({ kind: "mark", label: m.label, date: m.date, weight: m.weight, phrase: milestonePhrase(m.label) });
      }
    }
    // No mesmo dia, o marco vem antes do capítulo.
    return list.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.kind === "mark" ? -1 : 1) - (b.kind === "mark" ? -1 : 1));
  }, [visible, startDate]);

  return (
    <div>
      {startDate && <NextMilestoneCard startDate={startDate} onPlan={onPlan} />}

      {sealed.map((e) => (
        <SealedCard key={e.id} event={e} authorName={nameOf(e.created_by)} onOpen={() => onOpenSurprise(e)} />
      ))}

      {memory && <OnThisDayRow event={memory.event} years={memory.years} onOpen={() => onOpen(memory.event)} />}

      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground mt-9 mb-1.5">Capítulos</p>

      {visible.length === 0 && (
        <div className="py-8 border-b border-border/70">
          <p className="font-serif text-[17px] font-bold">O primeiro capítulo ainda não foi escrito</p>
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">Toquem no + para começar a contar a vossa história.</p>
        </div>
      )}

      {rows.map((row, i) =>
        row.kind === "mark" ? (
          <MilestoneMark key={`m-${i}`} label={row.label} date={row.date} weight={row.weight} kicker={row.kicker} phrase={row.phrase} />
        ) : (
          <ChapterItem
            key={row.event.id}
            event={row.event}
            number={numbers.get(row.event.id)}
            author={nameOf(row.event.created_by)}
            mine={row.event.created_by === userId}
            waiting={isWaitingToBeOpened(row.event, userId)}
            onOpen={onOpen}
            onLongPress={onLongPress}
          />
        ),
      )}
    </div>
  );
}

// ── Menu do capítulo (toque longo ou "…") ─────────────────────────────────────
export function ChapterMenu({
  event, onEdit, onDelete, onClose,
}: {
  event: RelationshipEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end">
      <div className="absolute inset-0 bg-black/30 animate-in fade-in duration-150" onClick={onClose} />
      <div className="relative w-full bg-background rounded-t-[30px] animate-in slide-in-from-bottom duration-200 px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="w-[38px] h-1 rounded-full bg-border mx-auto mb-4" />
        <p className="font-serif text-[15px] font-bold text-center px-6 mb-4 leading-snug">{event.title}</p>
        <div className="space-y-2">
          <button onClick={onEdit} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted/60 active:bg-muted text-[14px] font-semibold">
            <Pencil className="w-4 h-4 text-foreground/60" strokeWidth={1.8} /> Editar capítulo
          </button>
          <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/25 active:bg-red-100 text-[14px] font-semibold text-red-500">
            <Trash2 className="w-4 h-4" strokeWidth={1.8} /> Remover capítulo
          </button>
          <button onClick={onClose} className="w-full py-3 text-[13px] text-muted-foreground">Cancelar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
