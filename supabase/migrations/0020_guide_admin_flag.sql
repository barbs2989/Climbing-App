-- Hire-a-Guide Phase 1 (1/5) — a single admin flag for manual credential review.
-- There's exactly one reviewer (the app owner); no role hierarchy needed yet.
alter table profiles add column if not exists is_admin boolean not null default false;

-- Small reusable helper — later guide-feature migrations check "is this caller an admin?"
-- repeatedly in RLS policies; centralize it here rather than repeating the subquery.
create or replace function is_admin(uid uuid) returns boolean
language sql stable as $$
  select exists(select 1 from profiles where id = uid and is_admin);
$$;

-- The existing "edit own profile" policy (for all, using/with check auth.uid()=id) would
-- otherwise let a user flip their own is_admin to true. Block that specific column change
-- unless the acting session is already an admin.
create or replace function prevent_self_admin() returns trigger
language plpgsql security definer as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if not is_admin(auth.uid()) then
      raise exception 'only an admin can change is_admin';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists guard_self_admin on profiles;
create trigger guard_self_admin before update on profiles
  for each row execute function prevent_self_admin();

-- One-off, run by hand in the SQL editor after the owner signs up for real:
--   update profiles set is_admin = true where id = '<owner auth.users uuid>';
