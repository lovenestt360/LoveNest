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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Internal server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Get all couple spaces
    const { data: spaces, error: fetchError } = await sb.from("couple_spaces").select("id, house_name");
    
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

        // Count memories (photos)
        const { count: memoriesCount, error: photoErr } = await sb
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);
        if (photoErr) throw new Error(`Photos check failed: ${photoErr.message}`);

        // Count challenges completed
        const { count: challengesCount, error: challErr } = await sb
          .from("couple_challenges")
          .select("id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId)
          .eq("is_completed", true)
          .gte("completed_at", monthStart)
          .lt("completed_at", monthEnd);
        if (challErr) throw new Error(`Challenges check failed: ${challErr.message}`);

        // Get streak days
        const { data: streakData, error: streakErr } = await sb
          .from("love_streaks")
          .select("current_streak")
          .eq("couple_space_id", spaceId)
          .maybeSingle();
        if (streakErr) throw new Error(`Streak check failed: ${streakErr.message}`);

        // Count mood checkins
        const { data: moodEntries, error: moodErr } = await sb
          .from("mood_checkins")
          .select("mood_key")
          .eq("couple_space_id", spaceId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);
        if (moodErr) throw new Error(`Mood check failed: ${moodErr.message}`);

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

        // Upsert wrapped (update if exists for space/month/year)
        const { error: upsertError } = await sb.from("love_wrapped").upsert({
          couple_space_id: spaceId,
          month,
          year,
          messages_count: messagesCount ?? 0,
          memories_count: memoriesCount ?? 0,
          challenges_completed: challengesCount ?? 0,
          streak_days: streakData?.current_streak ?? 0,
          mood_checkins: moodCount,
          top_mood: topMood,
        }, {
          onConflict: 'couple_space_id,month,year'
        });

        if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

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
