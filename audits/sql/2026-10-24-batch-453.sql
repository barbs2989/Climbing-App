-- WA alpine/mountaineering audit -- batch 453 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_skookum_peak_twinsisters_scramble, wa_sky_mountain_s_route, wa_sloan_peak_corkscrew,
--         wa_snowfield_peak_neve_glacier, wa_snowking_mountain_standard, wa_south_arete,
--         wa_south_early_winter_spire_direct_east_buttress, wa_south_early_winter_spire_passenger
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Skookum Peak, North Ridge via Jaws' Tooth -- wa_skookum_peak_twinsisters_scramble
-- =========================================================================
-- fa claims "Dallas Kloke and Dave Dixon, September 1972 (first ascent of the peak)" for
-- Skookum Peak. That 1972 Kloke/Dixon ascent is real, but it was of a DIFFERENT, nearby
-- Twin Sisters Range summit: Washington State's 2022 Committee on Geographic Names
-- proposal for "Kloke Peak" (dnr.wa.gov, naming the peak after Dallas Kloke) states "Dallas
-- Kloke, who along with Dave Dixon, first summited the peak in September of 1972" for a
-- 6,480 ft summit -- listsofjohn.com's listing for that same peak (id 49984) gives its
-- unofficial prior name as "Hayden Peak". SummitPost's own Twin Sisters Range elevation
-- list orders the chain north-to-south as North Twin Sister, South Twin Sister, Skookum
-- Peak (6,616 ft), Hayden Peak (6,480 ft), Little Sister -- i.e. Hayden/Kloke Peak is the
-- next distinct summit south of Skookum, not Skookum itself. No source found ties the
-- Kloke/Dixon ascent to Skookum Peak, and no source gives a first-ascent party for Skookum
-- Peak itself, so the mis-ascribed fa is cleared rather than replaced with a guess.
UPDATE routes
SET fa = NULL,
    corrections = corrections || ' 2026-10-24: removed fa attribution to "Dallas Kloke and Dave Dixon, September 1972" -- WA DNR''s 2022 Kloke Peak naming proposal and listsofjohn.com confirm that 1972 ascent was of the neighboring 6,480 ft summit now named Kloke Peak (formerly "Hayden Peak"), the next distinct peak south of Skookum in the range, not Skookum Peak itself; no first-ascent source was found for Skookum Peak.',
    data_quality = jsonb_set(
      data_quality,
      '{gaps,1}',
      '"No confirmed first-ascent party found for Skookum Peak itself. A Sept 1972 Dallas Kloke/Dave Dixon ascent previously attributed here was actually of the neighboring, now officially named Kloke Peak (formerly \"Hayden Peak\", 6,480 ft), the next distinct Twin Sisters summit south of Skookum -- see corrections."'::jsonb
    )
WHERE id = 'wa_skookum_peak_twinsisters_scramble'
  AND fa = 'Dallas Kloke and Dave Dixon, September 1972 (first ascent of the peak)'
  AND data_quality #>> '{gaps,1}' = 'No confirmed first-ascent party for the north ridge specifically; the documented Sept 1972 Kloke/Dixon ascent covers the peak generally, route unspecified';

COMMIT;
