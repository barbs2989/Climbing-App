-- When a climber last practiced each skill (owner, 2026-11-14: "do what you recommend" after the technique
-- research, PR #3331).
--
-- Rescue skills decay fast when unused: a 2025 Psychological Bulletin meta-analysis (457 reports) puts the
-- half-life of a procedural skill gain at about 6.5 months, and a 2019 study of experienced multipitch climbers
-- (Hawley et al., Wilderness Environ Med 30:44) found only 24% passed three standard rescue scenarios. A
-- self-reported "last practiced" month beside each skill lets a partner see it and lets the climber's own profile
-- suggest a refresher (lib/skillPractice.js); it is self-reported, like profiles.skills beside it.
--
-- Keyed by SKILLS key (ClimbMatchCore.jsx), never by label, so renaming a label cannot orphan a date.
-- Nullable with no default: NULL means "not asked yet", the truth for every existing row (as 0237).
-- No RLS change: `profiles` policies are row-level and this is as public as the skills it annotates.

alter table public.profiles
  add column if not exists skill_practiced jsonb;

comment on column public.profiles.skill_practiced is
  'Last practiced month per skill, keyed by SKILLS key: {"belayescape":"2026-03","crevasse":"2025-06"}. Values are YYYY-MM. Self-reported. NULL = not set.';
