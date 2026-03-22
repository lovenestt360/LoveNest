import { useCycleData } from "./useCycleData";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Heart, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type CycleData = ReturnType<typeof useCycleData>;

export function CycleInsights({ data }: { data: CycleData }) {
  const { isMale, cycleInfo } = data;
  const phase = cycleInfo.phase;

  if (phase === "sem dados") return null;

  let message = "";
  let icon = <Info className="h-5 w-5 text-primary" />;
  let bgColor = "bg-primary/5";
  let borderColor = "border-primary/10";

  if (!isMale) {
    // Message for the female user
    message = "O teu corpo está a comunicar contigo — escuta-o 💛";
    icon = <Sparkles className="h-5 w-5 text-amber-500" />;
    bgColor = "bg-amber-500/5";
    borderColor = "border-amber-500/10";
  } else {
    // Messages for the partner
    if (phase === "TPM" || phase === "Menstruação") {
      message = "Hoje ela pode estar mais sensível 💗";
      icon = <Heart className="h-5 w-5 text-pink-500 fill-pink-500/20" />;
      bgColor = "bg-pink-500/5";
      borderColor = "border-pink-500/10";
    } else if (phase === "Lútea") {
      message = "Um pouco mais de carinho pode fazer diferença hoje";
      icon = <Heart className="h-5 w-5 text-rose-400" />;
      bgColor = "bg-rose-400/5";
      borderColor = "border-rose-400/10";
    } else {
      message = "Momento ideal para apoio e compreensão";
      icon = <Info className="h-5 w-5 text-blue-500" />;
      bgColor = "bg-blue-500/5";
      borderColor = "border-blue-500/10";
    }
  }

  return (
    <Card className={cn("border shadow-sm overflow-hidden", bgColor, borderColor)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="shrink-0 animate-pulse">
          {icon}
        </div>
        <p className="text-sm font-medium leading-tight text-foreground/90">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
