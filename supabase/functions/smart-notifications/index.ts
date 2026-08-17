import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ══════════════════════════════════════════════════════════════════════
// LoveNest — Emotional Notification System V2 (FCM HTTP v1)
//
// 7 notification rules + fasting + ciclo
// Max 2 notifications/user/day · Per-rule cooldowns · 8h–22h local only
// ══════════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── FCM HTTP v1 helpers ───────────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getFcmAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "").replace(/\n/g, "").trim();

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const header  = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600, iat: now,
  })));

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(`${header}.${payload}`));
  const jwt = `${header}.${payload}.${toBase64Url(sig)}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenResp.ok) throw new Error(`Google token exchange failed: ${await tokenResp.text()}`);
  const data = await tokenResp.json();
  return data.access_token as string;
}

async function sendFcmMessage(
  accessToken: string, projectId: string, fcmToken: string,
  title: string, body: string, url: string
): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        data: { url: url || "/" },
        webpush: {
          notification: {
            icon: "https://lovenestt.com/icon-192.png",
            badge: "https://lovenestt.com/icon-192.png",
            tag: "lovenest-smart",
          },
          fcm_options: { link: `https://lovenestt.com${url || "/"}` },
          headers: { TTL: "86400" },
        },
      },
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    const code = errBody?.error?.details?.[0]?.errorCode ?? errBody?.error?.status ?? resp.status;
    return { ok: false, error: String(code) };
  }
  return { ok: true };
}

// ── Message banks ──────────────────────────────────────────────────────
const MSGS = {
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
  partner_active: [
    { title: "Presença no ninho", body: "O teu par esteve presente hoje." },
    { title: "Um gesto no vosso espaço", body: "O teu par deixou um gesto no vosso espaço." },
    { title: "Presença", body: "Hoje alguém apareceu para vocês." },
  ],
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

const COOLDOWNS: Record<string, number> = {
  silent_day: 16, partner_active: 8, flame_risk: 8,
  perfect_day: 20, milestone: 168, capsule_soon: 48, wrapped_ready: 72,
  ciclo_lembrete: 20, ciclo_menstruacao: 12, ciclo_fertil: 22,
  fasting_registar_dia: 22, fasting_oracao: 22, fasting_motivacao_dia: 22,
  fasting_hora_terminar: 23, fasting_reflexao_noturna: 22,
};

const RULE_URLS: Record<string, string> = {
  silent_day: "/", partner_active: "/", flame_risk: "/jornada",
  perfect_day: "/jornada", milestone: "/jornada",
  capsule_soon: "/capsula", wrapped_ready: "/wrapped",
  ciclo_lembrete: "/ciclo", ciclo_menstruacao: "/ciclo", ciclo_fertil: "/ciclo",
  fasting_registar_dia: "/jornada-espiritual?tab=jejum",
  fasting_oracao: "/jornada-espiritual?tab=oracao",
  fasting_motivacao_dia: "/jornada-espiritual?tab=jejum",
  fasting_hora_terminar: "/jornada-espiritual?tab=jejum",
  fasting_reflexao_noturna: "/jornada-espiritual?tab=jejum",
};

// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const serviceKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
  const fcmPrivateKey  = Deno.env.get("FCM_PRIVATE_KEY");
  const fcmProjectId   = "lovenest-d7f81";

  const sb  = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const todayISO     = now.toISOString().slice(0, 10);
  const nowMs        = now.getTime();
  const yesterdayISO = new Date(nowMs - 86400000).toISOString().slice(0, 10);

  let totalSent = 0, scannedSpaces = 0;

  try {
    if (!fcmClientEmail || !fcmPrivateKey) {
      throw new Error("FCM_CLIENT_EMAIL or FCM_PRIVATE_KEY env var not set");
    }

    // Obter access token FCM uma única vez para todo o batch
    const accessToken = await getFcmAccessToken(fcmClientEmail, fcmPrivateKey);

    const { data: spaces, error: err } = await sb
      .from("couple_spaces")
      .select("id, streak_count, last_streak_date, members(user_id)");
    if (err) throw err;

    for (const space of (spaces || [])) {
      const spaceId = space.id;
      const members = (space.members as any[]) || [];
      if (members.length < 1) continue;

      const isSolo = members.length === 1;
      scannedSpaces++;

      const { data: todayActivity } = await sb
        .from("daily_activity")
        .select("user_id, type")
        .eq("couple_space_id", spaceId)
        .eq("activity_date", todayISO);

      const activeUsersToday = new Set((todayActivity || []).map((r: any) => r.user_id));

      const typeMap: Record<string, Set<string>> = {};
      for (const row of (todayActivity || []) as any[]) {
        if (!typeMap[row.type]) typeMap[row.type] = new Set();
        typeMap[row.type].add(row.user_id);
      }
      const missionThreshold = isSolo ? 1 : 2;
      const missionTypes = isSolo ? ["plano", "checkin", "mood"] : ["message", "checkin", "mood"];
      const missionsDone = missionTypes.filter(t => (typeMap[t]?.size ?? 0) >= missionThreshold).length;
      const isPerfectDay = missionsDone === missionTypes.length;

      const in5Days = new Date(nowMs + 5 * 86400000).toISOString();
      const { data: capsules } = await sb
        .from("time_capsule_messages").select("id")
        .eq("couple_space_id", spaceId)
        .gt("unlock_date", now.toISOString()).lte("unlock_date", in5Days);

      const { data: wrapped } = await sb
        .from("love_wrapped").select("id")
        .eq("couple_space_id", spaceId)
        .eq("month", now.getMonth() + 1).eq("year", now.getFullYear())
        .maybeSingle();

      for (const member of members) {
        const userId  = member.user_id;
        const partner = members.find((m: any) => m.user_id !== userId);

        const { data: profileData } = await sb
          .from("profiles").select("timezone")
          .eq("user_id", userId).maybeSingle();

        const tz = (profileData as any)?.timezone || "UTC";
        const localHour = parseInt(
          new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now)
        );

        if (localHour < 8 || localHour >= 22) continue;

        const { data: userSettings } = await sb
          .from("notification_settings").select("category, enabled, preferred_hour")
          .eq("user_id", userId);

        const categoryEnabled = (cat: string): boolean => {
          const s = (userSettings || []).find((r: any) => r.category === cat);
          return s ? s.enabled !== false : true;
        };
        const cicloEnabled = (cat: string): boolean => {
          const s = (userSettings || []).find((r: any) => r.category === cat);
          return s?.enabled === true;
        };

        const preferredHour: number | null = (() => {
          const s = (userSettings || []).find((r: any) => r.preferred_hour != null);
          return s?.preferred_hour ?? null;
        })();

        if (preferredHour !== null) {
          const diff = Math.abs(localHour - preferredHour);
          if (Math.min(diff, 24 - diff) > 2) continue;
        }

        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        const { count: dailyCount } = await sb
          .from("notification_history").select("id", { count: "exact", head: true })
          .eq("user_id", userId).gte("sent_at", todayStart.toISOString());
        if ((dailyCount ?? 0) >= 2) continue;

        const recentlySent = async (ruleKey: string): Promise<boolean> => {
          const since = new Date(nowMs - (COOLDOWNS[ruleKey] || 24) * 3600000).toISOString();
          const { data } = await sb
            .from("notification_history").select("id")
            .eq("user_id", userId).eq("rule_key", ruleKey).gte("sent_at", since).maybeSingle();
          return !!data;
        };

        const partnerUserId = partner?.user_id;
        const myActiveToday = activeUsersToday.has(userId);
        const partnerActive = partnerUserId ? activeUsersToday.has(partnerUserId) : false;
        const streak        = (space as any).streak_count ?? 0;

        let rule: string | null = null;
        let msg: { title: string; body: string } | null = null;

        // ── FASTING ────────────────────────────────────────────────────
        if (!rule) {
          const { data: fReminders } = await sb
            .from("fasting_reminders")
            .select("registar_dia, oracao, hora_terminar, reflexao_noturna, motivacao_dia")
            .eq("user_id", userId).maybeSingle();

          const hasAnyFastPref = fReminders && (
            fReminders.registar_dia || fReminders.oracao ||
            fReminders.hora_terminar || fReminders.reflexao_noturna || fReminders.motivacao_dia
          );

          if (hasAnyFastPref) {
            const { data: fProfile } = await sb
              .from("fasting_profiles").select("until_hour")
              .eq("user_id", userId).eq("is_active", true)
              .lte("start_date", todayISO).gte("end_date", todayISO).maybeSingle();

            if (fProfile) {
              if (!rule && fReminders.registar_dia && localHour >= 8 && localHour < 9) {
                const { data: todayLog } = await sb
                  .from("fasting_day_logs").select("id")
                  .eq("user_id", userId).eq("day_key", todayISO).maybeSingle();
                if (!todayLog && !(await recentlySent("fasting_registar_dia"))) {
                  rule = "fasting_registar_dia";
                  msg  = { title: "Jejum", body: "Ainda não registaste o teu dia de jejum." };
                }
              }
              if (!rule && fReminders.oracao && localHour >= 9 && localHour < 10) {
                if (!(await recentlySent("fasting_oracao"))) {
                  rule = "fasting_oracao";
                  msg  = { title: "Oração", body: "Um momento de oração para fortalecer o teu jejum." };
                }
              }
              if (!rule && fReminders.motivacao_dia && localHour >= 12 && localHour < 13) {
                if (!(await recentlySent("fasting_motivacao_dia"))) {
                  rule = "fasting_motivacao_dia";
                  msg  = { title: "O teu jejum", body: "Continua forte. O jejum é uma forma de cuidado." };
                }
              }
              if (!rule && fReminders.hora_terminar && fProfile.until_hour) {
                const [fhStr, fmStr] = (fProfile.until_hour as string).split(":");
                const fastEndMin = parseInt(fhStr) * 60 + parseInt(fmStr || "0");
                const nowMin     = localHour * 60 + now.getMinutes();
                const remaining  = fastEndMin - nowMin;
                if (remaining >= 25 && remaining <= 35 && !(await recentlySent("fasting_hora_terminar"))) {
                  rule = "fasting_hora_terminar";
                  msg  = { title: "O teu jejum", body: "O teu jejum termina em cerca de 30 minutos." };
                }
              }
              if (!rule && fReminders.reflexao_noturna && localHour >= 20 && localHour < 21) {
                if (!(await recentlySent("fasting_reflexao_noturna"))) {
                  rule = "fasting_reflexao_noturna";
                  msg  = { title: "Reflexão", body: "Um momento de reflexão sobre o teu dia de jejum." };
                }
              }
            }
          }
        }

        // ── CICLO ─────────────────────────────────────────────────────
        if (!rule) {
          const cicloLembrete    = cicloEnabled("ciclo_lembrete");
          const cicloMenstruacao = cicloEnabled("ciclo_menstruacao");
          const cicloFertil      = cicloEnabled("ciclo_fertil");

          if (cicloLembrete || cicloMenstruacao || cicloFertil) {
            const { data: cycleProfile } = await sb
              .from("cycle_profiles").select("avg_cycle_length, luteal_length")
              .eq("user_id", userId).maybeSingle();

            if (cycleProfile) {
              const cycleLen  = (cycleProfile.avg_cycle_length as number) || 28;
              const lutealLen = (cycleProfile.luteal_length as number) || 14;
              const { data: lastPeriod } = await sb
                .from("period_entries").select("start_date")
                .eq("user_id", userId).order("start_date", { ascending: false })
                .limit(1).maybeSingle();

              if (lastPeriod?.start_date) {
                const lastStart  = new Date((lastPeriod.start_date as string) + "T00:00:00Z");
                const nextStart  = new Date(lastStart.getTime() + cycleLen * 86400000);
                const daysUntil  = Math.round((nextStart.getTime() - nowMs) / 86400000);
                const ovDay      = cycleLen - lutealLen;
                const inFertile  = now >= new Date(lastStart.getTime() + (ovDay - 3) * 86400000)
                                && now <= new Date(lastStart.getTime() + (ovDay + 2) * 86400000);

                if (!rule && cicloMenstruacao && (daysUntil === 1 || daysUntil === 2)) {
                  if (!(await recentlySent("ciclo_menstruacao"))) {
                    rule = "ciclo_menstruacao";
                    msg  = { title: "O teu ciclo", body: daysUntil === 1
                      ? "O teu período pode chegar amanhã."
                      : "O teu período pode chegar em breve." };
                  }
                }
                if (!rule && cicloFertil && inFertile) {
                  if (!(await recentlySent("ciclo_fertil"))) {
                    rule = "ciclo_fertil";
                    msg  = { title: "O teu ciclo", body: "Estás na tua janela fértil." };
                  }
                }
              }
              if (!rule && cicloLembrete && localHour >= 8 && localHour < 10) {
                if (!(await recentlySent("ciclo_lembrete"))) {
                  rule = "ciclo_lembrete";
                  msg  = { title: "O teu ciclo", body: "Consulta o teu ciclo menstrual." };
                }
              }
            }
          }
        }

        // ── RULE 1: Perfect Day ───────────────────────────────────────
        if (!rule && isPerfectDay && myActiveToday && categoryEnabled("engagement")) {
          const mKey = `perfect_day_${todayISO}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            msg  = pick(isSolo ? MSGS.perfect_day_solo : MSGS.perfect_day);
          }
        }

        // ── RULE 2: Streak Milestone ──────────────────────────────────
        const MILESTONES = [7, 14, 30, 50, 100, 365];
        if (!rule && MILESTONES.includes(streak) && myActiveToday && categoryEnabled("engagement")) {
          const mKey = `milestone_${streak}`;
          if (!(await recentlySent(mKey))) {
            rule = mKey;
            const base = pick(isSolo ? MSGS.milestone_solo : MSGS.milestone);
            msg  = { title: base.title, body: `${streak} dias. ${base.body}` };
          }
        }

        // ── RULE 3: Capsule soon ──────────────────────────────────────
        if (!rule && (capsules?.length ?? 0) > 0 && categoryEnabled("system")) {
          if (!(await recentlySent("capsule_soon"))) {
            rule = "capsule_soon";
            msg  = pick(MSGS.capsule_soon);
          }
        }

        // ── RULE 4: Wrapped ready ─────────────────────────────────────
        if (!rule && wrapped && categoryEnabled("system")) {
          if (!(await recentlySent("wrapped_ready"))) {
            rule = "wrapped_ready";
            msg  = pick(MSGS.wrapped_ready);
          }
        }

        // ── RULE 5: Flame Risk ────────────────────────────────────────
        const flameRisk = isSolo
          ? (streak > 0 && localHour >= 19 && !myActiveToday)
          : (streak > 0 && localHour >= 19 && (!myActiveToday || !partnerActive));
        if (!rule && flameRisk && categoryEnabled("engagement")) {
          if (!(await recentlySent("flame_risk"))) {
            rule = "flame_risk";
            msg  = pick(isSolo ? MSGS.flame_risk_solo : MSGS.flame_risk);
          }
        }

        // ── RULE 6: Partner Presence ──────────────────────────────────
        if (!rule && !isSolo && partnerUserId && partnerActive && !myActiveToday && categoryEnabled("partner")) {
          if (!(await recentlySent("partner_active"))) {
            rule = "partner_active";
            msg  = pick(MSGS.partner_active);
          }
        }

        // ── RULE 7: Silent Day ────────────────────────────────────────
        const silentCondition = isSolo
          ? (!myActiveToday && localHour >= 19 && localHour < 21)
          : (!myActiveToday && !partnerActive && localHour >= 19 && localHour < 21);
        if (!rule && silentCondition && categoryEnabled("emotion")) {
          if (!(await recentlySent("silent_day"))) {
            const { count: yesterdayCount } = await sb
              .from("daily_activity").select("id", { count: "exact", head: true })
              .eq("couple_space_id", spaceId).eq("user_id", userId)
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

        // ── Long absence ──────────────────────────────────────────────
        if (!rule) {
          const { data: recentAct } = await sb
            .from("daily_activity").select("activity_date")
            .eq("couple_space_id", spaceId).eq("user_id", userId)
            .order("activity_date", { ascending: false }).limit(1).maybeSingle();
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

        // ── SEND via FCM HTTP v1 ──────────────────────────────────────
        if (!rule || !msg) continue;

        const cooldownKey = rule.startsWith("perfect_day_") ? "perfect_day"
          : rule.startsWith("milestone_") ? "milestone" : rule;
        const targetUrl = RULE_URLS[cooldownKey] || "/";

        const { data: subs } = await sb
          .from("push_subscriptions")
          .select("id, fcm_token")
          .eq("user_id", userId)
          .not("fcm_token", "is", null);

        if (!subs || subs.length === 0) continue;

        let sent = false;
        for (const sub of subs) {
          const result = await sendFcmMessage(
            accessToken, fcmProjectId, sub.fcm_token!,
            msg.title, msg.body, targetUrl
          );
          if (result.ok) {
            sent = true;
          } else if (result.error === "UNREGISTERED" || result.error === "INVALID_ARGUMENT") {
            await sb.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }

        if (sent) {
          await sb.from("notification_history").insert({
            user_id: userId, couple_space_id: spaceId, rule_key: rule,
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
