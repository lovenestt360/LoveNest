import { useEffect, useState } from "react";
import { CreditCard, UploadCloud, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useReceiptUpload } from "@/hooks/useReceiptUpload";
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
    const receipt = useReceiptUpload();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            const { data } = await supabase.from("payment_settings").select("*").limit(1).maybeSingle();
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

    const handleFileSelected = (file: File) => {
        receipt.select(file, (f) => {
            const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
            return `book-${book.id}-${coupleSpaceId}-${Date.now()}.${ext}`;
        });
    };

    const handleSubmit = async () => {
        if (!selectedMethod) {
            toast({ variant: "destructive", title: "Escolhe um método de pagamento" });
            return;
        }
        if (!receipt.proofRef) {
            toast({ variant: "destructive", title: "Falta comprovativo", description: "Envia o comprovativo de pagamento." });
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                couple_space_id: coupleSpaceId,
                book_id: book.id,
                status: "pending",
                amount: `${Number(book.price).toFixed(2)} ${book.currency}`,
                method: selectedMethod.name,
                proof_url: receipt.proofRef,
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
            <div className="rounded-[18px] border border-[#ECE8E3] bg-[#F7F5F2] p-4 text-center text-[13px] text-muted-foreground dark:border-border dark:bg-muted">
                Métodos de pagamento ainda não configurados.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {adminNotes && (
                <div className="rounded-[18px] border border-destructive/20 bg-destructive/10 p-3 text-[12.5px] text-destructive">
                    <p className="font-bold mb-0.5">Pedido anterior rejeitado</p>
                    <p>{adminNotes}</p>
                </div>
            )}

            <div className="space-y-2">
                <p className="px-1 text-[13px] font-semibold text-foreground">Método de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                    {methods.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethod(m)}
                            className={cn(
                                "h-11 px-2 rounded-[14px] border text-center font-semibold text-[13px] transition-colors",
                                selectedMethod?.id === m.id
                                    ? "bg-[#0B1324] text-white border-[#0B1324] dark:bg-foreground dark:text-background dark:border-foreground"
                                    : "bg-white border-[#ECE8E3] text-foreground dark:bg-card dark:border-border"
                            )}
                        >
                            {m.name}
                        </button>
                    ))}
                </div>
                {selectedMethod && (
                    <div className="flex items-start gap-2 rounded-[16px] border border-[#ECE8E3] bg-[#F7F5F2] p-3 dark:border-border dark:bg-muted">
                        <CreditCard className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" strokeWidth={1.8} />
                        <p className="text-[12.5px] text-[#3A4150] leading-relaxed dark:text-foreground">{selectedMethod.instructions}</p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <p className="px-1 text-[13px] font-semibold text-foreground">Comprovativo</p>
                {receipt.file ? (
                    <div className="overflow-hidden rounded-[18px] border border-[#ECE8E3] bg-white dark:border-border dark:bg-card">
                        {receipt.preview ? (
                            <img src={receipt.preview} alt="Comprovativo" className="w-full max-h-44 object-contain bg-black/5" />
                        ) : (
                            <div className="p-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                <p className="text-[12px] font-bold text-foreground truncate flex-1">{receipt.file.name}</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2 border-t border-[#ECE8E3] p-2 dark:border-border">
                            <span className="text-[11px] font-semibold flex items-center gap-1.5 px-1">
                                {receipt.uploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                        <span className="text-rose-500">A enviar comprovativo...</span>
                                    </>
                                ) : receipt.proofRef ? (
                                    <>
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-emerald-600">Comprovativo enviado</span>
                                    </>
                                ) : (
                                    <span className="text-destructive">Falha ao enviar — tenta de novo</span>
                                )}
                            </span>
                            <button
                                type="button"
                                disabled={receipt.uploading}
                                className="text-[12px] text-rose-500 font-semibold disabled:opacity-40 shrink-0"
                                onClick={receipt.reset}
                            >
                                Alterar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative rounded-[18px] border-2 border-dashed border-[#E2DED8] bg-[#FBFAF8] dark:border-border dark:bg-muted/40">
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
                                handleFileSelected(file);
                            }}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", fontSize: "0" }}
                        />
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || receipt.uploading || !receipt.proofRef}
                className="flex h-[52px] w-full items-center justify-center rounded-[18px] bg-[#0B1324] text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] transition-transform active:scale-[0.99] disabled:opacity-40 disabled:shadow-none dark:bg-foreground dark:text-background"
            >
                {submitting ? "A enviar..." : "Confirmar pedido de compra"}
            </button>
        </div>
    );
}
