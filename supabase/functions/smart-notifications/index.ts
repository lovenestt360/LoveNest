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
  // 1. Silent Day Reminder — casal: nenhum ativo; solo: utilizador inativo
  silent_day: [
    { title: "O vosso espaço", body: "O vosso espaço esteve silencioso hoje." },
    { title: "Ainda há tempo", body: "Hoje ainda podem aparecer um para o outro." },
    { title: "O vosso ninho", body: "Pequenos gestos mantêm o ninho vivo." },
    { title: "Um momento", body: "Ainda há espaço para um momento hoje." },
  ],
  silent_day_solo: [
    { title: "O teu espaço", body: "O teu espaço esteve silencioso hoje." },
    { title: "Ainda há tempo", body: "Hoje ainda podes aparecer por ti." },
    { title: "Um pequeno gesto", body: "Pequenos gestos mantêm a chama viva." },
  ],

  // 2. Partner Presence — parceiro ativo, utilizador não (só casal)
  partner_active: [
    { title: "Presença no ninho", body: "O teu par esteve presente hoje." },
    { title: "Um gesto no vosso espaço", body: "O teu par deixou um gesto no vosso espaço." },
    { title: "Presença", body: "Hoje alguém apareceu para vocês." },
  ],

  // 3. Flame Risk — streak em risco
  flame_risk: [
    { title: "A chama", body: "A chama sente falta dos dois." },
    { title: "Ainda a tempo", body: "Hoje ainda podem proteger o vosso momento." },
    { title: "A presença conta", body: "A presença de hoje ainda conta." },
  ],
  flame_risk_solo: [
    { title: "A tua chama", body: "A chama sente falta de ti." },
    { title: "Ainda a tempo", body: "Hoje ainda podes cuidar do teu momento." },
    { title: "A tua presença conta", body: "A tua presença de hoje ainda conta." },
  ],

  // 4. Perfect Day — todas as missões completas
  perfect_day: [
    { title: "O vosso espaço", body: "Hoje o vosso espaço esteve completo." },
    { title: "Todos os momentos", body: "Todos os pequenos momentos foram cuidados hoje." },
    { title: "Presença mútua", body: "Hoje escolheram aparecer um para o outro." },
  ],
  perfect_day_solo: [
    { title: "O teu espaço", body: "Hoje o teu espaço esteve completo." },
    { title: "Todos os momentos", body: "Todos os teus pequenos momentos foram cuidados." },
    { title: "Presença plena", body: "Hoje apareceste por ti." },
  ],

  // 5. Milestone — marco de sequência
  milestone: [
    { title: "Uma etapa juntos", body: "O vosso espaço continua a ganhar raízes." },
    { title: "Dias que ficam", body: "Pequenos dias tornam-se grandes memórias." },
    { title: "História em construção", body: "Chegaram a uma nova etapa juntos." },
  ],
  milestone_solo: [
    { title: "Uma etapa", body: "O teu espaço continua a ganhar raízes." },
    { title: "Dias que ficam", body: "Pequenos dias tornam-se grandes memórias." },
    { title: "O teu caminho", body: "Chegaste a uma nova etapa." },
  ],

  // Extra — capsule / wrapped
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
  // Ciclo menstrual (opt-in explícito)
  ciclo_lembrete:           20,
  ciclo_menstruacao:        12,
  ciclo_fertil:             22,
  // Jejum (opt-in via fasting_reminders)
  fasting_registar_dia:     22,
  fasting_oracao:           22,
  fasting_motivacao_dia:    22,
  fasting_hora_terminar:    23,
  fasting_reflexao_noturna: 22,
};

// ── Deep-link per rule ────────────────────────────────────────────────
const RULE_URLS: Record<string, string> = {
  silent_day:     "/",
  partner_active: "/",
  flame_risk:     "/jornada",
  perfect_day:    "/jornada",
  milestone:      "/jornada",
  capsule_soon:   "/capsula",
  wrapped_ready:  "/wrapped",
  ciclo_lembrete:           "/ciclo",
  ciclo_menstruacao:        "/ciclo",
  ciclo_fertil:             "/ciclo",
  fasting_registar_dia:     "/jornada-espiritual?tab=jejum",
  fasting_oracao:           "/jornada-espiritual?tab=oracao",
  fasting_motivacao_dia:    "/jornada-espiritual?tab=jejum",
  fasting_hora_terminar:    "/jornada-espiritual?tab=jejum",
  fasting_reflexao_noturna: "/jornada-espiritual?tab=jejum",
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
      .select("id, streak_count, last_streak_date, members(user_id)");

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
      if (members.length < 1) continue;

      const isSolo = members.length === 1;
      scannedSpaces++;

      // ── Shared couple data ────────────────────────────────────────

      const { data: todayActivity } = await sb
        .from("daily_activity")
        .select("user_id, type")
        .eq("couple_space_id", spaceId)
        .eq("activity_date", todayISO);

      const activeUsersToday = new Set((todayActivity || []).map((r: any) => r.user_id));

      // Perfect day: all missions complete (threshold: 1 solo, 2 casal)
      const typeMap: Record<string, Set<string>> = {};
      for (const row of (todayActivity || []) as any[]) {
        if (!typeMap[row.type]) typeMap[row.type] = new Set();
        typeMap[row.type].add(row.user_id);
      }
      const missionThreshold = isSolo ? 1 : 2;
      // Universal missions (chat/plano + checkin + mood). Prayer/leitura ignorado aqui
      // pois não temos religion em memória nesta query — conservador mas correcto.
      const missionTypes  = isSolo ? ["plano", "checkin", "mood"] : ["message", "checkin", "mood"];
      const missionsDone  = missionTypes.filter(t => (typeMap[t]?.size ?? 0) >= missionThreshold).length;
      const isPerfectDay  = missionsDone === missionTypes.length;

      // Capsule about to open (1–5 days)
      const in5Days = new Date(nowMs + 5 * 86400000).toISOString();
      const { data: capsules } = await sb
        .from("time_capsule_messages")
        .select("id")
        .eq("couple_space_id", spaceId)
        .gt("unlock_date", now.toISOString())
        .lte("unlock_date", in5Days);

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
        const partner = members.find((m: any) => m.user_id !== userId);

        // Fetch timezone from profiles (members.user_id has no FK so no auto-join)
        const { data: profileData } = await sb
          .from("profiles")
          .select("timezone")
          .eq("user_id", userId)
          .maybeSingle();

        // Resolve user's local hour
        const tz        = (profileData as any)?.timezone || "UTC";
        const localHour = parseInt(
          new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now)
        );

        // Healthy hours: 8h–22h
        if (localHour < 8 || localHour >= 22) continue;

        // User notification settings — categories + preferred hour
        const { data: userSettings } = await sb
          .from("notification_settings")
          .select("category, enabled, preferred_hour")
          .eq("user_id", userId);

        const categoryEnabled = (cat: string): boolean => {
          const s = (userSettings || []).find((r: any) => r.category === cat);
          return s ? s.enabled !== false : true; // default: enabled if no setting
        };

        const preferredHour: number | null = (() => {
          const s = (userSettings || []).find((r: any) => r.preferred_hour != null);
          return s?.preferred_hour ?? null;
        })();

        // Ciclo categories: strict opt-in (default false, never send unless user enabled)
        const cicloEnabled = (cat: string): boolean => {
          const s = (userSettings || []).find((r: any) => r.category === cat);
          return s?.enabled === true;
        };

        // If user set a preferred hour, only send within ±2h of that hour
        if (preferredHour !== null) {
          const diff = Math.abs(localHour - preferredHour);
          const wrapped = Math.min(diff, 24 - diff);
          if (wrapped > 2) continue;
        }

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

        // ── FASTING NOTIFICATIONS — lembrete de jejum ativo ─────────
        // Utiliza fasting_reminders (boolean toggles) + fasting_profiles (plano ativo hoje)
        if (!rule) {
          const { data: fReminders } = await sb
            .from("fasting_reminders")
            .select("registar_dia, oracao, hora_terminar, reflexao_noturna, motivacao_dia")
            .eq("user_id", userId)
            .maybeSingle();

          const hasAnyFastPref = fReminders && (
            fReminders.registar_dia || fReminders.oracao ||
            fReminders.hora_terminar || fReminders.reflexao_noturna ||
            fReminders.motivacao_dia
          );

          if (hasAnyFastPref) {
            const { data: fProfile } = await sb
              .from("fasting_profiles")
              .select("until_hour")
              .eq("user_id", userId)
              .eq("is_active", true)
              .lte("start_date", todayISO)
              .gte("end_date", todayISO)
              .maybeSingle();

            if (fProfile) {
              // registar_dia: 8h–9h, só se o utilizador ainda não registou hoje
              if (!rule && fReminders.registar_dia && localHour >= 8 && localHour < 9) {
                const { data: todayLog } = await sb
                  .from("fasting_day_logs")
                  .select("id")
                  .eq("user_id", userId)
                  .eq("day_key", todayISO)
                  .maybeSingle();
                if (!todayLog && !(await recentlySent("fasting_registar_dia"))) {
                  rule = "fasting_registar_dia";
                  msg  = { title: "Jejum", body: "Ainda não registaste o teu dia de jejum." };
                }
              }

              // oracao: 9h–10h
              if (!rule && fReminders.oracao && localHour >= 9 && localHour < 10) {
                if (!(await recentlySent("fasting_oracao"))) {
                  rule = "fasting_oracao";
                  msg  = { title: "Oração", body: "Um momento de oração para fortalecer o teu jejum." };
                }
              }

              // motivacao_dia: 12h–13h
              if (!rule && fReminders.motivacao_dia && localHour >= 12 && localHour < 13) {
                if (!(await recentlySent("fasting_motivacao_dia"))) {
                  rule = "fasting_motivacao_dia";
                  msg  = { title: "O teu jejum", body: "Continua forte. O jejum é uma forma de cuidado." };
                }
              }

              // hora_terminar: 25–35 minutos antes do fim do jejum
              if (!rule && fReminders.hora_terminar && fProfile.until_hour) {
                const [fhStr, fmStr] = (fProfile.until_hour as string).split(":");
                const fastEndMin = parseInt(fhStr) * 60 + parseInt(fmStr || "0");
                const nowMin     = localHour * 60 + now.getMinutes();
                const remaining  = fastEndMin - nowMin;
                if (remaining >= 25 && remaining <= 35) {
                  if (!(await recentlySent("fasting_hora_terminar"))) {
                    rule = "fasting_hora_terminar";
                    msg  = { title: "O teu jejum", body: "O teu jejum termina em cerca de 30 minutos." };
                  }
                }
              }

              // reflexao_noturna: 20h–21h
              if (!rule && fReminders.reflexao_noturna && localHour >= 20 && localHour < 21) {
                if (!(await recentlySent("fasting_reflexao_noturna"))) {
                  rule = "fasting_reflexao_noturna";
                  msg  = { title: "Reflexão", body: "Um momento de reflexão sobre o teu dia de jejum." };
                }
              }
            }
          }
        }

        // ── CICLO NOTIFICATIONS — lembrete menstrual (opt-in explícito) ──
        if (!rule) {
          const cicloLembrete    = cicloEnabled("ciclo_lembrete");
          const cicloMenstruacao = cicloEnabled("ciclo_menstruacao");
          const cicloFertil      = cicloEnabled("ciclo_fertil");

          if (cicloLembrete || cicloMenstruacao || cicloFertil) {
            const { data: cycleProfile } = await sb
              .from("cycle_profiles")
              .select("avg_cycle_length, luteal_length")
              .eq("user_id", userId)
              .maybeSingle();

            if (cycleProfile) {
              const cycleLen  = (cycleProfile.avg_cycle_length as number) || 28;
              const lutealLen = (cycleProfile.luteal_length as number) || 14;

              const { data: lastPeriod } = await sb
                .from("period_entries")
                .select("start_date")
                .eq("user_id", userId)
                .order("start_date", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastPeriod?.start_date) {
                const lastStart  = new Date((lastPeriod.start_date as string) + "T00:00:00Z");
                const nextStart  = new Date(lastStart.getTime() + cycleLen * 86400000);
                const daysUntil  = Math.round((nextStart.getTime() - nowMs) / 86400000);

                // Janela fértil: ovulação ≈ cycleLen − lutealLen dias após o início
                const ovDay      = cycleLen - lutealLen;
                const fertileFrom = new Date(lastStart.getTime() + (ovDay - 3) * 86400000);
                const fertileTo   = new Date(lastStart.getTime() + (ovDay + 2) * 86400000);
                const inFertile   = now >= fertileFrom && now <= fertileTo;

                // ciclo_menstruacao: período esperado em 1–2 dias
                if (!rule && cicloMenstruacao && (daysUntil === 1 || daysUntil === 2)) {
                  if (!(await recentlySent("ciclo_menstruacao"))) {
                    rule = "ciclo_menstruacao";
                    msg  = { title: "O teu ciclo", body: daysUntil === 1
                      ? "O teu período pode chegar amanhã."
                      : "O teu período pode chegar em breve." };
                  }
                }

                // ciclo_fertil: dentro da janela fértil
                if (!rule && cicloFertil && inFertile) {
                  if (!(await recentlySent("ciclo_fertil"))) {
                    rule = "ciclo_fertil";
                    msg  = { title: "O teu ciclo", body: "Estás na tua janela fértil." };
                  }
                }
              }

              // ciclo_lembrete: lembrete geral 8h–10h
              if (!rule && cicloLembrete && localHour >= 8 && localHour < 10) {
                if (!(await recentlySent("ciclo_lembrete"))) {
                  rule = "ciclo_lembrete";
                  msg  = { title: "O teu ciclo", body: "Consulta o teu ciclo menstrual." };
                }
              }
            }
          }
        }

        // ── RULE 1: Perfect Day (highest emotional value) ───────────
        if (!rule && isPerfectDay && myActiveToday && categoryEnabled("engagement")) {
          const mKey = `perfect_day_${todayISO}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            msg  = pick(isSolo ? MSGS.perfect_day_solo : MSGS.perfect_day);
          }
        }

        // ── RULE 2: Streak Milestone ─────────────────────────────────
        const MILESTONES = [7, 14, 30, 50, 100, 365];
        if (!rule && MILESTONES.includes(streak) && myActiveToday && categoryEnabled("engagement")) {
          const mKey = `milestone_${streak}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            const base = pick(isSolo ? MSGS.milestone_solo : MSGS.milestone);
            msg  = { title: base.title, body: `${streak} dias. ${base.body}` };
          }
        }

        // ── RULE 3: Capsule soon ─────────────────────────────────────
        if (!rule && (capsules?.length ?? 0) > 0 && categoryEnabled("system")) {
          if (!(await recentlySent("capsule_soon"))) {
            rule = "capsule_soon";
            msg  = pick(MSGS.capsule_soon);
          }
        }

        // ── RULE 4: Wrapped ready ────────────────────────────────────
        if (!rule && wrapped && categoryEnabled("system")) {
          if (!(await recentlySent("wrapped_ready"))) {
            rule = "wrapped_ready";
            msg  = pick(MSGS.wrapped_ready);
          }
        }

        // ── RULE 5: Flame Risk — streak > 0, after 19h, not active ──
        const flameRisk = isSolo
          ? (streak > 0 && localHour >= 19 && !myActiveToday)
          : (streak > 0 && localHour >= 19 && (!myActiveToday || !partnerActive));
        if (!rule && flameRisk && categoryEnabled("engagement")) {
          if (!(await recentlySent("flame_risk"))) {
            rule = "flame_risk";
            msg  = pick(isSolo ? MSGS.flame_risk_solo : MSGS.flame_risk);
          }
        }

        // ── RULE 6: Partner Presence — só para casal ────────────────
        // ~35% dos triggers — mantém raro e significativo
        if (!rule && !isSolo && partnerUserId && partnerActive && !myActiveToday && categoryEnabled("partner")) {
          if (!(await recentlySent("partner_active"))) {
            rule = "partner_active";
            msg  = pick(MSGS.partner_active);
          }
        }

        // ── RULE 7: Silent Day — 19h–21h, sem actividade ────────────
        const silentCondition = isSolo
          ? (!myActiveToday && localHour >= 19 && localHour < 21)
          : (!myActiveToday && !partnerActive && localHour >= 19 && localHour < 21);
        if (!rule && silentCondition && categoryEnabled("emotion")) {
          if (!(await recentlySent("silent_day"))) {
            const { count: yesterdayCount } = await sb
              .from("daily_activity")
              .select("id", { count: "exact", head: true })
              .eq("couple_space_id", spaceId)
              .eq("user_id", userId)
              .eq("activity_date", yesterdayISO);

            const recentPerfect =
              await recentlySent(`perfect_day_${todayISO}`) ||
              await recentlySent(`perfect_day_${yesterdayISO}`);

            if ((yesterdayCount ?? 0) < 3 && !recentPerfect) {
              rule = "silent_day";
              msg  = pick(isSolo ? MSGS.silent_day_solo : MSGS.silent_day);
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

          if (hoursInactive >= 48 && categoryEnabled("emotion")) {
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
