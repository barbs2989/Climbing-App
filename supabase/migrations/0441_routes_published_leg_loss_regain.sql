-- 0441 — routes.approach_loss_ft and routes.return_gain_ft: the PUBLISHED downhill on the way to the summit
-- and the PUBLISHED uphill on the way back to the car.
--
-- Why (owner, 2026-11-14): "mt goode northeast buttress has a pretty big descent on the approach, but the
-- stats don't show that", then "i dont want to have to do any of our own math, all the information should
-- be online". PR #3352 measured these on recorded track heights; the owner asked for published figures
-- only, so the leg cards now print only what these two columns hold, and each value is written by the
-- research pipeline with its evidence in route_field_evidence (0437) — never computed by the app.
--
-- `loss_ft` is NOT this: it holds two conventions (the descent to the car, or only the dips on the way in;
-- research-data/gain-loss-audit-2026-11-14/), so it cannot answer "how much do I lose on the approach".
--
--   approach_loss_ft  feet lost between the trailhead and the summit (a pass dropping to a creek, a col to
--                     a glacier). NULL = no source states one; 0 = a source states the approach only climbs.
--   return_gain_ft    feet regained between the summit and the trailhead (climbing back out of that drop).

alter table routes add column if not exists approach_loss_ft integer;
alter table routes add column if not exists return_gain_ft integer;

alter table routes drop constraint if exists routes_approach_loss_ft_range;
alter table routes add constraint routes_approach_loss_ft_range
  check (approach_loss_ft is null or approach_loss_ft between 0 and 20000);
alter table routes drop constraint if exists routes_return_gain_ft_range;
alter table routes add constraint routes_return_gain_ft_range
  check (return_gain_ft is null or return_gain_ft between 0 and 20000);

comment on column routes.approach_loss_ft is
  'Published feet LOST on the way from the trailhead to the summit; evidence in route_field_evidence (0441).';
comment on column routes.return_gain_ft is
  'Published feet REGAINED on the way from the summit back to the trailhead; evidence in route_field_evidence (0441).';
