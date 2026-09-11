import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendFcmMessage, FCM_PROJECT_ID } from "../_shared/fcm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("LOVE_WRAPPED_CRON_SECRET");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Internal server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // Autorização: antes esta função corria com service role sem validar o
    // chamador (verify_jwt=false no config.toml) e percorria TODOS os
    // espaços — qualquer pedido HTTP disparava a geração global. Agora
    // exige ou o segredo partilhado do agendador, ou uma sessão de admin.
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");

    let authorized = false;
    if (cronSecret && providedSecret && providedSecret === cronSecret) {
      authorized = true;
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) {
        const { data: adminRow } = await sb.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
        authorized = !!adminRow;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which month to generate (previous month)
    const now = new Date();
    let month = now.getMonth(); // 0-indexed, so this is previous month
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    // Allow override via body
    let overwrite = false;
    try {
      const body = await req.json();
      if (body.month) month = body.month;
      if (body.year) year = body.year;
      if (body.overwrite) overwrite = body.overwrite;
    } catch { /* no body */ }

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    console.log(`Generating LoveWrapped for ${month}/${year}`);

    // Get all couple spaces (streak_count comes from couple_spaces after V5 refactor)
    const { data: spaces, error: fetchError } = await sb.from("couple_spaces").select("id, house_name, streak_count");

    if (fetchError) {
      console.error("Error fetching spaces:", fetchError.message);
      return new Response(JSON.stringify({ error: `Fetch error: ${fetchError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!spaces || spaces.length === 0) {
      console.warn("No couple spaces found in database.");
      return new Response(JSON.stringify({ message: "No couple spaces found", total_spaces: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${spaces.length} spaces to process.`);

    let processed = 0;
    const failures: { id: string; name: string; error: string }[] = [];

    // Access token Google FCM obtido uma única vez para todo o batch
    let fcmAccessToken: string | null = null;
    if (fcmClientEmail && fcmPrivateKey) {
      try {
        fcmAccessToken = await getFcmAccessToken(fcmClientEmail, fcmPrivateKey);
      } catch (e: any) {
        console.error("FCM token fetch failed:", e.message);
      }
    }

    for (const space of spaces) {
      const spaceId = space.id;
      const spaceName = space.house_name || spaceId;

      try {
        console.log(`- Processing space: ${spaceName}`);

        // Count messages
        const { count: messagesCount, error: msgErr } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);
        if (msgErr) throw new Error(`Messages check failed: ${msgErr.message}`);
        console.log(`  - Messages: ${messagesCount}`);

        // Count memories (photos)
        const { count: memoriesCount, error: photoErr } = await sb
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);
        if (photoErr) throw new Error(`Photos check failed: ${photoErr.message}`);
        console.log(`  - Photos: ${memoriesCount}`);

        // Count challenges completed
        const { count: challengesCount, error: challErr } = await sb
          .from("couple_challenges")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .eq("is_completed", true)
          .gte("completed_at", monthStart)
          .lt("completed_at", monthEnd);
        if (challErr) throw new Error(`Challenges check failed: ${challErr.message}`);
        console.log(`  - Challenges: ${challengesCount}`);

        // Streak comes from couple_spaces.streak_count (love_streaks was dropped in V5)
        const streakDays = (space as any).streak_count ?? 0;
        console.log(`  - Streak: ${streakDays}`);

        // Count mood checkins
        const { data: moodEntries, error: moodErr } = await sb
          .from("mood_checkins")
          .select("mood_key")
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);
        if (moodErr) throw new Error(`Mood check failed: ${moodErr.message}`);
        console.log(`  - Moods: ${moodEntries?.length ?? 0}`);

        const moodCount = moodEntries?.length ?? 0;

        // Calculate top_mood
        let topMood = null;
        if (moodEntries && moodEntries.length > 0) {
          const counts: Record<string, number> = {};
          moodEntries.forEach(m => {
            counts[m.mood_key] = (counts[m.mood_key] || 0) + 1;
          });
          topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }

        // Check if already generated for this space/month/year
        const { data: existing, error: checkError } = await sb
          .from("love_wrapped")
          .select("id")
          .eq("couple_space_id", spaceId)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle();

        if (checkError) throw new Error(`Check existing failed: ${checkError.message}`);

        let shouldNotify = true;

        if (existing) {
          if (!overwrite) {
            console.log(`  - Record exists (ID: ${existing.id}) and overwrite=false — a ignorar.`);
            processed++;
            continue;
          }
          console.log(`  - Record exists (ID: ${existing.id}), updating...`);
          const { error: updateError } = await sb
            .from("love_wrapped")
            .update({
              messages_count: messagesCount ?? 0,
              memories_count: memoriesCount ?? 0,
              challenges_completed: challengesCount ?? 0,
              streak_days: streakDays,
              mood_checkins: moodCount,
              top_mood: topMood,
              generated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) throw new Error(`Update failed: ${updateError.message}`);
          console.log(`  - Update: SUCCESS`);
        } else {
          console.log(`  - No record found, inserting...`);
          const { error: insertError } = await sb
            .from("love_wrapped")
            .insert({
              couple_space_id: spaceId,
              month,
              year,
              messages_count: messagesCount ?? 0,
              memories_count: memoriesCount ?? 0,
              challenges_completed: challengesCount ?? 0,
              streak_days: streakDays,
              mood_checkins: moodCount,
              top_mood: topMood,
            });

          if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
          console.log(`  - Insert: SUCCESS`);
        }

        // --- SEND NOTIFICATION (via FCM, mesmo caminho do send-push) ---
        if (shouldNotify) {
          try {
            const { data: subs } = await sb
              .from("push_subscriptions")
              .select("id, fcm_token, user_id")
              .eq("couple_space_id", spaceId)
              .not("fcm_token", "is", null);

            if (subs && subs.length > 0 && fcmAccessToken) {
              let sent = 0;
              for (const sub of subs as any[]) {
                const result = await sendFcmMessage(
                  fcmAccessToken,
                  FCM_PROJECT_ID,
                  sub.fcm_token,
                  "O vosso mês está pronto",
                  "O resumo LoveWrapped deste mês já está disponível. Querem reviver?",
                  "/wrapped"
                );
                if (result.ok) {
                  sent++;
                } else if (result.error === "UNREGISTERED" || result.error === "INVALID_ARGUMENT") {
                  await sb.from("push_subscriptions").delete().eq("id", sub.id);
                }
              }
              console.log(`  - Push Sent: ${sent}/${subs.length} recipients`);

              // Registar em notification_history para que smart-notifications
              // não envie um segundo "wrapped_ready" (cooldown 72h)
              for (const sub of subs as any[]) {
                if (sub.user_id) {
                  await sb.from("notification_history").insert({
                    user_id: sub.user_id,
                    couple_space_id: spaceId,
                    rule_key: "wrapped_ready",
                  }).then(() => {}); // fire-and-forget, falha silenciosamente
                }
              }
            } else if (!fcmAccessToken) {
              console.warn("  - Push skipped: FCM credentials not configured");
            }
          } catch (pushErr: any) {
            console.error(`  - Push Failed for ${spaceId}:`, pushErr.message);
          }
        }

        processed++;
      } catch (err: any) {
        console.error(`Error processing space ${spaceName}:`, err.message);
        failures.push({ id: spaceId, name: spaceName, error: err.message });
      }
    }

    console.log(`Final stats: ${processed} processed, ${failures.length} failures, ${spaces.length} total.`);

    return new Response(
      JSON.stringify({
        success: true,
        total_spaces: spaces.length,
        processed,
        generated: processed, // Backward compatibility
        failures,
        month,
        year
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
