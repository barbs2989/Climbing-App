# Gunsight Range cross-peak text bleed — fixed 2026-07-31

Name-keyed enrichment landed other mountains' research on two Gunsight Range routes
(flagged in the 2026-07-30 hierarchy inventory). Fixed by nulling the foreign fields
in the live DB; the full pre-fix rows are archived in
`gunsight-bleed-recovered-rows.json` in case the prose ever finds its rightful rows.

## wa_west_face (West Face, South Peak — 5.9+, 4 pitches)
Three sources interleaved in one row:

- **Kept (genuine Gunsight):** grade/pitch data, pitch_detail, fa (referencing the real
  North Peak 5.11+ testpiece, Nelson/Dietrich 1986), rack/rope fields, Downey Creek /
  Ptarmigan Traverse approach + waypoints, Chickamin-glacier obj_haz, comms, rappels,
  high_point_ft 8100.
- **Nulled (Remmel Mountain scramble pass):** overview, beta, descent, descent_text,
  itinerary, turnaround, pro_tips, watch_out, pro_needs, best_season, detailed_rack,
  bail, gear, hazards, gain_ft 1985, dist_km 24.1 — all describe a class 2-4 scramble
  from an Andrews Pass camp on Remmel's west side. No Remmel "West Face" route row
  exists to move it to (Remmel has NW Ridge + Southeast Slope only).
- **Nulled (a third, unrelated bleed):** road (Barlow Pass / Monte Cristo — wrong
  drainage entirely) and access (claims North Cascades NP + a permit fee; the range is
  in the Glacier Peak Wilderness).

## wa_east_face (East Face, Middle Peak — 5.10d, 7 pitches)
- **Nulled:** rope_note, which described "the East Face of the Middle Peak, Mount
  Index" — Mount Index also has a Middle Peak, which is presumably how the note landed
  here. No Mount Index Middle-Peak East Face route exists to move it to.

Root cause is the same name-keyed identity problem as the route-id collisions:
"Middle Peak" and "West Face" are not identifiers. Guard: only null a field when its
live value still byte-matches the archived bled value (see the applier in the session
log); each write went through patchRow and was reconciled by read-back.
