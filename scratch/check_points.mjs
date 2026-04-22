import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyzeiwyfsnbnpzdqtxik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emVpd3lmc25ibnB6ZHF0eGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQ3MjAsImV4cCI6MjA4OTI4MDcyMH0.h_-zFXHJU2PQhVP9aWRoYaQx6DlJzB5LihYzgRvPqvA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'points' });
  if (error) {
    // If RPC doesn't exist, try a simple select and check keys
    const { data: row, error: selectError } = await supabase.from('points').select('*').limit(1).maybeSingle();
    if (selectError) {
       console.error('Error:', selectError);
    } else {
       console.log('Columns in points:', Object.keys(row || {}));
    }
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();
