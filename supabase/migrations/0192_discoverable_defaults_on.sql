-- Partner-browse listing becomes opt-OUT again (reverses the default half of 0110).
--
-- The user's decision, 2026-09-24: a climber should be included in partner search
-- automatically and opt out if they do not want to be.
--
-- WHY 0110's REASON NO LONGER HOLDS. 0110 made listing opt-in because #756 rendered the browse
-- list to ANONYMOUS visitors (production runs VITE_DEMO_AUTOLOGIN, which skips the sign-in
-- screen) and put a real name, handle and city on the open web. #759 closed that: the list
-- renders only for a real signed-in session (DB_UID), and useDiscoverableProfiles refuses to run
-- without one. DEMO_AUTOLOGIN sets UI state only and never creates a session. So default-on now
-- lists a climber to other signed-in climbers — who could already find the same public row by
-- searching the name — and nobody else.
--
-- TWO STATEMENTS, as in 0110, and for the same reason: changing the default alone would leave
-- every existing row at the value 0110 reset it to, which nobody chose either. At the time of
-- writing there are three profiles, all false: one real account and two CI fixtures.
--
-- THE CI FIXTURES STAY UNLISTED. scripts/lib/durable-fixture.mjs throws on every run if the CI
-- mate is discoverable, because those accounts must never surface in a real climber's browse
-- list. They are excluded by username, which scripts/oneoff/create-ci-test-accounts.mjs sets.
--
-- The opt-out is Settings -> Privacy & safety -> "List me in partner browse", and Privacy
-- "What others can see" states the default. Name search is unchanged.

alter table profiles
  alter column discoverable set default true;

update profiles
  set discoverable = true
  where discoverable is false
    and username not like 'climbmatch-ci-%';

comment on column profiles.discoverable is
  'Opt-OUT listing preference for partner browse (default true since 0192; opt-in 0110-0192). NOT an access control: profiles are public-read by policy (0009/0095) and remain findable by name regardless. Governs only whether the app lists this climber in browse results, which render only to a signed-in viewer (#759).';

-- Confirm -- expect default true, and only the CI fixtures still false:
--   select column_default from information_schema.columns
--   where table_name = 'profiles' and column_name = 'discoverable';
--
--   select username, discoverable from profiles order by username;
