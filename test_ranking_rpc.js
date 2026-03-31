const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Since RLS is on for love_streaks, it will return [] for anon
fetch(`${url}/rest/v1/love_streaks?select=couple_space_id,current_streak`, {
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(res => res.json())
.then(data => console.log('Raw love_streaks:', data))
.catch(err => console.error(err));
