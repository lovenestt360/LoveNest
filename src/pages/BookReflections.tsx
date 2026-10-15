import { useState } from "react";
import { useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { HeartHandshake, Send, Loader2 } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useBookReflections } from "@/hooks/useBookReflections";
import { useAuth } from "@/features/auth/AuthContext";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { GENERAL_CHAPTER_ID } from "@/features/biblioteca/reader/ChapterReflectionPrompt";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SURFACE } from "@/features/home/components/HomeSections";
import { cn } from "@/lib/utils";

export default function BookReflections() {
    const { bookId } = useParams<{ bookId: string }>();
    const { books } = useBiblioteca();
    const { user } = useAuth();
    const { partner } = usePartnerProfile();
    const { reflections, loading, addReflection } = useBookReflections(bookId);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);

    const book = books.find(b => b.id === bookId);

    const handleSend = async () => {
        if (!text.trim()) return;
        setSending(true);
        await addReflection(text, GENERAL_CHAPTER_ID, book?.title);
        setSending(false);
        setText("");
    };

    return (
        <section className="animate-fade-in">
            <ScreenHeader title="Reflexões do Casal" subtitle={book?.title} />

            <div className={cn(SURFACE, "mt-5 rounded-[20px] p-3")}>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Partilha um pensamento sobre este livro com o teu par..."
                    className="min-h-20 w-full resize-none rounded-[14px] bg-[#F7F5F2] p-3 text-[14px] text-foreground placeholder:text-[#9A9DA6] focus:outline-none focus:ring-2 focus:ring-rose-200 dark:bg-muted"
                />
                <button
                    type="button"
                    disabled={!text.trim() || sending}
                    onClick={handleSend}
                    className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0B1324] text-[14px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-40 dark:bg-foreground dark:text-background"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Partilhar reflexão
                </button>
            </div>

            <div className="space-y-2.5 pt-5">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                ) : reflections.length === 0 ? (
                    <div className={cn(SURFACE, "space-y-2 rounded-[20px] p-8 text-center")}>
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-rose-50 text-rose-500 dark:bg-rose-950/30">
                            <HeartHandshake className="h-6 w-6" strokeWidth={1.8} />
                        </span>
                        <p className="text-[15px] font-semibold text-foreground">Ainda sem reflexões</p>
                        <p className="text-[13px] text-muted-foreground">
                            As reflexões surgem também automaticamente quando terminas um capítulo na leitura.
                        </p>
                    </div>
                ) : (
                    reflections.map(r => {
                        const isMine = r.user_id === user?.id;
                        return (
                            <div key={r.id} className={cn(SURFACE, "space-y-1.5 rounded-[18px] p-4")}>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                                        <span className={cn("h-2 w-2 rounded-full", isMine ? "bg-rose-500" : "bg-[#4D7CFE]")} />
                                        {isMine ? "Tu" : (partner?.display_name || "O teu par")}
                                    </span>
                                    <span className="text-[12px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(r.created_at), { locale: pt, addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-[14px] leading-relaxed text-[#3A4150] whitespace-pre-line dark:text-foreground">{r.content}</p>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}
