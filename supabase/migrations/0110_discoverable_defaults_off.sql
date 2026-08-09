-- Partner-browse listing becomes strictly opt-IN.
--
-- 0104 added profiles.discoverable defaulting to TRUE, and the reasoning there was that the
-- row is public-read by policy and already findable by name, so the default changed what is
-- LISTED, not what is knowable. That reasoning held for the data. It did not hold for the
-- product: #756 shipped the browse list gated on USE_DB, and because production builds with
-- VITE_DEMO_AUTOLOGIN=true the list rendered for anonymous visitors — a real climber's name,
-- handle and city on the open web, under copy that claimed they had "chosen to be listed".
-- #759 fixed the gate so a signed-in account is required.
--
-- The default is the remaining half. Nobody has opted in to anything; default-true means the
-- app decides for them and they have to find a setting to undo it. Being listed is the
-- direction that cannot be walked back, so the default should be the safe one.
--
-- TWO STATEMENTS, and the second is the point. Changing the default alone would leave every
-- EXISTING row still true — the accounts that never opted in are exactly the ones this is
-- about, so they are reset too. This is reversible from the UI in one tap (Settings ->
-- Privacy -> "List me in partner browse"), which is the asymmetry that makes resetting the
-- safe move rather than a presumptuous one.
--
-- Name search is UNCHANGED and stays anonymous: a climber who knows your name can still find
-- you, exactly as before #756. This governs the browse LIST only.

alter table profiles
  alter column discoverable set default false;

update profiles
  set discoverable = false
  where discoverable is true;

comment on column profiles.discoverable is
  'Opt-IN listing preference for partner browse (default false since 0110). NOT an access control: profiles are public-read by policy (0009/0095) and remain findable by name regardless. Governs only whether the app lists this climber in browse results, and the app additionally requires a signed-in viewer to render that list at all (#759).';

-- Confirm -- expect default false, and zero rows still opted in:
--   select column_default, is_nullable
--   from information_schema.columns
--   where table_name = 'profiles' and column_name = 'discoverable';
--
--   select discoverable, count(*) from profiles group by discoverable;
--
-- Expect: column_default = false, is_nullable = NO, and a single row (false, <n>).
-- To opt yourself back in, use the Settings toggle rather than SQL -- that exercises the
-- write path the app actually uses.
