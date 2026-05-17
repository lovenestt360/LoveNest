import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ══════════════════════════════════════════════════════════════════════
// LoveNest — Emotional Notification System V1
//
// 5 notification categories (spec V1):
//   1. silent_day     — neither partner active today, 19h–21h local
//   2. partner_active — partner interacted, user hasn't
//   3. flame_risk     — streak at risk, end of day
//   4. perfect_day    — both partners completed all missions today
//   5. milestone      — streak milestone reached
//
// Extra (kept for product value, not in V1 spec):
//   capsule_soon, wrapped_ready
//
// Rules:
//   - Max 2 notifications/user/day
//   - Per-rule cooldowns prevent repetition
//   - Only during healthy hours: 8h–22h local
//   - No urgency, no guilt, no pressure
// ══════════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Message banks ──────────────────────────────────────────────────────
// Tone: calm · intimate · emotionally warm · no emojis · no urgency
const MSGS = {
  // 1. Silent Day Reminder — neither partner active, 19h–21h
  silent_day: [
    { title: "O vosso espaço", body: "O vosso espaço esteve silencioso hoje." },
    { title: "Ainda há tempo", body: "Hoje ainda podem aparecer um para o outro." },
    { title: "O vosso ninho", body: "Pequenos gestos mantêm o ninho vivo." },
    { title: "Um momento", body: "Ainda há espaço para um momento hoje." },
  ],

  // 2. Partner Presence — partner active, user hasn't checked in
  partner_active: [
    { title: "Presença no ninho", body: "O teu par esteve presente hoje." },
    { title: "Um gesto no vosso espaço", body: "O teu par deixou um gesto no vosso espaço." },
    { title: "Presença", body: "Hoje alguém apareceu para vocês." },
  ],

  // 3. Flame Risk — streak at risk after 19h
  flame_risk: [
    { title: "A chama", body: "A chama sente falta dos dois." },
    { title: "Ainda a tempo", body: "Hoje ainda podem proteger o vosso momento." },
    { title: "A presença conta", body: "A presença de hoje ainda conta." },
  ],

  // 4. Perfect Day — both partners completed all missions
  perfect_day: [
    { title: "O vosso espaço", body: "Hoje o vosso espaço esteve completo." },
    { title: "Todos os momentos", body: "Todos os pequenos momentos foram cuidados hoje." },
    { title: "Presença mútua", body: "Hoje escolheram aparecer um para o outro." },
  ],

  // 5. Milestone — streak milestone reached
  milestone: [
    { title: "Uma etapa juntos", body: "O vosso espaço continua a ganhar raízes." },
    { title: "Dias que ficam", body: "Pequenos dias tornam-se grandes memórias." },
    { title: "História em construção", body: "Chegaram a uma nova etapa juntos." },
  ],

  // Extra — capsule / wrapped (product value, kept from previous version)
  capsule_soon: [
    { title: "A vossa cápsula", body: "Uma mensagem do passado está prestes a chegar." },
    { title: "O tempo passa", body: "A vossa cápsula do tempo abre nos próximos dias." },
  ],
  wrapped_ready: [
    { title: "O vosso mês", body: "O resumo do vosso mês está à vossa espera." },
    { title: "Um mês em memórias", body: "Vejam juntos o que viveram este mês." },
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Cooldowns per rule (hours) ─────────────────────────────────────────
const COOLDOWNS: Record<string, number> = {
  silent_day:     16,
  partner_active:  8,
  flame_risk:      8,
  perfect_day:    20,
  milestone:     168, // 7 days
  capsule_soon:   48,
  wrapped_ready:  72,
};

// ── Deep-link per rule ────────────────────────────────────────────────
const RULE_URLS: Record<string, string> = {
  silent_day:     "/",
  partner_active: "/",
  flame_risk:     "/lovestreak",
  perfect_day:    "/lovestreak",
  milestone:      "/lovestreak",
  capsule_soon:   "/capsula",
  wrapped_ready:  "/wrapped",
};

// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPub    = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPriv   = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const sb          = createClient(supabaseUrl, serviceKey);

  const now         = new Date();
  const todayISO    = now.toISOString().slice(0, 10);
  const nowMs       = now.getTime();
  const yesterdayISO = new Date(nowMs - 86400000).toISOString().slice(0, 10);

  let totalSent     = 0;
  let scannedSpaces = 0;

  try {
    const { data: spaces, error: err } = await sb
      .from("couple_spaces")
      .select("id, streak_count, last_streak_date, members(user_id, profiles(display_name, timezone))");

    if (err) throw err;

    const webpush = await import("npm:web-push");
    webpush.default.setVapidDetails(
      "mailto:app@lovenestt.lovable.app",
      vapidPub.trim(),
      vapidPriv.trim()
    );

    for (const space of (spaces || [])) {
      const spaceId = space.id;
      const members = (space.members as any[]) || [];
      if (members.length < 2) continue;

      scannedSpaces++;

      // ── Shared couple data ────────────────────────────────────────

      const { data: todayActivity } = await sb
        .from("daily_activity")
        .select("user_id, type")
        .eq("couple_space_id", spaceId)
        .eq("activity_date", todayISO);

      const activeUsersToday = new Set((todayActivity || []).map((r: any) => r.user_id));

      // Perfect day: all 4 missions complete by both partners
      const typeMap: Record<string, Set<string>> = {};
      for (const row of (todayActivity || []) as any[]) {
        if (!typeMap[row.type]) typeMap[row.type] = new Set();
        typeMap[row.type].add(row.user_id);
      }
      const missionTypes  = ["message", "checkin", "mood", "prayer"];
      const missionsDone  = missionTypes.filter(t => (typeMap[t]?.size ?? 0) >= 2).length;
      const isPerfectDay  = missionsDone === missionTypes.length;

      // Capsule about to open (1–5 days)
      const in5Days = new Date(nowMs + 5 * 86400000).toISOString();
      const { data: capsules } = await sb
        .from("time_capsules")
        .select("id")
        .eq("couple_space_id", spaceId)
        .gt("unlock_at", now.toISOString())
        .lte("unlock_at", in5Days);

      // Monthly wrapped
      const { data: wrapped } = await sb
        .from("love_wrapped")
        .select("id")
        .eq("couple_space_id", spaceId)
        .eq("month", now.getMonth() + 1)
        .eq("year", now.getFullYear())
        .maybeSingle();

      // ── Per-member evaluation ─────────────────────────────────────
      for (const member of members) {
        const userId  = member.user_id;
        const profile = (member.profiles as any) || {};
        const partner = members.find((m: any) => m.user_id !== userId);

        // Resolve user's local hour
        const tz        = profile.timezone || "UTC";
        const localHour = parseInt(
          new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now)
        );

        // Healthy hours: 8h–22h
        if (localHour < 8 || localHour >= 22) continue;

        // Daily cap: max 2 smart notifications per user per day
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        const { count: dailyCount } = await sb
          .from("notification_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", todayStart.toISOString());
        if ((dailyCount ?? 0) >= 2) continue;

        // Cooldown helper
        const recentlySent = async (ruleKey: string): Promise<boolean> => {
          const since = new Date(nowMs - (COOLDOWNS[ruleKey] || 24) * 3600000).toISOString();
          const { data } = await sb
            .from("notification_history")
            .select("id")
            .eq("user_id", userId)
            .eq("rule_key", ruleKey)
            .gte("sent_at", since)
            .maybeSingle();
          return !!data;
        };

        const partnerUserId   = partner?.user_id;
        const myActiveToday   = activeUsersToday.has(userId);
        const partnerActive   = partnerUserId ? activeUsersToday.has(partnerUserId) : false;
        const streak          = (space as any).streak_count ?? 0;

        let rule: string | null = null;
        let msg: { title: string; body: string } | null = null;

        // ── RULE 1: Perfect Day (highest emotional value) ───────────
        // Trigger: all missions done by both. Send to both members.
        if (!rule && isPerfectDay && myActiveToday) {
          const mKey = `perfect_day_${todayISO}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            msg  = pick(MSGS.perfect_day);
          }
        }

        // ── RULE 2: Streak Milestone ─────────────────────────────────
        const MILESTONES = [7, 14, 30, 50, 100, 365];
        if (!rule && MILESTONES.includes(streak) && myActiveToday) {
          const mKey = `milestone_${streak}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            const base = pick(MSGS.milestone);
            msg  = { title: base.title, body: `${streak} dias. ${base.body}` };
          }
        }

        // ── RULE 3: Capsule soon ─────────────────────────────────────
        if (!rule && (capsules?.length ?? 0) > 0) {
          if (!(await recentlySent("capsule_soon"))) {
            rule = "capsule_soon";
            msg  = pick(MSGS.capsule_soon);
          }
        }

        // ── RULE 4: Wrapped ready ────────────────────────────────────
        if (!rule && wrapped) {
          if (!(await recentlySent("wrapped_ready"))) {
            rule = "wrapped_ready";
            msg  = pick(MSGS.wrapped_ready);
          }
        }

        // ── RULE 5: Flame Risk — streak > 0, after 19h, not both active
        if (!rule && streak > 0 && localHour >= 19 && (!myActiveToday || !partnerActive)) {
          if (!(await recentlySent("flame_risk"))) {
            rule = "flame_risk";
            msg  = pick(MSGS.flame_risk);
          }
        }

        // ── RULE 6: Partner Presence — partner active, user isn't ───
        // Only fires ~35% of valid triggers — keeps it rare and meaningful
        if (!rule && partnerUserId && partnerActive && !myActiveToday) {
          if (!(await recentlySent("partner_active")) && Math.random() <= 0.35) {
            rule = "partner_active";
            msg  = pick(MSGS.partner_active);
          }
        }

        // ── RULE 7: Silent Day — neither active, 19h–21h ────────────
        // Smarter filtering: skip if yesterday was active or a perfect day happened recently
        if (!rule && !myActiveToday && !partnerActive && localHour >= 19 && localHour < 21) {
          if (!(await recentlySent("silent_day"))) {
            // Skip if user was highly active yesterday (engaged couple, just had an off-day)
            const { count: yesterdayCount } = await sb
              .from("daily_activity")
              .select("id", { count: "exact", head: true })
              .eq("couple_space_id", spaceId)
              .eq("user_id", userId)
              .eq("activity_date", yesterdayISO);

            // Skip if perfect_day notification was sent today or yesterday (positive momentum)
            const recentPerfect =
              await recentlySent(`perfect_day_${todayISO}`) ||
              await recentlySent(`perfect_day_${yesterdayISO}`);

            if ((yesterdayCount ?? 0) < 3 && !recentPerfect) {
              rule = "silent_day";
              msg  = pick(MSGS.silent_day);
            }
          }
        }

        // ── Long absence (48h+ no activity) — lower priority ─────────
        if (!rule) {
          const { data: recentAct } = await sb
            .from("daily_activity")
            .select("activity_date")
            .eq("couple_space_id", spaceId)
            .eq("user_id", userId)
            .order("activity_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          const hoursInactive = recentAct
            ? (nowMs - new Date(recentAct.activity_date + "T00:00:00Z").getTime()) / 3600000
            : Infinity;

          if (hoursInactive >= 48) {
            if (!(await recentlySent("silent_day"))) {
              rule = "silent_day";
              msg  = pick(MSGS.silent_day);
            }
          }
        }

        // ── SEND ─────────────────────────────────────────────────────
        if (!rule || !msg) continue;

        // Derive cooldown key from rule (dynamic keys like perfect_day_2026-05-17 → perfect_day)
        const cooldownKey = rule.startsWith("perfect_day_") ? "perfect_day"
          : rule.startsWith("milestone_")    ? "milestone"
          : rule;

        const targetUrl = RULE_URLS[cooldownKey] || "/";

        const { data: subs } = await sb
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (!subs || subs.length === 0) continue;

        const payload = JSON.stringify({
          title:   msg.title,
          body:    msg.body,
          icon:    "/icon-192.png",
          badge:   "/icon-192.png",
          data:    { url: targetUrl, type: "smart" },
          vibrate: [80, 40, 80],
        });

        let sent = false;
        for (const sub of subs) {
          try {
            await webpush.default.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sent = true;
          } catch (e: any) {
            if (e.statusCode === 410 || e.statusCode === 404) {
              await sb.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }

        if (sent) {
          await sb.from("notification_history").insert({
            user_id:         userId,
            couple_space_id: spaceId,
            rule_key:        rule,
          });
          totalSent++;
          console.log(`[smart-notif] ${rule} → ${userId}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, scanned: scannedSpaces, sent: totalSent }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("[smart-notif] crash:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
