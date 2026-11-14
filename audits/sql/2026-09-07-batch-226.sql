-- WA alpine audit — batch 226 (2026-09-07, pass 4)
-- Routes checked: wa_sahale_mountain_r1, wa_sahale_mountain_sahale_glacier,
-- wa_scramble_route, wa_se_ridge_aka_shield_wall, wa_sentinel_peak_standard,
-- wa_sews_sw_rib, wa_sharkfin_tower_southeast_ridge, wa_sherman_peak_baker_route.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.
--
-- NOTE: this batch's routes have already been through three prior audit
-- passes (see wa-alpine-audit-log.md batches ~40, ~99-100, 162). Batch
-- 162's proposed bivy-pruning / phone-number fixes for six of these same
-- eight routes were re-checked against the LIVE database this session and
-- do not appear to have been applied yet (wa_sherman_peak_baker_route
-- still carries 6 bivy entries, wa_scramble_route's access._raw.
-- permit_location still has the transposed phone number, etc.) --
-- audits/sql/2026-09-01-batch-162.sql is still an open, unapplied fix and
-- is NOT re-proposed here to avoid duplication. This batch's SQL below
-- covers only a genuinely new finding not caught by any prior pass.

-- =========================================================================
-- Sentinel Peak (wa_sentinel_peak) — wa_sentinel_peak_standard (Standard
-- Route)
-- =========================================================================

-- road.status and access.closures both described Cascade River Road as
-- "currently closed at MP 8 (Marble Creek) due to the Pincer Two Fire...
-- as of mid-2026" -- but the Pincer Two Fire started July 17, 2024 near
-- Mineral Park Campground east of Marblemount, and Mt. Baker-Snoqualmie
-- NF lifted that closure in September 2024 (goskagit.com). It is not a
-- current fact for 2026. Multiple 2026 sources (NPS news releases, the
-- Spokesman-Review, June 17 2026) instead document a DIFFERENT, real 2026
-- closure: spring flood/landslide damage on this same road near MP 20
-- (Eldorado Trailhead), with repairs to MP 18 completed by June 10, 2026
-- but the gate at MP 20 still closed to vehicles as of mid-June 2026
-- (foot/bike travel permitted past the gate, adding ~3 mi/1,500 ft to
-- reach Cascade Pass Trailhead). No source found this session confirms
-- the road's status past mid-June 2026, so the exact current (Sept 2026)
-- state is left unconfirmed rather than guessed at, consistent with this
-- same road's treatment on wa_northeast_ridge_1963_route in batch 221 --
-- the stale 2024 fire claim is removed and replaced with what IS
-- confirmed, dated to when it was confirmed. road.seasonalGate's trailing
-- "independent of the fire closure" clause is also dropped since it now
-- refers to a claim no longer present.
UPDATE routes SET road = jsonb_set(
  road, '{status}',
  '"Both approach roads have had 2026 closures, though not from the source once listed here. A 2024 wildfire (Pincer Two) closed Cascade River Road at MP 8 that summer, but the closure was lifted by September 2024 and is no longer in effect. The current issue on Cascade River Road is spring 2026 flood/landslide damage reported near MP 20 (Eldorado), confirmed in effect as of at least June 2026 by NPS and news reports (Spokesman-Review); status beyond that has not been confirmed by any source found this session -- check current NPS road-condition alerts before a trip. Separately, Suiattle River Road (FSR 26) is closed to vehicles at about MP 4 under a long-term Forest Service closure order (No. 06-05-26-03, effective April 2, 2026 through January 1, 2028) following atmospheric-river flood damage; Grade Creek (FSR 2640), Tenas Creek (FSR 2660), Green Mountain (FSR 2680) and Forest Road 25 are closed as well. The Downey Creek trailhead itself is still reachable on foot or bike from the MP 4 closure point, adding roughly 16 miles round trip of road walking/biking."'::jsonb
)
WHERE id = 'wa_sentinel_peak_standard'
  AND road->>'status' LIKE '%Pincer Two Fire%';

UPDATE routes SET road = jsonb_set(
  road, '{seasonalGate}',
  '"Cascade River Road is additionally gated for winter each year around MP 20 (Eldorado)."'::jsonb
)
WHERE id = 'wa_sentinel_peak_standard'
  AND road->>'seasonalGate' LIKE '%independent of the fire closure%';

UPDATE routes SET access = jsonb_set(
  access, '{closures}',
  '"See road status above: Cascade River Road affected by spring 2026 flood/landslide damage reported near MP 20 (Eldorado) as of at least June 2026 (NPS, Spokesman-Review) -- a previously listed Pincer Two Fire closure at MP 8 was a 2024 event, lifted by September 2024, and is no longer accurate for 2026; and Suiattle River Road closed at MP 4 through at least January 2028 (flood damage) as of mid-2026 -- both can add substantial extra approach mileage."'::jsonb
)
WHERE id = 'wa_sentinel_peak_standard'
  AND access->>'closures' LIKE '%Pincer Two Fire%';

-- verify: should return 0 rows
select id from routes
where id = 'wa_sentinel_peak_standard'
  and (
    road->>'status' like '%Pincer Two Fire%'
    or road->>'seasonalGate' like '%independent of the fire closure%'
    or access->>'closures' like '%Pincer Two Fire%'
  );
