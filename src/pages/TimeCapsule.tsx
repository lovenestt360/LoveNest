import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, Lock, Unlock, Plus, Clock, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function TimeCapsule() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [capsules, setCapsules] = useState<any[]>([]);
    const [houseId, setHouseId] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [unlockDate, setUnlockDate] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadCapsules();
    }, [user]);

    const loadCapsules = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data: member } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
            if (!member) return;
            setHouseId(member.couple_space_id);

            const { data: capsData } = await supabase
                .from("time_capsule_messages")
                .select("*")
                .eq("couple_space_id", member.couple_space_id)
                .order("unlock_date", { ascending: true });

            setCapsules(capsData || []);
        } catch (error) {
            console.error("Erro a carregar cápsulas", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !unlockDate || !houseId || !user) return;

        try {
            setUploading(true);
            let publicUrl = null;

            if (selectedImage) {
                const fileExt = selectedImage.name.split('.').pop();
                const fileName = `${houseId}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from("photos")
                    .upload(`capsules/${fileName}`, selectedImage);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from("photos")
                    .getPublicUrl(`capsules/${fileName}`);

                publicUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase.from("time_capsule_messages").insert({
                couple_space_id: houseId,
                creator_id: user.id,
                message: newMessage,
                image_url: publicUrl,
                unlock_date: new Date(unlockDate).toISOString(),
                is_unlocked: false
            });

            if (error) throw error;

            toast({ title: "Cápsula Enterrada! ⏳", description: "O segredo foi guardado até essa data especial." });
            setNewMessage("");
            setUnlockDate("");
            setSelectedImage(null);
            setIsAdding(false);
            loadCapsules();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleUnlock = async (capsule: any) => {
        if (!isPast(new Date(capsule.unlock_date))) {
            toast({ title: "Calma! 🕰️", description: "Ainda não chegou a data certa.", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase.from("time_capsule_messages").update({ is_unlocked: true }).eq("id", capsule.id);
            if (error) throw error;
            loadCapsules();
            toast({ title: "Cápsula Aberta! 🎉", description: "Vê a mensagem que foi guardada para ti!" });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="px-4 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-[#f0f0f0] flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-[#717171]">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                        Cápsula do Tempo <Clock className="w-4 h-4 text-[#717171]" />
                    </h1>
                </div>
            </header>

            <main className="p-4 space-y-4 max-w-md mx-auto">
                <div className="bg-white border border-[#f0f0f0] rounded-2xl p-4 shadow-sm">
                    <p className="text-[13px] text-[#717171]">Guarda mensagens hoje para serem lidas juntos no futuro.</p>
                </div>

                {/* Add Flow */}
                {isAdding ? (
                    <form onSubmit={handleCreate} className="bg-white border border-[#f0f0f0] rounded-2xl shadow-sm animate-in slide-in-from-top-2 overflow-hidden">
                        <div className="p-4 border-b border-[#f0f0f0]">
                            <h3 className="font-semibold text-[15px]">Nova Cápsula</h3>
                        </div>
                        <div className="divide-y divide-[#f0f0f0]">
                            <div className="p-4 space-y-1">
                                <label className="text-[11px] font-semibold text-[#717171]">Para quando?</label>
                                <Input type="date" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} className="bg-transparent border-none p-0 h-auto text-sm focus-visible:ring-0 cursor-pointer" required />
                            </div>
                            <div className="p-4 space-y-1">
                                <label className="text-[11px] font-semibold text-[#717171]">A tua mensagem</label>
                                <Textarea placeholder="Escreve para o vosso eu do futuro..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="bg-transparent border-none p-0 resize-none text-sm focus-visible:ring-0 placeholder:text-[#c0c0c0]" rows={3} required />
                            </div>
                            <div
                                className={`p-4 flex items-center gap-3 cursor-pointer active:bg-[#fafafa] transition-colors ${selectedImage ? 'text-foreground' : 'text-[#717171]'}`}
                                onClick={() => document.getElementById('capsule-img')?.click()}
                            >
                                <ImageIcon className="w-5 h-5 shrink-0" />
                                <span className="text-[13px] font-medium">{selectedImage ? selectedImage.name : "Anexar Foto (Opcional)"}</span>
                                <input id="capsule-img" type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSelectedImage(e.target.files[0]); }} />
                            </div>
                        </div>
                        <div className="p-4 flex gap-2">
                            <button type="button" className="flex-1 h-11 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#717171] active:scale-[0.98] transition-all" onClick={() => setIsAdding(false)}>Cancelar</button>
                            <button type="submit" disabled={uploading || !newMessage.trim() || !unlockDate} className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all">
                                {uploading ? "A guardar..." : "Guardar Cápsula"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full h-12 rounded-2xl gap-2 bg-white border border-[#f0f0f0] shadow-sm text-foreground font-semibold text-sm flex items-center justify-center active:scale-[0.98] transition-all">
                        <Plus className="w-5 h-5 text-[#717171]" /> Criar Nova Cápsula
                    </button>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#c0c0c0]" />
                    </div>
                ) : capsules.length === 0 ? (
                    <div className="text-center p-10 bg-white border border-[#f0f0f0] rounded-2xl shadow-sm space-y-2">
                        <Lock className="w-9 h-9 text-[#c0c0c0] mx-auto" />
                        <p className="font-semibold text-foreground">Nenhuma cápsula ainda</p>
                        <p className="text-[12px] text-[#717171]">O vosso eu do futuro ainda não tem surpresas guardadas.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {capsules.map((c) => {
                            const unlockDateObj = new Date(c.unlock_date);
                            const canUnlock = isPast(unlockDateObj);
                            const daysDiff = Math.abs(differenceInDays(new Date(), unlockDateObj));

                            return (
                                <div key={c.id} className="bg-white border border-[#f0f0f0] rounded-2xl overflow-hidden shadow-sm transition-all">
                                    {c.is_unlocked ? (
                                        <div className="p-5 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                                                <span>Aberto em {format(unlockDateObj, "d MMM yyyy", { locale: pt })}</span>
                                                <Unlock className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            {c.image_url && <img src={c.image_url} alt="Cápsula" className="w-full h-48 object-cover rounded-xl mb-4 shadow-sm" />}
                                            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{c.message}</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center space-y-3">
                                            <div className="w-16 h-16 mx-auto bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-2">
                                                <Lock className="w-8 h-8" />
                                            </div>
                                            <h3 className="font-bold text-lg text-foreground">Cápsula Trancada</h3>

                                            {canUnlock ? (
                                                <div className="space-y-4">
                                                    <p className="text-sm text-green-600 font-bold">A cápsula já pode ser revelada!</p>
                                                    <Button onClick={() => handleUnlock(c)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full">Abrir Cápsula Agora 🗝️</Button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    Disponível em <strong>{format(unlockDateObj, "d 'de' MMMM, yyyy", { locale: pt })}</strong><br />
                                                    <span className="text-xs">Faltam {daysDiff} dia{daysDiff !== 1 ? 's' : ''}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
