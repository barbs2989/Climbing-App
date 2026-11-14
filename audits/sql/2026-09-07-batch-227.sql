-- WA alpine audit, pass 4, batch 227 (2026-09-07)
-- Routes checked: wa_sherman_peak_baker_squak_glacier, wa_sherpa_balanced_rock_ne_couloir,
-- wa_sherpa_glacier, wa_sherpa_peak_east_ridge, wa_sherpa_peak_north_ridge,
-- wa_sherpa_peak_west_ridge, wa_silver_star_glacier, wa_silver_star_ne_ridge.

-- wa_silver_star_glacier: access._raw.seasonal_closures says "Year-round access with
-- winter vehicle pass requirement; snow typically Nov-April" and access._raw.parking_pass
-- adds "Washington State Sno-Park Permit required Dec 1 - Mar 31". Both contradict this
-- same row's own road.seasonalGate field, which correctly states SR-20 is gated shut in
-- winter with a closure point at the MP 171 Silver Star gate -- and this route's pullout
-- (MP 165-166) sits inside that closure. Confirmed against WSDOT: SR-20 North Cascades
-- Highway closes completely between Ross Dam (MP 134) and the Silver Star gate (MP 171)
-- each winter, typically early Dec through April/May depending on snowpack -- there is no
-- vehicle access of any kind (Sno-Park-permitted or otherwise) to this pullout during that
-- window, since the highway itself is impassable. The _raw block reads like a generic
-- Sno-Park-area template that does not apply to a highway segment WSDOT closes outright,
-- not something specific to this trailhead. Corrected both fields to match the accurate,
-- already-correct road.seasonalGate wording on the same row; nothing else in access._raw
-- touched.
UPDATE routes SET access = jsonb_set(
  access, '{_raw,seasonal_closures}',
  '"SR-20 is fully gated and impassable to all vehicles here in winter -- this pullout (MP 165-166) sits inside WSDOT'\''s Ross Dam (MP 134) to Silver Star Gate (MP 171) closure zone, typically shut early December through April/May depending on snowpack. There is no year-round or Sno-Park-permitted vehicle access during that window."'::jsonb
)
WHERE id = 'wa_silver_star_glacier'
  AND access->'_raw'->>'seasonal_closures' = 'Year-round access with winter vehicle pass requirement; snow typically Nov-April';

UPDATE routes SET access = jsonb_set(
  access, '{_raw,parking_pass}',
  '"Northwest Forest Pass ($5 day / $30 annual) when SR-20 is open. The highway itself is gated and impassable in winter (see seasonal_closures), so no separate Sno-Park permit applies at this pullout."'::jsonb
)
WHERE id = 'wa_silver_star_glacier'
  AND access->'_raw'->>'parking_pass' = 'Northwest Forest Pass ($5 day / $30 annual); Washington State Sno-Park Permit required Dec 1 - Mar 31';

-- verify: should return 0 rows
select id from routes
where id = 'wa_silver_star_glacier'
  and (
    access->'_raw'->>'seasonal_closures' like '%Year-round access%'
    or access->'_raw'->>'parking_pass' like '%Sno-Park Permit required%'
  );
