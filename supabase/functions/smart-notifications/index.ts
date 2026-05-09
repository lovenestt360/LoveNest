import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ══════════════════════════════════════════════════════════════════════
// LoveNest — Smart Emotional Notifications
//
// Rules fire in priority order. Only 1 rule per user per run.
// Max 2 smart notifications per user per day.
// Each rule has its own cooldown to prevent repetition.
//
// Healthy hours: 8h–22h in the user's local timezone.
// ══════════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Message banks — pick randomly for variety ──────────────────────────
const MSGS = {
  streak_risk: [
    { title: "A chama ainda espera pelos dois 🔥", body: "O dia está quase a terminar. Um pequeno gesto protege o que construíram juntos." },
    { title: "Não deixem o dia terminar sem um gesto ❤️", body: "A vossa sequência precisa de vocês hoje. Um gesto é suficiente." },
    { title: "A vossa chama espera 🕯️", body: "Façam o check-in antes da meia-noite e mantenham a chama viva." },
  ],
  long_absence: [
    { title: "O vosso ninho sente falta de movimento 🕊️", body: "Pequenos gestos mantêm grandes amores vivos." },
    { title: "Voltam quando quiserem ❤️", body: "O vosso espaço está aqui, à vossa espera." },
    { title: "Já há algum tempo sem visitar o vosso ninho ✨", body: "Uma mensagem, um gesto — o que quiserem. Estamos aqui." },
  ],
  partner_active: [
    { title: "O teu par esteve presente hoje ❤️", body: "Vai ver o que está a acontecer no vosso ninho." },
    { title: "Há movimento no vosso ninho 🏠", body: "O teu amor passou por aqui. Talvez valha a pena dar uma vista de olhos." },
    { title: "O teu par deixou algo para ti 💛", body: "Entra e descobre o que aconteceu hoje." },
  ],
  mission_almost: [
    { title: "Falta só um gesto para proteger a chama hoje 🔥", body: "Estão quase lá. Um pequeno passo faz toda a diferença." },
    { title: "A chama agradece o esforço ✨", body: "Mais um gesto e o dia fica completo para a vossa chama." },
    { title: "Tão perto de um dia perfeito 💛", body: "Só falta um gesto para completar as missões de hoje." },
  ],
  gentle_reminder: [
    { title: "Como estás hoje? 💛", body: "O teu par pode querer saber. Regista o teu humor e partilha este momento." },
    { title: "Um pensamento sobre vocês 🌿", body: "Como está o vosso dia? Um gesto de carinho pode mudar tudo." },
    { title: "O teu par vai querer saber como te sentes 💛", body: "Abre a app e partilha o teu humor. É rápido e vale muito." },
  ],
  capsule_soon: [
    { title: "A vossa cápsula será aberta em breve 🕰️", body: "Uma mensagem do passado está prestes a chegar. Preparem-se para reviver." },
    { title: "O tempo está quase chegando ✉️", body: "A vossa cápsula do tempo abre nos próximos dias. Uma surpresa a caminho." },
  ],
  wrapped_ready: [
    { title: "O vosso Wrapped está pronto ✨", body: "O resumo do vosso mês de amor está à vossa espera." },
    { title: "Este mês em números e emoções 💛", body: "Vejam juntos o que viveram este mês. Vai surpreender." },
    { title: "Um mês de amor em imagens e gestos 🌟", body: "O vosso Wrapped do mês está criado. Abram juntos!" },
  ],
  streak_milestone: [
    { title: "Uma conquista de amor! 🏆", body: "Parabéns por este recorde de dias juntos. Que inspiração!" },
    { title: "Que casal extraordinário! ✨", body: "A vossa dedicação diária é de admirar. Continuem assim." },
    { title: "Este marco é vosso 💛", body: "Atingiram um novo recorde de dias consecutivos. O amor agradece." },
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Cooldowns per rule (hours) ─────────────────────────────────────────
const COOLDOWNS: Record<string, number> = {
  streak_risk:       6,
  long_absence:     24,
  partner_active:    6,
  mission_almost:   10,
  gentle_reminder:  16,
  capsule_soon:     48,
  wrapped_ready:    72,
  streak_milestone: 168, // 7 days
};

// ── URL routing per rule ──────────────────────────────────────────────
const RULE_URLS: Record<string, string> = {
  streak_risk:      "/lovestreak",
  long_absence:     "/",
  partner_active:   "/",
  mission_almost:   "/lovestreak",
  gentle_reminder:  "/humor",
  capsule_soon:     "/capsula",
  wrapped_ready:    "/wrapped",
  streak_milestone: "/lovestreak",
};

// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
  const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPub      = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPriv     = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const sb            = createClient(supabaseUrl, serviceKey);

  const now           = new Date();
  const todayISO      = now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const nowMs         = now.getTime();

  let totalSent = 0;
  let scannedSpaces = 0;

  try {
    // 1. Load all couple spaces with their members
    const { data: spaces, error: err } = await sb
      .from("couple_spaces")
      .select("id, streak_count, last_streak_date, members(user_id, profiles(display_name, timezone))");

    if (err) throw err;

    // Preload web-push once
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

      // ── Pre-fetch shared couple data ──────────────────────────────

      // Today's activity (streak/mission/mood)
      const { data: todayActivity } = await sb
        .from("daily_activity")
        .select("user_id, type")
        .eq("couple_space_id", spaceId)
        .eq("activity_date", todayISO);

      const activeUsersToday = new Set((todayActivity || []).map((r: any) => r.user_id));

      // Pending time capsules (unlock in 1–5 days)
      const in5Days = new Date(nowMs + 5 * 86400000).toISOString();
      const { data: capsules } = await sb
        .from("time_capsules")
        .select("id, unlock_at")
        .eq("couple_space_id", spaceId)
        .gt("unlock_at", now.toISOString())
        .lte("unlock_at", in5Days);

      // Wrapped this month
      const thisMonth = now.getMonth() + 1;
      const thisYear  = now.getFullYear();
      const { data: wrapped } = await sb
        .from("love_wrapped")
        .select("id")
        .eq("couple_space_id", spaceId)
        .eq("month", thisMonth)
        .eq("year", thisYear)
        .maybeSingle();

      // Today's missions completion (count distinct completed types)
      // A mission is "couple-completed" when both users have the activity type
      const typeMap: Record<string, Set<string>> = {};
      for (const row of (todayActivity || []) as any[]) {
        if (!typeMap[row.type]) typeMap[row.type] = new Set();
        typeMap[row.type].add(row.user_id);
      }
      const missionTypes = ["message", "checkin", "mood", "prayer"];
      const missionsDone = missionTypes.filter(t => (typeMap[t]?.size ?? 0) >= 2).length;

      // ── Per-member rule evaluation ────────────────────────────────
      for (const member of members) {
        const userId    = member.user_id;
        const profile   = (member.profiles as any) || {};
        const partner   = members.find((m: any) => m.user_id !== userId);
        const partnerName = (partner?.profiles as any)?.display_name || "o teu par";

        // Resolve local hour for this user
        const tz = profile.timezone || "UTC";
        const localHour = parseInt(
          new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now)
        );

        // Only notify during healthy hours (8h–22h local)
        if (localHour < 8 || localHour >= 22) continue;

        // Check daily cap (max 2 smart notifications per user today)
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);

        const { count: dailyCount } = await sb
          .from("notification_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", todayStart.toISOString());

        if ((dailyCount ?? 0) >= 2) continue;

        // Helper: check rule cooldown
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

        // ── RULE ENGINE (priority order) ───────────────────────────
        let rule: string | null = null;
        let msg: { title: string; body: string } | null = null;

        // ── RULE 1: Streak milestone ─────────────────────────────
        // Fires once when streak hits 7, 14, 30, 60, 90, 180, 365
        const streak = (space as any).streak_count ?? 0;
        const MILESTONES = [7, 14, 30, 60, 90, 180, 365];
        if (!rule && MILESTONES.includes(streak) && activeUsersToday.has(userId)) {
          const mKey = `streak_milestone_${streak}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            const base = pick(MSGS.streak_milestone);
            msg = {
              title: base.title,
              body: `${streak} dias de amor consecutivos. ${base.body}`,
            };
          }
        }

        // ── RULE 2: Capsule about to open ──────────────────────
        if (!rule && (capsules?.length ?? 0) > 0) {
          if (!(await recentlySent("capsule_soon"))) {
            rule = "capsule_soon";
            msg = pick(MSGS.capsule_soon);
          }
        }

        // ── RULE 3: Wrapped ready ──────────────────────────────
        if (!rule && wrapped) {
          if (!(await recentlySent("wrapped_ready"))) {
            rule = "wrapped_ready";
            msg = pick(MSGS.wrapped_ready);
          }
        }

        // ── RULE 4: Streak at risk (after 19h, not checked in) ─
        const lastStreak = (space as any).last_streak_date;
        const streakActive = streak > 0;
        const checkedInToday = activeUsersToday.has(userId);
        const partnerCheckedIn = activeUsersToday.has(partner?.user_id);

        if (!rule && streakActive && localHour >= 19 && (!checkedInToday || !partnerCheckedIn)) {
          if (!(await recentlySent("streak_risk"))) {
            rule = "streak_risk";
            msg = pick(MSGS.streak_risk);
          }
        }

        // ── RULE 5: Mission almost complete (3 of 4 done) ────
        if (!rule && missionsDone === 3) {
          if (!(await recentlySent("mission_almost"))) {
            rule = "mission_almost";
            msg = pick(MSGS.mission_almost);
          }
        }

        // ── RULE 6: Partner was active today, user wasn't ────
        const partnerUserId = partner?.user_id;
        if (
          !rule
          && partnerUserId
          && activeUsersToday.has(partnerUserId)
          && !activeUsersToday.has(userId)
        ) {
          if (!(await recentlySent("partner_active"))) {
            rule = "partner_active";
            const base = pick(MSGS.partner_active);
            msg = { title: base.title, body: base.body };
          }
        }

        // ── RULE 7: Long absence (no activity in 2+ days) ───
        if (!rule) {
          const { data: recentAct } = await sb
            .from("daily_activity")
            .select("activity_date")
            .eq("couple_space_id", spaceId)
            .eq("user_id", userId)
            .order("activity_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentAct) {
            const lastActive = new Date(recentAct.activity_date + "T00:00:00Z");
            const hoursInactive = (nowMs - lastActive.getTime()) / 3600000;
            if (hoursInactive >= 48) {
              if (!(await recentlySent("long_absence"))) {
                rule = "long_absence";
                msg = pick(MSGS.long_absence);
              }
            }
          } else {
            // Never logged activity
            if (!(await recentlySent("long_absence"))) {
              rule = "long_absence";
              msg = pick(MSGS.long_absence);
            }
          }
        }

        // ── RULE 8: Gentle daily reminder (no mood logged, before 20h)
        if (!rule && localHour < 20 && !activeUsersToday.has(userId)) {
          if (!(await recentlySent("gentle_reminder"))) {
            rule = "gentle_reminder";
            msg = pick(MSGS.gentle_reminder);
          }
        }

        // ── SEND ─────────────────────────────────────────────────
        if (!rule || !msg) continue;

        // Determine the rule key for cooldown (milestones use dynamic key)
        const cooldownKey = rule.startsWith("streak_milestone_") ? "streak_milestone" : rule;
        const targetUrl   = RULE_URLS[cooldownKey] || "/";

        // Get user's push subscriptions
        const { data: subs } = await sb
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (!subs || subs.length === 0) continue;

        const payload = JSON.stringify({
          title: msg.title,
          body:  msg.body,
          icon:  "/icon-192.png",
          badge: "/icon-192.png",
          data:  { url: targetUrl, type: "smart" },
          vibrate: [100, 50, 100],
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
            user_id:          userId,
            couple_space_id:  spaceId,
            rule_key:         rule,
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
