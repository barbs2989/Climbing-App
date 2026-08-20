# Defect triage — the 41 findings from the 2026-08-19 clustered enrichment batches

Three research batches (Mountain Loop, northern North Cascades, Pasayten/Hwy-20) reported 41
defects alongside the 83 routes they enriched. This is the triage: what was **fixed**, what is
**reported and deliberately not fixed**, and — for two entries — where the **report itself was
wrong** in a way that would have made the data worse if applied.

Read the second of those first. It is the reason this file exists rather than a checklist.

---

## A report's column attribution is a hypothesis, not a citation

This has now happened twice in this project. The defect index's attributions were wrong on 4 of 10
Class A rows, three of which would have been "fixed" backwards. It happened again here.

### `wa_castle_peak_pasayten_scramble` — the report named the wrong outlier

The batch reported: *"`overview` says 'southwest side' while `aspect`, `face`, `approach` and
`descent_text` all say east/southeast. I followed the three."*

Measured against the live row, counting direction words per column:

| column | "southwest" | "southeast" | "east" |
|---|---|---|---|
| `aspect` | 0 | 0 | 0 (the value is the code `E/SE`) |
| `face` | 0 | **1** | 1 |
| `overview` | **1** | 0 | 0 |
| `approach` | **1** | 0 | 1 |
| `descent_text` | **1** | 0 | 0 |

So **three prose columns say southwest**, not one. The lone `east` in `approach` is *"cross to the
south/east side of the drainage"* — a creek crossing at 5,000 ft, not the summit ridge. `face`
("East Ridge Couloir to Southeast Ridge") is the outlier, with `aspect` agreeing with it.

The prose is internally corroborated: `approach` and `descent_text` independently describe **the
same notch at the same elevation** — *"a notch on the peak's southwest ridge at about 7,600 ft"* and
*"back to the notch on the southwest ridge at ~7,600 ft"*.

**Had the report been applied, the `overview` would have been rewritten to say east** — contradicting
the approach line a party actually navigates by.

**Still not fixed, and that is deliberate.** Two records disagreeing says one is wrong, never which.
Castle Peak genuinely has more than one standard approach, so `face` may describe a real east-side
line rather than being contaminated. Settling it needs a third record.

---

## Fixed (2), each from evidence the catalog already held

### `wa_northwest_face_4` — one word inverted the geometry

The approach closed *"the Northwest Face is visible on the peak's east side across that valley"*,
which cannot be true of a northwest face. Three of the row's own fields say NW (`aspect` NW, `face`
"Northwest Face (a.k.a. Falcon Route)", `overview` "the remote Northwest Face").

**Which** side of the valley was settled by a third record rather than guessed:
`areas.wa_little_big_chief_mountain` (47.5297, −121.2567) sits **0.89 km east** and 0.69 km north of
`areas.wa_summit_chief_mountain` (47.5235, −121.2685), so the peak stands on the **east side of
Summit Chief Valley**. The phrase is now *"on the east side of that valley"*.

The preflight proves the edit is only that phrase, by reconstructing the original from the
replacement. A rewrite that changes a second thing cannot pass.

### `wa_mount_teneriffe_standard_route` — the blob stored the landmark you drive past

`approach_logistics.trailhead` read **"Mount Si Trailhead"**. The row's own approach says to drive
*"about 2.9 miles **past** the Mount Si trailhead"* to the Mount Teneriffe Trailhead lot, and its own
`Trailhead` waypoint is named *Mount Teneriffe Trailhead* at 47.4869, −121.7097.

Corrected, with the coordinate **copied from the row's own pin** — no coordinate typed. Blob-vs-pin
distance is now **0 m**, and this row moved out of `audit:trailhead-agreement`'s uncounted class into
its comparable-and-agreeing one (175 not comparable, down from 176; 624 comparable, up from 620).

`approach_logistics` was made settable through the guarded enrichment path for this, rather than
hand-writing another one-off. The script asserts the three-way coupling (settable → re-read select →
verify group) at startup, so a half-wired column cannot ship.

---

## Reported, not fixed — needs a third record

### `wa_three_fingers` — the three fingers are in an impossible order

Measured from the live rows:

| pin | coordinate |
|---|---|
| North Peak summit | 48.169895, −121.687865 |
| South Peak (Lookout) summit | **48.169895, −121.687865** — identical |
| Middle Peak summit | 48.175, −121.688 — **north of both** |
| area `wa_three_fingers` own lat/lng | 48.169895, −121.687865 — identical again |

Three Fingers is a north–south ridge, so Middle cannot plot north of North. Two summit pins and the
area coordinate are the same point, which is the signature of a placeholder rather than a survey.

There **is** partial internal evidence: the North Peak route carries a hazard pin *"South Peak lookout
ladders"* at 48.16636, −121.697229 — about **800 m** from where the South Peak row puts its own
summit. The lookout stands on South Peak, so that pin is the better record of the two. It is still
the ladders rather than the summit, so it is reported and not written.

### The two-approaches-in-one-row rows

- `wa_playing_not_spraying` and `wa_the_chalice` each store an `approach` describing the north-west
  side of the crest while their own trailhead waypoint note describes a valley approach up the creek
  draining the **south** side — the face these routes are actually on. The waypoint is *named* for
  one pullout, *carries* that pullout's coordinate, and states an elevation matching neither.
- `wa_the_devils_club` — prose describes one approach while four of its six waypoints are the
  approach on the **opposite side of the massif**.
- `wa_trapper_mountain_south_slopes` — prose sends a party up one creek; its own waypoint note says
  the route continues up a different valley, with the recorded junction and lake ~25 km apart.
- `wa_direct_north_buttress` — its `approach` column describes a different route entirely.

Each needs a decision about which record is the route's, which the columns cannot supply.

### `wa_silver_horn_the` (area)

Its stored coordinate puts it among a neighbouring group of spires; the elevation matches the peak
and the longitude does not. Two records disagree and neither says which is wrong.

---

## The class the batches under-counted by 29×

The batches reported **~11 rows** carrying source names in rendered prose. Scanning all 8,365 WA
routes for the same defect found **321** — because a batch only ever sees the rows it is enriching.
That sweep is a separate change; see the commit that removes them.

Two precision notes that cost real effort and should not be re-derived:

- A bare name scan reports **408** and a large share are **correct**. *"first climbed by Baker,
  Beckey, and Dudra in 1952"* is route **history**. Fred Beckey wrote the guidebook **and** made
  half these first ascents, so a detector that cannot separate the two would instruct someone to
  delete real first-ascent records. Splitting citation-and-site from history gives 321, and excludes
  32 history-only rows.
- *"as described in the route beta"* points at **our own page**. Flagging it would have someone
  delete a correct signpost.

### And a gap in a sibling guard, reported rather than patched

`audit:note-voice` shipped the same day (#1089) and asks a neighbouring question of waypoint notes.
Its cue matches `confirmed via research` but **not** `Confirmed via Mountain Project`, and
`according to Mountain Project` but not `Confirmed via` it. Against the same population it reports
**7** notes where a source-name scan finds ~**94**.

Its own comment records that the first version of that cue already missed one variant and was
widened once. This is the same widening, one step further out. Waypoint notes are that session's
lane, so this is flagged rather than edited — two passes rewriting one field is how a merge silently
reverts one of them.
