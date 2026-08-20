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

---

## Findings rescued from prose that was about to be deleted

A sweep removed 32 columns of **enrichment bookkeeping** — prose addressed to whoever maintains the
database, rendered on the route page as beta. Thirteen ended their descent text with an instruction
to a column (*"Set rappels to 0."*). That sweep is right, and it carries a risk worth naming:

> **Some of those notes were the only place a real defect was recorded.** Deleting the note deletes
> the record. These are moved here first, so the sweep loses nothing.

### `wa_mamie_peak` holds four routes whose own trailhead is 130 km from where the area is filed

`wa_blood_orgy`, `wa_ellation`, `wa_hail_satan`, `wa_woodland_critter_christmas`. All four store the
**Hannegan Pass Trailhead** (Trail #674, FR-32) at 48.9105, −121.5894, and the area's own coordinate
(48.91508, −121.58401) agrees with it — about 500 m away. That is the Ruth Creek valley off the
Mount Baker Highway.

The area chain is `wa_mamie_peak → North Cascades → Hwy 20 and North Cascades National Park`.
Hannegan Pass is reached from SR 542, not Hwy 20, so the parentage is at least questionable.

**Correcting the report that rescued it:** the deleted prose was paraphrased as "filed as a
Washington Pass area". It is not — it is filed under Hwy 20 / NCNP. The concern survives the
correction; the specific claim did not. `audit:area-parents` territory, report-only.

### `wa_prusik_peak_der_sportsman` — `rappels` says 5, its own descent text describes 6

The `rappel_count_note` existed only to reconcile the two. That note is now the count itself, so
**unless the column is set to 6 the disagreement is recorded nowhere.** This is the class
`audit:rappel-claims` exists for.

### `wa_east_face_2` — the stored per-station rappel lengths are estimates, and said so

Its `rappel_count_note` admitted the on-file station distances were derived from a single
"roughly 120 ft double-rope rappel" description. `check:rappel-lengths` treats stored station
distances as measured, so this row is a known-soft input to that guard.

### `wa_lexington_tower_east_face` — headline count and prose describe different descents

`rappels` is 0 for the walk-off, while the prose documents a 7 × 60 m double-rope face rappel
alternative. Correct as data; the headline is the walk-off, which is the single-rope-count rule
working as intended. Recorded because the two read as a contradiction.

### `wa_mount_skokomish_standard` — a trailhead defect stated in prose, now stated only here

The on-file approach described Mildred / Flapjack Lakes, which is the Mount Cruiser / Mount Lena
approach out of the North Fork Skokomish, not the Putvin Trail / Lake of the Angels. The `approach`
now leads with Putvin, but `approach_logistics.trailhead` and the Trailhead waypoint were **not**
examined. Worth an `audit:trailhead-agreement` read on that row.

### `wa_jack_mountain_south_face` — the row does not know which route it is

Its beta pointed at a "Corrections" section that is not a rendered surface, and said the entry
"likely maps onto" one of several class-4 Jack Mountain lines. Route identity, not prose.

---

## The Class B merge directions must be re-read against each row's own variants

`CLASS-B-MEASURED-2026-08-19.md` says of `wa_east_ridge_7` that "the whole row is Lundin's East
Ridge". **That is contradicted by evidence inside the row.** Its `approach_variants[0].baseFinding`
carries a naming warning from an earlier pass that investigated this exact question:

> the location text names the saddle between Lundin and East Lundin, while the approach it gives
> goes to Red Pass and then west, *which is Red Mountain's ground rather than Lundin's*

and traces the ridge onward to a notch at about **5,840 ft**, consistent with Red Mountain's 5,890
rather than Lundin's 6,057.

The merge was assembled and then **abandoned on that evidence**. Its `hazards` cannot be assigned
either — *"loose, fractured red rock … more pronounced than on the south face"*, and **both** peaks
carry a South Face route.

Nothing was transferred and nothing deleted, so the pair is intact while it stays open. **Before
acting on any Class B direction, read that row's own `approach_variants`** — the measured table was
built from column presence, which cannot see an argument written inside a variant.

---

## The "on file" sweep, and what checking its findings actually showed

63 more routes referred to the app's own stored values in prose a climber reads — *"matching the
on-file 19.3 km round trip"*, *"no rappelling on file"*, and in one case the literal column
expression **`rappels = 0`** printed as descent beta. Reworded, facts kept. The maintainer-voice
scan now reads **0** across all 8,365 WA routes, from 92.

The agents flagged six notes as possibly the sole record of a defect. **Three were checked against
the live columns and did not hold** — worth recording, because it is the same lesson a third time:

| claim | checked | verdict |
|---|---|---|
| `wa_northwest_buttress` FA "not 2020 as previously on file" | `fa` = *"M. Preiss & M. Bunker, 2000"* | **stale** — the column was already right |
| `wa_live_free_or_die` "despite its grade label on file, not a boulder problem" | `discipline` alpine, 11 pitches, 366 m, 5.12− | **stale** — the columns already say so |
| `wa_south_face_2001_variation` FA year unresolved | see below | **real** |

A note saying "the stored value is wrong" is evidence about the moment it was written, not about the
row today. Two of these were describing repairs that had since happened.

### `wa_south_face_2001_variation` — the one that held, and it is two defects

The route's **name and id both say 2001** while its `fa` resolves the first ascent to **2004**.

And the `fa` column itself holds 240 characters of prose, including its own sourcing caveat:

> Mike Preiss & Don Preiss, 2004 (route name "2001 Variation" reflects the year originally cited;
> 2004 is better-sourced per the route's own "South Face Left" catalog listing for the same
> climbers — not independently verified against a primary source)

That is the *enrichment-prose-in-a-display-field* class CLAUDE.md records for `season`, `grade` and
`rappels`, in a column nobody had checked. **Measured across the catalog: 7,830 WA routes carry
`fa`; 197 run past 120 characters and 118 contain source or record talk.** Most long values are
legitimately detailed credits (multi-party, multi-pitch first ascents), so this is *not* a
197-row defect list — it needs reading before any sweep. Recorded, not swept.

### `wa_gunsight_peak_standard` — a contamination warning that was the only one of its kind

Deleted from `rappel_count_note`: *"Because the mis-attribution reached this row from another
peak's route, treat other enrichment on it as suspect until checked."*

The contamination itself survives in the rewritten prose — four rappel stations of 50/50/50/20 m
that belong to **North** Gunsight Peak's West Face, a 5.11+ six-pitch rock route on a different
summit, stored on a Class 5.6 glacier route. What is lost is the instruction to audit the rest of
the row, so it is recorded here: **the remainder of this row's enrichment has never been
re-checked.** Same shape as `wa_chimney_rock_west_face`.

### Two elevation disagreements, both kept in the prose rather than deleted

`wa_mount_hardy_snow_scramble` (8,097 ft stored vs 8,099 ft by survey) and
`wa_ruth_peak_olympics_scramble` (6,841 ft stored vs ~6,850 ft) each noted a variance. Both are
within survey tolerance and both now read as plain hedges to the climber rather than as commentary
about the record.

### `wa_chiwawa_mountain_southwest` — the jargon class is wider than the cue that found it

Its `descent_text` contained the literal string `rappels = 0`. That is a column name and value
rendered as prose, and it was caught only because the row happened to match an *"on file"* scan. A
sweep for bare `column = value` expressions in prose columns would likely find more; the current
scan's `writes to a column` cue covers the `set X to 0` phrasing but not every shape.
