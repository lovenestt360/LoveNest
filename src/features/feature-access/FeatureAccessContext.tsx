import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

type FeatureScope = "global" | "couple" | "user";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  scope: FeatureScope;
  target_id: string | null;
}

interface FeatureAccessContextType {
  isEnabled: (key: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export const FeatureAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_flags" as any)
        .select("*");

      if (error) {
        console.error("Error fetching feature flags:", error);
      } else if (data) {
        setFlags(data as unknown as FeatureFlag[]);
      }
    } catch (err) {
      console.error("Unexpected error fetching flags:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const isEnabled = (key: string): boolean => {
    // 0. Master Switch Check
    const masterFlag = flags.find(f => f.key === "system_enabled" && f.scope === "global");
    if (masterFlag && masterFlag.enabled === false) {
      return true; // System is disabled, so all features are enabled (Bypass)
    }

    // 1. User scope check
    const userFlag = flags.find(f => f.key === key && f.scope === "user" && f.target_id === user?.id);
    if (userFlag) return userFlag.enabled;

    // 2. Couple scope check
    const coupleFlag = flags.find(f => f.key === key && f.scope === "couple" && f.target_id === spaceId);
    if (coupleFlag) return coupleFlag.enabled;

    // 3. Global scope check
    const globalFlag = flags.find(f => f.key === key && f.scope === "global");
    if (globalFlag) return globalFlag.enabled;

    // Default to enabled if no rule is found
    return true;
  };

  const value = useMemo(() => ({
    isEnabled,
    loading,
    refresh: fetchFlags
  }), [flags, loading, user?.id, spaceId]);

  return (
    <FeatureAccessContext.Provider value={value}>
      {children}
    </FeatureAccessContext.Provider>
  );
};

export const useFeatureAccess = () => {
  const context = useContext(FeatureAccessContext);
  if (context === undefined) {
    throw new Error("useFeatureAccess must be used within a FeatureAccessProvider");
  }
  return context;
};
