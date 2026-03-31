import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRankings() {
  console.log("Testing getting streaks ranking:");
  const { data: streaks, error: e1 } = await supabase.rpc('fn_get_global_ranking', {
    p_rank_type: 'current_streak'
  });
  console.log("Streaks:", streaks);
  if (e1) console.error("Error1:", e1);

  console.log("Testing getting points ranking:");
  const { data: points, error: e2 } = await supabase.rpc('fn_get_global_ranking', {
    p_rank_type: 'total_points'
  });
  console.log("Points:", points);
  if (e2) console.error("Error2:", e2);
}

testRankings();
