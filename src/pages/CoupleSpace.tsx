import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type MemberProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type CoupleState =
  | { status: "loading" }
  | { status: "no_house" }
  | {
      status: "has_house";
      coupleSpaceId: string;
      inviteCode: string | null;
      members: MemberProfile[];
    };

export default function CoupleSpace() {
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [state, setState] = useState<CoupleState>({ status: "loading" });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const memberCount = useMemo(() => {
    if (state.status !== "has_house") return 0;
    return state.members.length;
  }, [state]);

  const refresh = async () => {
    setState({ status: "loading" });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Rota está em AuthOnlyRoute, mas mantemos fallback.
      navigate("/entrar", { replace: true });
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: memberRow, error: memberErr } = await supabase
      .from("members")
      .select("couple_space_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (memberErr) {
      console.error("Error loading membership:", memberErr);
      toast({
        variant: "destructive",
        title: "Erro ao carregar seu LoveNest",
        description: "Não foi possível verificar seu pareamento. Tente novamente.",
      });
      setState({ status: "no_house" });
      return;
    }

    if (!memberRow?.couple_space_id) {
      setState({ status: "no_house" });
      return;
    }

    const coupleSpaceId = memberRow.couple_space_id;

    const { data: spaceRow, error: spaceErr } = await supabase
      .from("couple_spaces")
      .select("invite_code")
      .eq("id", coupleSpaceId)
      .maybeSingle();

    if (spaceErr) {
      console.error("Error loading couple space:", spaceErr);
    }

    const { data: membersRows, error: membersErr } = await supabase
      .from("members")
      .select("user_id")
      .eq("couple_space_id", coupleSpaceId);

    if (membersErr) {
      console.error("Error loading members:", membersErr);
      toast({
        variant: "destructive",
        title: "Erro ao carregar membros",
        description: "Não foi possível carregar os membros do seu LoveNest.",
      });
      setState({
        status: "has_house",
        coupleSpaceId,
        inviteCode: spaceRow?.invite_code ?? null,
        members: [],
      });
      return;
    }

    const userIds = (membersRows ?? []).map((m) => m.user_id);

    let profiles: MemberProfile[] = [];
    if (userIds.length > 0) {
      const { data: profilesRows, error: profilesErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      if (profilesErr) {
        console.error("Error loading profiles:", profilesErr);
        // fallback: mostrar apenas IDs
        profiles = userIds.map((id) => ({ user_id: id, display_name: null, avatar_url: null }));
      } else {
        // Garantir ordem estável
        const byId = new Map((profilesRows ?? []).map((p) => [p.user_id, p]));
        profiles = userIds.map((id) => {
          const p = byId.get(id);
          return {
            user_id: id,
            display_name: p?.display_name ?? null,
            avatar_url: p?.avatar_url ?? null,
          };
        });
      }
    }

    setState({
      status: "has_house",
      coupleSpaceId,
      inviteCode: spaceRow?.invite_code ?? null,
      members: profiles,
    });
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSpace = async () => {
    setLoadingAction(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          variant: "destructive",
          title: "Você precisa entrar",
          description: "Faça login para criar seu LoveNest.",
        });
        navigate("/entrar");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-couple-space", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const message =
          (error as any)?.context?.body?.error ||
          (error as any)?.context?.body ||
          (error as any)?.message ||
          "Não foi possível criar seu LoveNest.";

        const msg = typeof message === "string" ? message : "Não foi possível criar seu LoveNest.";

        toast({
          variant: "destructive",
          title: "Erro ao criar LoveNest",
          description: msg,
        });
        return;
      }

      if ((data as any)?.already_member) {
        toast({
          title: "Você já está num LoveNest",
          description: "Abrindo seu LoveNest...",
        });
        await refresh();
        return;
      }

      toast({
        title: "LoveNest criado!",
        description: "Agora copie o código e envie para o seu par.",
      });

      await refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao criar LoveNest",
        description: "Não foi possível criar seu LoveNest.",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          variant: "destructive",
          title: "Você precisa entrar",
          description: "Faça login para entrar num LoveNest.",
        });
        navigate("/entrar");
        return;
      }

      const code = inviteCodeInput.trim().toUpperCase();

      const { data, error } = await supabase.functions.invoke("join-couple-space", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { invite_code: code },
      });

      if (error) {
        const message =
          (error as any)?.context?.body?.error ||
          (error as any)?.context?.body ||
          (error as any)?.message ||
          "Código inválido ou Casa completa.";

        const msg = typeof message === "string" ? message : "Código inválido ou Casa completa.";

        toast({
          variant: "destructive",
          title: "Erro ao entrar no LoveNest",
          description: msg,
        });
        return;
      }

      if ((data as any)?.already_member) {
        toast({
          title: "Você já está num LoveNest",
          description: "Abrindo seu LoveNest...",
        });
        await refresh();
        return;
      }

      toast({
        title: "Bem-vindo ao LoveNest!",
        description: "Você entrou com sucesso.",
      });

      await refresh();
      navigate("/", { replace: true });
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao entrar no LoveNest",
        description: "Código inválido ou Casa completa.",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Código copiado!", description: "Compartilhe com seu par." });
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível copiar",
        description: "Copie manualmente o código.",
      });
    }
  };

  const MemberRow = ({ member }: { member: MemberProfile }) => {
    const fallback = (member.display_name ?? "?").slice(0, 2).toUpperCase();
    const whoLabel = currentUserId && member.user_id === currentUserId ? "Você" : "Seu par";

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={member.avatar_url ?? undefined} alt={member.display_name ?? "Perfil"} />
            <AvatarFallback>
              <UserIcon className="h-4 w-4" />
              <span className="sr-only">{fallback}</span>
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{member.display_name ?? "Sem nome"}</p>
            <p className="text-xs text-muted-foreground">{whoLabel}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">LoveNest</CardTitle>
          <CardDescription>Crie ou entre no seu espaço privado de casal</CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === "loading" ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : state.status === "no_house" ? (
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Criar Casa</TabsTrigger>
                <TabsTrigger value="join">Entrar com Código</TabsTrigger>
              </TabsList>

              <TabsContent value="create">
                <div className="space-y-4 pt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Crie uma nova Casa DK e gere um código de convite para seu par.
                  </p>
                  <Button onClick={handleCreateSpace} className="w-full" disabled={loadingAction}>
                    {loadingAction ? "Criando..." : "Criar Casa DK"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="join">
                <form onSubmit={handleJoinSpace} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Código de Convite</Label>
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="Ex: A1B2C3D4"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      required
                      className="text-center text-lg font-bold tracking-wider uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Apenas 2 membros podem estar numa Casa DK.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingAction}>
                    {loadingAction ? "Entrando..." : "Entrar na Casa"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Seu código da Casa</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={state.inviteCode ?? "—"}
                    readOnly
                    className="text-center text-lg font-bold tracking-wider"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => state.inviteCode && copyCode(state.inviteCode)}
                    disabled={!state.inviteCode}
                    aria-label="Copiar código"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {memberCount < 2 ? (
                <div className="rounded-lg border bg-card p-3 text-card-foreground">
                  <p className="text-sm font-medium">Aguardando o teu par entrar</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Envie o código acima — esta Casa DK aceita no máximo 2 membros.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card p-3 text-card-foreground">
                  <p className="text-sm font-medium">Casa completa</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vocês já estão pareados. Pode ir para a Home.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Membros ({memberCount}/2)</p>
                <div className="space-y-3">
                  {state.members.map((m) => (
                    <MemberRow key={m.user_id} member={m} />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => navigate("/", { replace: true })}>
                  Ir para Home
                </Button>
                <Button className="flex-1" variant="outline" onClick={refresh}>
                  Atualizar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
