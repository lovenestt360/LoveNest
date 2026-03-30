import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { toast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";
import { useLoveStreak } from "@/hooks/useLoveStreak";

export interface PlanoItem {
  id: string;
  couple_space_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  is_important: boolean;
  for_whom: "ambos" | "me" | "partner";
  plan_at: string | null;
  completed: boolean;
  created_at: string;
}

export function usePlano() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { recordInteraction } = useLoveStreak();
  const [items, setItems] = useState<PlanoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("plano_items")
      .select("*")
      .eq("couple_space_id", spaceId)
      .order("is_important", { ascending: false })
      .order("plan_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching plano items:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("plano-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plano_items", filter: `couple_space_id=eq.${spaceId}` },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, fetchItems]);

  const addPlan = async ({
    title, 
    date,
    time = "", 
    description = "", 
    category = "geral",
    isImportant = false,
    forWhom = "ambos"
  }: {
    title: string;
    date?: string;
    time?: string;
    description?: string;
    category?: string;
    isImportant?: boolean;
    forWhom?: "ambos" | "me" | "partner";
  }) => {
    if (!spaceId || !user) return null;
    
    let planAt = null;
    if (date) {
      planAt = time ? `${date}T${time}:00` : `${date}T00:00:00`;
    } else {
      const today = new Date().toISOString().split('T')[0];
      planAt = time ? `${today}T${time}:00` : `${today}T00:00:00`;
    }

    const { data, error } = await supabase
      .from("plano_items")
      .insert({
        couple_space_id: spaceId,
        user_id: user.id,
        title,
        description,
        category,
        is_important: isImportant,
        for_whom: forWhom,
        plan_at: planAt,
        completed: false
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
      return null;
    }

    // Notificar parceiro
    await notifyPartner({
      couple_space_id: spaceId,
      title: "Novo Plano! 📅",
      body: `O teu amor adicionou: ${title}`,
      url: "/plano?tab=agenda",
      type: "plano"
    });

    return data;
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Optimistic UI update
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed } : i));

    const { error } = await supabase
      .from("plano_items")
      .update({ completed })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      fetchItems(); // Rollback
    } else if (completed) {
      // Record interaction for LoveStreak
      recordInteraction("plan_completed");
      
      // Notificar conclusão
      await notifyPartner({
        couple_space_id: spaceId!,
        title: "Plano Concluído! ✅",
        body: `O teu amor concluiu: ${item.title}`,
        url: "/plano?tab=agenda",
        type: "plano"
      });
    }
  };

  const updatePlan = async (id: string, updates: Partial<PlanoItem>) => {
    // Optimistic UI update
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));

    const { error } = await supabase
      .from("plano_items")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      fetchItems(); // Rollback
    }
  };

  const deletePlan = async (id: string) => {
    // Optimistic UI update
    setItems(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase
      .from("plano_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao eliminar", description: error.message, variant: "destructive" });
      fetchItems(); // Rollback
    }
  };

  return {
    items,
    loading,
    addPlan,
    toggleComplete,
    updatePlan,
    deletePlan,
    refresh: fetchItems
  };
}
