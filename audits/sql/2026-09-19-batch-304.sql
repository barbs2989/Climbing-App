-- WA alpine route audit -- batch 304 (2026-09-19, pass 5)
-- Human-reviewable fixes. Nothing here is applied automatically.

-- wa_trapper_mountain_south_slopes (Trapper Mountain, South Slopes, first climbed 1949
-- by Bell/Griscom/King/Matthews -- FA, elevation (7,530 ft), and Hurry-up Peak's
-- prominence (7,821 ft, ~0.7 mi west) all externally confirmed via WebSearch/Wikipedia).
--
-- Two fields describe reaching this peak via a Stehekin ferry + Stehekin Valley Road +
-- "Harlequin Campground" + "Devore Creek approach" multi-day trip. That is wrong: the
-- Devore Creek Trail (confirmed via WebSearch) is the documented approach for Tupshin
-- Peak, Devore Peak and Flora Mountain -- a different Stehekin-area peak cluster far to
-- the southeast, not Trapper Mountain. The real approach is via the Cascade Pass
-- Trailhead (Cascade River Road) and Pelton Basin -- confirmed by (1) a WTA trip report
-- describing exactly that route to Trapper Lake (~10+ hours one-way, roughly half
-- maintained trail / half off-trail from Pelton Basin to the lake), and (2) this row's
-- OWN `beta` field, which already correctly says "Parties leave the Cascade Pass Trail
-- system at Pelton Basin, cross rough, partly-bushwhacked terrain over the ridge north
-- of Trapper Mountain, drop several hundred feet to the Trapper Lake basin (4,170 ft)"
-- -- and (3) the sibling route on this same peak (wa_trapper_mountain_north_couloir),
-- whose `approach` field independently and correctly describes the identical Cascade
-- Pass Trailhead -> Pelton Basin -> Trapper Lake (el. ~4,170 ft) approach. Two fields
-- contradicted a third field on the same row plus a sibling route on the same peak plus
-- external sources; rewritten to match all of them rather than invented.
UPDATE routes SET approach = 'From the Cascade Pass Trailhead (end of Cascade River Road), follow the maintained Cascade Pass Trail to Pelton Basin, then leave the trail system and cross rough, partly-bushwhacked terrain over the ridge north of Trapper Mountain, dropping several hundred feet to the Trapper Lake basin (el. ~4,170 ft). Trip reports describe the Pelton Basin-to-lake stretch as roughly half maintained tread and half off-trail travel, finishing with a steep, brushy, trail-less descent to the lake itself — figure 10+ hours one-way from the trailhead to the lake alone. From the lake, climb the open south-facing slopes and gullies above it to the 7,530-ft summit, staying on Class 2-3 terrain and avoiding steeper rock bands. There is no maintained trail beyond Pelton Basin and no cell coverage on route; most parties treat this as an overnight trip with a camp at or below Trapper Lake.'
  WHERE id = 'wa_trapper_mountain_south_slopes'
  AND approach = 'There is no road access to the Trapper Mountain area — reach Stehekin first via the Lady of the Lake ferry (Lake Chelan Boat Company) or floatplane (Chelan Airways) from Chelan, WA. From Stehekin Landing, take the Stehekin Valley Road (or park shuttle) about 4.5 miles to Harlequin Campground. Figure a full day of travel each way from Harlequin; most parties treat this as a 2-3 day trip with a camp at or below Trapper Lake.';

UPDATE routes SET best_season = 'Late July through September is most reliable. Early-season travel (June-early July) is slowed by lingering snow in the Trapper Lake basin and by the off-trail, brushy terrain and creek crossings between Pelton Basin and the lake. The route sees very little traffic, so current-conditions reports are scarce — plan on breaking your own trail/route regardless of month.'
  WHERE id = 'wa_trapper_mountain_south_slopes'
  AND best_season = 'Late July through September is most reliable. Early-season travel (June-early July) is slowed by lingering snow in the Trapper Lake basin and by high, cold creek crossings on the Devore Creek approach. The route sees very little traffic, so current-conditions reports are scarce — plan on breaking your own trail/route regardless of month.';

-- wa_traverse_of_mount_index (Mount Index Traverse -- elevation 5,991 ft and the 1950
-- Beckey/Schoening FA both externally confirmed). Minor, non-factual cleanup: the `fa`
-- field editorialized about the database's own edit history ("the 'Charles' stored here
-- previously is carried by no located source") -- pipeline/editor commentary about a
-- prior correction, shipped to a climber reading the route page, rather than a claim
-- about the mountain. The substantive fact (no given name is confirmed for Schoening in
-- the AAC/Mountain Project accounts) is kept and is NOT overturned here: WebSearch
-- returned "Pete Schoening" for this climb, but that appears to be inferred from Pete
-- Schoening's general fame in this era rather than a primary source naming him for this
-- specific 1950 traverse (Wikipedia and Mountain Project, the two sources this row's own
-- prior research already cites, were both blocked by network egress and could not be
-- checked directly this run) -- not confirmed enough to overwrite a more specific,
-- already-sourced claim. Trimmed to remove only the meta-commentary about the edit
-- history.
UPDATE routes SET fa = 'Fred Beckey and Schoening, August 1950 - the first recorded traverse, done in sneakers over two nights. No given name is recorded for Schoening in available sources (the AAC''s own account of the traverse and Mountain Project''s route page both give the surname alone).'
  WHERE id = 'wa_traverse_of_mount_index'
  AND fa = 'Fred Beckey and Schoening, August 1950 - the first recorded traverse, done in sneakers over two nights. No given name is recorded for Schoening: the AAC''s own account of the traverse and Mountain Project''s route page both give the surname alone, and the ''Charles'' stored here previously is carried by no located source.';
