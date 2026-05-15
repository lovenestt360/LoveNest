import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEmotionalFeed } from "@/hooks/useEmotionalFeed";
import { EmotionalFeed } from "@/components/EmotionalFeed";

export default function Momentos() {
  const navigate = useNavigate();
  const { items, loading, refresh } = useEmotionalFeed();

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#e5e5e5] px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Os vossos momentos</h1>
            <p className="text-[11px] text-[#aaa]">Últimos 7 dias juntos</p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-md mx-auto px-4 py-5">
        <EmotionalFeed items={items} loading={loading} onRefresh={refresh} />
      </div>
    </div>
  );
}
