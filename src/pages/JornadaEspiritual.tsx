import { useState, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Flame, BookOpen } from "lucide-react";
import { useAppNotifContext } from "@/features/notifications/AppNotifContext";
import { useProfile } from "@/hooks/useProfile";
import Prayer from "./Prayer";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import Fasting from "./Fasting";

type Tab = "oracao" | "jejum";

export default function JornadaEspiritual() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("tab") as Tab) ?? "oracao";
  const [tab, setTab] = useState<Tab>(initial);
  const { resetPrayerUnread } = useAppNotifContext();
  const { profile, loading: profileLoading } = useProfile();

  // Clear prayer badge on mount (user opened the page) and when switching to prayer tab
  useEffect(() => {
    if (tab === "oracao") resetPrayerUnread();
  }, [tab]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  // Quem escolheu "Nenhuma" em espiritualidade não tem forma de aceder a este
  // ecrã — nem pelo URL direto nem pelos atalhos /oracao e /jejum.
  if (!profileLoading && profile?.religion === "none") {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="space-y-4 animate-fade-in">
      <ScreenHeader title="Jornada Espiritual" subtitle="Oração e disciplina, juntos." />

      <SegmentedTabs<"oracao" | "jejum">
        tabs={[
          { id: "oracao", label: "Oração", icon: BookOpen },
          { id: "jejum", label: "Jejum", icon: Flame },
        ]}
        value={tab}
        onChange={switchTab}
      />

      {/* Content */}
      {tab === "oracao" ? <Prayer hideHeader /> : <Fasting hideHeader />}
    </section>
  );
}
