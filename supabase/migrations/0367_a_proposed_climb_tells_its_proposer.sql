-- 0367: a climber who ADDS a climb or an area is told what became of it, and can open it.
--
-- A route EDIT has told its author the outcome since 0309 ("Your route edit is live" / "... was
-- turned down", into user_notices, read by the bell). A proposed NEW climb (kind new_route) and a
-- proposed NEW area (kind new_area, 0360) told nobody: approve_new_route, approve_new_area and
-- reject_new_route only flip contributions.status. The climber's one view of the proposal, Your
-- contributions, could not link to the climb either, because nothing recorded which routes row the
-- approval minted (route_id stays null on a new_route row; setting it would put the proposal among
-- the route page's own contributions, which every reader there would then have to skip).
--
-- So, without touching the three functions (0128/0132 forked approve_new_route once; 0352 is its
-- one definition and check:approve-route-columns guards it):
--   1. contributions.result_id — the id of the route or area an approval created. Set here, never
--      by a client (any client value is thrown away).
--   2. A BEFORE UPDATE trigger that, when a new_route / new_area row leaves 'pending', finds the row
--      the approval just inserted (the functions insert it BEFORE flipping status, and both refuse a
--      duplicate (area, name), so the name finds exactly one) and sends the proposer a notice whose
--      link opens it. A rejection sends the owner's reason, as 0309 does for an edit.
--
-- Model: Mountain Project holds new routes for its regional admins; its sister site MTB Project
-- tells the submitter on the site and by email when a submission is approved. Here the notice is
-- the bell, and the approved climb's notice says it can now be logged from its page.

alter table contributions add column if not exists result_id text;
comment on column contributions.result_id is
  'For an approved new_route / new_area proposal: the id of the routes / areas row the approval created (0367). Null otherwise. Set only by trg_contribution_result.';

create or replace function contribution_result() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  who uuid;
  nm  text := btrim(coalesce(new.value ->> 'name', ''));
  rid text;
  aname text;
begin
  if tg_op = 'INSERT' then
    new.result_id := null;
    return new;
  end if;
  new.result_id := old.result_id;
  if new.kind not in ('new_route', 'new_area') or old.status <> 'pending' or new.status = old.status then
    return new;
  end if;

  if new.status = 'approved' then
    if new.kind = 'new_route' then
      select r.id into rid from routes r
       where r.area_id = new.area_id and lower(btrim(r.name)) = lower(nm)
       limit 1;
    else
      select a.id into rid from areas a
       where a.parent_id = new.area_id and lower(btrim(a.name)) = lower(nm)
       limit 1;
    end if;
    new.result_id := rid;
  end if;

  -- contributor is text (0165 defaults it to auth.uid()); an old anonymous row has no one to tell.
  if new.contributor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    who := new.contributor::uuid;
  end if;
  if who is null or not exists (select 1 from profiles where id = who) then
    return new;
  end if;
  select name into aname from areas where id = new.area_id;

  if new.status = 'approved' and new.kind = 'new_route' then
    perform _notify(who, 'contribution_approved', 'Your climb is live: ' || coalesce(nullif(nm, ''), 'the climb you added'),
      'Added' || coalesce(' in ' || aname, '') || '. Climbed it? Log it from its page.',
      case when rid is null then null else jsonb_build_object('route', rid) end);
  elsif new.status = 'approved' then
    perform _notify(who, 'contribution_approved', 'Your area is live: ' || coalesce(nullif(nm, ''), 'the area you added'),
      'Added' || coalesce(' under ' || aname, '') || '. You can add its climbs now.',
      case when rid is null then null else jsonb_build_object('area', rid) end);
  elsif new.status = 'rejected' then
    perform _notify(who, 'contribution_rejected',
      case when new.kind = 'new_route' then 'The climb you added wasn''t approved: ' else 'The area you added wasn''t approved: ' end
        || coalesce(nullif(nm, ''), 'unnamed'),
      case when nullif(btrim(coalesce(new.review_note, '')), '') is null then null else 'Reason: ' || btrim(new.review_note) end,
      null);
  end if;
  return new;
end $$;
revoke all on function contribution_result() from public, anon, authenticated;

drop trigger if exists trg_contribution_result on contributions;
create trigger trg_contribution_result before insert or update on contributions
  for each row execute function contribution_result();

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--   select column_name from information_schema.columns where table_name='contributions' and column_name='result_id';
--   select tgname from pg_trigger where tgname = 'trg_contribution_result';
