import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Determine which month to generate (previous month)
    const now = new Date();
    let month = now.getMonth(); // 0-indexed, so this is previous month
    let year = now.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    // Allow override via body
    try {
      const body = await req.json();
      if (body.month) month = body.month;
      if (body.year) year = body.year;
    } catch { /* no body */ }

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    // Get all couple spaces
    const { data: spaces } = await sb.from("couple_spaces").select("id, house_name");
    if (!spaces || spaces.length === 0) {
      return new Response(JSON.stringify({ message: "No couple spaces found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;

    for (const space of spaces) {
      const spaceId = space.id;

      // Check if already generated
      const { data: existing } = await sb
        .from("love_wrapped")
        .select("id")
        .eq("couple_space_id", spaceId)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (existing) continue;

      // Count messages
      const { count: messagesCount } = await sb
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("couple_space_id", spaceId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      // Count memories (photos)
      const { count: memoriesCount } = await sb
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("couple_space_id", spaceId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      // Count challenges completed
      const { count: challengesCount } = await sb
        .from("couple_challenges")
        .select("id", { count: "exact", head: true })
        .eq("couple_space_id", spaceId)
        .eq("is_completed", true)
        .gte("completed_at", monthStart)
        .lt("completed_at", monthEnd);

      // Get streak days
      const { data: streakData } = await sb
        .from("love_streaks")
        .select("current_streak")
        .eq("couple_space_id", spaceId)
        .maybeSingle();

      // Count mood checkins
      const { data: moodEntries } = await sb
        .from("mood_checkins")
        .select("mood_key")
        .eq("couple_space_id", spaceId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

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

      // Insert wrapped
      await sb.from("love_wrapped").insert({
        couple_space_id: spaceId,
        month,
        year,
        messages_count: messagesCount ?? 0,
        memories_count: memoriesCount ?? 0,
        challenges_completed: challengesCount ?? 0,
        streak_days: streakData?.current_streak ?? 0,
        mood_checkins: moodCount,
        top_mood: topMood,
      });

      generated++;
    }

    return new Response(
      JSON.stringify({ success: true, generated, month, year }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
