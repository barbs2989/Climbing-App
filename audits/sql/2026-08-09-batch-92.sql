-- WA alpine audit -- batch 92 (pass 2) -- 2026-08-09
-- Routes: wa_mount_tom_scramble, wa_mount_torment_south_ridge,
--         wa_mount_torment_torment_forbidden_traverse, wa_mount_triumph_northeast_ridge,
--         wa_ne_ridge (Cathedral Peak), wa_needle_peak_north_ridge,
--         wa_neve_glacier_west_ridge (Snowfield Peak), wa_news_nw_corner (North Early Winters Spire)
-- Researched via 4 parallel agents grouped by peak (Tom+Triumph; Torment x2; Cathedral+Needle;
-- Snowfield+NEWS). WebFetch to nearly every primary-source domain (nps.gov, mountainproject.com,
-- summitpost.org, mountaineers.org, wikipedia, etc.) was blocked by this session's egress proxy, same
-- as every recent batch, so findings rest on WebSearch result snippets rather than full-page reads;
-- noted per item below. Two of the four fixes below rest on pure internal self-contradiction within a
-- single row (no external source needed to see the row disagrees with itself); the other two are
-- confirmed against external sources as well as an internal contradiction.

-- wa_needle_peak_north_ridge: `permit` field describes the North Cascades NP backcountry-permit system
-- (Recreation.gov / Marblemount WIC), but this route's own `access.landManager` field already says
-- "Okanogan-Wenatchee National Forest" -- a direct in-row contradiction. External sources agree with
-- the row's own landManager: Needle Peak sits on the Dark Peak/Anonymity Towers ridge extending from
-- Bonanza Peak, and Wikipedia's "Bonanza Peak (Washington)" page places that whole ridge in the
-- Glacier Peak Wilderness of the Wenatchee National Forest, not North Cascades National Park -- a
-- free self-issue USFS wilderness permit applies, not an NPS reservation. This is the same
-- Pasayten-self-issue-vs-NCNP-backcountry-permit distinction this audit already had right on the
-- Cathedral Peak row researched in the same batch, just landing on the wrong peak here.
UPDATE routes SET permit = 'Glacier Peak Wilderness (Okanogan-Wenatchee National Forest): free self-issue wilderness permit at the trailhead for both day and overnight use; no quota, fee, or NPS backcountry reservation -- this route is well outside North Cascades National Park.'
WHERE id = 'wa_needle_peak_north_ridge'
  AND permit = 'North Cascades NP complex: no permit for day climbs; all overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).';

-- wa_mount_torment_torment_forbidden_traverse: `alpine_grade` ('D') contradicts this same row's own
-- `commitment` ('IV') and `grade` ('Grade IV, 5.6') fields -- a self-contained inconsistency, no
-- external source needed. The sibling South Ridge route on the same peak has `alpine_grade` and
-- `commitment` matching each other (both 'II'), confirming the field is meant to carry the same
-- roman-numeral commitment grade as `commitment`, not a separate letter scale.
UPDATE routes SET alpine_grade = 'IV'
WHERE id = 'wa_mount_torment_torment_forbidden_traverse'
  AND alpine_grade = 'D'
  AND commitment = 'IV';

-- wa_neve_glacier_west_ridge (Snowfield Peak): access.notes and access.rules are contaminated with
-- content from an unrelated area. access.notes claimed a Northwest Forest Pass is required and named
-- "Mount Tom area, North Cascades" -- Mount Tom is a different WA peak entirely (in the Olympics, not
-- the North Cascades), and the claim directly contradicts this same row's own access.passRequired
-- ("No -- North Cascades NP has no entry or parking fees"). External sources confirm Pyramid Lake
-- Trailhead (this route's actual approach) needs no parking pass of any kind, being NPS/Ross Lake NRA
-- land. access.rules described Boston Basin-specific camping/group-size rules (Low/High Camp site
-- names, a 6-person cross-country cap) -- Boston Basin is the Forbidden/Sahale/Eldorado approach on the
-- Cascade River Road corridor, unrelated to Snowfield Peak's Highway 20/Pyramid Lake corridor; the
-- rules and group_limit are deleted rather than replaced with a guessed number, since no source found
-- gives a Pyramid-Lake-zone-specific group limit.
UPDATE routes SET access = jsonb_set(
  (access - 'rules' - 'group_limit'),
  '{notes}',
  '"No Northwest Forest Pass or day-use fee applies at the Pyramid Lake Trailhead -- it is North Cascades National Park / Ross Lake NRA land, not a fee-based Forest Service trailhead (see passRequired above). No permit is needed for day climbs; overnight stays require the backcountry permit described above."'::jsonb
)
WHERE id = 'wa_neve_glacier_west_ridge'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- wa_news_nw_corner (North Early Winters Spire): three fields (rappels, descent_text, pro_tips) say
-- the bolted West Face rappel line has "six" stations, contradicting this same row's own
-- rappel_count_note, which explicitly corrects it to "four bolted (not six) rap stations plus one tree
-- rappel for the last section." External corroboration sides with rappel_count_note: a North Cascade
-- Mountain Guides route page and associated trip reports describe "four fairly new bolted rap
-- stations, new bolts every 100 feet" on this exact descent, not six.
UPDATE routes SET rappels = '~4 bolted rappels plus one final tree rappel down the shared West Face rap line (60-70m rope recommended)'
WHERE id = 'wa_news_nw_corner'
  AND rappels = '~6 rappels down the shared bolted West Face rap line (60-70m rope recommended)';

UPDATE routes SET descent_text = replace(
  descent_text,
  'Six bolted (2-bolt) rappel stations in a nearly direct line bring you back down',
  'Four bolted (2-bolt) rappel stations, plus a final tree rappel, bring you back down'
)
WHERE id = 'wa_news_nw_corner'
  AND descent_text LIKE '%Six bolted (2-bolt) rappel stations in a nearly direct line bring you back down%';

UPDATE routes SET pro_tips = jsonb_set(
  pro_tips,
  '{2}',
  '"Prefer the newer 4-station bolted rappel line (plus a final tree rappel) down the West Face when rope length and conditions allow -- cleaner and faster than the loose gully"'::jsonb
)
WHERE id = 'wa_news_nw_corner'
  AND pro_tips->>2 = 'Prefer the newer 6-station bolted rappel line down the West Face when rope length and conditions allow — cleaner and faster than the loose gully';

-- verify: each should return exactly the corrected row, none of the old contaminated/contradictory text
select id, permit from routes where id = 'wa_needle_peak_north_ridge';
select id, alpine_grade, commitment from routes where id = 'wa_mount_torment_torment_forbidden_traverse';
select id, access from routes where id = 'wa_neve_glacier_west_ridge';
select id, rappels, pro_tips->>2 as tip3 from routes where id = 'wa_news_nw_corner';
