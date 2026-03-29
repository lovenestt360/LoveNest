import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

/**
 * Smart Notifications Edge Function
 * Analyzing couple activity and sending emotional reminders.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    console.log("Starting Smart Notifications scan...");

    // 1. Get all active couple spaces and their members
    const { data: spaces, error: scanError } = await sb
      .from("couple_spaces")
      .select(`
        id,
        members (
          user_id,
          profiles (display_name, timezone)
        )
      `)
      .eq("status", "active");

    if (scanError) throw scanError;

    let totalSent = 0;
    const now = new Date();

    for (const space of spaces || []) {
      const spaceId = space.id;
      const members = space.members as any[];
      if (members.length < 2) continue;

      // Activity analysis for the space
      const { data: summary, error: summaryErr } = await sb.rpc('get_couple_activity_summary', { 
        _couple_space_id: spaceId 
      });
      if (summaryErr) {
        console.error(`Error for space ${spaceId}:`, summaryErr);
        continue;
      }

      for (const member of members) {
        const userId = member.user_id;
        const profile = member.profiles;
        const partner = members.find(m => m.user_id !== userId)?.profiles;
        
        // Timezone check
        const userTime = new Intl.DateTimeFormat('en-US', {
          timeZone: profile.timezone || 'UTC',
          hour: 'numeric',
          hour12: false
        }).format(now);
        
        const currentHour = parseInt(userTime);

        // 2. Check User Preferences
        const { data: settings } = await sb
          .from("notification_settings")
          .select("*")
          .eq("user_id", userId);

        // Check History - Avoid spam (max 2 per day)
        const { count: dailyCount } = await sb
          .from("notification_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", new Date(now.setHours(0,0,0,0)).toISOString());

        if (dailyCount && dailyCount >= 2) continue;

        // Reset now for rules
        const rulesTimestamp = new Date();

        // --- RULE ENGINE (DISABLED TO STOP SPAM) ---
        let triggeredRule: string | null = null;
        let notifTitle = "";
        let notifBody = "";

        // Temporary return to prevent any rules from firing
        /*
        // Preference mapping helper
        const isEnabled = (cat: string) => {
          const s = settings?.find(i => i.category === cat);
          if (!s) return true; // Default to true if not set
          return s.enabled && s.preferred_hour === currentHour;
        };

        // RULE A: Inactivity (Engagement) - 24h since any move
        if (isEnabled('engagement')) {
          const lastInteraction = new Date(Math.max(
            new Date(summary.last_message_at).getTime() || 0,
            new Date(summary.last_mood_at).getTime() || 0
          ));
          const hoursInactive = (rulesTimestamp.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);
          
          if (hoursInactive > 24 && hoursInactive < 48) {
            triggeredRule = "inactivity";
            notifTitle = "Sinto a tua falta 💛";
            notifBody = `Hoje ficou mais silencioso por aqui... talvez seja um bom momento para vocês 💛`;
          }
        }

        // RULE B: Mood Checkin (Emotion)
        if (!triggeredRule && isEnabled('emotion')) {
          if (summary.moods_today === 0) {
            triggeredRule = "missing_mood";
            notifTitle = "Como estás hoje? 😊";
            notifBody = `O teu par pode querer saber como te sentes. Deixa um registo de humor 💛`;
          }
        }

        // RULE C: Low Communication (Engagement) - Only in the evening
        if (!triggeredRule && currentHour >= 19 && isEnabled('engagement')) {
          if (summary.messages_today < 3) {
            triggeredRule = "low_comms";
            notifTitle = "Diz olá! 👋";
            notifBody = `Uma pequena mensagem pode mudar o dia de ${partner?.display_name || 'quem amas'} 💬`;
          }
        }

        // RULE D: Pending Tasks (System)
        if (!triggeredRule && isEnabled('system')) {
          if (summary.open_tasks_count > 0) {
            triggeredRule = "pending_tasks";
            notifTitle = "Planos pendentes? ✔️";
            notifBody = `Há algo que vocês começaram... que tal terminarem juntos hoje?`;
          }
        }
        */

        // --- SEND PUSH ---
        if (triggeredRule) {
          try {
            // Check if this specific rule was sent recently to this user
            const { data: recent } = await sb
              .from("notification_history")
              .select("id")
              .eq("user_id", userId)
              .eq("rule_key", triggeredRule)
              .gte("sent_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
              .maybeSingle();

            if (!recent) {
              // Trigger send-push logic (or call the function internally if you have direct push logic)
              await triggerPush(sb, userId, spaceId, notifTitle, notifBody);
              
              // Record history
              await sb.from("notification_history").insert({
                user_id: userId,
                couple_space_id: spaceId,
                rule_key: triggeredRule
              });

              totalSent++;
              console.log(`Sent [${triggeredRule}] to ${userId}`);
            }
          } catch (e) {
            console.error(`Failed to send push for ${userId}:`, e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, scan_count: spaces?.length, sent_count: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Critical Error in Smart Notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Triggers the actual push using the existing send-push logic structure
 */
async function triggerPush(sb: any, userId: string, spaceId: string, title: string, body: string) {
  // Get subscriptions for this specific user
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const webpush = await import("npm:web-push");
  
  webpush.default.setVapidDetails(
    "mailto:app@lovenestt.lovable.app",
    vapidPublicKey.trim(),
    vapidPrivateKey.trim()
  );

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icon-192.png",
    data: { url: "/home", type: "system" }
  });

  for (const sub of subs) {
    try {
      await webpush.default.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await sb.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}
