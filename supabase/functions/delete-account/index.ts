import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller's JWT — never trust the client to say who they are
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (!user || authError) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const uid = user.id;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // ── 1. Remove from couple space ───────────────────────────────────────
    await admin.from("members").delete().eq("user_id", uid);

    // ── 2. Delete personal data ───────────────────────────────────────────
    // Each table is deleted independently — a failure in one shouldn't
    // block the others; we log and continue.
    const tables = [
      "profiles",
      "push_subscriptions",
      "notification_settings",
      "notification_history",
      "daily_activity",
      "mood_checkins",
      "daily_spiritual_logs",
      "relationship_milestones",
    ];

    for (const table of tables) {
      const { error } = await admin.from(table as any).delete().eq("user_id", uid);
      if (error) console.warn(`[delete-account] ${table}:`, error.message);
    }

    // ── 3. Delete auth user (irreversible — must be last) ─────────────────
    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) throw deleteError;

    console.log(`[delete-account] deleted user ${uid}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[delete-account] error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
