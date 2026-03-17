import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function checkNotifs() {
  console.log("--- Notification System Diagnosis ---");
  
  // 1. Check Push Subscriptions
  const { data: subs, error: sError } = await supabase.from('push_subscriptions').select('count');
  if (sError) console.error("Push Subscriptions Error:", sError.message);
  else console.log("Push Subscriptions count:", subs);

  // 2. Check Edge Function Logs
  const { data: logs, error: lError } = await supabase.from('edge_function_logs').select('*').limit(5).order('created_at', { ascending: false });
  if (lError) console.error("Edge Function Logs Error:", lError.message);
  else {
    console.log("Recent Logs:", logs.length);
    logs.forEach(log => console.log(`[${log.created_at}] ${log.event_type}:`, log.payload));
  }

  // 3. Check if table 'messages' is in Realtime publication
  const { data: pub, error: pError } = await supabase.rpc('get_table_publication_info', { t_name: 'messages' });
  if (pError) {
    console.log("RPC get_table_publication_info not found, trying raw query...");
    const { data: rawPub, error: rError } = await supabase.from('pg_publication_tables').select('*').eq('tablename', 'messages');
    if (rError) console.error("Realtime Check Error:", rError.message);
    else console.log("Realtime publication for 'messages':", rawPub);
  } else {
    console.log("Realtime Info:", pub);
  }
}

checkNotifs();
