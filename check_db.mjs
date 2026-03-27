import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyzeiwyfsnbnpzdqtxik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emVpd3lmc25ibnB6ZHF0eGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQ3MjAsImV4cCI6MjA4OTI4MDcyMH0.h_-zFXHJU2PQhVP9aWRoYaQx6DlJzB5LihYzgRvPqvA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking love_missions...');
  const { data, error } = await supabase.from('love_missions').select('id, title');
  if (error) {
    console.error('Error fetching missions:', error);
    return;
  }
  console.log('Current missions count:', data.length);
  data.forEach(m => console.log(`- ${m.title}`));
}

check();
