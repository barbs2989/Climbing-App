-- Auth Phase 3: Account Linking & Multi-Account Support
-- Allows users to link secondary accounts to a primary account and optionally
-- support simultaneous login to two accounts (Phase 4).

-- Account link table: tracks relationships between primary and secondary accounts
create table if not exists account_links (
  id uuid primary key default gen_random_uuid(),
  primary_id uuid not null references auth.users(id) on delete cascade,
  secondary_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz default now(),
  status text check (status in ('active', 'pending', 'revoked')) default 'active',
  unique(primary_id, secondary_id)
);
alter table account_links enable row level security;

-- Users can see their own account links (both directions)
create policy "view own account links" on account_links for select
  using (auth.uid() = primary_id or auth.uid() = secondary_id);

-- Users can manage their own account links
create policy "manage own account links" on account_links for all
  using (auth.uid() = primary_id or auth.uid() = secondary_id);

-- Extend profiles to track if this is a primary or secondary account
alter table profiles add column if not exists account_type text check (account_type in ('primary', 'secondary')) default 'primary';
alter table profiles add column if not exists primary_account_id uuid references auth.users(id) on delete cascade;

-- Function: Get all linked profiles for a user (including self)
create or replace function get_linked_profiles(user_id uuid)
returns table(id uuid, username text, name text, avatar text, account_type text) as $$
begin
  return query
  select p.id, p.username, p.name, p.avatar, p.account_type
  from profiles p
  where p.id = user_id
    or p.primary_account_id = user_id
    or p.id in (
      select primary_id from account_links where secondary_id = user_id and status = 'active'
      union
      select secondary_id from account_links where primary_id = user_id and status = 'active'
    );
end;
$$ language plpgsql;

-- Function: Merge secondary account data into primary account
create or replace function merge_accounts(primary_id uuid, secondary_id uuid)
returns json as $$
declare
  merged_count int := 0;
  result json;
begin
  -- Merge crews (secondary user's crews become primary user's crews)
  update crews set created_by = primary_id
  where created_by = secondary_id and not exists (
    select 1 from crews c2 where c2.route_id = crews.route_id and c2.created_by = primary_id
  );
  merged_count := merged_count + found;

  -- Merge crew memberships (secondary user's memberships become primary's)
  update crew_members set user_id = primary_id
  where user_id = secondary_id and not exists (
    select 1 from crew_members cm2 where cm2.crew_id = crew_members.crew_id and cm2.user_id = primary_id
  );
  merged_count := merged_count + found;

  -- Merge logs (secondary user's logs become primary user's logs)
  update climb_logs set user_id = primary_id
  where user_id = secondary_id;
  merged_count := merged_count + found;

  -- Merge vouches (secondary user's vouches get linked to primary)
  update vouches set from_id = primary_id
  where from_id = secondary_id;
  merged_count := merged_count + found;

  -- Mark secondary account as merged
  update profiles set account_type = 'secondary', primary_account_id = primary_id
  where id = secondary_id;

  -- Create active link record
  insert into account_links (primary_id, secondary_id, status) values (primary_id, secondary_id, 'active')
  on conflict (primary_id, secondary_id) do update set status = 'active';

  result := json_build_object(
    'success', true,
    'merged_count', merged_count,
    'primary_id', primary_id,
    'secondary_id', secondary_id
  );

  return result;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users
grant execute on function get_linked_profiles(uuid) to authenticated;
grant execute on function merge_accounts(uuid, uuid) to authenticated;
