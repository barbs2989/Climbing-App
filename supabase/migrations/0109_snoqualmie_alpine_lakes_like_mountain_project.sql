-- 0109: file the Snoqualmie / Alpine Lakes peaks where Mountain Project files them.
--
-- Requested directly: "do how mountain project does it". Same shape as 0105 did for Mount
-- Index, and it starts by correcting something 0108 asserted.
--
-- ── WHAT WAS WRONG ───────────────────────────────────────────────────────────
-- Three sibling regions cover one stretch of terrain under Central-West Cascades:
--
--   wa_snoqualmie_pass_area   "Snoqualmie Pass Area"   15 children, ALL crags/regions
--   wa_western_alpine_lakes   "Western Alpine Lakes"    8 children, 6 peaks + 2 crags
--   wa_snoqualmie_i90_region  "Snoqualmie Pass"        31 children, 30 peaks + 1 crag
--
-- The first two are Mountain Project's own areas — both appear verbatim in MP's
-- Central-West Cascades & Seattle sub-area list, alongside Skykomish Valley, North Bend &
-- Vicinity and Greater Seattle, which we also match. **MP has no "Snoqualmie Pass"**; that
-- third row is the alpine peak list's bucket, the same two-load artifact 0106 and 0107
-- repaired at Washington Pass and the Pickets. Its 30 peaks were never distributed into
-- the MP tree, so peaks and crags of the same terrain sat in parallel regions.
--
-- ── A CORRECTION TO 0108 ─────────────────────────────────────────────────────
-- 0108 deleted the hollow `wa_summit_chief` stub and stated that Summit Chief Mountain was
-- "already filed with its actual neighbours" in wa_snoqualmie_i90_region. **That was
-- wrong.** MP lists "Summit Chief" as a sub-area of Western Alpine Lakes, and MP's own
-- description of that region names it explicitly: "The Cascade Crest north of Snoqualmie
-- offers the spires of Chimney Rock and Summit Chief". So the deleted stub had been in the
-- RIGHT region and the populated peak is the one misfiled. Deleting the stub was still
-- correct -- it held no routes, no children, no elevation -- but the peak needed a move,
-- and it gets one below. Nothing from 0108 needs undoing.
--
-- ── HOW THE TARGETS WERE DECIDED ─────────────────────────────────────────────
-- By reading MP's two sub-area listings and matching on NAME, not by coordinates. Every
-- move below is a row whose name appears verbatim in one of MP's lists:
--
--   MP Snoqualmie Pass Area  ... Bryant Peak, Chair Peak, Guye Peak, Kendall Peak,
--                                Lundin Peak, Red Mountain, Snoqualmie Mountain,
--                                "Tooth, The", Granite Mountain, Kaleetan Peak
--   MP Western Alpine Lakes  ... Big Snow Mountain, Chimney Rock, Hibox Mountain,
--                                Huckleberry Mountain, Little Big Chief, Mount Thomson,
--                                Summit Chief, "Bear's Breast Mountain"
--
-- Note Granite Mountain and Kaleetan Peak move the OTHER way -- they are ours under
-- Western Alpine Lakes but MP files both under Snoqualmie Pass Area. This is not a
-- one-directional sweep, which is why it is worth doing from MP's lists rather than from
-- an intuition about which region is "bigger".
--
-- Bear's Breast was nearly missed: MP spells it with an apostrophe and our row does not,
-- so the first name-match pass reported it as absent from MP and left it behind. Matching
-- is only as good as its normaliser -- 17 moves became 18 once apostrophes were stripped
-- before tokenising rather than turned into a separator.
--
-- ── WHAT IS DELIBERATELY LEFT ALONE ──────────────────────────────────────────
-- Fifteen rows stay in wa_snoqualmie_i90_region (28 routes) because **MP has no area for
-- them at all** -- Alta Mountain, Burnt Boot Peak, Cathedral Rock, Denny Mountain, Four
-- Brothers, Garfield Mountain, Lemah Two, Mount Daniel, Mount Hinman, Mount Price, Mount
-- Roosevelt, Mount Teneriffe, Preacher Mountain, Treen Peak, and one ice crag. There is no
-- MP structure to copy for a place MP does not list, and inventing one from coordinates is
-- the move this codebase keeps being right to refuse. They are reported, not guessed at.
--
-- Two of them are worth flagging for a later decision rather than acting on now: MP's
-- Western Alpine Lakes blurb names "the glaciated gentleness of Daniel and Hinman" as part
-- of that region, but MP carries no sub-area for either, so the prose says one thing and
-- the structure says nothing. And "Lemah Two" is a sub-summit MP does not separate from
-- "Lemah Mountain" (which we already have, correctly, in Western Alpine Lakes) -- 340 m
-- apart with different names and routes on both, so it is most likely a real second
-- summit, not a duplicate. Neither is touched here.
--
-- ── WHY THE MOVES ARE SAFE ───────────────────────────────────────────────────
-- Verified against the live DB immediately before writing: both destinations hold ZERO
-- direct routes (so trg_areas_leaf_xor passes), all 18 movers are childless leaves (so
-- there is no ltree cascade to chase, unlike 0097), and every row involved is already
-- inside wa_centralwest -- so only the three region rows change subtree membership and
-- every ancestor above keeps its count.

-- ── 1. To MP's "Snoqualmie Pass Area" (10 areas, 37 routes) ──────────────────
update areas set parent_id = 'wa_snoqualmie_pass_area'
 where id in ('wa_bryant_peak','wa_chair_peak','wa_guye_peak','wa_kendall_peak',
              'wa_lundin_peak','wa_red_mountain_snoqualmie','wa_snoqualmie_mountain',
              'wa_the_tooth','wa_granite_mountain','wa_kaleetan_peak');

-- ── 2. To MP's "Western Alpine Lakes" (8 areas, 21 routes) ───────────────────
update areas set parent_id = 'wa_western_alpine_lakes'
 where id in ('wa_big_snow_mountain','wa_chimney_rock','wa_hibox_mountain',
              'wa_huckleberry_mountain','wa_little_big_chief_mountain','wa_mount_thomson',
              'wa_summit_chief_mountain','wa_bears_breast_mountain');

-- ── 3. Recount the three regions ─────────────────────────────────────────────
-- route_count is trigger-maintained on the ROUTES table (0001) and does NOT recompute when
-- an AREA's parent_id changes. Recount, never arithmetic -- 0097 predicted 106 from two
-- cached numbers and the truth was 103.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_snoqualmie_pass_area','wa_western_alpine_lakes','wa_snoqualmie_i90_region');

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- Do not append these to the paste: the SQL Editor runs a pasted script as ONE
-- transaction, and an error in a read-only SELECT rolls back the writes before it.
--
--   select name, route_count from areas where parent_id = 'wa_snoqualmie_pass_area'
--     order by name;
--   -- expect 25 rows (15 + 10), including Chair Peak, Guye Peak, The Tooth
--
--   select name, route_count from areas where parent_id = 'wa_western_alpine_lakes'
--     order by name;
--   -- expect 16 rows (8 + 8), including Chimney Rock and Summit Chief Mountain
--
--   select name from areas where parent_id = 'wa_snoqualmie_i90_region' order by name;
--   -- expect 15 rows, none of them named in this migration
--
--   select id, route_count from areas
--     where id in ('wa_snoqualmie_pass_area','wa_western_alpine_lakes',
--                  'wa_snoqualmie_i90_region','wa_centralwest') order by id;
--   -- expect roughly snoqualmie_pass_area 84, western_alpine_lakes 29,
--   --        snoqualmie_i90_region 28, and wa_centralwest UNCHANGED at 2100.
--   -- The three recounts are authoritative if they disagree; wa_centralwest moving at all
--   -- would mean a route left the subtree and is a real problem.
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents
