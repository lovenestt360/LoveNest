import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
)

async function debugData() {
  const { data, error } = await supabase
    .from('daily_activity')
    .select('created_at, type, user_id, activity_date')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log("LAST 20 ACTIVITIES:");
  console.log(data);
}

debugData();
