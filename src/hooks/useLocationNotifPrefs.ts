import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export interface LocationNotifPrefs {
  notify_arrives: boolean;
  notify_leaves: boolean;
  notify_proximity: boolean;
}

const DEFAULTS: LocationNotifPrefs = {
  notify_arrives: true,
  notify_leaves: false,
  notify_proximity: true,
};

export function useLocationNotifPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<LocationNotifPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("location_notification_prefs")
      .select("notify_arrives,notify_leaves,notify_proximity")
      .eq("user_id", user.id)
      .single()
      .then(({ data }: { data: LocationNotifPrefs | null }) => {
        if (data) setPrefs(data);
        setLoading(false);
      });
  }, [user?.id]);

  const updatePref = async (key: keyof LocationNotifPrefs, value: boolean) => {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await (supabase as any)
      .from("location_notification_prefs")
      .upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  };

  return { prefs, loading, updatePref };
}
