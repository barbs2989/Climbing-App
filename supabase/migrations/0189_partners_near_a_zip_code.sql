-- Partner search by distance: a climber's ZIP CODE, and "within N miles" of it or of where they are.
--
-- WHY THIS EXISTS. Every distance control on the Partners tab filtered the SEED example profiles
-- only. `profiles` carries one free-text `location` ("Seattle, WA") and no coordinate, and the
-- sign-in reset clears ME.lat/lng, so for a real account every "within N mi" slider read "Needs your
-- location" and no real climber was ever filtered, sorted or shown a distance. Mountain Project's
-- partner finder takes a zip and a 25/50/100-mile radius; this is that, with one thing it gets wrong
-- fixed: MP searches on the zip and DISPLAYS a self-typed city, so a "within 25 miles of 98101"
-- search lists somebody in Las Vegas. Here the radius and the displayed distance come from one record.
--
-- PRIVACY IS THE DESIGN, not a bolt-on:
--
--   * `profiles` is public-read (0009), so the zip must NOT live there. It lives in `profile_zips`,
--     readable and writable by its owner ONLY. Nobody else can select anyone's zip.
--   * Other climbers learn a DISTANCE, never a zip or a coordinate, and only through
--     `partners_near`, a SECURITY DEFINER function that reads the owner-only table and returns a
--     distance ROUNDED UP to the next 5 miles. That is the one door, and it is narrow on purpose.
--   * The radius has a 10-mile FLOOR. With arbitrary origins and a tiny radius a caller could walk a
--     circle around somebody and pin their zip centroid; a 10-mile floor plus 5-mile rounding keeps
--     the most a determined caller can learn at roughly "which part of a metro area". Stated plainly
--     rather than claimed away: distance-only REDUCES what is disclosed, it does not make it zero.
--   * Only climbers who chose to be listed (`discoverable`, 0104) are returned, the caller is never
--     returned to themselves, and a climber who has blocked the caller is never returned
--     (`profile_owner_blocked_me`, 0095 -- reused, not re-implemented).
--   * The ORIGIN a caller passes (their zip centroid, or a rounded device position for "use my
--     current location") is used for this one query and written nowhere.
--
-- `zip_centroids` is the 2020 Census ZCTA gazetteer (internal points, ~33k rows) -- public data, so
-- public read. It is loaded by scripts/oneoff/load-zip-centroids.mjs with the service key. A ZCTA is
-- not identical to a USPS zip; a zip with no ZCTA (PO-box-only zips) is refused by the foreign key,
-- which the app reports as "we don't recognise that zip" rather than storing an unplaceable value.

create table if not exists zip_centroids (
  zip text primary key check (zip ~ '^[0-9]{5}$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);
alter table zip_centroids enable row level security;
drop policy if exists "zip centroids are public" on zip_centroids;
create policy "zip centroids are public" on zip_centroids for select using (true);

create table if not exists profile_zips (
  user_id uuid primary key references profiles(id) on delete cascade,
  zip text not null references zip_centroids(zip),
  updated_at timestamptz not null default now()
);
alter table profile_zips enable row level security;
drop policy if exists "read own zip" on profile_zips;
create policy "read own zip" on profile_zips for select using (auth.uid() = user_id);
drop policy if exists "insert own zip" on profile_zips;
create policy "insert own zip" on profile_zips for insert with check (auth.uid() = user_id);
drop policy if exists "update own zip" on profile_zips;
create policy "update own zip" on profile_zips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own zip" on profile_zips;
create policy "delete own zip" on profile_zips for delete using (auth.uid() = user_id);

create or replace function partners_near(p_lat double precision, p_lng double precision, p_radius_mi integer, p_limit integer default 24)
returns table (
  id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
  sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
  dist_mi integer
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  n integer := least(greatest(coalesce(p_limit, 24), 1), 50);
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'a valid origin is required';
  end if;
  return query
    with d as (
      select p.*, 3958.8 * 2 * asin(sqrt(
               power(sin(radians(z.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2)
             )) as miles
      from profiles p
      join profile_zips pz on pz.user_id = p.id
      join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true
        and p.id <> auth.uid()
        and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           (greatest(1, ceil(d.miles / 5.0)) * 5)::integer as dist_mi
    from d
    where d.miles <= r
    order by d.miles, d.id
    limit n;
end;
$$;

revoke all on function partners_near(double precision, double precision, integer, integer) from public;
revoke all on function partners_near(double precision, double precision, integer, integer) from anon;
grant execute on function partners_near(double precision, double precision, integer, integer) to authenticated;
