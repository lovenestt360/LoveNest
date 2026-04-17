import { RankingCard } from "@/components/RankingCard";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Ranking() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 animate-in fade-in duration-300">

      {/* Header */}
      <div className="sticky top-0 z-10 frosted-glass shadow-sm px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-2xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-black tracking-tight text-foreground">Ranking Global 🏆</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <RankingCard compact={false} />
      </div>
    </div>
  );
}
