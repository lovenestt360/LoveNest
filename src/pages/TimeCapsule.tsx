import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, Lock, Unlock, Plus, Clock, Image as ImageIcon } from "lucide-react";
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
            const { data: member } = await supabase.from("house_members").select("house_id").eq("user_id", user.id).maybeSingle();
            if (!member) return;
            setHouseId(member.house_id);

            const { data: capsData } = await supabase
                .from("time_capsule_messages")
                .select("*")
                .eq("house_id", member.house_id)
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
                house_id: houseId,
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
            <header className="px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Cápsula do Tempo <Clock className="w-5 h-5 text-indigo-500" />
                        </h1>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-md mx-auto">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-5 text-center shadow-sm">
                    <p className="text-sm font-medium text-indigo-700">Guarda mensagens hoje para serem lidas juntos no futuro.</p>
                </div>

                {/* Add Flow */}
                {isAdding ? (
                    <form onSubmit={handleCreate} className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
                        <h3 className="font-bold">Enterrar Nova Cápsula</h3>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground ml-1">Para quando?</label>
                            <Input type="date" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} className="bg-muted border-none" required />
                        </div>

                        <Textarea placeholder="A tua mensagem para o futuro..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="bg-muted border-none resize-none" rows={4} required />

                        <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${selectedImage ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => document.getElementById('capsule-img')?.click()}>
                            <div className="flex flex-col items-center gap-1 justify-center pointer-events-none">
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs font-bold text-muted-foreground">{selectedImage ? selectedImage.name : "Anexar Foto (Opcional)"}</span>
                            </div>
                            <input id="capsule-img" type="file" accept="image/*" className="hidden" onChange={(e) => {
                                if (e.target.files?.[0]) setSelectedImage(e.target.files[0]);
                            }} />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setIsAdding(false)}>Cancelar</Button>
                            <Button type="submit" className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white" disabled={uploading || !newMessage.trim() || !unlockDate}>
                                {uploading ? "A enterrar..." : "Enterrar Cápsula"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button onClick={() => setIsAdding(true)} className="w-full h-12 rounded-2xl gap-2 shadow-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200" variant="secondary">
                        <Plus className="w-5 h-5" /> Criar Nova Cápsula
                    </Button>
                )}

                {/* List */}
                {loading ? (
                    <div className="text-center p-8 animate-pulse font-bold text-muted-foreground tracking-widest text-sm">A PROCURAR NO TEMPO...</div>
                ) : capsules.length === 0 ? (
                    <div className="text-center p-10 bg-card border rounded-3xl shadow-sm space-y-3">
                        <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
                        <h3 className="font-bold">Nenhuma Cápsula Encontrada</h3>
                        <p className="text-sm text-muted-foreground">O vosso eu do futuro ainda não tem nenhuma surpresa vossa.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {capsules.map((c) => {
                            const unlockDateObj = new Date(c.unlock_date);
                            const canUnlock = isPast(unlockDateObj);
                            const daysDiff = Math.abs(differenceInDays(new Date(), unlockDateObj));

                            return (
                                <div key={c.id} className={`bg-card border rounded-2xl overflow-hidden relative shadow-sm transition-all ${c.is_unlocked ? '' : 'bg-muted/30'}`}>
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
