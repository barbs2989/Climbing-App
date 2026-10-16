# A third of the waypoint-order backlog is arithmetic, not research

2026-08-19. Follow-up to `WAYPOINT-ORDER-TRIAGE-2026-08-19.md`, which closed with *"the real fix
is to populate `distMi`, which is per-route research."* That is true of most of it and **not of
all of it**, and the difference is worth knowing before anybody starts reading trip reports.

## The idea

`orderWaypoints` sorts by `distMi` and gives up unless **every** pin has one. A pin has a
coordinate, and many routes have a gpx track. Distance-along-track is then arithmetic: project
the pin onto the polyline, sum the segment lengths up to that point. No sources needed.

## Where it does and does not work

Measured across 1,012 WA routes carrying waypoints:

| | routes |
|---|---|
| already have `distMi` on every pin — nothing to derive | 470 |
| fewer than 2 pins — cannot be mis-ordered | 107 |
| **no usable gpx track** — genuinely needs research | **226** |
| a pin with no coordinate — cannot be placed on any track | 6 |
| **track IS the pins joined up** — computing from it is circular | **88** |
| **could have `distMi` computed from a genuine track** | **115** |

That 88 is the interesting exclusion and it is not a technicality. `lib/track.js` already
records that 201 of 580 WA gpx tracks are the route's own waypoint list joined up. On those, the
polyline's vertex order **is** the stored pin order, so distance-along-track would reproduce
whatever order is already there and confirm it. It would look like a fix and be a tautology —
the same circularity `audit:waypoints` and `audit:waypoint-track` hit, where "is the pin on its
track?" is answered yes by construction.

## Against the actual backlog

Of the **64** routes that list an approach marker after the summit:

- **20 are computable** — `wa_cutthroat_south_buttress`, `wa_cutthroat_west_ridge`,
  `wa_dragontail_peak_r3`, `wa_enchantment_peak_southwest_scramble`, `wa_gothic_peak_standard`,
  `wa_hibox_mountain_standard`, `wa_luna_peak_southeast_slopes`,
  `wa_mount_adams_wilson_glacier_headwall`, `wa_mount_anderson_eel_glacier` and 11 more.
- **44 still need a source.**

So the backlog is roughly a third arithmetic, two thirds research. Worth reframing, not worth
overstating.

## What is NOT done here, and what it would need

The computation is deliberately **not implemented**. This is data *generation* rather than
repair, and it carries risks the trim appliers did not:

- **A pin far off the track snaps to the wrong place.** The waypoint audits found many pins
  hundreds of metres off their line; projecting one of those onto the polyline yields a
  confident, wrong distance. Any implementation needs a **snap-distance gate** — refuse rather
  than guess — and the threshold has to be measured, not chosen.
- **A track that does not start at the trailhead** offsets every distance on the route. The
  first pin being a Trailhead within a short distance of the track's first point is a cheap
  check worth making before writing anything.
- **Writing a derived number into a column that elsewhere holds a researched one** needs the
  provenance to be visible, or the next audit cannot tell measured from computed.

The right shape is the one the trim work used: compute, gate hard, apply a small reviewed batch,
re-read, and only widen once the gate has been shown to refuse the cases it should.
`scripts/oneoff/probe-distmi-derivable-from-track.mjs` is the measurement half and writes
nothing.
