-- Routes on alpine peaks filed under a rock discipline, plus one invalid value.
--
-- Started from Black Peak: its East Buttress is `trad` while both siblings are `alpine`.
-- Scanning WA found ~45 trad/sport routes on majority-alpine peaks, but most are CORRECT
-- and are deliberately not touched: Prusik's Sail Away and Liberty Bell's Freedom Rider
-- are genuine alpine ROCK climbs. Blanket-fixing by peak would have wrecked them.
--
-- What remains is routes that are not rock climbs at all, where `trad` (traditional rock
-- protection) is categorically wrong. Each target is justified by that row's own overview.
-- Targets follow WA convention, not preference: routes named "* Glacier" are mountaineering
-- 42 / alpine 28 / trad 5; "* Couloir" are alpine 14 / mountaineering 11 / ice 5 / trad 3.
--
-- Name matching alone was insufficient and is not used: "Glacier View Temple", "Glacier
-- View Palace" and "Glacier Geeks and Wombats" are ordinary rock climbs, correctly
-- labelled, and are excluded.
--
-- Each statement is guarded on the current discipline AND area_id, so a re-run affects
-- 0 rows rather than rewriting something else. Expect "UPDATE 1" each. The SQL Editor
-- reports success for an UPDATE that matched nothing.

-- Glacier ascents; overviews describe glacier travel, not rock climbing.
-- "a longer, more adventurous mountaineering line ... north-side Conrad Glacier"
update routes set discipline = 'mountaineering'
 where id = 'wa_gilbert_peak_conrad_glacier' and area_id = 'wa_gilbert_peak' and discipline = 'trad';

-- "A glacier ascent up Mount Daniel's north side, climbing the retreating Lynch Glacier"
update routes set discipline = 'mountaineering'
 where id = 'wa_mount_daniel_lynch_glacier' and area_id = 'wa_mount_daniel' and discipline = 'trad';

-- "glaciated north side ... glacier travel crosses the Silver Glacier"
update routes set discipline = 'mountaineering'
 where id = 'wa_mount_spickard_silver_glacier' and area_id = 'wa_mount_spickard' and discipline = 'trad';

-- Snow/mixed alpine days: snow-dominated with a short technical finish.
-- "~35-degree, roughly 1,200-ft snow climb finishes with one short 5.4 rock pitch"
update routes set discipline = 'alpine'
 where id = 'wa_tenpeak_mountain_north_couloir' and area_id = 'wa_tenpeak_mountain' and discipline = 'trad';

-- "a full alpine day combining glacier travel, loose ridge scrambling, ... Class 4 ridge"
update routes set discipline = 'alpine'
 where id = 'wa_icy_peak_ruth_icy_traverse' and area_id = 'wa_icy_peak' and discipline = 'trad';

-- Black Peak East Buttress, the row that started this: "class 3-4 steps on generally solid
-- rock" on a 8,970 ft peak. Its sibling South Ridge is graded "4th" and filed `alpine`,
-- so alpine is this peak's own convention for terrain at exactly this grade.
update routes set discipline = 'alpine'
 where id = 'wa_black_peak_east_buttress' and area_id = 'wa_black_peak' and discipline = 'trad';

-- Not a judgement call: `scramble` is not in the app's vocabulary
-- (sport|trad|bouldering|alpine|mountaineering|ice|mixed|scrambling), so this route cannot
-- be found under its own discipline filter. Exactly one WA row has it.
update routes set discipline = 'scrambling'
 where id = 'wa_forbidden_peak_east_ledges' and area_id = 'wa_forbidden_peak' and discipline = 'scramble';

select id, discipline from routes
 where id in ('wa_gilbert_peak_conrad_glacier','wa_mount_daniel_lynch_glacier',
              'wa_mount_spickard_silver_glacier','wa_tenpeak_mountain_north_couloir',
              'wa_icy_peak_ruth_icy_traverse','wa_black_peak_east_buttress',
              'wa_forbidden_peak_east_ledges')
 order by discipline;
