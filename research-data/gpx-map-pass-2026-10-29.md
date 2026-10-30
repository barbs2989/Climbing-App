# GPX map pass, 2026-10-29 (owner note, 2026-10-25 GPX item, resumed)

**Ascent and descent on the map.** `splitAtSummit` (`lib/track.js`) splits a recorded track at its
vertex nearest the summit pin; `GPXMap` draws the way up as a wide blue line and the way down as a thin orange line over it.
Over the 425 tracks the map draws: 110 split into ascent + descent, 278 end at the summit
(legend: *Descent not recorded in this track*), 37 have no summit pin and stay one line
(`scripts/oneoff/gpx-legs-measure.mjs`).

**Off-route waypoints removed.** `scripts/oneoff/gpx-offroute-candidates.mjs` measured every pin
against the route's own recorded track, with the per-type tolerance `trackCoverage` uses (hazard
600 m, camp 500 m, water 400 m, other 300 m). Judged: every pin on a complete track; on a one-way
track only the pins listed before the summit. Trailhead and summit pins are never candidates.
Result `offroute-waypoints-2026-10-29.json`: 72 pins on 55 routes removed
(`gpx-offroute-remove.mjs`, paced, rollback `scripts/rollback-offroute-waypoints-2026-10-29.json`,
0 reconcile failures). Every drive-in campground among them is still in the route's CAMPING & BIVY
list. 24 routes where half or more of the judged pins are off (`disagree`) were not edited
mechanically: the track and the pins may describe different ways, which needs research
(`track-pin-disagree-evidence-2026-10-29.json`).

**Routes without a complete track.** `routes-without-complete-gpx-2026-10-29.csv` lists every
alpine, mountaineering and scrambling route without a trailhead-summit-trailhead track: 6,135 of
6,208. In Washington: 278 one-way, 145 starting away from the trailhead, 50 stopping short of the
summit, 5 uncheckable (pin missing), 492 with no track.

**Why no tracks were imported from the owner's list of sites.** Their terms were read on
2026-10-29. FastestKnownTime and Gaia GPS (both Outside Inc.: content use needs prior written
permission, scraping barred), CalTopo (no scraping, not for reproduction), Strava (API policy bars
showing other users' data), Mountain Project (no scraping), Peakbagger ("unauthorized attempt to
copy ... scrape" is infringement), The Mountaineers (personal non-commercial licence) do not allow
copying their tracks into another app. Mazamas, Alpine Savvy, Climber Kyle and Road Trip Ryan
state no licence. Facts (place names, coordinates, distances) may be read from any of them and
written in our own words.

**Round 2: the 24 track/pin disagreements, researched** (`track-pin-disagree-verdicts-A/B-2026-10-29.json`).
Most were not real disagreements: the drive-in campgrounds counted as route pins, and many of the
tracks had only 4-9 points, so distances were measured to straight chords. Removed 12 pins on 8
routes (`offroute-waypoints-round2-2026-10-29.json`, rollback
`scripts/rollback-offroute-waypoints-round2-2026-10-29.json`, 0 reconcile failures): nine drive-in
campgrounds that stay listed under CAMPING & BIVY, Cardinal Peak's Fern Lake junction and west-side
camp (both well off where WTA's mileage and the recording put them), and Windy Peak's boundary and
Two Bear Camp pins (600-840 m off a dense recording). Left for a later pass, evidence did not settle
them: Navaho Peak (the dense recording reaches the summit ~1.2 km east of the Navaho Pass pin) and
Mount Fairchild (the line follows Appleton Pass; sources name the Deer Lake / High Divide way).

**Lines too sparse to be recordings.** 74 drawn "tracks" had 2-9 points at a median spacing of
1,392 m, against 17 m for the 314 tracks of 100+ points; by point count the data breaks off between
9 and 13 (`scripts/oneoff/gpx-sparse-measure.mjs`). `recordedTrackPts` now refuses any line under
`MIN_RECORDED_PTS` (10), so those routes show their pins with no line, a waypoints-only download, and
the *Add a track* prompt.

**Round 3: routes with no recorded track** (`scripts/oneoff/gpx-corridor-measure.mjs`,
`corridor-offroute-pins-2026-10-29.json`). With no track to measure against, a pin counted as off
the route when it sat more than 3 km from the trailhead-summit line and further than 60% of that
line's length. 104 pins on 72 routes; 95 were drive-in campgrounds already listed in the route's
CAMPING & BIVY section, and those 95 map pins (63 routes) were removed
(`offroute-waypoints-round3-campgrounds-2026-10-29.json`, rollback
`scripts/rollback-offroute-waypoints-round3-2026-10-29.json`, 0 reconcile failures). The other 9
were kept: they are real camps on a long approach (Berg Lake on Robson, May Creek on Jack Mountain,
Camp Kiser, Spike Camp), where the straight line is a poor stand-in for the trail.
`audit:coord-origin` found nothing more than 50 km from its own area.

**Restored (same day):** 11 round-1 pins on 7 routes (Amphitheater N Ridge, Bonanza NE Buttress, East Slope, Shuksan White Salmon, Mount Tom, The Pleiades, Union Peak) had been judged against a line of 5-8 points, which `MIN_RECORDED_PTS` then ruled is not a recording, so "off the line" was no evidence; they were put back (`scripts/oneoff/gpx-offroute-restore.mjs`, 0 problems). The campground removals on Chockstone and Fairchild, judged against 4- and 9-point lines, stand: those camps are 2.6-14 km away and stay in the camping list.

Totals for 2026-10-29: 168 pins removed from 119 routes across three rounds.

**Road Trip Ryan as a source.** Its 12,000-page sitemap is Utah, Nevada and Wyoming (plus one
Colorado and a few odds and ends), so it overlaps three of our peak routes. Two had no way-in at all
and now have one, from facts confirmed on at least two fetched pages each and written in our own
words (`ut-approach-batch-2026-10-29.json`, written with `enrich:apply`, copy check 0 overlaps,
verified on re-read): Kings Peak / Anderson Pass (Henrys Fork Trail) and Twin Peaks via Broads Fork.
The North Ridge of Monte Cristo was left out: the way from Lake Blanche to the foot of the ridge was
on one page only. Not written either: the Henrys Fork fee (one page only).

**Round 4 (owner note "route tracks are still messed up", resumed): named pins against the gazetteer.**
Bear Mountain North Buttress, the note's example, now draws no line: its stored `gpx` is 7 points
built from its own pins, which `recordedTrackPts` refuses, so the map shows the pins alone. Its
*Hannegan Pass* pin agrees with GNIS (108 m). Every pin whose whole name is a point feature
(*X Pass / Gap / Col / Notch / Saddle / Lake*) was compared with GNIS in its own state
(`scripts/oneoff/gpx-named-pins/`, results in `research-data/gpx-named-pins-2026-10-29/`): 388
pins, 282 agree, 99 are climbers' names GNIS does not hold, 6 are namesakes 50+ km away (also
climbers' names), 4 were off and were moved to the GNIS coordinate after a second source and the
ground agreed (`fixes.json`, rollback `scripts/rollback-named-pins-gnis-54399.json`, 0 problems):
Blizzard Peak's Castle Pass (2.5 km south on the PCT; WTA puts it at the Trail 749 junction west of
Frosty Pass), Cathedral Peak's Cathedral Pass (on the wrong side of Upper Cathedral Lake), McClellan
Peak's Nada Lake (1.3 km off; Wikipedia and WTA agree with GNIS) and The Tooth's Source Lake (it
was the Alpental parking coordinate). Ground under the new pins: 5,457 / 7,617 / 4,936 / 3,750 ft
against stated 5,451 / 7,600 / 5,100 / 4,100.

**The two left open in round 2, settled.** Navaho Peak's recording climbs the south slopes from
Stafford Creek and returns to the trailhead, 25 m from the summit; the route is *South Slopes* and
its own descent text names that shortcut, so the track stays. Mount Fairchild's pins 2-3 named
Appleton Pass, a different trail; the route's text, a 2011 trip report and WTA's Bailey Range
article all go Deer Lake - High Divide - Catwalk - Boston Charlie's, and no source ties Appleton
Pass to Fairchild. They were replaced with Deer Lake at its GNIS coordinate
(`fix-fairchild.mjs`, rollback `scripts/rollback-fairchild-appleton-pins-2026-10-29.json`).

**No more tracks to import.** OSM's public GPS traces were considered: their licence is argued
about on OSM's own lists, and a trace carries no route name and no proof of a summit, so none were
used. New tracks come from climbers' own uploads (*Add a track*) or an author's permission.
