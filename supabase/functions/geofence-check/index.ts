import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { user_id, couple_space_id, lat, lng } = await req.json();
    if (!user_id || !couple_space_id || lat == null || lng == null) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch favorite places for this couple space
    const { data: places } = await admin
      .from("favorite_places")
      .select("id,name,lat,lng,radius_m")
      .eq("couple_space_id", couple_space_id);

    if (!places || places.length === 0) {
      return new Response(JSON.stringify({ transitions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch sender's notification prefs
    const { data: prefsRow } = await admin
      .from("location_notification_prefs")
      .select("notify_arrives,notify_leaves")
      .eq("user_id", user_id)
      .maybeSingle();

    const notifyArrives = prefsRow?.notify_arrives ?? true;
    const notifyLeaves = prefsRow?.notify_leaves ?? false;

    // 3. Fetch sender's display name
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", user_id)
      .maybeSingle();
    const senderName = profile?.display_name ?? "O teu amor";

    const transitions: { type: "enter" | "exit"; place_name: string }[] = [];

    for (const place of places) {
      const dist = haversineMeters({ lat, lng }, { lat: place.lat, lng: place.lng });
      const isInside = dist <= place.radius_m;

      // Get last location_event for user+place to determine previous state
      const { data: lastEvents } = await admin
        .from("location_events")
        .select("event_type,occurred_at")
        .eq("couple_space_id", couple_space_id)
        .eq("user_id", user_id)
        .eq("place_name", place.name)
        .order("occurred_at", { ascending: false })
        .limit(1);

      const lastEvent = lastEvents?.[0] ?? null;
      const wasInside = lastEvent?.event_type === "enter";
      const isFirstDetection = !lastEvent;

      // No state change — skip
      if (isInside === wasInside) continue;

      const eventType: "enter" | "exit" = isInside ? "enter" : "exit";

      // Record event in DB
      await admin.from("location_events").insert({
        couple_space_id,
        user_id,
        event_type: eventType,
        place_name: place.name,
        occurred_at: new Date().toISOString(),
      });

      transitions.push({ type: eventType, place_name: place.name });

      // Skip push on first detection to avoid false "chegou" when app starts
      if (isFirstDetection) continue;

      const shouldNotify =
        (eventType === "enter" && notifyArrives) ||
        (eventType === "exit" && notifyLeaves);

      if (shouldNotify) {
        const notifBody =
          eventType === "enter"
            ? `Chegou a ${place.name}`
            : `Saiu de ${place.name}`;

        // Fire-and-forget — forward the user's JWT so send-push identifies the sender
        fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            couple_space_id,
            title: senderName,
            body: notifBody,
            url: "/localizacao",
            type: "location",
          }),
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ transitions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
