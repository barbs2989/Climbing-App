-- Two visibility switches promised something about OTHER PEOPLE and could not deliver it.
--
-- "Make my résumé public — When public, other climbers can open your résumé from your profile."
-- "Show me on leaderboards — Off keeps you out of every ranking."
--
-- Both are claims about what somebody ELSE sees, and `profiles` had no column to carry either:
-- 20 columns, no `resume_public` and no `show_on_ranks`. Nothing anywhere wrote one. Both were a
-- bare useState(true) that reset on reload -- so a climber who turned one OFF got it back ON at
-- the next load, with no notice, and no other climber's app could ever have honoured it.
--
-- THE RÉSUMÉ ONE IS THE SHARPER OF THE TWO, and it fails in the DANGEROUS direction. FullProfile
-- renders the "open résumé" button on `climber.resumePublic !== false`. A DB-derived climber
-- carries no such field, so the value is undefined, `undefined !== false` is true, and the button
-- renders for EVERY real climber regardless of what they set. The switch could only ever change
-- its owner's own preview.
--
-- This is the #1535/#1540 sweep finished rather than a new decision. That work hid five controls
-- that could not work behind PRIVACY_CONTROLS_LIVE and made `show_name` REAL (0175); these two
-- were left outside the gate while being just as inert. Making them real is the better half of
-- the same choice, for the reason 0175 gives: a control that works beats a control that is hidden.
--
-- DEFAULT TRUE for BOTH, and unlike 0175 that is the preserving choice rather than the exposing
-- one. Both useState defaults are already `true`, and both readers treat an absent value as
-- "shown" (`resumePublic !== false`; the leaderboard adds `me` when the flag is truthy). So every
-- existing account is ALREADY public on both surfaces, and a default of false would silently
-- withdraw two things people can currently see -- the mirror of the disclosure 0175 was avoiding.
-- The column records the choice; it does not change anybody's current state.
--
-- A SELECT THAT OMITS THESE COLUMNS IS THE FAILURE MODE TO WATCH, and it is worse here than for
-- show_name. There, an omitted column arrived undefined, read as false, and under-disclosed (a
-- handle instead of a name). Here an omitted `resume_public` arrives undefined and reads as
-- PUBLIC, so a missed SELECT silently re-exposes a résumé its owner made private. Every profiles
-- select that becomes a climber object must carry both columns; check:profile-visibility-columns
-- enforces exactly that.
--
-- No policy work is needed, for the same reason 0175 needed none: `profiles` already has a public
-- read policy (a visibility choice must be readable by the person it governs the view for) and an
-- owner-scoped update policy, so a climber can set their own flags and nobody else's.

alter table profiles add column if not exists resume_public  boolean not null default true;
alter table profiles add column if not exists show_on_ranks  boolean not null default true;

comment on column profiles.resume_public is
  'When true, other climbers see the "open résumé" button on this climber''s profile. Default true because every account was already effectively public: FullProfile tests `resumePublic !== false`, and the field did not exist.';

comment on column profiles.show_on_ranks is
  'When true, this climber may appear in leaderboard rankings. Default true to preserve the behaviour every account already had before the column existed.';
