-- "Show my real name publicly" promised something it could not deliver.
--
-- The Settings switch reads: "Off shows @quinnfixture to others. On shows Quinn Fixture." That is
-- a claim about what OTHER PEOPLE see, and `profiles` had no column to carry it -- 19 columns and
-- no `show_name` -- while the string appears nowhere in ClimbMatch.jsx or lib/auth.js, so no
-- surface ever wrote one. The state was a bare useState(false) that reset on reload and could
-- never reach anybody else. Measured on screen: a second real account sees "@quinnfixture"
-- whatever the owner set.
--
-- The alternative was to hide the control behind PRIVACY_CONTROLS_LIVE, where four siblings
-- already sit. This makes it REAL instead, because the control is the more useful half: a
-- partner-finding app in which nobody can ever show their name is worse than one where the choice
-- works. Its sibling `visibleWhileBrowsing` IS gated in the same change -- it has no consumer at
-- all, so persisting it would store a preference nothing reads.
--
-- DEFAULT FALSE, deliberately, because that is what the app does TODAY: `showName` arrives
-- undefined on every DB-derived climber, pubName() falls back to the handle, and every existing
-- account is therefore already being shown as @handle. A default of true would flip every current
-- account from a handle to a real name without anyone asking for it -- turning a fix for a dead
-- control into an unannounced disclosure of everybody's name.
--
-- No policy work is needed: `profiles` already has a public read policy (a name a climber has
-- chosen to publish is meant to be readable) and an owner-scoped update policy, so a climber can
-- set their own flag and nobody else's.

alter table profiles add column if not exists show_name boolean not null default false;

comment on column profiles.show_name is
  'When true, pubName() renders this climber''s display name to others; when false it renders @username. Default false to preserve the behaviour every account already had before the column existed.';
