import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ArrowLeft, Send, CheckCircle2, Archive, MessageCircle, Loader2, Heart, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

const FEELINGS = ["magoado", "frustrado", "triste", "ansioso", "zangado", "confuso", "ignorado", "sozinho", "outro"];
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "Aberta", color: "bg-destructive text-destructive-foreground" },
  talking: { label: "Em conversa", color: "bg-yellow-500 text-white" },
  resolved: { label: "Resolvida", color: "bg-green-600 text-white" },
  archived: { label: "Arquivada", color: "bg-muted text-muted-foreground" },
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
    return <ComplaintDetail complaint={selected} onBack={() => { setSelected(null); fetchComplaints(); }} onResolve={() => { setShowResolvedOverlay(true); setTimeout(() => setShowResolvedOverlay(false), 3000); }} />;
  }

  const filtered = complaints.filter(c => c.status === filter).slice(0, PAGE_SIZE);
  const totalForFilter = complaints.filter(c => c.status === filter).length;

  return (
    <section className="space-y-4 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conflitos</h1>
          <p className="text-sm text-muted-foreground">Central de reclamações.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Reclamação</DialogTitle></DialogHeader>
            <CreateComplaintForm spaceId={spaceId} userId={user?.id} onCreated={() => { setCreateOpen(false); fetchComplaints(); }} />
          </DialogContent>
        </Dialog>
      </header>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_MAP).map(([key, { label }]) => {
          const count = complaints.filter(c => c.status === key).length;
          return (
            <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)}>
              {label} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
            </Button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground pt-4">Nenhuma reclamação {STATUS_MAP[filter]?.label.toLowerCase()}.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, idx) => (
            <Card 
              key={c.id} 
              className={cn(
                "cursor-pointer hover:bg-accent/30 transition-all animate-fade-slide-up shadow-sm",
                `stagger-${(idx % 5) + 1}`
              )} 
              onClick={() => setSelected(c)}
            >
              <CardContent className="py-3 flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className={STATUS_MAP[c.status]?.color + " border-0 text-[10px]"}>{STATUS_MAP[c.status]?.label}</Badge>
                    <span>Sev. {c.severity} — {SEVERITY_LABELS[c.severity]}</span>
                    {c.feeling && <span>· {c.feeling}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "d MMM, HH:mm", { locale: pt })}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {totalForFilter > PAGE_SIZE && (
            <p className="text-xs text-muted-foreground text-center pt-2">A mostrar {PAGE_SIZE} de {totalForFilter}</p>
          )}
        </div>
      )}

      {/* Reconciliation Overlay */}
      {showResolvedOverlay && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="text-center space-y-6 animate-bounce-in">
            <div className="relative inline-block">
              <div className="bg-primary/20 p-8 rounded-full shadow-glow animate-pulse">
                <Heart className="w-24 h-24 text-primary fill-primary" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-10 h-10 text-yellow-500 animate-spin-slow" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-foreground tracking-tight italic">Mais fortes juntos 💛</h2>
              <p className="text-muted-foreground text-sm font-medium mx-auto max-w-[280px]">O diálogo cura e o compromisso fortalece a vossa história.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Create Form ---------- */
function CreateComplaintForm({ spaceId, userId, onCreated }: { spaceId: string | null; userId?: string; onCreated: () => void }) {
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
      toast({ title: "Erro ao criar conflito", description: "Tenta novamente.", variant: "destructive" });
    } else {
      toast({ 
        title: "Vamos resolver isto com calma 💛", 
        description: "O amor também se constrói nos momentos difíceis.",
        duration: 6000
      });
      if (spaceId) {
        notifyPartner({
          couple_space_id: spaceId,
          title: "⚡ Nova reclamação",
          body: title.trim().slice(0, 80),
          url: "/conflitos",
          type: "conflitos",
        });
      }
      onCreated();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resumo breve" /></div>
      <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="O que aconteceu…" /></div>
      <div>
        <Label>Sentimento</Label>
        <Select value={feeling} onValueChange={setFeeling}>
          <SelectTrigger><SelectValue placeholder="Como me sinto" /></SelectTrigger>
          <SelectContent>{FEELINGS.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Severidade (1-5)</Label>
        <div className="flex gap-1 pt-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Button key={s} size="sm" variant={severity === s ? "default" : "outline"} onClick={() => setSeverity(s)} className="w-9 h-9 p-0">
              {s}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{SEVERITY_LABELS[severity]}</p>
      </div>
      <div><Label>O que eu preciso é… (opcional)</Label><Textarea value={clearRequest} onChange={e => setClearRequest(e.target.value)} rows={2} placeholder="Pedido claro" /></div>
      <Button className="w-full" onClick={submit} disabled={saving || !title.trim() || !description.trim()}>Criar reclamação</Button>
    </div>
  );
}

/* ---------- Detail View ---------- */
function ComplaintDetail({ complaint: initial, onBack, onResolve }: { complaint: Complaint; onBack: () => void; onResolve: () => void }) {
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
    // Push to partner
    if (spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "💬 Resposta num conflito",
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
      toast({ title: "Mais fortes juntos 💛", description: "Resolver conflitos fortalece a vossa união." });
    } else {
      toast({ title: `Estado: ${STATUS_MAP[status]?.label}` });
    }
    // Push for resolved
    if (status === "resolved" && spaceId) {
      notifyPartner({
        couple_space_id: spaceId,
        title: "✅ Conflito resolvido",
        body: complaint.title.slice(0, 80),
        url: "/conflitos",
        type: "conflitos",
      });
    }
  };

  const saveSolution = async () => {
    await supabase.from("complaints").update({ solution_note: solutionNote.trim() || null }).eq("id", complaint.id);
    toast({ title: "💡 Plano de solução guardado" });
  };

  const isMine = complaint.created_by === user?.id;

  return (
    <section className="space-y-4 pb-4 flex flex-col h-full">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{complaint.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={STATUS_MAP[complaint.status]?.color + " border-0 text-[10px]"}>{STATUS_MAP[complaint.status]?.label}</Badge>
            <span>Sev. {complaint.severity}</span>
            {complaint.feeling && <span>· {complaint.feeling}</span>}
          </div>
        </div>
      </header>

      {/* Original */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
          {complaint.clear_request && (
            <div className="rounded bg-accent/40 p-2">
              <p className="text-xs font-medium text-muted-foreground">O que preciso:</p>
              <p className="text-sm">{complaint.clear_request}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{isMine ? "Criada por ti" : "Criada pelo teu par"} — {format(new Date(complaint.created_at), "d MMM, HH:mm", { locale: pt })}</p>
        </CardContent>
      </Card>

      {/* Guided Tips */}
      {complaint.status !== "resolved" && complaint.status !== "archived" && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Heart className="h-4 w-4 text-primary fill-primary/20" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-primary">Dicas para uma resolução saudável:</p>
            <ul className="text-[11px] text-muted-foreground list-disc list-inside space-y-0.5">
              <li>Respirem antes de responder ✨</li>
              <li>Evitem responder com raiva 💛</li>
              <li>Foquem-se em como se sentem, não em culpar.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {complaint.status !== "talking" && complaint.status !== "resolved" && complaint.status !== "archived" && (
          <Button size="sm" variant="outline" onClick={() => updateStatus("talking")}><MessageCircle className="mr-1 h-3 w-3" /> Em conversa</Button>
        )}
        {complaint.status !== "resolved" && complaint.status !== "archived" && (
          <Button size="sm" variant="outline" onClick={() => updateStatus("resolved")}><CheckCircle2 className="mr-1 h-3 w-3" /> Resolvida</Button>
        )}
        {complaint.status !== "archived" && (
          <Button size="sm" variant="ghost" onClick={() => updateStatus("archived")}><Archive className="mr-1 h-3 w-3" /> Arquivar</Button>
        )}
      </div>

      {/* Solution note */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">💡 Plano de solução</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={solutionNote} onChange={e => setSolutionNote(e.target.value)} rows={2} placeholder="Como vamos resolver isto…" />
          <Button size="sm" variant="outline" onClick={saveSolution}>Guardar</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <h3 className="text-sm font-semibold mb-2">Conversa</h3>
        <ScrollArea className="h-60 rounded-md border p-3">
          {messages.length === 0 && <p className="text-xs text-muted-foreground">Sem mensagens ainda.</p>}
          {messages.map(m => (
            <div key={m.id} className={`mb-2 flex ${m.user_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.user_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="text-[10px] opacity-70 mt-1">{format(new Date(m.created_at), "HH:mm")}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </ScrollArea>
      </div>

      {/* Send */}
      {complaint.status !== "archived" && (
        <div className="flex gap-2">
          <Input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Escreve uma resposta…"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <Button size="icon" onClick={sendMessage} disabled={sending || !newMsg.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      )}
    </section>
  );
}
