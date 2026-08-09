-- A listing preference for partner discovery.
--
-- WHY THIS IS NOT AN ACCESS CONTROL, and why saying so matters.
--
-- `profiles` is publicly readable by policy: 0009 created "profiles public read" with
-- `using (true)`, and 0095 narrowed it only to hide you from someone YOU blocked, keeping
-- anon read on purpose ("blocking hides you from an ACCOUNT, it does not make a public
-- profile private") because the guide directory, route pages and trip reports all show
-- names. So every profile row is already readable by anyone, and is already findable
-- through the by-name search in PartnerSearch.
--
-- Therefore this column CANNOT be enforced in RLS in any meaningful way: the same row stays
-- readable by id and by name whatever it says. Writing an RLS policy around it would be the
-- always-passing guard this codebase keeps shipping -- present, reviewed, enforcing nothing.
--
-- What it does control is SURFACING: whether the app puts you in a browse list you never
-- asked to be in. That was the reason partner browse has been seed-only until now:
--
--   "Deliberately SEARCH, not a browse list: the 'who can see my profile' setting is one of
--    the four controls behind PRIVACY_CONTROLS_LIVE=false and is not enforced yet.
--    Requiring someone to type your name is a far weaker exposure than listing every
--    account, and listing more people later is easy -- un-listing someone who was already
--    shown is not."
--
-- This column is what makes "listing more people later" safe: a person who turns it off is
-- not listed, and the app has somewhere to record that.
--
-- DEFAULT true, deliberately. Being findable is the reason someone signs up to a
-- partner-matching app, the row is already public, and name search already returns it -- so
-- the default changes what is LISTED, not what is knowable. At the time of writing there is
-- exactly one real profile in this project, so the default affects one account, which can
-- turn it off in Settings.
--
-- NOT NULL so the app never has to treat missing as a third state; every consumer asks one
-- question and gets true or false.

alter table profiles
  add column if not exists discoverable boolean not null default true;

comment on column profiles.discoverable is
  'Listing preference for partner browse. NOT an access control: profiles are public-read by policy (0009/0095) and remain findable by name regardless. Controls only whether the app lists this climber in browse results.';

-- Confirm -- expect one row, boolean, not null, default true:
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_name = 'profiles' and column_name = 'discoverable';
--
-- And expect every existing profile to carry the default:
--   select discoverable, count(*) from profiles group by discoverable;
