# Per-discipline rules (from the 2026-11-14 worked examples, WA)

Worked examples: Disappointment Cleaver (mountaineering), Sunshine Buttress (sport), Outer Space
(trad), Catwalk (toprope), Pimpsqueak (bouldering), Abraxas (aid), Devils Punch Bowl (ice), Chair
Peak NE Buttress (mixed), Backbone Ridge (alpine), Mount Si Haystack (scrambling).

## Everywhere
- **Mountain Project / OpenBeta coordinates are never evidence** — a lead only. MP put Outer Space
  ~100 km away and Devils Punch Bowl 3 km from the ice. Pins lock from USGS / OSM features or the
  app's base check-ins.
- **MP alone locks at the 1-source tier** for grade, length, pitches, bolts, anchor, rack when the
  other sources are blocked or paywalled (theCrag, SummitPost, The Mountaineers, Rakkup guides).
  Never for coordinates or a first ascent. MP's description and its comments are ONE publisher.
- **No derived values** (e.g. rope length from route length). Only what a source states.
- **Re-verify every templated block.** Area-wide text was pasted onto routes where it is false
  (Index walls said USFS + NW Forest Pass; they are WA State Parks land).
- **Shapes:** `pitches` ≥ 1 or null, never 0. `fa` holds names only; the year goes in its own
  place. Route FA, variation FA, FFA and FWA are separate facts.
- **Renamed routes:** keep the app's name, add the other as an alias, grade Disputed (both values)
  until a third source settles it (Catwalk = "Henny Penny" 5.4 sport in the 2022 Mt Erie guide).
- **Safety closures** (road, rockfall, raptor, trailhead work) reported only in news that quotes an
  agency: show at once, marked unconfirmed, re-check after 30 days.
- **Misclassification is a finding:** check discipline and grade system against the sources first.

## Sport
Key facts: bolts, anchor type, length, pitches (1), grade. All bolts and no gear in the protection
field = sport. Anchor type locks with no expiry. Spacing remarks ("over-bolted", stick clip) are
opinions: 2 sources. Pins: parking + route base (OSM route node or check-ins).

## Trad
Key facts: grade, pitches, length, rack (sizes and doubles), descent, commitment grade. Pitch count
depends on the start used: record the count for the start most parties use and the other start as
a variant. Measure the walk-in along mapped trails.

## Toprope
Key facts: how to reach the top anchor (walk-up or rappel), which anchor serves which line, how
much extension, whether it can also be led. The anchor/topout matters more than the base.

## Bouldering
Key facts: grade, start (stand/sit, which hold), landing, pads, boulder location. V↔Font: state
the table used; a grade one step apart across systems is Disputed, not agreeing. The boulder pin
needs a mapped feature or check-ins — expect most boulders to stay without a locked pin.

## Aid
Key facts: free and aid grades separately, pitches, commitment, rack, FA and FFA. Aid grades go
stale when pitches are bolted or freed (Abraxas P1-P2 now go free at 5.12): a later free ascent or
rebolt makes the old aid grade historical, not "disagreeing". Expect most facts at 1-source.

## Ice
Grade, length, location and land manager lock normally; a WI range (WI2-3) agrees with either end.
**Conditions never lock**: "in / thin / out" comes only from dated reports and expires after 14
days. Season is a trigger ("needs about two weeks of hard cold"), not a month window. Icefall onto
belays is the key objective hazard (`obj_haz`).

## Mixed
Winter routes: pin only permanent rock (summit, named towers) — snow hides summer features.
Avalanche exposure is the forecast zone's job, not a lockable fact. A route that is a summer rock
route AND a winter mixed route is **split into two routes** (owner, Chair Peak NE Buttress); the
new row starts empty and is researched like any other.

## Alpine
Key facts: grades (rock, commitment), length, pitches per variation, approach, descent, permit.
Variations carry their own FA, grade and pitches. Gear claims ("#6 required") are contradicted by
trip reports more often than not — Disputed until 2 agree. Permit objects (Enchantments) lock from
the official page, field by field.

## Scrambling
Key facts: class, gain, distance, pass (a parking pass is not a permit), exposure. Exposure facts
are easily attributed to the wrong neighbouring summit — check the report is about THIS summit.
The climbed summit may not be the USGS point (Mount Si Haystack is ~125 m off).

## Mountaineering
See the Disappointment Cleaver lessons in SKILL.md.
