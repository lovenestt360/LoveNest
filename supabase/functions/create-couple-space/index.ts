import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EmptyBodySchema = z.object({}).strict();

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function safeErrorMessage(error: any): string {
  const code = error?.code;
  if (code === "23505") return "Este registo já existe.";
  if (code === "23503") return "Referência inválida.";
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

    // 0) Validar body: esta rota não espera payload (apenas {} opcional)
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 0) {
      let bodyJson: unknown;
      try {
        bodyJson = await req.json();
      } catch {
        return json(400, { error: "Requisição inválida." });
      }

      const parsed = EmptyBodySchema.safeParse(bodyJson);
      if (!parsed.success) {
        return json(400, { error: "Requisição inválida." });
      }
    }

    // 1) Validar o token com o client público (compatível com ES256)
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return json(401, { error: "Você precisa estar logado para continuar." });
    }

    // 2) Operações no banco com service-role (bypass RLS onde necessário)
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verificar se o utilizador já está numa Casa DK
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

    // Gerar código único (6-8 chars aleatórios)
    const inviteCode = crypto.randomUUID().slice(0, 8).toUpperCase();

    // Criar couple_space
    const { data: space, error: spaceError } = await supabase
      .from("couple_spaces")
      .insert({ invite_code: inviteCode })
      .select()
      .single();

    if (spaceError) {
      throw spaceError;
    }

    // Adicionar o criador como primeiro membro
    const { error: memberError } = await supabase.from("members").insert({
      couple_space_id: space.id,
      user_id: userId,
    });

    if (memberError) {
      throw memberError;
    }

    return json(200, {
      couple_space_id: space.id,
      invite_code: inviteCode,
    });
  } catch (error: any) {
    console.error("Error in create-couple-space:", error);
    return json(500, { error: safeErrorMessage(error) });
  }
});
