# Contributions and the logbook

The contribute form and the climb log: fields that apply, consensus clustering, corrections out-voting enrichment, climb_logs hydration, tick lists and suggestions.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:contrib-fields`** asserts that every field a climber can submit is a field the
  merge will actually apply. `var SS={…}` in `ClimbMatch.jsx` is an **allow-list**, consulted
  by both merge paths (the local `routeEdits` one and the DB one that counts distinct
  contributors). A key offered by `SuggestFix` and absent from `SS` is accepted, toasted as
  recorded, written to the `contributions` table, and then read by nothing — the climber gets
  a success message and the route never changes. Static, so it sits in `npm run build`.
  - **Two submission paths, and checking only one was this guard's own first-draft bug.**
    Besides the `FIELDS` list, `RouteDetail` calls `onSubmit` with a literal field name; that
    is how `bailout` and `startLocation` are filed, and neither is in `FIELDS`, so a
    FIELDS-only scan cannot see that path at all. Those two are the only `EXEMPT` names,
    because `onContribute` returns before the field-edit path for them (they are additive,
    geo-clustered lists read back through `bailoutEdits`/`startLocationConsensus`). An
    exemption that stops being submitted anywhere **fails**, so the list cannot rot.
  - **EIGHT keyed objects now, not two, and widening the form exposed TWO holes in this guard.**
    `crowds`, `partnerRequirements`, `seasonalGuidance`, `emergency` and `approachLogistics` all
    rendered on the route page and could be corrected by nobody — the **`bivy` shape**, which had
    already shipped once. They reuse the generic `OBJ_KEYS` editor, so they needed key specs and
    no new component: `renderInput` keys off `f.type` and reads `route[f.type]`, which is why the
    field key and the type are deliberately the same string.
    - **The sub-key test scanned `RouteDetail.jsx` ALONE, and three of the five panels live in
      `EnrichmentPanels.jsx`** — so their readers were in a file the guard never opened. Same
      shape as [[grep-the-app-not-just-the-db-layer]].
    - **And it tested for `.key`, which a DESTRUCTURING reader does not contain.**
      `const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds` reads all three and
      writes none of them with a dot. Together these two reported **five correct panels as dead**
      — the direction that tells an author to delete working wiring. The destructure test is
      scoped to `= <x>.<field>`, never to every `{a,b}` in 1.5 MB of JSX, which would make it
      vacuous. Proven still sharp by misspelling a key and watching it fail by name.
  - **It also asserts OBJ_KEYS / OBJ_STATE / FIELDS agree, because a mismatch is a BLANK SHEET.**
    `renderInput` does `OBJ_STATE[f.type][0]`, so a type registered in `OBJ_KEYS` with no state
    entry **throws on the first render of the contribute sheet** — the climber taps a pencil and
    gets nothing. A type with no `FIELDS` entry is the milder half: a section id that scrolls
    nowhere. Injection-tested by removing one state entry, which fails naming the type.
  - **`sling_rack` is NOT the cheap text field it looks like**, and this is why the sweep stopped
    where it did: `fmtSlingRack` returns `null` for a plain string, so a text box there would be
    contributable and render **nothing** — the very defect the sweep exists to remove. Six columns
    still need editors that do not exist (`approach_variants`, `climbing_route`, `climate`,
    `seasonal_hazards`, `sling_rack`, `difficulty`); four must **never** be writable (`verif`,
    `corrections`, `data_quality`, `gear_confidence` are trust and provenance records, and a write
    path lets a climber forge their own verification). See
    [[climbing-route-edit-pencil-writes-elsewhere]].
  - **It asks the same question one level down for the two jsonb fields.** `road` and `access`
    are objects, so passing the column check proves nothing about the individual sub-keys the
    form offers. `ROAD_KEYS` / `ACCESS_KEYS` are checked against the file for a reader, because
    the readers and the key lists sit ~400 lines apart and nothing else ties them together —
    and `access` carries **two spellings of the same fact** (`land_manager` on 399 of 400
    sampled rows, `landManager` on 8, display reading `ac.land_manager||ac.landManager`), so
    "which spelling does the form write?" has a right answer and a silently-wrong one.
    Deliberately a substring test: a sub-key is legitimately read as `ac.foo`, `road.foo` or
    destructured, and demanding one shape would fail on correct code. Writing the *legacy*
    spelling **passes** on purpose — it is read, so it is worse rather than broken, and the
    editorial preference lives in the comment beside `ACCESS_KEYS` where it will be read.
  - Reports the reverse direction as information, not failure: 4 keys are in `SS` without
    being in the form (`gpxPts`, `discipline`, `rockStyle`, `topo`), each set by another flow.
  - **IT PROVES THE KEY IS READ, WHICH IS WEAKER THAN IT SOUNDS: the form showed
    `Weather: [object Object]` AS THE CURRENT VALUE ON EVERY ROUTE.** `objStr` builds the line the
    keyed editor opens with and did a raw `String(v)`; `weather` is an OBJECT on 498 of the 504
    routes carrying `seasonal_hazards`, so 100% of them rendered that. This guard passed
    throughout — `weather` *was* read — because reaching a screen and being **legible** on it are
    different questions, the same split `check:token-boxes` draws against `check:field-renders`.
    - **Not cosmetic.** That line also feeds `wasEmpty`, which decides whether one climber can
      fill a blank or three must agree, and a form opening on `[object Object]` invites a climber
      to replace a real value with whatever they can actually see.
    - **Two fixes, each proven independently necessary by reverting them one at a time.** The
      form already supports DOTTED keys, so `weather` became `weather.typical` (string on 498) and
      `weather.probability` (471) — one field per fact. And `objStr` now flattens a nested value
      through the app's own `fmtSlingVal` rather than `String(v)`, because `crevasses` is a string
      on 453 rows and an OBJECT on 34, so **no single key spec is right for it** and the next
      column to drift shape would reintroduce the defect.
    - **Reverting the dotted keys alone leaves the row count at ZERO**, because the flattener
      catches it — which is why the regression check asserts the key SPECS as well as the count.
      A count-only check would have missed that revert entirely. Reverting the flattener alone
      puts 34 rows back.
    - **The 30 fields that show `route.<prop>` RAW are CLEAN, measured rather than assumed**
      (`scripts/oneoff/measure-raw-cur-stringification.mjs`): 28 columns read, 0 stringify badly,
      and the 2 with no column at all (`permitUrl`, `style`) are declared with reasons and fail as
      **stale** if they stop being raw-cur fields. So this class is the keyed fields only — *a
      detector for a class of zero is the thing this repo keeps refusing to build.*
    - **Test the rendered STRING, never the type.** `String(["a","b"])` is `"a,b"` — readable —
      so a `typeof v === "object"` scan counts arrays and over-reported by a factor of two, 1,008
      rows against a true 504. `requiredSkills` is an array of strings and renders fine.
    - This guard's `ANCHOR LOST` branch earned itself during the fix: a comment landed between
      `export const` and `SEASHAZ_KEYS`, and it refused the run — *"the sub-keys went unchecked,
      so this run proved less than it claims"* — rather than skipping the field.
  - Fails closed on an empty parse of either side, and `ANCHOR LOST` if `const FIELDS=[{k:`
    or `var SS={` is renamed — an empty set on either side would make every comparison pass
    vacuously, which is the failure mode `guard-sources.mjs` exists to stop.
  - Injection-tested; the 4 cases are named at the bottom of the script.
- **`check:consensus-clustering`** asserts that three climbers who agree can actually be **counted**
  as agreeing. The merge gate is `win.n>=3||wasEmpty`, so for a field that already holds a value
  three contributors must land in the same cluster or the correction sits pending **forever** —
  which makes `sameEditValue`, not the form or `SS`, the thing that decides whether a correction can
  ever go live. It was **exact for everything except numbers**. Static (bundles core and executes the
  real comparison), so it sits in `npm run build`.
  - **TWO WAYS IT COULD NOT BE REACHED, and the first is a defect this repo had already fixed one
    layer up.** `togMulti` appends chips in **click order** (`arr.concat([o])`) and the comparison
    preserved array order, so two climbers picking the same hazards in a different order produced
    different JSON and **never clustered**. `_stableJson`'s own comment describes exactly this for
    object KEY order — *"the 3-agree gate can never be reached and both suggestions sit pending
    forever"* — and it was fixed for keys and left for arrays. Worst on `haz`/`objHaz`, the fields
    most likely to actually be corrected.
  - The second is wording: *"Northwest Forest Pass"* / *"northwest forest pass"* / *"Northwest Forest
    Pass."* are one fact and were three clusters. This app writes **curly** apostrophes, so text
    typed in the form and text pasted from elsewhere never matched either — the same
    straight-vs-curly trap `check:outage`'s `says-broken` pattern already records.
  - **NORMALISATION IS FOR GROUPING ONLY, which is what makes it safe.** The merge stores
    `win.value` — one contributor's verbatim text — so nothing here changes what a climber reads. It
    only decides who counts as agreeing with whom.
  - **DELIBERATELY NOT FUZZY, and the negative assertions are the point.** No edit distance, no
    stemming, no synonyms: a loose rule does not under-report, because a cluster of three **WINS**,
    so it would publish a value nobody agreed on. Case, whitespace, quote style and a trailing full
    stop are differences in *typing*; anything past that is a difference in *claim*. Six "must NOT
    cluster" cases pin it, including *"a 5.8 slab"* vs *"a 5.10 slab"*.
  - **`SET_FIELDS` is declared, never global, because order is a FACT elsewhere** — waypoints are a
    sequence along the route, `pitchDetail` is pitch order, `itinerary` is days. The guard asserts it
    covers every `type:"multi"` field in the form, and fails on a **stale** entry, so a new chip field
    cannot quietly go back to being order-sensitive.
  - **An injection MISSED and found a hole in the guard rather than a false alarm.** Sorting every
    array inside `_agreeJson` changed nothing the waypoint and pitch cases assert, because those two
    have their **own branches above it** — so the only ordered field that actually flows through
    `_agreeJson` is `itinerary`. That case was added and the injection then fired. *A case that
    passes may be testing a path the defect cannot reach.*
  - Fails **closed**: a missing export, fewer than three chip fields parsed, or fewer than 16 cases
    are each a broken guard — every "must not cluster" assertion passes against a comparison that
    returns false for everything. Injection-tested **6/6**, each proving its edit landed by checksum
    and restoring the file byte-identically. Case 1 is the real historical rule; cases 4 and 5 make
    it **looser** and must both fail.
- **A CARD MUST NOT ADVERTISE A TOTAL IT CANNOT REACH.** Colorado 14ers rendered `0 / 53` while
  only **52** are tickable, and the gap printed *"+ 1 more on the full list — fills in as the
  catalog grows."* That 1 is **Mount Bross**, whose summit is privately owned and closed to the
  public and which `0146` excluded **on purpose** — so the app promised a summit nobody may stand
  on was on its way. Proven on screen rather than inferred: chip `Colorado 14ers 0/53`, card
  expanded 1032 → 2550 chars, the sentence read back verbatim.
  - **The second defect is worse than the copy.** `cpl = d >= t`, so at `t = 53` the card could
    **never** read Complete: a climber who ticks every achievable Colorado 14er sits at 52/53
    forever.
  - **Fixed by this file's own precedent, not a new rule.** Desert Towers hit exactly this and the
    TOTAL was corrected **30 → 27**, on the reasoning that the advertised number is what you can
    tick *here*; Colorado had been left at 53. `total: 52` deletes the false sentence outright
    (`extra` becomes 0) instead of rewording it, and makes Complete reachable.
  - **52 is only honest because the card says why.** `LDESC.co14` now states that the standard list
    counts 53 and that Mount Bross is not among these 52 because its summit is closed to the
    public. Without that, 52 is a number that disagrees with every guidebook — **do not "correct"
    it back**, and never "finish" the list by adding Bross: a tick list is an invitation to go
    climb something.
  - The generic sentence carries a comment saying what it is FOR — a gap the catalog really can
    close — so nobody points it at a permanent ceiling again. `audit:list-coverage` now reports all
    six rosters complete and advertised-not-in-catalog **1 → 0**.
  - Guarded in **`check:challenge-rows`** (CI, not the build). It expands the Colorado card
    **separately**, because that guard's existing expansion takes whichever roster card sorts
    shortest and was never guaranteed to be this one — *a guard that might look at the right card
    is not a guard.* `scripts/oneoff/probe-colorado-14ers-ceiling-copy.mjs` is the before/after
    measurement, and it fails closed on a card that never expanded.
- **`check:correction-readers`** (was `check:rappel-readers`) enforces one sentence, now for
  **every** contributable column rather than rappels alone: **where a contribute-form field
  competes with an enrichment column, the reader must prefer the CLIMBERS' value once
  `_contribFields` records that they agreed it.** The rule has broken twice, in shapes sharing
  no code and no symptom — `rappelDetail` (#787/#791, readers preferred the station list so a
  correction displayed **nothing**) and `rack` (#907, the RACK box read `gearTiers.required`
  while the form writes `rack`, so the box the climber edited kept the value they had
  replaced). Fixing one never found the next; **do not assume a third looks like either.**
  - **It was widened because `rack` was guarded only by a `scripts/oneoff/` probe, and nothing
    runs those.** The general rule was enforced nowhere, so a third instance would have shipped
    in silence. That is the gap it closes, and it is why this is a build gate rather than a
    probe.
  - **Three rules.** (1) Every reader of `rappelDetail` must carry `_rapEdited`. (2) The named
    **precedence** function — the one that chooses between the climbers' column and the
    enrichment — must consult the guard, and where a rename is **live** must return the
    **M destination**. (3) Fail closed on an **unregistered** `_<x>Edited` helper, since that
    helper is the fingerprint of a third rivalry; a registered guard or precedence function
    that no longer exists fails as stale.
  - **The rename map is READ FROM THE APP, never restated**, and so is whether the rename still
    matters. Both merge paths file a contribution through `var M` (`o[M[k]||k]` and `M[f]||f`),
    and `M` carries `{descentText:"descent"}`. But **a rename only creates a rivalry if the two
    spellings can disagree**, and after both merges the writer runs
    `if(o.descent!=null)o.descentText=o.descent;` — so they cannot. The guard **detects mirrors
    rather than declaring them**: while one stands, that rename is reported moot and skipped;
    delete it and the rename rule switches back on by itself. Position is checked as well as
    presence, since a mirror upstream of a merge would simply be overwritten by it.
    - **This is the correction to three earlier readings of the same code**, including this
      guard's own first version, which asserted #915's direction as a rule and would therefore
      have failed a correct refactor. #897, #915 and that first draft each derived a rule from
      the `var M` line and stopped there. It fails `ANCHOR LOST` if `var M` moves, and fails if
      either merge path stops routing through it.
  - **`everyReaderGates` is true for exactly one column, deliberately.** Asserting it for the
    other two was this guard's own first-draft mistake: it flagged `hasPlanContent` (an
    existence OR), `routeHasGlacierTravel` and `simulMentioned` (keyword blobs) and
    `proseSources` — four functions that read `.descentText` correctly and make no precedence
    decision. #915 had already swept the other 15 renames and said so. **A guard that flags
    correct work teaches people to ignore it**, which is worse than the hole it closes.
  - **`rack` is deliberately NOT rename-checked**, and that is measured: a rack contribution
    is written to **both** `o.rack` and `o.gearTiers.required`, so returning
    `gearTiers.required` under the guard really does hand back the climbers' value. It is the
    same mirroring the descent fix-up performs, just done by the writer rather than by a
    trailing assignment — **neither column can be got the wrong way round.**
  - **No rename in the app currently needs policing**, which is a finding rather than a gap:
    the sweep of all 15 `M` renames found no other reader making a display-precedence decision
    across one. Rule 2 is armed and idle, and the mirror detection is what keeps it honest —
    it will arm itself the moment a mirror is deleted.
  - **Nothing caught the two real ones and nothing could**, which is the entire argument for a
    script over a better comment: the merges were **clean** (the PRs touch different lines),
    every gate stayed **green** (the invariant is semantic — an unguarded reader is valid JS
    that renders a plausible value), and the new functions read as **correct in isolation**.
    Only a comment three functions above them said otherwise, and nobody adding a sixth reader
    has to scroll there.
  - **What it does NOT settle, and could not:** whether the value reaches *the screen the
    correction was made on*. `rack` rendered on the right tab and in the wrong box. Only
    rendering answers that, which is what the `scripts/oneoff/` probe is for; this guard proves
    the precedence decision, not the destination.
  - Scans **per function**, not per file, and that scoping is what keeps it honest: the long
    explanatory comment about this very rule sits at top level between functions, so a
    whole-file grep would report a phantom sixth reader. Function bodies come from balancing
    braces over **raw** source — the blanker used elsewhere desynchronises on JSX apostrophes.
  - **Comments are stripped before either test, and that is load-bearing.** Two of the five
    readers explain the rule in a comment that *names* `_rapEdited`, so deleting their real
    guard still left the token in the body. Injection case 2 unguarded all five and the first
    draft reported **four** — the two best-documented readers were the two that would have
    slipped. Presence is not use, the same false pass `check:fire` records for `zoneInEffect`.
  - Fails **closed**: zero readers means the column was renamed or the walk broke, never that
    the app is clean. A plain `includes(".rappelDetail")` also matches `.rappelDetailX`, so
    that branch could never fire until the match was word-bounded (injection case 3, the
    second first-draft false pass).
  - Injection-tested, 9 cases plus 4 that pin the **mirror behaving as a switch** (mirror on +
    reader flipped must PASS; mirror deleted + reader flipped must FAIL). **Two of the original
    seven failed on the first draft and both were false passes**, neither visible by reading
    it. Each case proves the edit **landed by checksum** before judging the guard — which
    earned itself twice: case 1's pattern did not match at first and the harness reported
    *"edit never landed"* rather than *"guard missed"*, and later the whole baseline went stale
    the moment #915 merged (it was pinned to that branch, so two cases silently ran against a
    file predating the rack work). **A harness baseline pinned to a branch rots when the branch
    merges** — pin it to main. The widening added its own first-draft failure in the other
    direction: `[^)]*` in the guarded-return pattern **cannot cross the `)` inside
    `_descEdited(r)`**, so every reader reported as an unrecognised shape — noisy rather than
    silent, and caught at once.
- **`check:log`** guards the climb-log read path against silently dropping fields, and since
  #861 it guards **both** of them. `climb_logs` is hydrated **twice** — `ClimbMatch.jsx` builds
  `logs` (your own logbook), `RouteDetail.jsx` builds `dbReports` (the same rows as a route's
  `activity`) — and a route's `activity` dedupes `route.activity → myReports → dbReports` by
  `_dbId`, so **your** row arrives via `myReports` carrying the full ClimbMatch shape while
  every **other** climber's row exists only as `dbReports`. Both are opened into the same
  components (`ReportStats`, `TripReport`). So a column one hydration drops is a fact on
  screen for its author and for nobody else. Gated by `npm run build`.
  - It has now caught that in **both directions**. #843: `car_to_car_minutes` was read by
    RouteDetail and not by ClimbMatch, so your car-to-car time showed while you typed (the
    form computes it), vanished on reload, and stayed visible to everyone else. #861: the
    reverse — `fa_ascent` and `developed` were read by ClimbMatch and not by RouteDetail, so
    `buildConsensus`' `faCredits`/`isDeveloped` could only ever credit a First Ascent to
    **yourself**, on a panel whose entire purpose is public attribution. The same hydration
    was also starving `TripReport` of `itinerary`, `sun_vote` and `sun_note`.
  - **`DERIVED` is the dangerous list, and #843 is why.** `car_to_car_minutes` sat there as
    "derived on both sides rather than round-tripped" — a claim requiring something to
    re-derive it on read, and nothing did (the only place `carToCar` is computed from the
    three legs is the LogAscent form, while typing). Proved by injection: restore that
    exemption *and* delete the read, and the script prints `ok`. **An exemption is a claim
    about the code**; if you cannot point at the deriving expression, it is not derived, it
    is dropped. Same standard as `check:field-renders`' `KNOWN` map.
  - `ROUTE_THIN` is the second hydration's exemption list and a **stale entry fails** — a
    column that starts being read there, or stops being written, is reported rather than
    tolerated. Only two entries are live; each names the reader it was checked for.
  - **`partners` is deliberately not hydrated onto the route page**, and this is measured
    rather than a taste call: `matchClimber` does
    `CLIMBERS.find(c=>c.name===nm&&ascent.partnerIds.includes(c.id))` against seed **integer**
    ids, so feeding it uuids takes that branch and returns `null` for **every** partner —
    strictly worse than the name fallback it uses today. The class
    `check:crew-member-readers` exists for.
  - Scope trap worth knowing: `written` comes from the depth-1 keys of the payload **literal**,
    so the three columns `syncLogToDb` appends conditionally afterwards (`partners`,
    `belayed_by`, `gpx_track`) are not in it. They are tracked by `UNWRITTEN_OK` instead.
    Exempting them in `ROUTE_THIN` fails as stale — which is how that was discovered.
  - Fails closed twice over: `ANCHOR LOST` if RouteDetail's `return _tripRows.map(function(r){`
    is renamed, and a parse yielding fewer than 10 column reads is reported as a broken scan
    rather than a clean app.
  - Injection-tested, 4 cases for the second-hydration section, listed at the bottom of the
    script. Case 2 (drop a single column) took two attempts: `stars:r.stars,` occurs **twice**
    in `RouteDetail.jsx` and the first hit is unrelated, so a bare `.replace()` edited the
    wrong line and the run passed. It reported *"edit landed: false"* rather than *"guard
    missed"* — **prove the injection landed before believing what the guard says about it.**
- **`check:suggestion-discs`** asserts that Suggested climbs covers **every** discipline a
  climber logs, and that a climb they merely **looked at** is never described as one they have
  climbed. `suggestionProfile` used to end `Object.keys(byDisc).sort(by count)[0]` — it kept the
  single most-logged discipline and discarded the rest, so a climber logging 6 sport and 5 alpine
  got sport-only suggestions and a couple of new logs could flip the whole feed. Static (the pure
  functions are lifted from the real source and run with stubbed deps), so it sits in `npm run build`.
  - **Nothing caught it and nothing could.** Every identifier was bound, the section rendered, and
    the rows it showed were *correct for the one discipline it had picked*. A feed that is right
    about a third of your climbing looks exactly like a feed that is right — the same shape as
    `descent_text` being populated on 1,021 routes and rendered on none.
  - **The structural half is the important half, and no unit test can reach it.** The DB reader
    filtered at the **query** — `useSubtreeRoutes(area.id,{disc:profile.disc})` — so other
    disciplines were never fetched and no client-side ranking could have recovered them. A
    perfectly correct `suggestDiscSlots` returning three slots is worth nothing if the pool it
    ranks only ever holds one discipline. Section 2 pins the pool query as discipline-**blind**;
    the fix costs no extra round trip, because one mixed pool replaced one filtered pool.
  - **Comments are stripped before that scan**, and it is load-bearing: `DbSuggestedClimbs` now
    *explains* the rule in prose naming `{disc: profile.disc}`, so a scan that read comments
    would pass on the strength of the explanation. The trap `check:ci-cancel` and
    `check:correction-readers` both record. The slice is bounded at the next top-level
    `function ` so a `disc:` belonging to another component cannot be read as this one's.
  - **The honesty rule is separate from the coverage rule.** A discipline that is both logged and
    browsed must appear **once**, labelled logged — "you've been climbing X" and "you've been
    looking at X" are different claims and only one is true of a climb you have done. Browsing
    alone still earns a row, which is what lets the feed react to research before anything is
    logged; that is deliberate, not a leak.
  - Fails **closed**: a truncated source, a renamed function (`ANCHOR LOST`), or a missing
    `SUGGEST_DISC_MAX` are reported as a broken scan, never as a clean app.
  - What it does **not** prove: that the ranked routes are *good*, or that the section is
    reachable on screen. It tests which disciplines survive and which query fetches them.
    Grade/gain scoring is stubbed — unchanged by this work and drags in the whole grade scale.
