import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JoinSchema = z
  .object({
    invite_code: z
      .string()
      .trim()
      .min(6)
      .max(8)
      .regex(/^[a-zA-Z0-9]+$/)
      .transform((v) => v.toUpperCase()),
  })
  .strict();

type JoinBody = z.infer<typeof JoinSchema>;

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function safeErrorMessage(error: any): string {
  // Keep specifics in logs; return safe messages to clients.
  // Map a few common Postgres errors to user-friendly Portuguese messages.
  const code = error?.code;
  const message = String(error?.message ?? "");

  if (code === "23505") return "Este registo já existe.";
  if (code === "23503") return "Referência inválida.";
  if (code === "P0001" && message.includes("couple_space_full")) {
    return "Este LoveNest já está completo (máximo 2 membros).";
  }

  return "Ocorreu um erro. Tente novamente.";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Método não permitido." });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Você precisa estar logado para continuar." });
    }

    const token = authHeader.replace("Bearer ", "");

    // 1) Validar o token com o client público (compatível com ES256)
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return json(401, { error: "Você precisa estar logado para continuar." });
    }

    // 2) Operações no banco com service-role
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 3) Validar o body
    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return json(400, { error: "Requisição inválida." });
    }

    const parsed = JoinSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return json(400, { error: "Requisição inválida." });
    }

    const { invite_code }: JoinBody = parsed.data;

    // Verificar se o utilizador já está num LoveNest
    const { data: existingMember, error: memberCheckError } = await supabase
      .from("members")
      .select("couple_space_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberCheckError) {
      throw memberCheckError;
    }

    if (existingMember) {
      return json(200, {
        already_member: true,
        message: "Você já está numa Casa DK",
        couple_space_id: existingMember.couple_space_id,
      });
    }

    // Buscar couple_space pelo código
    const { data: space, error: spaceError } = await supabase
      .from("couple_spaces")
      .select("id")
      .eq("invite_code", invite_code)
      .eq("status", "active")
      .maybeSingle();

    if (spaceError) {
      throw spaceError;
    }

    if (!space) {
      return json(404, { error: "Código de convite inválido ou expirado" });
    }

    // Verificar quantos membros já existem
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("user_id")
      .eq("couple_space_id", space.id);

    if (membersError) {
      throw membersError;
    }

    if (members && members.length >= 2) {
      return json(400, { error: "Esta Casa DK já está completa (máximo 2 membros)" });
    }

    // Adicionar como segundo membro
    const { error: joinError } = await supabase.from("members").insert({
      couple_space_id: space.id,
      user_id: userId,
    });

    if (joinError) {
      throw joinError;
    }

    return json(200, { couple_space_id: space.id });
  } catch (error: any) {
    console.error("Error in join-couple-space:", error);
    return json(500, { error: safeErrorMessage(error) });
  }
});
