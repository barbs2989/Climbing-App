-- 0478 — A CREW'S MEET-UP SPOT CAN CARRY A MAP PIN (owner 2026-11-19: "For meetup spot, would there be a
-- way to share a google or Apple Maps pin? Ie paste the shared link into the app?").
--
-- crews.meet_place is the spot's NAME, typed by the organiser. The Meet-up sheet also had an "Exact
-- pin" box, but nothing stored what was typed there: it lived in the organiser's own screen until a
-- reload and no crewmate ever received it.
--
-- meet_lat / meet_lng are that pin. The organiser pastes a Google or Apple Maps link (or a bare
-- coordinate); the app reads the coordinate out of it and stores ONLY the coordinate — never the
-- link, which can carry tracking tokens — and builds both apps' links from it for every member.
--
-- Who can read and write it is unchanged, because it is two more columns on the same row:
--   * write: the organiser ("organizer can update own crew", 0036);
--   * read:  the organiser and the crew's members and invitees ("crew members can read", 0068/0180) —
--            the same people who already read meet_place;
--   * crew_listings and crew_share_preview name their columns one by one and name neither, so a
--     listed crew or a share link does not show where the crew meets.

begin;

alter table public.crews
  add column if not exists meet_lat double precision,
  add column if not exists meet_lng double precision;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'crews_meet_pin_valid' and conrelid = 'public.crews'::regclass) then
    alter table public.crews add constraint crews_meet_pin_valid check (
      (meet_lat is null and meet_lng is null)
      or (meet_lat between -90 and 90 and meet_lng between -180 and 180)
    );
  end if;
end $$;

comment on column public.crews.meet_lat is
  'Latitude of the crew''s meet-up pin (0478); set with meet_lng or not at all. Read out of a pasted maps link or coordinate by the app — the link itself is never stored.';
comment on column public.crews.meet_lng is
  'Longitude of the crew''s meet-up pin (0478); see meet_lat.';

commit;
