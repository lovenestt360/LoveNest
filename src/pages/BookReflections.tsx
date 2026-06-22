import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, HeartHandshake, Send, Loader2 } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { useBookReflections } from "@/hooks/useBookReflections";
import { useAuth } from "@/features/auth/AuthContext";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { GENERAL_CHAPTER_ID } from "@/features/biblioteca/reader/ChapterReflectionPrompt";

export default function BookReflections() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
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
        <section className="pb-24 max-w-lg mx-auto animate-fade-in">
            <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-40 border-b border-border flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold tracking-tight">Reflexões do Casal</h1>
                    {book && <p className="text-[12px] text-muted-foreground line-clamp-1">{book.title}</p>}
                </div>
            </header>

            <div className="px-4 pt-5 space-y-3">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Partilha um pensamento sobre este livro com o teu par..."
                    className="w-full min-h-20 rounded-2xl border border-border bg-card p-3 text-[13px] text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <button
                    type="button"
                    disabled={!text.trim() || sending}
                    onClick={handleSend}
                    className="w-full h-11 rounded-2xl font-bold text-[13px] gap-2 flex items-center justify-center text-white bg-rose-500 active:scale-95 transition-all disabled:opacity-50"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Partilhar reflexão
                </button>
            </div>

            <div className="px-4 pt-6 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                ) : reflections.length === 0 ? (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-2">
                        <HeartHandshake className="w-8 h-8 mx-auto text-muted-foreground/40" strokeWidth={1.5} />
                        <p className="text-sm font-semibold text-foreground">Ainda sem reflexões</p>
                        <p className="text-[12px] text-muted-foreground">
                            As reflexões surgem também automaticamente quando terminas um capítulo na leitura.
                        </p>
                    </div>
                ) : (
                    reflections.map(r => {
                        const isMine = r.user_id === user?.id;
                        return (
                            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-rose-500">
                                        {isMine ? "Tu" : (partner?.display_name || "O teu par")}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(r.created_at), { locale: pt, addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-line">{r.content}</p>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}
