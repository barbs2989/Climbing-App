-- Full-accounts auth — Phase 1 (foundation). A profile per Supabase auth user,
-- auto-created on signup; contributions bound to the real user id (closes the spoof hole).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique, name text, bio text, location text, avatar text,
  sport_grade text, trad_grade text, boulder_grade text,
  disciplines jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles public read" on profiles for select using (true);
create policy "edit own profile"   on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- auto-create a profile row when a user signs up
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Climber'));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- bind contributions to the caller's identity (fixes the spoofing HIGH from the audit)
alter table contributions alter column contributor set default auth.uid()::text;
drop policy if exists "anyone can contribute" on contributions;
create policy "authed can contribute" on contributions for insert
  with check (auth.uid() is not null);
