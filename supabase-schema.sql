-- ZEUS BOSS CLOCK: Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.boss_state (
  boss_id text primary key,
  next_spawn_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.boss_state enable row level security;

-- Public read/write is intentional for this version because the user selected
-- open access and anonymous cut registration. Anyone with the project URL/key
-- can change boss times. Do not store private information in this table.
drop policy if exists "Public can read boss times" on public.boss_state;
create policy "Public can read boss times"
on public.boss_state for select to anon, authenticated using (true);

drop policy if exists "Public can insert boss times" on public.boss_state;
create policy "Public can insert boss times"
on public.boss_state for insert to anon, authenticated with check (true);

drop policy if exists "Public can update boss times" on public.boss_state;
create policy "Public can update boss times"
on public.boss_state for update to anon, authenticated using (true) with check (true);

-- Enable Realtime for the table.
alter publication supabase_realtime add table public.boss_state;
