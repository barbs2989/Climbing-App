-- Route fixes from the 2026-11-14/18 research batches that enrich:apply cannot write (identity,
-- classification and numeric columns). Each UPDATE names the OLD value in its WHERE clause, so a
-- row that changed since the research matches nothing rather than being overwritten.
-- Evidence: research-data/route-ledger-2026-11-14/ and -2026-11-18/, route_field_evidence.
begin;

-- Disappointment Cleaver: route high point = NPS published summit elevation (owner rule).
update routes set high_point_ft = 14410
 where id = 'wa_mount_rainier_disappointment_cleaver' and high_point_ft = 14406;

-- Single-pitch crag routes stored pitches = 0 (shape rule: >= 1 or null). Mountain Project: 1 pitch.
update routes set pitches = 1 where id = 'wa_sunshine_buttress' and pitches = 0;
update routes set pitches = 1 where id = 'wa_air_guitar'        and pitches = 0;
update routes set pitches = 1 where id = 'wa_catwalk'           and pitches = 0;
-- A boulder problem has no pitches.
update routes set pitches = null where id = 'wa_pimpsqueak' and pitches = 0;

-- Devils Punch Bowl: grade (WI3) contradicted its own ice_grade (WI2-3); MP + Alpine Dave give WI2-3.
update routes set grade = 'WI2-3'
 where id = 'wa_devils_punch_bowl_area_2_devils_punch_bowl' and grade = 'WI3' and ice_grade = 'WI2-3';

-- Abraxas (Index Upper Town Wall): `access` was a pasted peaks template (USFS, Northwest Forest
-- Pass, "Mount Persis, Gunn Peak, Baring"). The wall is in Forks of the Sky State Park. Remove the
-- false block; the correct access is researched in a later batch.
update routes set access = null
 where id = 'wa_full_or_nearly_wall_routes_abraxas' and access::text like '%Persis%';

-- Chair Peak NE Buttress: a winter mixed route (MP type "Mixed, Ice, Snow"; every dated ascent is
-- winter). The owner chose to split off a summer rock route; that row is NOT created here (see the
-- open question in the batch report). Its stored line has 4 km gaps and no timestamps, so it fails
-- the track checks and is removed (owner rule: failing stored tracks are removed).
update routes set discipline = 'mixed' where id = 'wa_chair_peak_northeast_buttress' and discipline = 'alpine';
update routes set gpx = null where id = 'wa_chair_peak_northeast_buttress' and gpx is not null;

commit;
