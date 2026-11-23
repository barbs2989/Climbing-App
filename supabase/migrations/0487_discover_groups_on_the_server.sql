-- 0487 — DISCOVER GROUPS IS SEARCHED, FILTERED AND PAGED IN THE DATABASE.
--
-- Discover read every group the caller may see into the browser (`useMyGroups`) and did the
-- search, the state filter, the distance filter and the sort there. The screen showed 20 at a
-- time, but the read behind it was the whole table plus every roster row the caller could read,
-- so it grew with the number of groups, not with what was on screen.
--
-- What moves here:
--   groups.region        the state or province the typed `location` names, as its full name.
--                        The SQL twin of regionOfPlace() in lib/db.js; check:search-norm compares
--                        the two region tables. Stored, so "browse by state" is an index lookup.
--   groups.search_text   search_norm() of everything the Discover box matches: name, disciplines,
--                        location, region in both spellings, About text. The same haystack the
--                        browser built per keystroke for every group.
--   discover_groups()    one page of the groups the caller can JOIN, with the total.
--   discover_group_facets()  the counts behind the state chips, and the discipline chips.
--
-- Both columns are GENERATED, so no client can write them, nothing needs a backfill, and adding
-- them fires none of the triggers on `groups` (moderation screening, place-from-area).
--
-- WHO IS LISTED. Exactly what Discover listed before: public groups the caller is not an active
-- member of. A private group was never listed here (an invitee finds it under Requests), and a
-- group ClimbMatch Safety has taken down is hidden by 0263's restrictive policy from everyone but
-- its creator, who is its owner and so not listed either. The functions are SECURITY DEFINER
-- because two of the sorts need numbers the caller cannot read row by row (0318: a non-member
-- reads no roster; posts are members-only), so they state that rule themselves:
-- visibility = 'public' and moderation = 'visible'. They return the member COUNT, which
-- group_member_counts() already gives anyone, and never a roster row or a post.

-- ── The region table, once. Same rows, same order, as REGION_ABBR in lib/db.js. ──────────────
create or replace function public.place_regions()
returns table (ord integer, abbr text, name text)
language sql immutable parallel safe
set search_path = public, pg_temp
as $$
  values
    (1, 'AL', 'Alabama'), (2, 'AK', 'Alaska'), (3, 'AZ', 'Arizona'), (4, 'AR', 'Arkansas'),
    (5, 'CA', 'California'), (6, 'CO', 'Colorado'), (7, 'CT', 'Connecticut'), (8, 'DE', 'Delaware'),
    (9, 'FL', 'Florida'), (10, 'GA', 'Georgia'), (11, 'HI', 'Hawaii'), (12, 'ID', 'Idaho'),
    (13, 'IL', 'Illinois'), (14, 'IN', 'Indiana'), (15, 'IA', 'Iowa'), (16, 'KS', 'Kansas'),
    (17, 'KY', 'Kentucky'), (18, 'LA', 'Louisiana'), (19, 'ME', 'Maine'), (20, 'MD', 'Maryland'),
    (21, 'MA', 'Massachusetts'), (22, 'MI', 'Michigan'), (23, 'MN', 'Minnesota'), (24, 'MS', 'Mississippi'),
    (25, 'MO', 'Missouri'), (26, 'MT', 'Montana'), (27, 'NE', 'Nebraska'), (28, 'NV', 'Nevada'),
    (29, 'NH', 'New Hampshire'), (30, 'NJ', 'New Jersey'), (31, 'NM', 'New Mexico'), (32, 'NY', 'New York'),
    (33, 'NC', 'North Carolina'), (34, 'ND', 'North Dakota'), (35, 'OH', 'Ohio'), (36, 'OK', 'Oklahoma'),
    (37, 'OR', 'Oregon'), (38, 'PA', 'Pennsylvania'), (39, 'RI', 'Rhode Island'), (40, 'SC', 'South Carolina'),
    (41, 'SD', 'South Dakota'), (42, 'TN', 'Tennessee'), (43, 'TX', 'Texas'), (44, 'UT', 'Utah'),
    (45, 'VT', 'Vermont'), (46, 'VA', 'Virginia'), (47, 'WA', 'Washington'), (48, 'WV', 'West Virginia'),
    (49, 'WI', 'Wisconsin'), (50, 'WY', 'Wyoming'), (51, 'DC', 'District of Columbia'), (52, 'AB', 'Alberta'),
    (53, 'BC', 'British Columbia'), (54, 'MB', 'Manitoba'), (55, 'NB', 'New Brunswick'), (56, 'NL', 'Newfoundland and Labrador'),
    (57, 'NS', 'Nova Scotia'), (58, 'ON', 'Ontario'), (59, 'PE', 'Prince Edward Island'), (60, 'QC', 'Quebec'),
    (61, 'SK', 'Saskatchewan'), (62, 'YT', 'Yukon')
$$;

-- regionOfPlace(), in the same order of tests: the trailing two-letter code (as typed, upper
-- case only, so "Washington, DC" is not Washington), then the last comma part as a full name,
-- then the longest full name found anywhere in the text as a whole word.
create or replace function public.region_of_place(loc text)
returns text
language plpgsql immutable parallel safe
set search_path = public, pg_temp
as $$
declare
  l text := btrim(coalesce(loc, ''), E' \t\n\r');
  tail text;
  hit text;
begin
  if l = '' then return null; end if;
  tail := btrim(regexp_replace(l, '^.*,', ''), E' \t\n\r');
  if tail ~ '^[A-Z]{2}$' then
    select r.name into hit from public.place_regions() r where r.abbr = tail;
    if hit is not null then return hit; end if;
  end if;
  select r.name into hit from public.place_regions() r where lower(r.name) = lower(tail) limit 1;
  if hit is not null then return hit; end if;
  select r.name into hit from public.place_regions() r
   where lower(l) ~ ('(^|[^a-z])' || lower(r.name) || '($|[^a-z])')
   order by length(r.name) desc, r.ord limit 1;
  return hit;
end;
$$;

-- Everything the Discover box matches, in search_norm()'s spelling-forgiving form (0190).
create or replace function public.group_search_text(g_name text, g_disciplines text[], g_location text, g_blurb text)
returns text
language sql immutable parallel safe
set search_path = public, pg_temp
as $$
  select public.search_norm(
    coalesce(g_name, '') || ' ' || coalesce(array_to_string(g_disciplines, ' '), '') || ' ' ||
    coalesce(g_location, '') || ' ' || coalesce(public.region_of_place(g_location), '') || ' ' ||
    coalesce((select r.abbr from public.place_regions() r where r.name = public.region_of_place(g_location)), '') || ' ' ||
    coalesce(g_blurb, ''))
$$;

alter table public.groups add column if not exists region text
  generated always as (public.region_of_place(location)) stored;
alter table public.groups add column if not exists search_text text
  generated always as (public.group_search_text(name, disciplines, location, blurb)) stored;

create index if not exists groups_region_idx on public.groups (region);
create index if not exists groups_search_text_trgm on public.groups using gin (search_text gin_trgm_ops);
create index if not exists groups_created_at_idx on public.groups (created_at desc);

-- ── One page of the groups the caller can join ───────────────────────────────────────────────
--   q              the typed search; every word must occur in search_text
--   p_region       a full state/province name, 'Other' for groups whose location names none, or null
--   near_*         a point and a radius in miles; a group with no home area has no point and is
--                  never near anywhere
--   p_sort         'match'   nearest first when a point is given; otherwise groups sharing a
--                            discipline with the caller (my_discs), then home_region, then
--                            climb_regions, then the rest
--                  'active'  most recent visible post first
--                  'members' most active members first
--   p_limit        1 to 50 rows; p_offset rows are skipped
-- total_count is the number of groups the filters match, on every row, so the screen can say how
-- many are left without reading them.
create or replace function public.discover_groups(
  q text default '',
  p_region text default null,
  near_lat double precision default null,
  near_lng double precision default null,
  near_mi double precision default null,
  p_sort text default 'match',
  my_discs text[] default '{}',
  home_region text default null,
  climb_regions text[] default '{}',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, name text, blurb text, location text, region text, area_id text, area_name text,
  lat double precision, lng double precision, disciplines text[], accent text,
  avatar_url text, cover_url text, policy text, event_policy text, visibility text,
  join_questions jsonb, rules jsonb, invite_policy text, created_by uuid, created_at timestamptz,
  member_count integer, my_status text, dist_mi double precision, total_count bigint
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with me as (select auth.uid() as uid),
  pats as (
    select array(select '%' || w || '%' from unnest(string_to_array(public.search_clean(coalesce(q, '')), ' ')) w where w <> '') as p
  ),
  cand as (
    select g.id, g.region, g.disciplines, g.created_at,
      case when near_lat is not null and near_lng is not null and g.lat is not null and g.lng is not null then
        3958.8 * 2 * asin(least(1, sqrt(
          power(sin(radians(g.lat - near_lat) / 2), 2) +
          cos(radians(near_lat)) * cos(radians(g.lat)) * power(sin(radians(g.lng - near_lng) / 2), 2))))
      end as dist
    from public.groups g, me, pats
    where me.uid is not null
      and g.visibility = 'public' and g.moderation = 'visible'
      and not exists (select 1 from public.group_members m
                      where m.group_id = g.id and m.user_id = me.uid and m.status = 'active')
      and g.search_text like all (pats.p)
      and (coalesce(p_region, '') = ''
           or (p_region = 'Other' and g.region is null)
           or g.region = p_region)
  ),
  keyed as (
    select c.id, c.dist, c.created_at,
      -- Each sort's number is worked out only when that sort is asked for.
      case when p_sort = 'members' then
        (select count(*) from public.group_members m where m.group_id = c.id and m.status = 'active') end as k_members,
      case when p_sort = 'active' then
        (select max(p.created_at) from public.group_posts p where p.group_id = c.id and p.moderation = 'visible') end as k_active,
      case when p_sort = 'match' and near_lat is null then
        (case when c.disciplines && coalesce(my_discs, '{}') then 0 else 1 end) end as k_fit,
      case when p_sort = 'match' and near_lat is null then
        (case when c.region is null then 3 when c.region = home_region then 0
              when c.region = any (coalesce(climb_regions, '{}')) then 1 else 2 end) end as k_region,
      case when p_sort = 'match' and near_lat is not null then c.dist end as k_dist
    from cand c
    where near_lat is null or near_lng is null or (c.dist is not null and c.dist <= coalesce(near_mi, 100))
  ),
  ranked as (
    select k.id, k.dist, count(*) over () as total,
      row_number() over (order by k.k_dist asc nulls last, k.k_members desc nulls last, k.k_active desc nulls last,
                                  k.k_fit asc nulls last, k.k_region asc nulls last, k.created_at desc, k.id) as rn
    from keyed k
  )
  select g.id, g.name, g.blurb, g.location, g.region, g.area_id, a.name,
    g.lat, g.lng, g.disciplines, g.accent, g.avatar_url, g.cover_url, g.policy, g.event_policy, g.visibility,
    g.join_questions, g.rules, g.invite_policy, g.created_by, g.created_at,
    (select count(*)::integer from public.group_members m where m.group_id = g.id and m.status = 'active'),
    (select m.status from public.group_members m where m.group_id = g.id and m.user_id = auth.uid()),
    r.dist, r.total
  from ranked r
  join public.groups g on g.id = r.id
  left join public.areas a on a.id = g.area_id
  where r.rn > greatest(coalesce(p_offset, 0), 0)
    and r.rn <= greatest(coalesce(p_offset, 0), 0) + least(greatest(coalesce(p_limit, 20), 1), 50)
  order by r.rn;
$$;
revoke all on function public.discover_groups(text, text, double precision, double precision, double precision, text, text[], text, text[], integer, integer) from public, anon;
grant execute on function public.discover_groups(text, text, double precision, double precision, double precision, text, text[], text, text[], integer, integer) to authenticated;

-- ── What the chips above the list count ──────────────────────────────────────────────────────
-- kind 'region'      key = the state or province ('Other' when the location names none), n = groups
-- kind 'discipline'  key = a discipline some joinable group lists, n = groups
-- kind 'total'       key = '', n = every group the caller can join
-- Counted over the same groups discover_groups() lists with no filter, so a chip never promises a
-- group the list then hides.
create or replace function public.discover_group_facets()
returns table (kind text, key text, n integer)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with cand as (
    select g.region, g.disciplines
    from public.groups g
    where auth.uid() is not null
      and g.visibility = 'public' and g.moderation = 'visible'
      and not exists (select 1 from public.group_members m
                      where m.group_id = g.id and m.user_id = auth.uid() and m.status = 'active')
  )
  select 'region'::text, coalesce(c.region, 'Other'), count(*)::integer from cand c group by 2
  union all
  select 'discipline'::text, d.d, count(*)::integer from cand c, unnest(c.disciplines) as d(d) group by 2
  union all
  select 'total'::text, ''::text, count(*)::integer from cand c;
$$;
revoke all on function public.discover_group_facets() from public, anon;
grant execute on function public.discover_group_facets() to authenticated;

-- Verify:
--   select name, location, region, search_text from groups limit 5;
--   select region_of_place('Seattle, WA'), region_of_place('Kansas City, Missouri'), region_of_place('Squamish');
--   (as a signed-in climber) select name, member_count, total_count from discover_groups('wa', null);
