-- Reações em fotos (❤️ 🥹 😍 ✨ 🙏)
create table if not exists public.photo_reactions (
  id             uuid        primary key default gen_random_uuid(),
  photo_id       uuid        not null references public.photos(id) on delete cascade,
  couple_space_id uuid       not null references public.couple_spaces(id) on delete cascade,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  reaction       text        not null,
  created_at     timestamptz not null default now(),
  unique(photo_id, user_id, reaction)
);

alter table public.photo_reactions enable row level security;

create policy "photo_reactions_select" on public.photo_reactions
  for select using (
    couple_space_id in (select couple_space_id from members where user_id = auth.uid())
  );

create policy "photo_reactions_insert" on public.photo_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and couple_space_id in (select couple_space_id from members where user_id = auth.uid())
  );

create policy "photo_reactions_delete" on public.photo_reactions
  for delete using (user_id = auth.uid());

-- Realtime para reações em tempo real
alter table public.photo_reactions replica identity full;
alter publication supabase_realtime add table public.photo_reactions;
