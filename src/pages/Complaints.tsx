import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ArrowLeft, Send, CheckCircle2, Archive, MessageCircle, Loader2, Heart } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const FEELINGS = ["magoado", "frustrado", "triste", "ansioso", "zangado", "confuso", "ignorado", "sozinho", "outro"];

const STATUS_MAP: Record<string, { label: string; dot: string; text: string }> = {
  open:     { label: "Aberta",      dot: "bg-rose-500",   text: "text-rose-500" },
  talking:  { label: "Em conversa", dot: "bg-amber-400",  text: "text-amber-500" },
  resolved: { label: "Resolvida",   dot: "bg-green-500",  text: "text-green-600" },
  archived: { label: "Arquivada",   dot: "bg-[#c4c4c4]",  text: "text-[#717171]" },
};

const SEVERITY_LABELS = ["", "Leve", "Baixa", "Média", "Alta", "Crítica"];
const PAGE_SIZE = 20;

interface Complaint {
  id: string;
  couple_space_id: string;
  created_by: string;
  title: string;
  description: string;
  feeling: string | null;
  clear_request: string | null;
  solution_note: string | null;
  severity: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface ComplaintMessage {
  id: string;
  complaint_id: string;
  couple_space_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function Complaints() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResolvedOverlay, setShowResolvedOverlay] = useState(false);

  const fetchComplaints = useCallback(async () => {
    if (!spaceId) return;
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .eq("couple_space_id", spaceId)
      .order("created_at", { ascending: false });
    if (data) setComplaints(data as Complaint[]);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase
      .channel("complaints-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints", filter: `couple_space_id=eq.${spaceId}` }, () => fetchComplaints())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, fetchComplaints]);

  if (selected) {
    return (
      <ComplaintDetail
        complaint={selected}
        onBack={() => { setSelected(null); fetchComplaints(); }}
        onResolve={() => { setShowResolvedOverlay(true); setTimeout(() => setShowResolvedOverlay(false), 3000); }}
      />
    );
  }

  const filtered = complaints.filter(c => c.status === filter).slice(0, PAGE_SIZE);

  return (
    <section className="space-y-5 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Conflitos</h1>
          <p className="text-sm text-[#717171]">Resolve com calma e amor</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nova
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {Object.entries(STATUS_MAP).map(([key, { label, dot }]) => {
          const count = complaints.filter(c => c.status === key).length;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all border",
                active
                  ? "bg-foreground text-white border-foreground"
                  : "bg-white text-[#717171] border-[#e5e5e5] hover:bg-[#f5f5f5]"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white" : dot)} />
              {label}
              {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-12 text-center space-y-2">
          <Heart className="mx-auto h-7 w-7 text-[#c4c4c4]" strokeWidth={1.5} />
          <p className="text-sm text-[#717171]">Nenhum conflito {STATUS_MAP[filter]?.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-[#f0f0f0]">
          {filtered.map((c) => {
            const s = STATUS_MAP[c.status];
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-[#fafafa] transition-colors first:rounded-t-[1.25rem] last:rounded-b-[1.25rem]"
              >
                <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", s?.dot)} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-[#717171]">
                    {s?.label} · Sev. {c.severity} {SEVERITY_LABELS[c.severity] && `— ${SEVERITY_LABELS[c.severity]}`}
                    {c.feeling && ` · ${c.feeling}`}
                  </p>
                  <p className="text-[11px] text-[#c4c4c4]">{format(new Date(c.created_at), "d MMM, HH:mm", { locale: pt })}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0 shadow-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-lg font-bold text-foreground">Nova Reclamação</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] px-6 pb-6">
          <CreateComplaintForm
            spaceId={spaceId}
            userId={user?.id}
            onCreated={() => { setCreateOpen(false); fetchComplaints(); }}
            onCancel={() => setCreateOpen(false)}
          />
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Overlay */}
      {showResolvedOverlay && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-5">
            <div className="bg-rose-50 p-8 rounded-full mx-auto w-fit">
              <Heart className="w-20 h-20 text-rose-400 fill-rose-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Mais fortes juntos</h2>
              <p className="text-sm text-[#717171] max-w-[260px] mx-auto">O diálogo cura e o compromisso fortalece a vossa história.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Create Form ── */
function CreateComplaintForm({
  spaceId, userId, onCreated, onCancel
}: {
  spaceId: string | null;
  userId?: string;
  onCreated: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feeling, setFeeling] = useState("");
  const [severity, setSeverity] = useState(3);
  const [clearRequest, setClearRequest] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!spaceId || !userId || !title.trim() || !description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("complaints").insert({
      couple_space_id: spaceId,
      created_by: userId,
      title: title.trim(),
      description: description.trim(),
      feeling: feeling || null,
      clear_request: clearRequest.trim() || null,
      severity,
    });
    if (error) {
      console.error("Complaint insert error:", error);
      toast({ title: "Erro ao criar conflito", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Criado com calma", description: "O amor também se constrói nos momentos difíceis." });
      if (spaceId) {
        notifyPartner({
          couple_space_id: spaceId,
          title: "Nova reclamação",
          body: title.trim().slice(0, 80),
          url: "/conflitos",
          type: "conflitos",
        });
      }
      onCreated();
    }
    setSaving(false);
  };

  const inputClass = "h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400";

  return (
    <div className="space-y-4">

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Título</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resumo breve" className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Descrição</label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="O que aconteceu…"
          className="rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400 resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Sentimento</label>
        <Select value={feeling} onValueChange={setFeeling}>
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Como me sinto" />
          </SelectTrigger>
          <SelectContent>
            {FEELINGS.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Severidade (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                "h-10 w-10 rounded-full text-sm font-semibold border transition-all",
                severity === s
                  ? "bg-rose-500 text-white border-rose-500"
                  : "bg-white text-foreground border-[#e5e5e5] hover:border-rose-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#717171]">{SEVERITY_LABELS[severity]}</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          O que eu preciso é… <span className="text-[#717171] font-normal">(opcional)</span>
        </label>
        <Textarea
          value={clearRequest}
          onChange={e => setClearRequest(e.target.value)}
          rows={2}
          placeholder="Pedido claro"
          className="rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 h-12 rounded-2xl border border-[#e5e5e5] text-sm font-semibold text-[#717171] hover:bg-[#f5f5f5] transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={saving || !title.trim() || !description.trim()}
          className="flex-1 h-12 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
        </button>
      </div>
    </div>
  );
}

/* ── Detail View ── */
function ComplaintDetail({
  complaint: initial, onBack, onResolve
}: {
  complaint: Complaint;
  onBack: () => void;
  onResolve: () => void;
}) {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [complaint, setComplaint] = useState(initial);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [solutionNote, setSolutionNote] = useState(initial.solution_note ?? "");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("complaint_messages")
      .select("*")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ComplaintMessage[]);
  }, [complaint.id]);

  const fetchComplaint = useCallback(async () => {
    const { data } = await supabase.from("complaints").select("*").eq("id", complaint.id).single();
    if (data) setComplaint(data as Complaint);
  }, [complaint.id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase
      .channel(`complaint-${complaint.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaint_messages", filter: `complaint_id=eq.${complaint.id}` }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints", filter: `id=eq.${complaint.id}` }, () => fetchComplaint())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, complaint.id, fetchMessages, fetchComplaint]);

  const sendMessage = async () => {
    if (!spaceId || !user || !newMsg.trim()) return;
    setSending(true);
    await supabase.from("complaint_messages").insert({
      complaint_id: complaint.id,
      couple_space_id: spaceId,
      user_id: user.id,
      content: newMsg.trim(),
    });
    setNewMsg("");
    setSending(false);
    if (complaint.status === "open") {
      await supabase.from("complaints").update({ status: "talking" }).eq("id", complaint.id);
    }
    if (spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "Resposta num conflito",
        body: newMsg.trim().slice(0, 80),
        url: "/conflitos",
        type: "conflitos",
      });
    }
  };

  const updateStatus = async (status: string) => {
    if (status === "archived" && !window.confirm("Tens a certeza que queres arquivar esta reclamação?")) return;
    const update: Record<string, unknown> = { status };
    if (status === "resolved") update.resolved_at = new Date().toISOString();
    await supabase.from("complaints").update(update).eq("id", complaint.id);
    if (status === "resolved") {
      onResolve();
      toast({ title: "Mais fortes juntos", description: "Resolver conflitos fortalece a vossa união." });
    } else {
      toast({ title: `Estado: ${STATUS_MAP[status]?.label}` });
    }
    if (status === "resolved" && spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "Conflito resolvido",
        body: complaint.title.slice(0, 80),
        url: "/conflitos",
        type: "conflitos",
      });
    }
  };

  const saveSolution = async () => {
    await supabase.from("complaints").update({ solution_note: solutionNote.trim() || null }).eq("id", complaint.id);
    toast({ title: "Plano de solução guardado" });
  };

  const isMine = complaint.created_by === user?.id;
  const s = STATUS_MAP[complaint.status];

  return (
    <section className="space-y-4 pb-6">

      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{complaint.title}</h1>
          <div className="flex items-center gap-1.5 text-xs text-[#717171]">
            <span className={cn("h-1.5 w-1.5 rounded-full", s?.dot)} />
            <span>{s?.label}</span>
            <span>· Sev. {complaint.severity}</span>
            {complaint.feeling && <span>· {complaint.feeling}</span>}
          </div>
        </div>
      </div>

      {/* Original description */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm text-foreground whitespace-pre-wrap">{complaint.description}</p>
        {complaint.clear_request && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-0.5">O que preciso</p>
            <p className="text-sm text-foreground">{complaint.clear_request}</p>
          </div>
        )}
        <p className="text-[11px] text-[#c4c4c4]">
          {isMine ? "Criada por ti" : "Criada pelo teu par"} — {format(new Date(complaint.created_at), "d MMM, HH:mm", { locale: pt })}
        </p>
      </div>

      {/* Tips */}
      {complaint.status !== "resolved" && complaint.status !== "archived" && (
        <div className="glass-card p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <Heart className="h-4 w-4 text-rose-400 fill-rose-100" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Dicas para uma resolução saudável</p>
            <ul className="text-[11px] text-[#717171] list-disc list-inside space-y-0.5">
              <li>Respirem antes de responder</li>
              <li>Evitem responder com raiva</li>
              <li>Foquem-se em como se sentem, não em culpar</li>
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {complaint.status !== "talking" && complaint.status !== "resolved" && complaint.status !== "archived" && (
          <button
            onClick={() => updateStatus("talking")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-2xl border border-[#e5e5e5] bg-white text-xs font-semibold text-foreground hover:bg-[#f5f5f5] transition-all"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Em conversa
          </button>
        )}
        {complaint.status !== "resolved" && complaint.status !== "archived" && (
          <button
            onClick={() => updateStatus("resolved")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-2xl border border-green-200 bg-green-50 text-xs font-semibold text-green-600 hover:bg-green-100 transition-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Resolvida
          </button>
        )}
        {complaint.status !== "archived" && (
          <button
            onClick={() => updateStatus("archived")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-2xl border border-[#e5e5e5] bg-white text-xs font-semibold text-[#717171] hover:bg-[#f5f5f5] transition-all"
          >
            <Archive className="h-3.5 w-3.5" strokeWidth={1.5} /> Arquivar
          </button>
        )}
      </div>

      {/* Solution note */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Plano de solução</p>
        <Textarea
          value={solutionNote}
          onChange={e => setSolutionNote(e.target.value)}
          rows={2}
          placeholder="Como vamos resolver isto…"
          className="rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400 resize-none"
        />
        <button
          onClick={saveSolution}
          className="h-9 px-4 rounded-2xl border border-[#e5e5e5] text-sm font-semibold text-foreground hover:bg-[#f5f5f5] transition-all"
        >
          Guardar
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#717171]">Conversa</p>
        <div className="glass-card p-3 space-y-2 max-h-64 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-xs text-[#717171] text-center py-4">Sem mensagens ainda. Inicia o diálogo.</p>
          )}
          {messages.map(m => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-[18px] px-3 py-2 text-sm",
                  mine
                    ? "rounded-br-[4px] bg-rose-500 text-white"
                    : "rounded-bl-[4px] bg-white border border-[#e5e5e5] text-foreground"
                )}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className={cn("text-[10px] mt-0.5", mine ? "text-white/60" : "text-[#c4c4c4]")}>
                    {format(new Date(m.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Send */}
      {complaint.status !== "archived" && (
        <div className="flex gap-2">
          <Input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Escreve uma resposta…"
            className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMsg.trim()}
            className="h-12 w-12 shrink-0 rounded-2xl bg-rose-500 text-white flex items-center justify-center disabled:opacity-50 active:scale-[0.96] transition-all"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>
      )}
    </section>
  );
}
