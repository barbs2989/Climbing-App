-- WA alpine route audit -- batch 475 (pass 8)
-- Routes: wa_cascade_peak_east_ridge, wa_cascade_peak_nw_chimney,
-- wa_castle_in_the_sky, wa_castle_peak_pasayten_east_ridge,
-- wa_castle_peak_pasayten_north_ridge, wa_castle_peak_pasayten_the_drawbridge,
-- wa_castle_peak_tatoosh_la_villa, wa_castle_peak_tatoosh_southeast_face

-- wa_cascade_peak_nw_chimney: both `approach` and `approach_variants[0].notes`
-- send the party to the Cascade-Johannesburg (C-J) col via "the Cascade Pass
-- trail to the pass at 5,392 ft, then cross-country by way of Mixup Arm and
-- the Cache Glacier" -- that is the approach to Mixup Peak/Gunsight Notch
-- (confirmed via Mountaineers.org and SummitPost), an unrelated objective
-- well south of Cascade Peak. The actual C-J col approach -- confirmed by
-- multiple independent trip reports (turns-all-year.com, cascadeclimbers.com,
-- whereiskylemiller.com) and already correctly described on this route's own
-- sibling wa_cascade_peak_east_ridge -- goes directly from the Cascade Pass
-- trailhead: back down the road to the hairpin, across the Cascade River,
-- over the moraine, and ~3,400 ft up the C-J Couloir itself. Corrected both
-- fields to match the verified route. (Separately, flagged for human review:
-- this route may now duplicate/overlap wa_cascade_peak_east_ridge, whose own
-- corrections note says research found the East Ridge and NW Chimney to be
-- "parts of the natural summit line, not separate climbing objectives" --
-- not fixed here, since de-duplicating routes is outside this audit's scope.)
update routes set
  approach = 'Same approach as the East Ridge to the C-J col: from the Cascade Pass Trailhead (3,600 ft), walk back down the road to the hairpin, drop down and cross the Cascade River, then go up and over the terminal moraine onto the apron at the foot of the C-J Couloir. Climb roughly 3,400 ft of the couloir directly to the Cascade-Johannesburg col.'
where id = 'wa_cascade_peak_nw_chimney'
  and approach like '%Mixup Arm/Cache Glacier%';

update routes set
  approach_variants = jsonb_set(
    approach_variants, '{0,notes}',
    to_jsonb(replace(
      approach_variants #>> '{0,notes}',
      'Same approach as the East Ridge: Cascade River Road to the Cascade Pass trailhead, the Cascade Pass trail to the pass at 5,392 ft, then cross-country by way of Mixup Arm and the Cache Glacier to the Cascade-Johannesburg Col.',
      'Same approach as the East Ridge: Cascade River Road to the Cascade Pass trailhead, then back down the road to the hairpin, across the Cascade River, and up and over the moraine onto the apron at the foot of the C-J Couloir -- roughly 3,400 ft of the couloir directly to the Cascade-Johannesburg Col.'
    ))
  )
where id = 'wa_cascade_peak_nw_chimney'
  and approach_variants #>> '{0,notes}' like '%Mixup Arm and the Cache Glacier%';

-- wa_castle_peak_tatoosh_la_villa: the row's own "The Castle summit" waypoint
-- carries two disagreeing elevations in the same object -- elev: 6440 vs
-- elevFt: 6460. elev (6440) agrees with the route's own high_point_ft (6440),
-- the parent wa_castle_peak_tatoosh area row's elevation_ft (6440), and the
-- sibling wa_castle_peak_tatoosh_southeast_face route's waypoint for the same
-- summit -- plus external sources Wikipedia and Mountaineers.org, both 6,440
-- ft. Only SummitPost gives 6,460 ft. Corrected elevFt to match elev and the
-- weight of evidence.
update routes set
  waypoints = jsonb_set(
    waypoints, '{1,elevFt}', to_jsonb(6440)
  )
where id = 'wa_castle_peak_tatoosh_la_villa'
  and waypoints #>> '{1,name}' = 'The Castle summit'
  and waypoints #>> '{1,elevFt}' = '6460'
  and waypoints #>> '{1,elev}' = '6440';
