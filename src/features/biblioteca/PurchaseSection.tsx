import { useEffect, useState } from "react";
import { CreditCard, UploadCloud, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Book } from "@/hooks/useBiblioteca";

type PaymentMethod = { id: string; name: string; instructions: string };

export function PurchaseSection({ book, coupleSpaceId, existingPurchaseId, adminNotes, onSubmitted }: {
    book: Book;
    coupleSpaceId: string;
    existingPurchaseId?: string;
    adminNotes?: string | null;
    onSubmitted: () => void;
}) {
    const { toast } = useToast();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            const { data } = await supabase.from("payment_settings" as any).select("*").limit(1).maybeSingle();
            if (!active) return;
            if (data) {
                const accountName = data.account_name || "LoveNest";
                const list: PaymentMethod[] = [];
                if (data.mpesa_number) list.push({ id: "M-Pesa", name: "M-Pesa", instructions: `Envia o valor para: ${data.mpesa_number} (Nome: ${accountName})` });
                if (data.emola_number) list.push({ id: "e-Mola", name: "e-Mola", instructions: `Envia o valor para: ${data.emola_number} (Nome: ${accountName})` });
                if (data.mkesh_number) list.push({ id: "mKesh", name: "mKesh", instructions: `Envia o valor para: ${data.mkesh_number} (Nome: ${accountName})` });
                setMethods(list);
                if (list.length > 0) setSelectedMethod(list[0]);
            }
            setLoadingSettings(false);
        })();
        return () => { active = false; };
    }, []);

    const handleSubmit = async () => {
        if (!selectedMethod) {
            toast({ variant: "destructive", title: "Escolhe um método de pagamento" });
            return;
        }
        if (!receiptFile) {
            toast({ variant: "destructive", title: "Falta comprovativo", description: "Envia o comprovativo de pagamento." });
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const ext = (receiptFile.name.split(".").pop() || "jpg").toLowerCase();
            const fileName = `book-${book.id}-${coupleSpaceId}-${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("receipts")
                .upload(fileName, receiptFile, { contentType: receiptFile.type || "image/jpeg", upsert: false });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);

            const payload = {
                couple_space_id: coupleSpaceId,
                book_id: book.id,
                status: "pending",
                amount: `${Number(book.price).toFixed(2)} ${book.currency}`,
                method: selectedMethod.name,
                proof_url: publicUrlData.publicUrl,
                requested_by: user?.id ?? null,
                admin_notes: null,
            };

            const { error } = existingPurchaseId
                ? await supabase.from("book_purchases" as any).update(payload).eq("id", existingPurchaseId)
                : await supabase.from("book_purchases" as any).insert(payload);
            if (error) throw error;

            toast({ title: "Pedido enviado!", description: "Aguarda a aprovação do admin." });
            onSubmitted();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao enviar", description: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingSettings) {
        return (
            <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
            </div>
        );
    }

    if (methods.length === 0) {
        return (
            <div className="bg-muted/60 border border-border rounded-2xl p-4 text-center text-[13px] text-muted-foreground">
                Métodos de pagamento ainda não configurados.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {adminNotes && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3 text-[12px] text-destructive">
                    <p className="font-bold mb-0.5">Pedido anterior rejeitado</p>
                    <p>{adminNotes}</p>
                </div>
            )}

            <div className="space-y-2">
                <p className="text-[13px] font-bold text-foreground">Método de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                    {methods.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethod(m)}
                            className={cn(
                                "py-2.5 px-2 rounded-xl border-2 text-center font-bold text-[13px] transition-colors",
                                selectedMethod?.id === m.id
                                    ? "bg-rose-500 text-white border-rose-500"
                                    : "bg-card border-border text-foreground"
                            )}
                        >
                            {m.name}
                        </button>
                    ))}
                </div>
                {selectedMethod && (
                    <div className="bg-muted/60 border border-border rounded-2xl p-3 flex items-start gap-2">
                        <CreditCard className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                        <p className="text-[12px] text-foreground leading-relaxed">{selectedMethod.instructions}</p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <p className="text-[13px] font-bold text-foreground">Comprovativo</p>
                {receiptFile ? (
                    <div className="border-2 border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 rounded-2xl overflow-hidden">
                        {receiptPreview ? (
                            <img src={receiptPreview} alt="Comprovativo" className="w-full max-h-44 object-contain bg-black/5" />
                        ) : (
                            <div className="p-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                <p className="text-[12px] font-bold text-foreground truncate flex-1">{receiptFile.name}</p>
                            </div>
                        )}
                        <button
                            type="button"
                            className="w-full p-2 border-t border-rose-200 dark:border-rose-900/40 text-[12px] text-rose-500 font-semibold"
                            onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        >
                            Alterar
                        </button>
                    </div>
                ) : (
                    <div className="relative border-2 border-dashed border-border rounded-2xl">
                        <div className="p-6 text-center space-y-2 pointer-events-none select-none">
                            <UploadCloud className="w-7 h-7 mx-auto text-muted-foreground" strokeWidth={1.5} />
                            <p className="text-[12px] font-bold text-foreground">Toca para selecionar</p>
                            <p className="text-[11px] text-muted-foreground">Galeria, câmara ou PDF</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setReceiptFile(file);
                                setReceiptPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
                            }}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", fontSize: "0" }}
                        />
                    </div>
                )}
            </div>

            <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 rounded-2xl font-bold text-[15px] bg-rose-500 hover:bg-rose-600 text-white shadow-lg"
            >
                {submitting ? "A enviar..." : "Confirmar pedido de compra"}
            </Button>
        </div>
    );
}
