import { Clock, Loader2 } from "lucide-react";
import guardiaoTriste from "@/assets/flame/guardiao_triste.webp";
import guardiaoFeliz from "@/features/landing/stages/guardiao.webp";
import "./flameRecovery.css";

const CTA = "flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#0B1324] text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:bg-[#F7F5F2] disabled:text-muted-foreground dark:bg-foreground dark:text-background dark:disabled:bg-muted dark:disabled:text-muted-foreground";

function Frame({ image, alt, className, title, text, children }: {
  image: string;
  alt: string;
  className: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center px-1 pt-1 text-center">
      <img src={image} alt={alt} className={`h-[210px] w-[210px] ${className}`} />
      <h2 className="mt-1 text-[24px] font-extrabold leading-[1.12] tracking-[-0.035em] text-foreground">{title}</h2>
      <p className="mt-2.5 max-w-[30ch] text-[14.5px] leading-[1.45] text-muted-foreground">{text}</p>
      {children}
    </section>
  );
}

export function FlameLost({ days, deadline, cost, points, pointsLoading, isSolo, busy, onRecover }: {
  days: number;
  deadline: string;
  cost: number;
  points: number;
  pointsLoading: boolean;
  isSolo: boolean;
  busy: boolean;
  onRecover: () => void;
}) {
  const hours = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 3600000));
  const missing = Math.max(0, cost - points);
  const streak = isSolo
    ? (days === 1 ? "o teu primeiro dia" : `os teus ${days} dias`)
    : (days === 1 ? "o vosso primeiro dia" : `os vossos ${days} dias`);
  const text = missing > 0 && !pointsLoading
    ? `Faltam ${missing} pontos para ${isSolo ? "recuperares" : "recuperarem"} ${streak}.`
    : `A chama apagou-se, mas ainda ${isSolo ? "podes" : "podem"} recuperar ${streak}.`;
  const foot = missing > 0
    ? "Os gestos de hoje também dão pontos."
    : isSolo
    ? `Tens ${points} pts.`
    : `Têm ${points} pts. Qualquer um dos dois pode recuperar.`;

  return (
    <Frame
      image={guardiaoTriste}
      alt="Guardião triste"
      className="flame-droop"
      title={isSolo ? "Sinto a tua falta" : "Sinto a vossa falta"}
      text={text}
    >
      <span className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-foreground">
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        {hours === 1 ? "Resta 1 hora" : `Restam ${hours} horas`}
      </span>
      <div className="mt-5 w-full">
        <button type="button" onClick={onRecover} disabled={busy || pointsLoading || missing > 0} className={CTA}>
          {busy || pointsLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : missing > 0 ? `Faltam ${missing} pts` : `Recuperar a chama · ${cost} pts`}
        </button>
        {!pointsLoading && <p className="mt-2.5 text-[12.5px] leading-[1.4] text-muted-foreground">{foot}</p>}
      </div>
    </Frame>
  );
}

export function FlameRecovered({ days, cost, pointsLeft, isSolo, checkedIn, checkingIn, onCheckIn, onDone }: {
  days: number;
  cost: number;
  pointsLeft: number;
  isSolo: boolean;
  checkedIn: boolean;
  checkingIn: boolean;
  onCheckIn: () => void;
  onDone: () => void;
}) {
  const streak = isSolo ? `Os teus ${days} dias` : `Os vossos ${days} dias`;
  const next = isSolo ? "Hoje, aparece para a chama continuar." : "Hoje, apareçam os dois para a chama continuar.";

  return (
    <Frame
      image={guardiaoFeliz}
      alt="Guardião feliz"
      className="flame-glad"
      title={isSolo ? "Voltaste!" : "Voltaram!"}
      text={`${streak} ${days === 1 ? "está" : "estão"} de volta. ${next}`}
    >
      <div className="mt-5 w-full">
        <button type="button" onClick={checkedIn ? onDone : onCheckIn} disabled={checkingIn} className={CTA}>
          {checkingIn
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : checkedIn ? "Continuar" : "Estou presente hoje"}
        </button>
        <p className="mt-2.5 text-[12.5px] leading-[1.4] text-muted-foreground">Foram usados {cost} pts. Restam {pointsLeft}.</p>
      </div>
    </Frame>
  );
}
