import { useMemo, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { BadgeCheck, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { BTN, CARD, GHOST, LABEL, MUTED, Modal, RED, Segmented, TEXTAREA } from "./ui";

/* Verificações de identidade, agrupadas por casa, e o selo de casa verificada. */

type Filter = "pending" | "all";

const pill = (status: string) =>
  status === "verified"
    ? <span className="rounded-full bg-[#EAF6EE] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1E7A44]">Verificado</span>
    : status === "rejected"
      ? <span className="rounded-full bg-[#FDF3F2] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#B91C1C]">Recusado</span>
      : <span className="rounded-full bg-[#FEF5E7] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#B45309]">Por rever</span>;

export function VerificationsView({ houses, users, verifications, onChanged }: {
  houses: any[]; users: any[]; verifications: any[]; onChanged: () => void;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [note, setNote] = useState("");

  const profile = (userId: string) => users.find((u: any) => u.user_id === userId);
  const firstName = (userId: string, fallback?: string) => (profile(userId)?.display_name || fallback || "Sem nome").split(" ")[0];

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; house: any | null; members: string[]; subs: any[] }[] = [];
    houses.forEach((h: any) => {
      const members: string[] = (h.members ?? []).map((m: any) => m.user_id);
      const subs = verifications.filter((v: any) => members.includes(v.user_id));
      if (!subs.length) return;
      subs.forEach((v: any) => seen.add(v.id));
      out.push({ id: h.id, house: h, members, subs });
    });
    verifications.filter((v: any) => !seen.has(v.id)).forEach((v: any) => out.push({ id: `solo-${v.id}`, house: null, members: [v.user_id], subs: [v] }));
    return out;
  }, [houses, verifications]);

  const shown = filter === "pending" ? groups.filter(g => g.subs.some(s => s.status === "pending")) : groups;
  const pendingCount = verifications.filter((v: any) => v.status === "pending").length;

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from("identity-documents").createSignedUrl(path, 60);
    if (error || !data) { toast({ variant: "destructive", title: "Não foi possível abrir o documento", description: error?.message }); return; }
    setImage(data.signedUrl);
  };

  const decide = async (sub: any, status: "verified" | "rejected", notes?: string) => {
    setBusy(sub.id);
    const { error: e1 } = await supabase.from("identity_verifications").update(status === "verified" ? { status } : { status, admin_notes: notes || null }).eq("id", sub.id);
    const { error: e2 } = e1 ? { error: null } : await supabase.from("profiles").update({ verification_status: status }).eq("user_id", sub.user_id);
    setBusy(null);
    const error = e1 || e2;
    if (error) { toast({ variant: "destructive", title: "Não foi possível", description: error.message }); return; }
    toast({ title: status === "verified" ? `${firstName(sub.user_id, sub.full_name)} verificado` : "Verificação recusada" });
    setRejecting(null); setNote("");
    onChanged();
  };

  const setSeal = async (houseId: string, on: boolean) => {
    setBusy(houseId);
    const { error } = await supabase.rpc("admin_set_verified" as any, { p_couple_space_id: houseId, p_verified: on });
    setBusy(null);
    if (error) { toast({ variant: "destructive", title: "Não foi possível", description: error.message }); return; }
    toast({ title: on ? "Selo de casa verificada ativo" : "Selo retirado" });
    onChanged();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("max-w-[60ch] text-[13px] leading-relaxed", MUTED)}>
          Cada pessoa envia o documento. Quando os dois estão verificados, podes dar à casa o selo de verificada.
        </p>
        <Segmented<Filter> value={filter} onChange={setFilter} options={[["pending", `Por rever${pendingCount ? ` (${pendingCount})` : ""}`], ["all", "Todas"]]} />
      </div>

      <div className="mt-3 space-y-3">
        {shown.length === 0 && (
          <div className={cn(CARD, "px-4 py-8 text-center text-[13.5px]", MUTED)}>
            {filter === "pending" ? "Nada por rever." : "Ainda ninguém enviou documentos."}
          </div>
        )}
        {shown.map(g => {
          const verifiedAll = g.members.length === 2 && g.members.every(uid => g.subs.some(s => s.user_id === uid && s.status === "verified"));
          const title = g.house
            ? g.members.map(uid => firstName(uid)).join(" & ") || g.house.house_name || "Casa"
            : `${firstName(g.subs[0].user_id, g.subs[0].full_name)} (sem casa)`;
          return (
            <div key={g.id} className={CARD}>
              <div className="flex flex-wrap items-center gap-3 border-b border-[#F0EDE9] px-4 py-3 dark:border-border/60">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[15px] font-bold">
                    {title}
                    {g.house?.is_verified && <BadgeCheck className="h-4 w-4 text-[#1E7A44]" strokeWidth={2} aria-label="Casa verificada" />}
                  </p>
                  <p className={cn("text-[12.5px]", MUTED)}>
                    {g.house?.is_verified ? "Casa verificada" : verifiedAll ? "Os dois estão verificados" : g.members.length < 2 && g.house ? "Ainda sem par" : `${g.subs.filter(s => s.status === "verified").length} de 2 verificados`}
                  </p>
                </div>
                {g.house && (g.house.is_verified
                  ? <button className={GHOST} disabled={busy === g.id} onClick={() => setSeal(g.id, false)}>Tirar selo</button>
                  : verifiedAll && <button className={BTN} disabled={busy === g.id} onClick={() => setSeal(g.id, true)}>{busy === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dar selo"}</button>)}
              </div>

              {g.members.map(uid => {
                const sub = g.subs.find(s => s.user_id === uid);
                const p = profile(uid);
                return (
                  <div key={uid} className="flex flex-wrap items-center gap-3 border-t border-[#F0EDE9] px-4 py-3 first:border-t-0 dark:border-border/60">
                    {p?.avatar_url
                      ? <img src={p.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[13px] font-bold text-[#4A5060] dark:bg-muted">{firstName(uid, sub?.full_name).charAt(0).toUpperCase()}</span>}
                    {sub ? (
                      <>
                        <div className="min-w-[200px] flex-1">
                          <p className="text-[14px] font-semibold">{sub.full_name || firstName(uid)}</p>
                          <p className={cn("text-[12.5px]", MUTED)}>
                            {sub.document_type || "BI"} {sub.id_number}{sub.age ? ` · ${sub.age} anos` : ""} · enviado a {format(new Date(sub.created_at), "d MMM", { locale: pt })}
                          </p>
                          {sub.status === "rejected" && sub.admin_notes && <p className="mt-0.5 text-[12.5px] text-[#B91C1C]">{sub.admin_notes}</p>}
                        </div>
                        {pill(sub.status)}
                        <div className="flex flex-wrap gap-1.5">
                          {sub.document_url && <button className={GHOST} onClick={() => openDoc(sub.document_url)}>Frente</button>}
                          {sub.document_back_url && <button className={GHOST} onClick={() => openDoc(sub.document_back_url)}>Verso</button>}
                          {sub.status === "pending" && (
                            <>
                              <button className={GHOST} disabled={busy === sub.id} onClick={() => { setNote(""); setRejecting(sub); }}>Recusar</button>
                              <button className={BTN} disabled={busy === sub.id} onClick={() => decide(sub, "verified")}>
                                {busy === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">{firstName(uid)}</p>
                        <p className={cn("text-[12.5px]", MUTED)}>Ainda não enviou o documento</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {image && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1324]/80 p-4" onClick={() => setImage(null)}>
          <img src={image} alt="Documento" className="max-h-[85vh] max-w-full rounded-[14px] object-contain" />
          <button onClick={() => setImage(null)} aria-label="Fechar" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0B1324]"><X className="h-4 w-4" /></button>
        </div>
      )}

      {rejecting && (
        <Modal title="Recusar verificação?" subtitle={rejecting.full_name || firstName(rejecting.user_id)} onClose={() => !busy && setRejecting(null)}>
          <label className={cn(LABEL, "mt-4")}>Porquê (a pessoa vê esta nota)</label>
          <textarea rows={3} className={TEXTAREA} value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: a foto do documento está desfocada" />
          <div className="mt-4 flex gap-2">
            <button onClick={() => setRejecting(null)} disabled={!!busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
            <button onClick={() => decide(rejecting, "rejected", note.trim() || "Documento inválido")} disabled={!!busy} className={cn(BTN, RED, "h-11 flex-1 rounded-[14px]")}>
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Recusar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
