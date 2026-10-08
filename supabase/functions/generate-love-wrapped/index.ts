import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendFcmMessage, FCM_PROJECT_ID } from "../_shared/fcm.ts";
import { streakAtMonthEnd } from "../_shared/streak.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
      return json({ error: "Internal server configuration error" }, 500);
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // Autorização: segredo partilhado do agendador (x-cron-secret) ou uma
    // sessão de admin. verify_jwt=false no config.toml, por isso é aqui.
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

    if (!authorized) return json({ error: "Não autorizado" }, 401);

    // Mês por omissão: o anterior.
    const now = new Date();
    let month = now.getMonth(); // 0-indexed → é o mês anterior em 1-indexed
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    // Opções no body:
    // - dry_run: calcula e devolve uma prévia por casa. Não escreve
    //   love_wrapped, não obtém token FCM, não envia push, não escreve
    //   notification_history.
    // - silent (ou notify: false): escreve love_wrapped normalmente, mas não
    //   obtém token FCM, não envia push e não escreve notification_history.
    //   Para backfills e testes com dados reais.
    // - couple_space_id: limita a execução a uma casa.
    // - overwrite: atualiza registos já existentes (senão são ignorados).
    let overwrite = false;
    let dryRun = false;
    let notify = true;
    let onlySpaceId: string | null = null;
    try {
      const body = await req.json();
      if (body.month) month = Number(body.month);
      if (body.year) year = Number(body.year);
      overwrite = body.overwrite === true;
      dryRun = body.dry_run === true;
      if (body.silent === true || body.notify === false) notify = false;
      if (typeof body.couple_space_id === "string") onlySpaceId = body.couple_space_id;
    } catch { /* sem body */ }
    if (dryRun) notify = false;

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2020 || year > 2100) {
      return json({ error: "month/year inválidos" }, 400);
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const monthStart = `${year}-${pad(month)}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEndExclusive = `${nextYear}-${pad(nextMonth)}-01`;
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

    console.log(
      `LoveWrapped ${month}/${year}` +
      (dryRun ? " [dry_run]" : "") + (!dryRun && !notify ? " [silent]" : "") +
      (onlySpaceId ? ` [space ${onlySpaceId}]` : ""),
    );

    let spacesQuery = sb.from("couple_spaces").select("id, house_name, streak_count, last_streak_date");
    if (onlySpaceId) spacesQuery = spacesQuery.eq("id", onlySpaceId);
    const { data: spaces, error: fetchError } = await spacesQuery;

    if (fetchError) {
      console.error("Error fetching spaces:", fetchError.message);
      return json({ error: `Fetch error: ${fetchError.message}` }, 500);
    }

    const result = {
      month,
      year,
      dry_run: dryRun,
      notify,
      total_spaces: spaces?.length ?? 0,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      notifications_sent: 0,
      failures: [] as { id: string; name: string; error: string }[],
      preview: [] as Record<string, unknown>[],
    };

    if (!spaces || spaces.length === 0) return json(result);

    // Token FCM só quando vamos mesmo notificar.
    let fcmAccessToken: string | null = null;
    if (notify && fcmClientEmail && fcmPrivateKey) {
      try {
        fcmAccessToken = await getFcmAccessToken(fcmClientEmail, fcmPrivateKey);
      } catch (e: any) {
        console.error("FCM token fetch failed:", e.message);
      }
    }

    // Utilizadores já notificados nesta execução — um utilizador com vários
    // dispositivos recebe push em todos, mas só gera um notification_history.
    const historyLogged = new Set<string>();

    for (const space of spaces) {
      const spaceId = space.id;
      const spaceName = space.house_name || spaceId;

      try {
        const { count: messagesCount, error: msgErr } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEndExclusive);
        if (msgErr) throw new Error(`Messages check failed: ${msgErr.message}`);

        const { count: memoriesCount, error: photoErr } = await sb
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEndExclusive);
        if (photoErr) throw new Error(`Photos check failed: ${photoErr.message}`);

        const { count: challengesCount, error: challErr } = await sb
          .from("couple_challenges")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .eq("is_completed", true)
          .gte("completed_at", monthStart)
          .lt("completed_at", monthEndExclusive);
        if (challErr) throw new Error(`Challenges check failed: ${challErr.message}`);

        // Streak vivo no último dia do mês, reconstruído a partir do ledger
        // (ver _shared/streak.ts). Antes usava streak_count atual, que fica
        // parado em casas inativas e, num backfill, refletia o mês errado.
        const { data: ledgerDays, error: ledgerErr } = await sb
          .from("lovepoints_ledger")
          .select("created_at")
          .eq("couple_space_id", spaceId)
          .eq("source", "streak_diario")
          .lt("created_at", monthEndExclusive);
        if (ledgerErr) throw new Error(`Streak ledger failed: ${ledgerErr.message}`);

        const streakDays = streakAtMonthEnd({
          countedDays: (ledgerDays ?? []).map((r: any) => String(r.created_at)),
          monthEnd: lastDayOfMonth,
          currentStreak: (space as any).streak_count ?? 0,
          currentLastDate: (space as any).last_streak_date ?? null,
        });

        const { data: moodEntries, error: moodErr } = await sb
          .from("mood_checkins")
          .select("mood_key")
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEndExclusive);
        if (moodErr) throw new Error(`Mood check failed: ${moodErr.message}`);

        const moodCount = moodEntries?.length ?? 0;
        let topMood: string | null = null;
        if (moodEntries && moodEntries.length > 0) {
          const counts: Record<string, number> = {};
          moodEntries.forEach((m) => { counts[m.mood_key] = (counts[m.mood_key] || 0) + 1; });
          topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }

        const stats = {
          messages_count: messagesCount ?? 0,
          memories_count: memoriesCount ?? 0,
          challenges_completed: challengesCount ?? 0,
          streak_days: streakDays,
          mood_checkins: moodCount,
          top_mood: topMood,
        };

        const { data: existing, error: checkError } = await sb
          .from("love_wrapped")
          .select("id")
          .eq("couple_space_id", spaceId)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle();
        if (checkError) throw new Error(`Check existing failed: ${checkError.message}`);

        const action = existing ? (overwrite ? "update" : "skip") : "insert";

        if (dryRun) {
          result.preview.push({ couple_space_id: spaceId, house_name: spaceName, ...stats, would: action });
          result.processed++;
          continue;
        }

        if (action === "skip") {
          result.skipped++;
          result.processed++;
          continue;
        }

        if (action === "update") {
          const { error: updateError } = await sb
            .from("love_wrapped")
            .update({ ...stats, generated_at: new Date().toISOString() })
            .eq("id", existing!.id);
          if (updateError) throw new Error(`Update failed: ${updateError.message}`);
          result.updated++;
        } else {
          const { error: insertError } = await sb
            .from("love_wrapped")
            .insert({ couple_space_id: spaceId, month, year, ...stats });
          if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
          result.inserted++;
        }
        result.processed++;

        // --- Notificação (FCM, mesmo caminho do send-push) ---
        if (!notify) continue;
        if (!fcmAccessToken) {
          console.warn("  - Push skipped: FCM credentials not configured");
          continue;
        }

        try {
          const { data: subs } = await sb
            .from("push_subscriptions")
            .select("id, fcm_token, user_id")
            .eq("couple_space_id", spaceId)
            .not("fcm_token", "is", null);

          // Só utilizadores com pelo menos um envio bem-sucedido entram em
          // notification_history (é isso que impede smart-notifications de
          // reenviar "wrapped_ready" durante 72h). Antes registava toda a
          // gente com subscrição, mesmo quando o envio tinha falhado.
          const delivered = new Set<string>();
          for (const sub of (subs ?? []) as any[]) {
            const r = await sendFcmMessage(
              fcmAccessToken,
              FCM_PROJECT_ID,
              sub.fcm_token,
              "O vosso mês está pronto",
              "O resumo LoveWrapped deste mês já está disponível. Querem reviver?",
              "/wrapped",
            );
            if (r.ok) {
              result.notifications_sent++;
              if (sub.user_id) delivered.add(sub.user_id);
            } else if (r.error === "UNREGISTERED" || r.error === "INVALID_ARGUMENT") {
              await sb.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }

          for (const userId of delivered) {
            if (historyLogged.has(userId)) continue;
            historyLogged.add(userId);
            const { error: histErr } = await sb.from("notification_history").insert({
              user_id: userId,
              couple_space_id: spaceId,
              rule_key: "wrapped_ready",
            });
            if (histErr) console.error(`  - notification_history failed for ${userId}:`, histErr.message);
          }
        } catch (pushErr: any) {
          console.error(`  - Push failed for ${spaceId}:`, pushErr.message);
        }
      } catch (err: any) {
        console.error(`Error processing space ${spaceName}:`, err.message);
        result.failures.push({ id: spaceId, name: spaceName, error: err.message });
      }
    }

    console.log(
      `Done: inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped} ` +
      `notifications_sent=${result.notifications_sent} failures=${result.failures.length}`,
    );

    if (!dryRun) delete (result as any).preview;
    return json(result);
  } catch (error: any) {
    return json({ error: error.message }, 500);
  }
});
