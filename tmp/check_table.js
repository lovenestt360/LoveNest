import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Fallback

async function checkTable() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('edge_function_logs').select('*').limit(1);
  if (error) {
    console.error("Table check failed:", error.message);
  } else {
    console.log("Table exists! Found rows:", data.length);
  }
}

checkTable();
