import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Bell, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { BTN, CARD, Chips, Confirm, GHOST, INPUT, LABEL, MUTED, ROW, Spinner, TEXTAREA, Toggle } from "./ui";

/* Painel admin (parte 4): Conteúdo — Avisos, LoveWrapped, Tutorial PWA. */


/* ═══════════════ Avisos ═══════════════ */

type Audience = "all" | "paid" | "trial";
type Duration = "1" | "3" | "7" | "0";
const AUDIENCE: [Audience, string][] = [["all", "Todos"], ["paid", "Só com plano"], ["trial", "Só em experiência"]];
const DURATION: [Duration, string][] = [["1", "1 dia"], ["3", "3 dias"], ["7", "1 semana"], ["0", "Até eu tirar"]];

export function AnnouncementsTab() {
  const { toast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [duration, setDuration] = useState<Duration>("3");
  const [push, setPush] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);

  const load = async () => {
    const { data, error } = await supabase.from("admin_announcements").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro a carregar avisos", description: error.message, variant: "destructive" });
    setList(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const live = (a: any) => a.active && (!a.ends_at || new Date(a.ends_at).getTime() > Date.now());
  const audienceLabel = (a: string) => AUDIENCE.find(x => x[0] === a)?.[1] ?? "Todos";

  const publish = async () => {
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    const ends_at = duration === "0" ? null : addDays(new Date(), Number(duration)).toISOString();
    const { data: row, error } = await supabase.from("admin_announcements")
      .insert({ title: title.trim(), content: content.trim(), active: true, audience, ends_at } as any)
      .select().single();
    if (error) { setBusy(false); toast({ title: "Não foi possível publicar", description: error.message, variant: "destructive" }); return; }

    let pushNote = "";
    if (push) {
      // "Todos" usa o envio global; "Só com plano"/"Só em experiência" usa o filtro de público da função.
      const { data, error: pErr } = await supabase.functions.invoke("send-push", {
        body: audience === "all"
          ? { broadcast: true, title: title.trim(), body: content.trim(), url: "/" }
          : { audience, title: title.trim(), body: content.trim(), url: "/" },
      });
      if (pErr) pushNote = " A notificação não saiu: a função send-push precisa de ser atualizada.";
      else {
        pushNote = ` Notificação enviada a ${data?.sent ?? 0} ${data?.sent === 1 ? "aparelho" : "aparelhos"}.`;
        await supabase.from("admin_announcements").update({ pushed_at: new Date().toISOString() } as any).eq("id", (row as any).id);
      }
    }
    setBusy(false);
    toast({ title: "Aviso publicado", description: `Já aparece na Home.${pushNote}` });
    setTitle(""); setContent("");
    load();
  };

  const toggle = async (a: any) => {
    const reopen = !live(a);
    const patch: any = reopen ? { active: true, ...(a.ends_at && new Date(a.ends_at).getTime() <= Date.now() ? { ends_at: null } : {}) } : { active: false };
    const { error } = await supabase.from("admin_announcements").update(patch).eq("id", a.id);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: reopen ? "Voltou a aparecer na Home" : "Tirado da Home" });
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from("admin_announcements").delete().eq("id", deleting.id);
    setBusy(false);
    if (error) { toast({ title: "Não foi possível apagar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Aviso apagado" });
    setDeleting(null);
    load();
  };

  const previewTitle = title.trim() || "Título do aviso";
  const previewBody = content.trim() || "A mensagem aparece aqui, por baixo do título.";

  return (
    <>
      <div className="grid gap-3.5 md:grid-cols-[1fr_300px]">
        <div className={cn(CARD, "p-4")}>
          <p className="text-[15px] font-bold">Novo aviso</p>
          <p className={cn("mt-1 text-[13px] leading-relaxed", MUTED)}>Aparece no topo da Home das casas que escolheres, até acabar o prazo.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className={LABEL}>Título</label>
              <input className={INPUT} value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Ex.: Nova função: Nossa História" />
            </div>
            <div>
              <label className={LABEL}>Mensagem</label>
              <textarea rows={3} value={content} onChange={e => setContent(e.target.value)} maxLength={240}
                placeholder="Curta e clara. Uma ou duas frases."
                className={TEXTAREA} />
            </div>
            <div>
              <label className={LABEL}>Para quem</label>
              <Chips<Audience> value={audience} onChange={setAudience} options={AUDIENCE} />
            </div>
            <div>
              <label className={LABEL}>Quanto tempo fica</label>
              <Chips<Duration> value={duration} onChange={setDuration} options={DURATION} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#ECE8E3] px-3.5 py-3 dark:border-border">
              <div className="flex min-w-0 items-center gap-2.5">
                <Bell className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">Enviar também como notificação</p>
                  <p className={cn("text-[12.5px]", MUTED)}>Chega ao telemóvel de quem tem as notificações ligadas</p>
                </div>
              </div>
              <Toggle on={push} onChange={setPush} label="Enviar notificação" />
            </div>
            <button onClick={publish} disabled={busy || !title.trim() || !content.trim()} className={cn(BTN, "h-11 w-full rounded-[14px] md:w-auto md:px-6")}>
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : push ? "Publicar e notificar" : "Publicar"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className={cn(CARD, "p-4")}>
            <p className={LABEL}>Assim aparece na Home</p>
            <div className="rounded-[18px] border border-rose-200/60 bg-rose-50/70 px-4 py-3">
              <p className="text-[12px] font-semibold text-rose-600">{previewTitle}</p>
              <p className="mt-0.5 text-[12px] leading-5 text-rose-800">{previewBody}</p>
            </div>
          </div>
          {push && (
            <div className={cn(CARD, "p-4")}>
              <p className={LABEL}>E assim no telemóvel</p>
              <div className="rounded-[16px] bg-[#F2F0ED] p-2.5 dark:bg-muted">
                <div className="flex gap-2.5 rounded-[12px] bg-white/90 p-2.5 shadow-sm dark:bg-card">
                  <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0 rounded-[8px] bg-[#F7F5F2]" onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                  <div className="min-w-0">
                    <p className="flex justify-between gap-2 text-[11px] text-[#7A7F8C]"><span>LoveNest</span><span>agora</span></p>
                    <p className="truncate text-[13px] font-semibold">{previewTitle}</p>
                    <p className="line-clamp-2 text-[12.5px] leading-snug text-[#4A5060] dark:text-muted-foreground">{previewBody}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mb-2 mt-6 text-[14px] font-semibold">Avisos</p>
      <div className={CARD}>
        {loading && <Spinner />}
        {!loading && list.length === 0 && <p className={cn("px-4 py-6 text-[13.5px]", MUTED)}>Ainda não publicaste avisos.</p>}
        {list.map(a => {
          const on = live(a);
          return (
            <div key={a.id} className={ROW}>
              <div className={cn("min-w-[200px] flex-1", !on && "opacity-60")}>
                <p className="text-[14px] font-semibold">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#4A5060] dark:text-muted-foreground">{a.content}</p>
                <p className={cn("mt-1 text-[12px]", MUTED)}>
                  {audienceLabel(a.audience)} · {format(new Date(a.created_at), "d MMM yyyy", { locale: pt })}
                  {a.ends_at ? ` · ${new Date(a.ends_at).getTime() > Date.now() ? "até" : "acabou a"} ${format(new Date(a.ends_at), "d MMM", { locale: pt })}` : ""}
                  {a.pushed_at ? " · notificado" : ""}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", on ? "bg-[#EAF6EE] text-[#1E7A44]" : "bg-[#F7F5F2] text-[#4A5060] dark:bg-muted")}>
                {on ? "Na Home" : "Escondido"}
              </span>
              <button className={GHOST} onClick={() => toggle(a)}>{on ? "Tirar da Home" : "Mostrar outra vez"}</button>
              <button className={cn(GHOST, "text-[#B91C1C]")} onClick={() => setDeleting(a)}>Apagar</button>
            </div>
          );
        })}
      </div>

      {deleting && (
        <Confirm title="Apagar este aviso?" action="Apagar de vez" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}>
          «{deleting.title}» sai da Home e da lista para sempre. Não dá para desfazer. Para só o esconder, usa "Tirar da Home".
        </Confirm>
      )}
    </>
  );
}

/* ═══════════════ LoveWrapped ═══════════════ */

const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2024, i, 1), "MMMM", { locale: pt }));

export function WrappedTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<{ month: number; year: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ month: number; year: number } | null>(null);
  const prev = useMemo(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return { month: d.getMonth() + 1, year: d.getFullYear() }; }, []);
  const [month, setMonth] = useState(prev.month);
  const [year, setYear] = useState(prev.year);
  const [notify, setNotify] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from("love_wrapped").select("month, year");
    if (error) toast({ title: "Erro a carregar", description: error.message, variant: "destructive" });
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const months = useMemo(() => {
    const m = new Map<string, { month: number; year: number; count: number }>();
    rows.forEach(r => {
      const k = `${r.year}-${String(r.month).padStart(2, "0")}`;
      const cur = m.get(k) ?? { month: r.month, year: r.year, count: 0 };
      cur.count++;
      m.set(k, cur);
    });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v);
  }, [rows]);

  const generate = async (m: number, y: number, opts: { overwrite: boolean; notify: boolean }) => {
    const key = `${y}-${m}`;
    setBusy(key);
    const { data, error } = await supabase.functions.invoke("generate-love-wrapped", {
      body: { month: m, year: y, overwrite: opts.overwrite, notify: opts.notify },
    });
    setBusy(null);
    if (error) { toast({ title: "Não foi possível gerar", description: error.message, variant: "destructive" }); return; }
    const failed = data?.failures?.length ?? 0;
    toast({
      title: failed ? `Gerado, com ${failed} ${failed === 1 ? "falha" : "falhas"}` : "Gerado",
      description: `${MONTHS[m - 1]} de ${y}: ${data?.inserted ?? 0} novos, ${data?.updated ?? 0} atualizados${data?.skipped ? `, ${data.skipped} já existiam` : ""}.`,
      variant: failed ? "destructive" : "default",
    });
    load();
  };

  const removeMonth = async () => {
    if (!deleting) return;
    setBusy("delete");
    const { error } = await supabase.from("love_wrapped").delete().eq("month", deleting.month).eq("year", deleting.year);
    setBusy(null);
    if (error) { toast({ title: "Não foi possível apagar", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${MONTHS[deleting.month - 1]} de ${deleting.year} apagado` });
    setDeleting(null);
    load();
  };

  const years = [prev.year, prev.year - 1];

  return (
    <>
      <div className={cn(CARD, "p-4")}>
        <p className="text-[15px] font-bold">Automático</p>
        <p className={cn("mt-1 text-[13px] leading-relaxed", MUTED)}>
          No dia 1 de cada mês, às 10:00, a app prepara o LoveWrapped do mês anterior para todos os casais e avisa-os com uma notificação. Não precisas de fazer nada.
        </p>
      </div>

      <div className={cn(CARD, "mt-3 p-4")}>
        <p className="text-[15px] font-bold">Gerar um mês à mão</p>
        <p className={cn("mt-1 text-[13px] leading-relaxed", MUTED)}>Só para um mês que falhou. Os casais que já o têm ficam como estão.</p>
        <div className="mt-3 flex flex-wrap items-end gap-2.5">
          <div>
            <label className={LABEL}>Mês</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={cn(INPUT, "w-40 capitalize")}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Ano</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={cn(INPUT, "w-28")}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <label className="flex h-11 items-center gap-2 text-[13px] font-semibold text-[#4A5060] dark:text-muted-foreground">
            <Toggle on={notify} onChange={setNotify} label="Avisar os casais" /> Avisar os casais
          </label>
          <button className={cn(BTN, "h-11 rounded-[14px] px-5")} disabled={!!busy} onClick={() => generate(month, year, { overwrite: false, notify })}>
            {busy === `${year}-${month}` ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Gerar"}
          </button>
        </div>
      </div>

      <p className="mb-2 mt-6 text-[14px] font-semibold">Meses gerados</p>
      <div className={CARD}>
        {loading && <Spinner />}
        {!loading && months.length === 0 && <p className={cn("px-4 py-6 text-[13.5px]", MUTED)}>Ainda não há LoveWrapped gerados.</p>}
        {months.map(m => (
          <div key={`${m.year}-${m.month}`} className={ROW}>
            <div className="min-w-[160px] flex-1">
              <p className="text-[14px] font-semibold capitalize">{MONTHS[m.month - 1]} de {m.year}</p>
              <p className={cn("text-[12.5px]", MUTED)}>{m.count} {m.count === 1 ? "casal" : "casais"}</p>
            </div>
            <button className={GHOST} disabled={!!busy} onClick={() => generate(m.month, m.year, { overwrite: true, notify: false })}>
              {busy === `${m.year}-${m.month}` ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Gerar outra vez"}
            </button>
            <button className={cn(GHOST, "text-[#B91C1C]")} disabled={!!busy} onClick={() => setDeleting(m)}>Apagar</button>
          </div>
        ))}
      </div>
      <p className={cn("mt-2 px-1 text-[12.5px]", MUTED)}>"Gerar outra vez" recalcula os números sem mandar nova notificação.</p>

      {deleting && (
        <Confirm title={`Apagar ${MONTHS[deleting.month - 1]} de ${deleting.year}?`} action="Apagar de vez" busy={busy === "delete"} onCancel={() => setDeleting(null)} onConfirm={removeMonth}>
          O LoveWrapped deste mês desaparece para todos os casais. Podes gerá-lo outra vez depois.
        </Confirm>
      )}
    </>
  );
}

/* ═══════════════ Tutorial PWA ═══════════════ */

export function PwaTab() {
  const { toast } = useToast();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"android" | "ios" | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("pwa_tutorial_settings" as any).select("*").maybeSingle();
    if (error) toast({ title: "Erro a carregar", description: error.message, variant: "destructive" });
    setS(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: any) => {
    const next = { ...s, ...patch };
    setS(next);
    setSaving(true);
    const { error } = await supabase.from("pwa_tutorial_settings" as any)
      .update({ is_enabled: next.is_enabled, android_video_url: next.android_video_url, ios_video_url: next.ios_video_url }).eq("id", s.id);
    setSaving(false);
    if (error) { toast({ title: "Não foi possível guardar", description: error.message, variant: "destructive" }); load(); return false; }
    return true;
  };

  const upload = async (file: File, platform: "android" | "ios") => {
    setUploading(platform);
    const path = `tutorials/pwa-tutorial-${platform}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("pwa-tutorials").upload(path, file, { upsert: true });
    if (error) { setUploading(null); toast({ title: "Não foi possível enviar o vídeo", description: error.message, variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("pwa-tutorials").getPublicUrl(path);
    const ok = await save({ [platform === "android" ? "android_video_url" : "ios_video_url"]: publicUrl });
    setUploading(null);
    if (ok) toast({ title: "Vídeo atualizado" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#7A7F8C]" /></div>;
  if (!s) return <div className={cn(CARD, "px-4 py-8 text-center text-[13.5px]", MUTED)}>As definições do tutorial não existem na base de dados.</div>;

  const video = (platform: "android" | "ios", label: string) => {
    const key = platform === "android" ? "android_video_url" : "ios_video_url";
    return (
      <div className={cn(CARD, "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold">{label}</p>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", s[key] ? "bg-[#EAF6EE] text-[#1E7A44]" : "bg-[#F7F5F2] text-[#4A5060] dark:bg-muted")}>
            {s[key] ? "Com vídeo" : "Sem vídeo"}
          </span>
        </div>
        {s[key] && <video src={s[key]} controls preload="metadata" className="mt-3 aspect-[9/16] max-h-[280px] w-full rounded-[14px] bg-[#F7F5F2] object-contain dark:bg-muted" />}
        <label className={cn(GHOST, "mt-3 inline-flex cursor-pointer items-center gap-1.5", uploading === platform && "pointer-events-none opacity-60")}>
          {uploading === platform ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.8} />}
          {s[key] ? "Trocar vídeo" : "Enviar vídeo"}
          <input type="file" accept="video/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, platform); e.currentTarget.value = ""; }} />
        </label>
      </div>
    );
  };

  return (
    <>
      <div className={cn(CARD, "flex items-center justify-between gap-4 p-4")}>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">Mostrar o tutorial</p>
          <p className={cn("mt-0.5 text-[13px] leading-relaxed", MUTED)}>
            Explica como pôr a LoveNest no ecrã inicial do telemóvel. Só aparece a quem ainda abre a app pelo browser.
          </p>
        </div>
        <Toggle on={!!s.is_enabled} disabled={saving} label="Mostrar o tutorial"
          onChange={async v => { if (await save({ is_enabled: v })) toast({ title: v ? "Tutorial ligado" : "Tutorial desligado" }); }} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {video("ios", "iPhone")}
        {video("android", "Android")}
      </div>
    </>
  );
}
