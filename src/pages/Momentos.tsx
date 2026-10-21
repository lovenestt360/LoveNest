import { ScreenHeader } from "@/components/ScreenHeader";
import { useEmotionalFeed } from "@/hooks/useEmotionalFeed";
import { EmotionalFeed } from "@/components/EmotionalFeed";

export default function Momentos() {
  const { items, loading, refresh } = useEmotionalFeed();

  return (
    <div className="animate-fade-in">
      <ScreenHeader title="Os vossos momentos" subtitle="Últimos 7 dias juntos" className="mb-5" />
      <EmotionalFeed items={items} loading={loading} onRefresh={refresh} />
    </div>
  );
}
