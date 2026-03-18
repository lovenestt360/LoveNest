import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useToast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";

export interface RoutineItem {
    id: string;
    couple_space_id: string | null;
    user_id: string;
    title: string;
    emoji: string | null;
    active: boolean;
    position: number;
    created_at: string;
    updated_at: string;
}

export function useRoutineItems(userId?: string) {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const { toast } = useToast();
    const [items, setItems] = useState<RoutineItem[]>([]);
    const [loading, setLoading] = useState(true);

    const targetUserId = userId ?? user?.id;

    const fetch = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("routine_items")
            .select("*")
            .eq("user_id", targetUserId)
            .order("position", { ascending: true });
        if (error) console.error(error);
        setItems((data as RoutineItem[]) ?? []);
        setLoading(false);
    }, [targetUserId]);

    useEffect(() => { fetch(); }, [fetch]);

    const activeItems = items.filter(i => i.active);

    const addItem = useCallback(async (title: string, emoji?: string) => {
        if (!user || !spaceId || typeof spaceId !== 'string') {
            console.warn("AddItem cancelado: user ou spaceId inválido", { user: !!user, spaceId });
            return;
        }

        const maxPos = items.length > 0 
            ? Math.max(...items.map(i => typeof i.position === 'number' ? i.position : 0)) + 1 
            : 0;

        const { error } = await supabase.from("routine_items").insert({
            user_id: user.id,
            couple_space_id: spaceId,
            title,
            emoji: emoji || null,
            position: isNaN(maxPos) ? 0 : maxPos,
        });

        if (error) {
            console.error("Erro ao adicionar hábito no Supabase:", error);
            toast({ 
                title: "Erro ao adicionar hábito", 
                description: error.message,
                variant: "destructive" 
            });
        } else {
            toast({ title: "Hábito adicionado ✓" });
            notifyPartner({
                couple_space_id: spaceId,
                type: "routine",
                title: "Nova tarefa de rotina 📋",
                body: `${user.user_metadata?.display_name || "O seu parceiro"} adicionou "${title}".`,
                url: "/rotina"
            });
            fetch();
        }
    }, [user, spaceId, items, fetch, toast]);

    const updateItem = useCallback(async (id: string, updates: Partial<Pick<RoutineItem, "title" | "emoji" | "active" | "position">>) => {
        const { error } = await supabase.from("routine_items").update(updates).eq("id", id);
        if (error) {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        } else {
            fetch();
        }
    }, [fetch, toast]);

    const deleteItem = useCallback(async (id: string) => {
        const { error } = await supabase.from("routine_items").delete().eq("id", id);
        if (error) {
            toast({ title: "Erro ao apagar", variant: "destructive" });
        } else {
            toast({ title: "Hábito removido" });
            fetch();
        }
    }, [fetch, toast]);

    const swapPositions = useCallback(async (idA: string, idB: string) => {
        const a = items.find(i => i.id === idA);
        const b = items.find(i => i.id === idB);
        if (!a || !b) return;
        await Promise.all([
            supabase.from("routine_items").update({ position: b.position }).eq("id", idA),
            supabase.from("routine_items").update({ position: a.position }).eq("id", idB),
        ]);
        fetch();
    }, [items, fetch]);

    return { items, activeItems, loading, fetch, addItem, updateItem, deleteItem, swapPositions };
}
