# Camping and bivy

`check:camping` and the two camp audits: where CAMPING & BIVY renders, the merged stores, camp elevations and whether a camp fits its route.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:camping`** asserts that **CAMPING & BIVY reaches the Planner tab**, on every
  discipline that can benight a party, and that it merges its **two** stores into one section.
  Static SSR, so it sits in `npm run build`.
  - **The mount has already been silently lost once**, which is why this is a script and not the
    comment it replaces. It lived on a dense line, main changed the same line, and the merge kept
    main's copy — leaving the panel **defined and rendered nowhere**. Nothing caught it:
    `check:dead-props` sees props, not unmounted components; `check:refs` sees bindings, and every
    binding was fine; and `routes.bivy` was populated, so any coverage check looked healthy. The
    repair left a comment saying "confirm BIVY still reaches the screen" — the exact shape
    [[semantic-invariants-need-a-script]] records as rotting.
  - **Two stores, one section.** `route.bivy` holds researched sites (capacity/water/permit/notes);
    a **Campsite waypoint** is the same fact recorded on the track. Rendered apart, a route could
    show a camp pin under WAYPOINTS while this panel said nothing — two answers to one question.
    `campSites()` merges them and dedupes on **name**, the only field both stores reliably carry.
  - **It moved off the Safety tab (2026-08-13) and gained `scrambling`.** Where you sleep is a
    planning decision, not a hazard; on Safety it sat behind a tab nobody opens for logistics. And
    a scramble that overruns benights a party exactly like an alpine route. The gate reads
    `catOf(route)`, **not** `route.discipline`, because `catOf` folds `rock` into trad/sport first.
  - It renders on a day-trippable route too, deliberately: the party that gets benighted on a
    "car-to-car" route is precisely who needs it, so *no bivy plan* is not *no bivy*.
  - **Count inside the panel, never across the tab.** The Planner also renders ROUTE TRACK and its
    map legend, which name the same waypoint legitimately — a whole-tab count reads 2 for correct
    code. The first run of this script did exactly that and reported a dedupe bug that did not
    exist. The slice is bounded by the next heading, and a missing `ROUTE TRACK` fails as
    `ANCHOR LOST` rather than passing.
  - **Match the un-escaped text.** `renderToStaticMarkup` emits `CAMPING &amp; BIVY`; see
    [[ssr-probes-must-match-escaped-html]]. Assertion 0 proves the probe can fire at all, so a
    renamed heading reports `ANCHOR LOST` instead of a vacuously green run.
  - **`bivy` IS contributable now**, and the gap it closed is worth keeping: it used to be in
    neither `FIELDS` nor `SS`, and the panel's edit pencil opened the *waypoints* editor — a
    different store. So the ~380 routes carrying camping had all got it from an enrichment pass,
    and the climber who actually slept there could not fix a word. It is a `type:"bivy"` FIELDS
    entry with its own array editor beside the waypoints one, `bivy:1` in `SS`, and the pencil now
    opens `sf-section-bivy`.
    - **`structuredVal` writes `elev` in FEET**, converted through `uImp()` exactly as a waypoint
      elevation is. That is load-bearing rather than tidy: the column already holds two conventions
      (`elev` feet, legacy `elevM` metres), and writing a metric number into `elev` would put a
      THIRD reading into a field `uElev()` treats as feet. `elevM` is never written — the read side
      converts the legacy spelling and the write side must not add to it.
    - **`check:contrib-shapes` caught the wiring before it shipped.** It models every non-structured
      field as serialising to a string, so a new builder type must be added to its `STRUCTURED`
      set; until `bivy` was, it correctly reported *"reader discards a string, and CONV has no
      `bivy` entry"*. Keyed on the TYPE, so the next builder field is exempt automatically.
    - The guard asserts the **contributed shape** renders, which is NOT the enrichment shape:
      `structuredVal` emits every text key as a string (empty when left blank) where enrichment
      omits keys it has nothing for. It also asserts blank strings do not become empty chips —
      otherwise every contributed site would carry three or four blank pills, and no fixture built
      from enrichment data would ever have shown it.
  - **It also pins the COLLAPSE, in both directions, because a disclosure has two failure modes
    and only one of them is visible.** Prose still in the default view means nothing was
    shortened; prose no longer **selected** by `campDetail()` means the disclosure did not hide
    it, it deleted it — the `descent_text` shape, populated on 1,021 routes and rendered on none.
    A third assertion requires a **labelled** expand control naming the site, since data behind
    an unannounced door is unreachable for anyone not using a mouse.
    - **The collapse silently made an existing assertion VACUOUS, which is the transferable
      part.** Case 8c counted `Water:` chips to prove a blank contributed string renders no chip
      — and once the chips were gone that count is 0 whatever the code does, so a broken
      selector would have read as a pass. It asks `campDetail()` directly now. **When you delete
      the markup an assertion was scanning, the assertion does not fail — it stops meaning
      anything.** Re-read the guard, not just its exit code, after changing what it looks at.
    - What it **cannot** prove, stated in the script rather than implied: that the tap works. SSR
      renders initial state and cannot click. `check:clickable` covers the keyboard triad and
      holds announced-but-inert controls at zero, and the tap is driven in a real browser by
      `scripts/oneoff/probe-camping-expand-onscreen.mjs` (dev server + Chrome, so not a build
      gate): collapsed shows none of the prose, the control found **by accessible name** reveals
      all four fields, and a second tap closes it. Seed `ROUTES` carry no `bivy`, so the sites
      are injected in memory by `scripts/camping-expand.config.mjs` — the same never-edit-the-
      source pattern `zero-state.config.mjs` and `anniversary.config.mjs` use.
      - That config asserts **ROUTES[0] is a discipline the camping gate admits**, and the
        assertion earned itself on its first run: a seed reshuffle would otherwise leave the
        probe opening a route with no panel and reporting the disclosure broken when it is fine.
      - It found that by **failing on a fixed 4,000-char window** used to read the route's
        discipline — ROUTES[0] is far longer, since it carries `communityTracks`, `activity` and
        `gpx` inline, so it read `undefined`. It balances braces now. That is the **third** magic
        offset in this one change (the probe's `i + 400`, this window), which is the argument for
        the rule rather than the instance: **a fixed window encodes a guess about the size of the
        thing you are looking at, and these files are exactly where that guess is wrong.**
  - **Every site now says WHERE IT IS — elevation, gain from the trailhead, distance from the
    trailhead — and the SILENCE is the half worth guarding.** Two of those three are the shape this
    catalog keeps fabricating, so all three were measured before any of them was rendered.
    - **The two stores are wildly asymmetric, and that decides what can be shown.** Elevation:
      65% of the 5,083 researched `bivy` sites, 98% of the 445 campsite waypoints. **Trail
      distance: 92% of waypoints and ZERO of the bivy store — the key does not exist under any
      spelling**, and only **4 of 5,083** carry a coordinate, so there is nothing to read and
      nothing to compute. A site with no recorded distance shows none.
    - **A straight line is NOT this number and must never be substituted.** A trail cannot be
      shorter than its own chord — the premise of `audit:waypoint-distances` — so a great-circle
      distance from the trailhead pin would be wrong *and* look authoritative. That is injection
      case 7, and it is the assertion this section most exists for.
    - **Gain is arithmetic, not research** (`site.elev - trailhead.elev`), so it inherits every
      defect in the two numbers it subtracts. Three things were checked first: the waypoint is the
      **only** trailhead-elevation record (687 routes; **0** carry one only in
      `approach_logistics`; the 2 with both agree exactly), **no camping route has two trailheads**
      (0 of 757, so "the" trailhead is not arbitrary here the way it would be catalog-wide), and
      `bivy[].elev` holds **one** convention — 0 of 3,265 values are metres-like against the
      route's own `high_point_ft`, unlike `dist_km` and `gain_ft`.
    - **16% of sites sit BELOW their trailhead, and they are not bad data.** 527 of 3,243. Roadside
      vocabulary appears in **72%** of them against **9%** of the sites above — a 63-point gap, so
      the population is real: they are valley car-campgrounds you *drive* to, where
      gain-from-the-trailhead is the wrong question. They render as **"1,250 ft below the
      trailhead"**, never as a negative gain, which is the same arithmetic worded as the fact it
      actually is and tells a climber the useful thing.
    - **Two assertions in this section had to be scoped to the PANEL, and both were written
      tab-wide first.** The Planner legitimately says "trailhead" in `TrailheadCard` and APPROACH,
      so a tab-wide match reported correct code as broken; and the fixture's trailhead pin renders
      its **longitude**, so a tab-wide scan for a minus sign flagged a correct app. This guard's
      own header already recorded that mistake from the dedupe work — *it was then made twice
      more in one sitting.* Count inside the panel.
    - **The fixture trailhead needs COORDINATES, and injection case 7 is what found that.** Without
      them the anti-fabrication assertion is inert: a derived chord needs two points, so a
      coordinate-less fixture let the guard go green on an app that *was* deriving a distance.
      Caught by the case MISSING, not by reading the guard.
  - Injection-tested, 8 cases at the bottom of the script; the first 4 were run by hand and each
    failed naming its own defect (deleted mount → `ANCHOR LOST` + exit 1; dropped `scrambling`;
    removed dedupe; dropped the waypoint half of the merge). Cases 6-8 are automated in
    `scripts/oneoff/inject-camping-metric-cases.mjs` — **3/3**, each proving its edit landed by
    checksum before the guard is believed.
  - **The recorded worry that this gate fires on "sea-level desert scrambles" DOES NOT REPRODUCE,
    and the note is retired rather than acted on.** `CampingPanel` already returns null with no
    sites, so a lowland route can only draw the section if it *carries* camping data — and of the
    **799** gated routes that do, **0** have a high point under 3,000 ft
    (`measure-camping-gate-lowland.mjs`). Widening or narrowing the gate would have been a fix to
    nothing, and narrowing it risks suppressing correct data.
  - **THE PIN-DISTANCE GATE GENERALISES OFF THE CAMP STORE, and it turns `audit:cross-route-pins`
    from 54 unactionable rows into 9 adjudicated ones** (`adjudicate-cross-route-pins.mjs`). That
    audit reports a named POINT placed 2 km or more apart by two routes and **deliberately refuses
    to pick** — *"a majority can be one enrichment pass counted many times"* — which is right and
    leaves every row unactionable. The adjudicator supplies what it asks for: an independent record
    (the gazetteer) plus the distance rule the camp work arrived at. A pin within **250 m** of a
    uniquely-named feature is corroborated; a sibling **1.5 km+** away is the misplaced one.
    - **Its refusals are most of its value, and each is a rule already paid for here**: a name the
      gazetteer does not hold; SEVERAL features of that name in WA (*"Cathedral Pass"* is three);
      a LINEAR feature whose label point locates nothing; EVERY pin far from the feature (*"Myrtle
      Lake"* resolves 87 km from both pins, so it adjudicates nothing); and every pin near it.
    - **PROSE DECIDED WHICH OF TWO IDENTICAL-LOOKING FINDINGS TO REPAIR.** Four Mount Constance
      routes put *"Lake Constance"* **2,827 m** from the lake, and all four describe walking *"the
      unsigned, unmaintained Lake Constance climbers' trail"* — they mean that lake, so the pin
      belongs at it. Three Mount Stuart routes put *"Lake Ingalls"* **3,203 m** from Lake Ingalls
      and **none of them mentions the lake anywhere**; their pin sits near Longs Pass, so it is
      plausibly a DIFFERENT place carrying the wrong name, where the repair is a rename rather than
      a move. **Moving it would put a correct point at a wrong one.** Repaired the first, reported
      the second — the same split as the two Cascade Pass pins that merely mention Pelton Basin.
    - The repair **copies a corroborated sibling's coordinate**, so no latitude or longitude is
      typed and a fix needing a coordinate the catalog lacks cannot be expressed — the
      *declare a winner, never a coordinate* contract. Only the coordinate moves: the 50 ft
      elevation difference is below what the DEM resolves and is not what is being repaired.
      Cross-route agreement **436 -> 437 (81% -> 82%)**, candidates 14 -> 13.
    - **A ROW THAT CONTRADICTS ITS OWN STATED DIRECTION IS STRONGER EVIDENCE THAN ANY DISTANCE**
      (`fix-adjudicated-cross-route-pins.mjs`). `wa_magic_mountain_south_ridge` puts *"Kool-Aid
      Lake"* **1,623 m** from the lake, and its own approach says *"From Cache Col, descend roughly
      600 ft ... a descending traverse to the **southeast**, dropping to Kool-Aid Lake"*. Measured
      from that row's **own** Cache Col pin, its lake pin bears **345 deg** where the corroborated
      position bears **154 deg** — nearly opposite, and it breaks the row's own waypoint sequence.
      That is the route disagreeing with itself, which needs no second route and no vote. The
      elevation settles which half is wrong: it matches the corroborated cluster to **1 ft**, so the
      pin means that lake and the COORDINATE is the wrong half rather than the name.
    - **THE GROUND SAYS WHETHER THE ELEVATION SURVIVES THE MOVE, and not asking is how a coordinate
      repair strands the field beside it.** Lake Constance left its elevation alone correctly — 50 ft,
      inside the DEM floor. `wa_ptarmigan_traverse`'s *"Cache Col"* is the other case: six routes
      place that col within 50 m of the gazetteer and this pin is **2,752 m** away, and the ground at
      the corroborated coordinate reads **6,935 ft** — admitting the siblings' 6,903 and **refusing
      this pin's 6,600 by 335 ft**. Moving the coordinate and keeping the number would have minted a
      fresh `audit:waypoint-elevations` finding, which is
      [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] committed by the repair.
      Both values are COPIED from the corroborated donor, so the contract is unchanged. The script
      decides per repair and **refuses** an elevation move the ground does not demand.
    - **AND THE THIRD FINDING WAS REFUSED ON MIXED EVIDENCE, which is what the prose check is for.**
      The same traverse's *"Spire Point"* pin sits **2,124 m** from Spire Point with an elevation
      matching the summit **exactly** (8,264) — which argues it means the peak. Everything else
      argues it does not: it is typed **Junction** rather than Summit, it sits in sequence between
      White Rock Lakes and Cub Lake (i.e. on the traverse line), and the route's one mention of it
      reads *"If you summit **optional peaks** (Dome, Sentinel, Spire) ... do not commit to peak
      summits unless the time/weather window is clear"* — **the traverse does not go over it.**
      Moving it would put a traverse waypoint on a summit the route does not climb and break its own
      order. *Mixed evidence is a refusal*, the Lake Ingalls discipline on a route rather than a lake.
    - **A SIBLING SESSION ADJUDICATES THE SAME AUDIT BY A DIFFERENT RECORD, and the two are
      complementary rather than rival** (#1519, merged eight minutes after #1518). It compares each
      pin's **own stated elevation** against the ground under its cluster and needs no gazetteer, so
      it reaches names no gazetteer holds (*"Sahale-Boston col"*, *"Luna Col"*, *"Mary's Falls
      Camp"*); this one uses the gazetteer plus the route's prose, so it reaches pins whose stated
      elevation is fine. **Independently, both conclude the Lake Constance OUTLIER was the correct
      pin** — the entry above records the ground fitting it better, and the gazetteer puts it 29 m
      from the feature. Check `git log` before quoting a count from this audit: it moved by more
      than either session's writes.
  - **A PIN REPAIR SILENTLY DELETES THE "NOT A RECORDED TRACK" CAVEAT, AND 52 ROUTES HAD ALREADY LOST
    IT** (`audit-stranded-track-vertices.mjs`, `fix-stranded-track-vertices.mjs`). `trackIsJustTheWaypoints`
    requires **every** vertex to be on a pin — correctly, since a threshold would caption genuine
    tracks. So moving a pin and leaving the vertex drawn through its OLD position turns the predicate
    false, and the route **stops saying its line is a sketch**: a seven-vertex line across the North
    Cascades then poses as a recorded GPS track with **Download GPX** beneath it.
    - **Found by causing it.** The Cache Col repair above took `wa_ptarmigan_traverse` from 0 m off
      its own track to 1,133 m, which looked like evidence the repair was WRONG — a real recording is
      a stronger record than any gazetteer. It was not: that route stores **11 points for 11
      waypoints**, 10 sitting exactly on a pin, median vertex spacing **3.3 km**. The line was drawn
      THROUGH the pins, so the old 0 m was by construction and proved nothing. *Check what a track IS
      before reading agreement with it as corroboration.*
    - **The fingerprint is a ROUNDED vertex beside a HIGH-PRECISION pin** — `wa_tooth_and_claw` has a
      vertex at `48.521,-120.644` against a pin at `48.51454,-120.64332`. This repo has applied **427**
      researched coordinates, so the collateral scales with that work. Sketched lines had gone
      **201 -> 139**; the repair took them to **170** and stranded routes **52 -> 21**.
    - **NOTHING COULD SEE IT.** `check:track-caveat` proves the CODE renders the caveat when the
      predicate fires, never that a row still satisfies the predicate. The three waypoint audits ask
      whether a pin is on its track — true by construction on these routes before the repair, and
      afterwards reported (if at all) as a *pin* defect rather than as a lost caveat.
    - **ORDER IS NOT A PAIRING RULE, measured rather than assumed** (`probe-sketch-line-follows-waypoint-order.mjs`):
      only 64.6% of sketched lines are drawn vertex-i-on-waypoint-i, and **34.2% do not follow their
      own list at all** — an out-and-back sketch reads `0,1,2,2,2`. Pairing by position would scramble
      27 lines. Distance it is.
    - **THE POST-CONDITION IS EXACT AND STILL NOT SUFFICIENT.** Every candidate is applied in memory
      and the app's own predicate must return **true** afterwards — but that is satisfied by ANY
      bijection, so with two adrift vertices a wrong pairing passes while scrambling the drawn line.
      The ambiguity gate (the chosen assignment must beat the swap by 3x) **earned itself immediately**:
      `wa_tenpeak_mountain_southeast`'s swapped pairing was *better* (559 m against 872 m), so greedy
      had it wrong. 36 -> 31 repaired, 21 refused, every refusal printed.
      - **IT WAS DETECTING A REAL FAULT AND DRAWING THE WRONG CONCLUSION FROM IT, which is why the
        pairing was later rewritten.** *"Greedy had it wrong"* is a defect in the PAIRING, and the
        gate answered it by refusing the route — so it defended the wrong assignment rather than
        replacing it, and a route with an unarguable 15 m anchor went unrepaired. An aggregate also
        hides a certain pair behind an uncertain one (`wa_vasiliki_ridge_standard`, 17.5x, refused
        on the sum). Confidence-first plus elimination fixes both; the counts above are the
        pre-rewrite ones. **A gate that fires correctly can still prescribe the wrong repair.**
    - **THE ROOT CAUSE WAS AN ASYMMETRY IN THE PREDICATE, AND FIXING IT BEAT REPAIRING VERTICES.**
      `trackIsJustTheWaypoints` demanded `line.every(onAPin)` — **no slack at all on the vertex side,
      while pins already had one** — and only the pin slack had a stated reason. So the vertex
      strictness was doing the damage: one stranded vertex deleted the caveat outright, and 17 routes
      could not be recovered by moving it because the pin had been **REPLACED rather than refined**
      (`wa_mount_lyall_south_route`'s orphan is High Bridge on the Stehekin Valley Road, **27 km**
      from Holden Village) so there was nowhere correct to move it to.
      - **The stated objection does not apply to this change, and that distinction is the whole
        argument.** The comment says *"a threshold would condemn genuine tracks that happen to be
        sparse"* — true of a threshold on the FRACTION of vertices that are waypoints, and not of
        **one** of slack under the existing `<=40` cap: a recording has hundreds of points and not
        one lands within 5 m of a NAMED waypoint by chance. Measured: the 26 lines this newly
        recognises carry at most **8 vertices at a median spacing of 2,217 m**, densest 105 m, so
        **none of them could be a recording**.
      - **A SPACING-BASED PREDICATE WAS MEASURED FIRST AND IS THE WRONG INSTRUMENT.** Median vertex
        spacing separates the catalog cleanly — recordings sit at 8-47 m, sketches at 2,356 m — and
        **66** uncaptioned lines have spacing over 500 m with a median of 4 vertices. But **62 of
        those 66 are a line through SOME of their own pins**, which the one-vertex slack already
        reaches, and the other 4 are lines related to no pin at all, where the existing sentence
        (*"Straight lines between this route's waypoints"*) would be a **false claim**. A threshold
        would also need justifying against the stated objection; the slack does not.
      - **STRICTLY ADDITIVE, AND THAT HAD TO BE ENFORCED RATHER THAN ASSUMED.** A two-point line has
        no interior, so one of slack is HALF of it: applying it there admitted a **55 m placeholder**
        (`wa_mount_terror_stoddard_buttress`, which this file already records as a stub) AND **took
        the caveat AWAY from 34 two-point lines that legitimately carry it**. Only the measurement's
        own `LOST:` check caught that — the summary line alone read 174 -> 140 and `tail` had scrolled
        the evidence off. **A change to a predicate must assert that nothing loses what it had.**
      - Sketched lines **139 -> 174** by repairing vertices, then **-> 200** by fixing the predicate;
        stranded routes **52 -> 21 -> 17 -> 8**. Injection-tested **both** directions in
        `check:track-caveat`: reverting to no slack fails **exactly** the stranded case while the
        three over-reach cases stay green, and widening to two-of-slack fails **exactly** the
        two-point case.
      - **The repair script is deliberately NOT gated on the predicate any more.** With the slack a
        single stranded vertex now SATISFIES it and would be skipped — but the caveat and the drawn
        line are different questions: that vertex is still painted on the map a kilometre from the
        pin it belongs to. The slack restores the honesty; the repair restores the accuracy.
      - **The cases had to be built FROM the fixture, not typed.** Two of the four first failed
        against a correct predicate because their hand-written coordinates missed every pin, and a
        third was testing the PIN half by accident — a two-point line cannot put 3 of 4 pins on
        itself, so it needs a two-pin route. *A case that fails for its own reasons proves nothing.*
    - **THE SLACK IS TWO WHERE TWO IS STILL A MINORITY, AND WIDENING IT SILENCED THE AUDIT THAT FOUND
    THE CLASS — which is the part worth reading.** Eight routes had TWO pins repaired, so the
    one-vertex fix left them posing as recorded GPS tracks with Download GPX beneath them, and five
    of the eight cannot be repaired at all: the pin was **replaced** rather than refined (a
    trailhead up a different valley), so there is nowhere correct to carry the vertex to. A caveat
    that only reaches the repairable half is not the honesty fix.
    - **Stated as what it MEANS rather than as a picked number**: a strict majority of the points
      must still sit on a pin, which **derives** the five-vertex minimum instead of choosing it and
      leaves every shorter line on exactly the old rule. A flat two is wrong and
      `check:track-caveat` pins it — on a three-point line it means ONE vertex need be a pin, which
      is not a sketch test at all.
    - **Measured across the catalog before shipping, and the LOSING side is the one that mattered:
      275 lines considered, 200 captioned by both rules, GAINED 8, LOST 0.** A summary count alone
      hid a real loss last time (34 two-point lines), so `measure-majority-slack.mjs` prints the
      lost set in full and exits 1 if it is not empty. None of the 8 could be a recording — their
      median vertex spacing runs **258 m to 4,432 m** against the 8-47 m a real GPS track sits at.
    - **THE AUDIT SHARED THE PREDICATE, SO EVERY WIDENING QUIETLY SHORTENED IT.**
      `audit:stranded-track-vertices` `continue`d on a qualifying route, so the moment two of slack
      landed all eight vanished and it printed *"no stranded vertices"* about a catalog where eight
      lines still had a vertex drawn a kilometre from its pin. **An audit that goes quiet because
      the thing it measures was excused is the overstated-coverage failure this file keeps
      recording** — committed here by the author of the widening.
    - **Decoupling it showed the silencing had ALREADY HAPPENED ONCE: 17 routes carry a misplaced
      vertex, not 8.** Nine were hidden by the ONE-vertex slack from #1541 and nobody noticed,
      because the only thing that reported them consulted the rule that excused them. The caption
      is a **column** now, not a filter: a captioned route is still reported, flagged
      `[captioned — accuracy only]`, and only an uncaptioned one is the honesty defect. Today that
      reads **0 uncaptioned, 17 accuracy** — which is the correct state, since *the slack restores
      the honesty and the repair restores the accuracy*, as this entry already says one bullet up.
    - **THAT FOLLOW-UP WAS MEASURED BY A SECOND CLASSIFIER, AND IT NAMED A FABRICATION AS THE
      ANSWER WHILE BEING BLIND TO THE ONE REAL REPAIR.** The bullet here used to read *"3 of the 8
      have a decidable half and 5 do not"*, citing `measure-stranded-vertex-pairings.mjs` — a
      read-only triage sitting beside the applier and re-implementing its rules. It got **all three
      different**, and the one that matters is the first:
      - **It never consulted `coordinateIsComputed`**, which the applier imports from
        `lib/track.js`. So `wa_mount_lyall_south_route`'s v0 scored `CONFIDENT — 15x clear` on a
        vertex that is **computed** — interpolated along the line, with no old pin position to
        carry it to. The audit's own closing text says moving one *"would invent a shape the line
        never had"*. **The headline said `1 decidable`, which is a worklist entry**, and acting on
        it by hand is the fabrication class this whole family exists to refuse. The applier refuses
        the same route correctly (`best is 1.7x, needs 3x`) because it excludes that vertex first.
      - **`ROUTES` was a hardcoded list of EIGHT ids**, frozen when it was written, while the class
        grew to **28** as more pin repairs landed. `wa_guye_peak_improbable_traverse` — the ONE
        genuinely repairable route, a vertex **70 m** from the summit pin it was left behind by —
        was not in that list at all. *A hardcoded scope cannot see a class it was not told about*,
        and here it made the instrument wrong in both directions at once.
      - **Its `FAR` threshold was 1200 m against the applier's 500 m**, whose reasoning is recorded
        four bullets down: a refinement is tens of metres, a replacement is kilometres, and **85 to
        2,103 is empty**. So a 1,071 m move read CONFIDENT there and is refused here.
    - **IT RAN CLEAN, WHICH IS SHARPER THAN #1695's SIX RED PROBES.** That sweep found six
      DB-reading one-offs erroring and recorded that *"an exit code is not evidence a probe is
      telling the truth"*. This one exits **0** and prints plausible per-leg distances, so it
      survived the sweep and kept publishing a wrong worklist. **A probe that fails loudly is
      cheaper than one that answers confidently.**
    - **THE REPAIR IS TO COLLAPSE, NEVER TO MAKE THE TWO BODIES MATCH** — the rule this file
      already states for `useMyHomeStatePath`, since matching restarts the drift. The measurement
      is **deleted**; `fix-stranded-track-vertices.mjs` with no `--apply` IS the triage and is
      strictly better: it discovers its routes rather than listing them, excludes computed
      vertices, uses one bar, and prints a per-route reason for every refusal plus the move-distance
      distribution. **Run the dry run; do not write a second classifier for it.**
    - **Guye Peak applied and reconciled by read-back** (70 m, the only candidate pair, the same
      refinement band as the 26 m and 85 m already applied): **35 adrift across 28 routes → 34
      across 27**, 12 of them computed, and **0 uncaptioned** throughout — so this was accuracy
      only, with the honesty half already intact.
    - **AND THE REPAIR PATH HAD THE SAME HOLE AS THE AUDIT, IN A SECOND CONSUMER.**
      `fix-stranded-track-vertices` asserted its post-condition by asking the app's predicate to
      return true after the move — exact while the predicate demanded every vertex be on a pin, and
      **vacuous** once it tolerated two: on precisely the routes the script exists to repair it now
      returns true BEFORE the move as well. It measures the repair instead — strictly fewer adrift
      vertices and no newly-orphaned pin — neither of which a future widening can weaken.
    - **ALL-OR-NOTHING PAIRING WAS REFUSING UNARGUABLE WORK.** Every one of the 17 was refused
      because ONE of its vertices could not be placed, including a vertex **26 m** from Anderson
      Pass at 776x. An unplaceable pair now stops the pairing rather than condemning the route.
    - **THE MOST USEFUL FINDING: THREE OF THE SIX CANDIDATES WERE NOT STRANDED VERTICES AT ALL.**
      A stranded vertex sits where a pin used to be; these were **interpolated along the line**
      — 14-decimal coordinate tails, **0.00 m** off the straight chord between their own
      neighbours, at fractions of exactly **3/5** and **2/5**. Moving one onto a pin would invent a
      shape the line never had, which is the fabrication class `audit:synthetic-waypoints` already
      documents for pins, arriving on a gpx VERTEX. **The confidence ratio did not catch them —
      `wa_mount_lyall_south_route` scored 18.4x** — because distance from a pin says nothing about
      where a point came from. `lib/track.js` now exports `coordinateIsComputed` per point so the
      repair path and the audit ask its rule rather than copying it.
    - **A computed vertex is EXCLUDED FROM PAIRING, not route-fatal**, and the first version got
      that wrong: refusing the whole route threw away `wa_inner_constance_standard`'s 85 m / 80x
      repair because its *other* vertex was computed.
    - **ELIMINATION IS ONLY SOUND WITH ONE ORPHAN LEFT, and excluding a vertex broke that
      silently.** With fewer candidates than orphans the "last vertex" branch took `os[0]` — an
      arbitrary pick wearing elimination's clothes. It proposed Mushroom Tower at 1,520 m to the
      first orphan when the confidence test had correctly refused that route at 2.3x. **Found by
      reading the dry run, not by any check.**
    - **A PARTIAL PAIR HAS NO ELIMINATION BEHIND IT, so its bar is 500 m rather than 3 km — and
      that number sits in a measured VOID rather than being fitted.** Across all 17 routes the
      move distances are 26, 85, 2103, 3156, 3546, 4583, 6257, 6257, 6258, 12430, 15682: a
      refinement is tens of metres, a replacement is kilometres, and **85 to 2,103 is empty**. It
      matters on `wa_mount_rainier_liberty_ridge`, whose vertex would move 2,103 m onto the Liberty
      Cap pin while its own 3-decimal coordinate sits closer to Rainier's MAIN summit.
    - **Applied: 2 routes** (26 m and 85 m, both onto a coordinate the row already holds), verified
      by read-back on the repaired property rather than on the caption — re-checking the caption
      would have the identical hole, since it is already true of those rows.
    - **The audit names the CAUSE now, because the two want opposite repairs**: 23 adrift vertices
      across 17 routes, **8 of them computed**. Telling somebody to carry a computed vertex onto a
      pin is wrong advice, and the report used to give it for all of them.
    - Injection-tested **4/4** (`scripts/oneoff/inject-majority-slack-cases.mjs`), each proving its
      edit landed **by checksum**. **Two cases came back WRONG FAILURE first and the guard was
      innocent both times**: the three-point case was written against the FIVE-pin fixture, where
      the PIN half refuses the line before the vertex rule is reached — so it passed against a
      flat-two predicate while proving nothing about the rule it names. The same wrong-half mistake
      the two-point cases already record, found only because the injection judged on each case's
      **own** failure text. **Case 4 must stay SILENT**: the same rule written longhand is not a
      change.
  - **THE REFUSALS ARE A SECOND CLASS, NOT A TAIL OF THE FIRST.** A repaired pin moves a few hundred
      metres (p50 **381 m**); a refused one is 3-27 km out, which is a trailhead REPLACED rather than
      refined — `wa_mount_lyall_south_route`'s orphan is **High Bridge on the Stehekin Valley Road,
      27 km from Holden Village**, a different access point entirely. Carrying the vertex there would
      redraw the line across another valley, so which of the two records is right has to be read.
    - The repair **moves a vertex onto a coordinate the row already holds** — no latitude or longitude
      is typed — and is verified through the app's OWN hydration, not the raw column: `RouteDetail`
      reads `route.gpxPts`, so `dbRouteToCamel` and `normalizeWaypoints` sit between the write and the
      screen and either could have made 31 repaired columns reach nothing.
  - **The waypoint NOTE store is clean**: `audit:note-voice` finds **1 note in pipeline voice out of
    2,931 on screen**, and reading it, the audit's *"delete"* verdict would lose the road-washout
    location it carries. Left alone.
  - **THE WHOLE CAMP STORE WAS SWEPT, AND THE ONE DISAGREEMENT WAS ONE I HAD SPREAD THAT MORNING.**
    `audit:camp-elevations` places 178 of 459 populated names and **177 agree with the ground within
    400 ft (99%)**. The single disagreement was `Pelton Basin` — **5,400 ft stored on 25 rows against
    4,770 ft of ground** — and four of those rows had been written hours earlier by
    `solve-camp-elevations`' WAYPOINT-DONOR path, copying 5,400 from the catalog waypoint.
    - **Decided by the gate built the same day, and it cuts BOTH ways.** The pin is real (five
      decimals), the gazetteer's *"Pelton Basin, Water Access Trail"* is **14 metres** away, and both
      ground reads agree (4,778 under the pin, 4,770 under the feature). Sahale Glacier Camp is the
      mirror: its feature is **458 m** away, so there the ground speaks for somewhere else and the
      stored value stands. **The audit line looks identical in both cases; only the distance
      separates them.** Waypoint and all 25 rows corrected.
    - **TWO OTHER PINS NAME PELTON BASIN AND WERE NOT TOUCHED** — *"Cascade Pass — cross and descend
      east toward Pelton Basin"* states 5,392 ft on ground of 5,321, and sits 1,037 m from the
      feature. Those are CASCADE PASS; the name merely says where you are heading. A repair matching
      on the name alone would have moved them 600 ft.
  - **THE CAMP PROSE HAD NEVER BEEN ASKED ANYTHING** — `measure-pipeline-voice-in-route-prose`'s
    column list does not include `bivy`, so every prose needle this repo has was pointed elsewhere.
    `audit-bivy-prose-quality.mjs` scans all 29,809 leaves across 4,995 sites: **0 citations, 0
    pipeline voice**, 51 properly-dated claims (the ACCEPTABLE form — *date it or drop the claim*),
    and **2** genuinely open-ended ones.
    - **Its first version manufactured 14 findings on correct prose**, and the fix is the sibling
      audit's own rule: every one read *"…through the END OF 2027, with no reopening estimate…"* —
      the sentence bounds itself, and the needle fired on the fragment without it.
      `audit:expiring-closures` carries a `SELF_LIMITING` exclusion for exactly this and omitting it
      here reproduced the defect. **14 -> 2.**
  - **THE FULL CAMP VERDICT, so it is not re-derived**: renders (`check:camping` ok), chip shapes
    (`check:token-boxes` ok, 5,274 boxes), route fit (`audit:camp-route-fit` **0** at its headline
    threshold, down from 5), elevations on screen (**99%**), coverage (1,206 of 5,022 blank, and
    measured as UNAVAILABLE rather than undone), propagated lists (63 shared, mostly genuine zone
    files, two corridors split), prose (clean), and 5 camps stored at two elevations — reported,
    since 2 are below the DEM's resolution and 2 sit on misplaced pins.
  - **THE 50 "NO FEATURE ANYWHERE IN WA" REFUSALS ARE REAL — 42 of 50 MEASURED, not assumed.**
    That bucket had been *read* as climbers' names and never tested, and this repo has been burned
    by exactly that shape: an ArcGIS `LIKE` was case-sensitive, GNIS matched nothing for 25 of 39
    pins, and the run reported every one as *"a climbers' name, not a federal one"* — uniform,
    plausible and wrong. `diagnose-unfound-camp-names.mjs` asks the gazetteer directly for every
    refused name and prints what came back:

        ABSENT  the gazetteer holds nothing of this name : 42
        EXACT   an exact name match, in Washington       :  2
        NEAR    hits in WA, no exact name match          :  2
        FAR     best hit is outside Washington           :  4

    So the reading was right, and now it is evidence. *Lower Lena Lake*, *Chiwaukum Chain Lakes*,
    *Upper Ice Lake* and *Upper Horseshoe Basin* return **nothing** — these are climbers' and
    descriptive names, and no amount of querying finds a place that is not mapped.
    - **The 4 FAR entries are the namesake gate working**: *Chicago Camp* resolves to California,
      *Bearpaw Lake* to Wyoming, *Moose Creek bridge* to New York, *Colonnade Ridge* to the Grand
      Canyon.
    - **ONE was a gate gap and is fixed**: `roadhead` was missing from `TAIL`, so the search was the
      whole phrase — *"Trinity trailhead roadhead"* returned nothing while *"Trinity trailhead"*
      matches exactly. Added, and it **composes with the gates rather than bypassing them**:
      *"Bedal Creek roadhead"* now reaches *"Bedal Creek"* and is refused as LINEAR, which is the
      right answer for a stream. One row filled: Trinity Trailhead, 2,764 ft.
    - **TWO ARE REPORTED, NOT SWEPT.** *"Sulphide Camp, end of the Baker River trail"* → *"Sulphide
      Creek Camp"*, and *"Cat Basin"* → *"Cat Basin Stock Camp"*. Both are plausibly the same place
      — Sulphide Creek Camp really is on the Baker River trail the row names — but accepting them
      means letting an INSERTED WORD through the identity gate, and this catalog already records
      that a feature type discriminates: Whatcom Pass is not Whatcom Camp. Two rows are not worth
      loosening the rule that keeps 855 wrong matches out.
    - **So the remaining camp-name work is genuinely unavailable, not merely undone.** 42 names have
      no mapped feature, 66 more are dispersed zones where no single height exists, and 31 name
      several places at once. That is the answer to *"can this be finished?"* — no, and the refusals
      are the result.
  - **NOT-COMPUTED IS NOT NOT-MISPLACED, and conflating them nearly wrote a WRONG number with a
    measurement to justify it.** The five camps stored at two elevations were taken back to the
    ground — the method that settled Skagit Queen — and the first pass "settled" Sahale Glacier
    Camp: three pins read 7,376-7,380 ft, which admits the majority's 7,400 and refuses 7,500. Every
    fabrication check passed: clean 4-decimal tails, not on any chord.
    - **The gazetteer inverted it.** *"Sahale Glacier Camp, Sahale Arm Trail"* sits **458 m** from
      those pins on ground of **7,612 ft** — which is what the pins THEMSELVES state (7,600). So the
      pin's elevation is right, its COORDINATE is 458 m downhill, and both bivy values (7,400/7,500)
      are low. Applying the "settled" repair would have moved the row FURTHER from the truth.
    - Skagit Queen was decidable because its gazetteer feature was **7 metres** away. That distance
      was the whole difference and it had not been made a rule. It is now: a pin may only speak for
      a camp when an independent record of that camp is within **250 m** of it.
    - **The gate caught a second one immediately.** Two *Boston Basin high camp* pins sit **1,051 m**
      from *"Boston Basin High Camp, Boston Basin Trail"*, reading 5,395 ft where the real camp
      stands on 6,248. The one pin that IS corroborated (0 m) reads 6,248 and admits BOTH stored
      values, so that split honestly stands.
    - **A SPREAD BELOW THE INSTRUMENT IS A CONSISTENCY DEFECT, NOT AN ACCURACY ONE.** Camp Schurman's
      two values are **20 ft** apart and Thumb Rock's **15 ft**; 3DEP is a 10 m grid on steep ground.
      Asking it to choose is asking a question finer than the instrument, and an answer would be
      noise wearing a verdict's clothes. Those want one value used everywhere — a choice about the
      record — not a measurement.
    - **RESULT: 0 of 5 settled**, and two misplaced pins found as a by-product. The splits are
      REPORTED and unrepaired; picking on the majority alone is the *ten agreeing records are one
      claim counted ten times* trap this file already records.
  - **THE CROSS-CHECK WAS NOT REGION-BOUNDED WHILE THE DONOR INDEX BESIDE IT WAS, and that cost
    real answers.** `wpElev` was keyed by NAME ALONE; `wpByRegion` two lines down is keyed by
    name+region — same store, same identity function, two different scopes. So a namesake anywhere
    in Washington could refuse a correct answer: *"Five Mile Camp, Park Creek trail"* sits on nine
    **North Cascades** routes and was refused because a *"Five Mile Camp"* waypoint on a Mount La
    Crosse route — **`wa_olympics`, ~250 km away** — states 1,350 ft against the gazetteer's 3,921.
    Neither is wrong; they are two places sharing a name. Bounding it unlocked that name and *"Twin
    Lakes basin, under the west face of Columbia"*, and the gazetteer confirms the first verbatim:
    **"Five Mile Camp, Park Creek Trail, Chelan County"**. `donorFor`'s own comment already records
    this lesson; its sibling did not apply it.
  - **SKAGIT QUEEN CAMP IS SETTLED, and this entry used to say it could not be.** It read
    *"independent research leans toward the DEM but not conclusively, so it stays unwritten"*. The
    refusal compared the waypoint's STATED elevation against the DEM at the GAZETTEER's coordinate —
    two different places — and **nothing had asked what the ground is under the waypoint's OWN pin**.
    Three facts settle it: the pin is **real** (six decimals, no interpolation residue, 1,437 m off
    the nearest chord between its neighbours — it matters, because ground under a COMPUTED pin is
    ground under a place nobody chose); the gazetteer feature is **7 metres away**, so agreeing on
    height is corroboration rather than coincidence; and the two ground reads are **3,089 and 3,093
    ft** against a stated **4,000**. The waypoint is 911 ft above the ground it sits on. Corrected,
    which unlocked its 9 camp rows at 3,093 ft, now marked CORROB.
  - **THE SOLVER HAS A WAYPOINT-DONOR PATH AND NO BIVY-TO-BIVY ONE**, so a camp whose height the
    catalog already publishes on a sibling route stayed blank —
    `measure-missing-camp-elevations.mjs` had been labelling those **FREE** the whole time and
    nothing acted on the label. `fill-camp-elevations-from-unanimous-siblings.mjs` fills them under
    a gate **stricter than the solver's own 400 ft cross-check: UNANIMITY.** Where donors disagree
    at all, copying either is a silent pick.
    - **THE REFUSALS ARE A SEPARATE FINDING: one camp, two elevations, depending which route you
      open.** Camp Schurman is **9,440 ft on some routes and 9,460 on others** (15 donors), Sahale
      Glacier Camp 7,400/7,500 (26), Thumb Rock 10,760/10,775 (14), Boston Basin high 6,200/6,300,
      Whatcom Camp 5,286/5,500. Every spread is inside the solver's tolerance and would have been
      copied silently. That is the [[facts-stored-twice-census]] class in the camp store, and it is
      **reported, not repaired** — picking a winner needs a source, and 5 names is not a sweep.
  - **Coverage 1,255 -> 1,207 blank rows, 166 -> 159 distinct names**, across four passes: 9 rows
    the solver already had, 17 unlocked by the region bound, 9 unlocked by the Skagit Queen repair,
    29 from unanimous siblings. Confirmed on screen, **9 assertions across 4 routes** — asserting the
    camp NAME beside each number, since a bare number search is satisfied by a coincidence elsewhere
    on the tab.
  - **The 1,763 missing elevations were 230 DISTINCT NAMES, and 180 of them have no answer to
    find. `scripts/oneoff/solve-camp-elevations.mjs` filled 320 rows; the REFUSALS are the
    result.** Named place -> OSM coordinate -> USGS DEM (`elevationAt`), no agent involved.
    Coverage went **65% -> 75%** over six passes (501 rows), derivable gain pairs 3,243 -> 3,676,
    and **no new impossible value appeared at any point** — camps above their own high point
    stayed at 16 throughout, which is the gates holding rather than luck.
    - **CONTROL FIRST, because the expected output is "a plausible elevation" — which is exactly
      what a broken pipeline emits.** `probe-camp-elev-control.mjs` runs four places of known
      height through the identical path and reproduces all four within **68 ft**: Shield Lake
      6,706 against an independently researched 6,699, plus three the catalog already knew from
      the *waypoint* store, so agreement is corroboration across methods rather than one claim
      counted twice. Independent spot-checks after the fact: Three Fingers Lookout **6,851** (the
      lookout is 6,854), Doubtful Lake 5,393, Tin Can Gap 5,752.
    - **The refusals are most of the work and must not be "finished".** 86 names have no OSM
      feature near the peak (a different source, not a guess); **66 are DISPERSED ZONES** —
      *"Informal snow and rock bivouacs above the basins"* has no single height and a number there
      invents precision the record cannot carry; 24 name several places at once, where one number
      is a silent pick; 3 disagree with the catalog's own waypoint; 3 resolved only to a
      **linear** feature.
    - **A LINEAR FEATURE HAS NO SINGLE HEIGHT.** *"West Fork Agnes Creek"* matched an OSM
      `stream`, whose label node hangs at an arbitrary point along a creek that drops thousands of
      feet. A **lake** is deliberately NOT in that deny-list — a lake surface is flat, which is why
      the Shield Lake control agreed to 7 ft. The exception is corroboration: once the waypoint
      store independently agrees, the feature type stops mattering.
    - **The WAYPOINT STORE IS A GATE, NOT A SOURCE**, and it earned that on its first run.
      Agreement corroborates; a disagreement means one record is wrong, so it **refuses** rather
      than picking — Skagit Queen Camp, catalog 4,000 ft against DEM 3,093 ft. Independent
      research leans toward the DEM (the trail is snow-free to ~4,200 ft *above* the camp) but not
      conclusively, so it stays unwritten. The `audit:trailhead-agreement` discipline: a fact
      stored twice is a free consistency check.
    - **THE CHEAP VERSION OF THIS WOULD HAVE WRITTEN ~700 WRONG NUMBERS, and the near miss is the
      most useful thing here.** Re-homing an elevation from a same-named waypoint looked free.
      With `solve-camps.mjs`' token gate it accepted **855 rows**; tightened to name IDENTITY it
      accepts **151**. What the loose gate matched: a **town park in Darrington** given a ridge
      camp's 4,900 ft, *"Luna Cirque floor"* given Luna Camp's valley 2,500 ft, and *"Whatcom
      Camp, Brush Creek BELOW Whatcom Pass"* given Whatcom Pass's height. The fault was the
      GENERIC list — it discards `pass`, `camp`, `lake`, `basin`, `creek` as noise, and **those are
      FEATURE TYPES that discriminate**. Whatcom Pass and Whatcom Camp are two places sharing a
      proper noun. *One distinctive token is not an identity* — the lesson this catalog already
      paid for at the level of whole names, one level finer.
    - **THE TRAILING DESCRIPTION IS NOT NOISE — IT SAYS WHICH PART OF THE FEATURE YOU MEAN.** Once
      the solver learned to search the LEADING proper noun ("Reflection Lakes area winter snow
      camp" -> *Reflection Lakes*, which OSM maps), it also started throwing away the word that
      says which part. Measured on that run: **5 of 11 results were wrong**, all the same way —
      *"Iron Peak saddle dry camp"* took Iron Peak's **summit** (6,504 ft), *"Liberty Cap saddle"*
      took Liberty Cap's summit (**14,118 ft**), *"Goode Glacier moraine"* took the glacier, and
      *"Curtis Ridge camp"* took an `arete` running ~7,000-12,000 ft on Rainier. Every one had the
      right name, the right county, a real feature and a real DEM reading.
      - **The guard for this existed and had the shape of the bug it was guarding against.** It
        was written *because* the hazard was predicted, then keyed on the `peak` TYPE against a
        word list omitting `saddle`, with a linear set omitting `arete` and `glacier`. It fired
        once and let four through — which reads exactly like a working gate. *A deny-list is
        beaten by one more adjective*, twice in one change.
      - The fix is structural, not another word: **if anything follows the leading proper noun
        that names a PART of it, the leading-noun search is not offered at all.** Camp words stay
        exempt, because "X camp" is the camp AT X rather than a different part of X.
      - **Reading the output caught it; no gate did.** Only knowing that a saddle sits below its
        summit separates those five from the six that are right.
    - **A trailing generic CAMP word must not break an identity match**: "Pelton Basin" was
      refused while the catalog held "Pelton Basin Camp" at 5,400 ft. Strip camp words from both
      sides — never a FEATURE TYPE, which is the distinction the loose token gate got wrong.
      Checked against the known-bad pairs: "Whatcom Camp" still does not equal "Whatcom Pass".
    - **A statewide retry is gated on UNIQUENESS, not distance.** Some camps are legitimately far
      from the peak — "Squire Creek Park & Campground" and "Whitehorse Community Park campground"
      are valley staging a 25 km box can never reach. Widening the box would reopen the namesake
      hole the box exists to close, so the retry accepts only if **exactly one** feature of that
      name exists in Washington. One match cannot be the wrong one of several.
    - **Scoping was wrong twice before it was right.** `measure-missing-camp-elevations.mjs` first
      asked only whether another **bivy** entry knew a height (5 names) and never asked the
      **waypoint** store, which is 98% populated — the *check the existing files before
      researching* lesson, one store over. And 1,763 is a ROW count: the unit of work is the 230
      distinct names behind it.
- **THE WHOLE-CATALOG CAMP-FIT SWEEP (2026-09-25) — "0 candidates" WAS NOT "clean".** Every one of
  the 799 routes carrying camps was read per CORRIDOR (routes sharing a byte-identical list kept
  together), judged against its own trailhead, researched ways in (`approach_variants`, incl.
  `primary`), prose and descent — the evidence matrix the Mountain Loop and Sultan splits used, run
  everywhere instead of on the pairs one audit could see. `audit:camp-route-fit` read **0** before
  and after; the sweep removed **1,539** foreign camps from **443** routes (4,938 → 3,408 pairs), and batch 2 closed below.
  - **TWO INDEPENDENT READINGS PER REMOVAL.** A reviewer proposed; a separate ADVERSARIAL verifier,
    told to find removals that are WRONG (descent camps, traverse camps, a stated second way in),
    rejected **58 of 1,597** — e.g. Silver Star Creek camps on the Wine Spires (a documented early-
    season approach to Burgundy Col), Camp Muir/Ingraham Flats on the Mowich headwalls (they descend
    the DC), Mount Stuart's Ingalls camps on the Stuart Glacier Couloir (a south approach via Goat
    Pass). Only camps BOTH agreed on were removed. Rollbacks and every verdict:
    `audits/camp-fit/`; writer `scripts/oneoff/remove-foreign-camps.mjs` (declared-state: the whole
    current list must match, or the row is refused; a same-name Campsite pin goes too, because
    `campSites()` would merge it straight back; a pin the drawn line passes through refuses the row).
  - **A ROUTE MAY END WITH NO CAMPS**, only via an explicit `allowEmpty` set when both readings found
    EVERY listed camp foreign (12 routes: e.g. Mount Baker's Boulder/Park routes, whose Portals and
    Boulder Ridge camps were never in their list; Mount Prophet East). Another mountain's camps are
    worse than none. Adding the right camps is enrichment, not this repair.
  - **BATCH 2 (82 routes: US-2 Index/Skykomish, Glacier Peak east, the Olympics, Stevens Pass,
    Stehekin, Pasayten) CLOSED A DAY LATER, and the refusal is what made that safe.** Its verifier
    confirmed 326 of 332; the writer then REFUSED 80 of the 82 rows — "camp list changed since the
    review". A parallel session (`camping-roles`: every route's camps sorted into main / on-route /
    drop, with researched additions) had rewritten them in between. Re-reading instead of forcing:
    that session had independently dropped **321 of the 326** — a third agreement — and the last 5
    (Whistler's PCT camps, Stickney's San Juan Campground) were on the 2 rows it had not reached.
    It had also re-sorted 345 of the 443 rows repaired above and brought back **none** of the
    1,539 removed camps. The declared-state contract is what turned a write race into a check.
- **`audit:camp-route-fit`** asks the question `audit:camp-elevations` surfaced and could not
  answer: **is this camp plausibly usable FOR THIS ROUTE?** `wa_ellation`, a 5,000 ft route, was
  offered *"Ruth Mountain summit camp"* at 7,100 ft — a real camp with a correct elevation, on a
  different mountain 7.2 km away and 2,100 ft above the top of an 800 ft rock buttress.
  **FIXED** by `scripts/oneoff/fix-ellation-summit-camp.mjs`; kept here as the founding case. A zone file handed every camp in a corridor to every route in
  it. **The elevations are right; the PAIRING is noise.** Report-only, read-only; not a build gate.
  - **THE OBVIOUS SIGNAL IS FAR TOO WEAK, and saying why is the point.** *"The camp names a
    different peak"* describes almost every CORRECT camp: Boston Basin serves Boston, Forbidden
    and Sahale, and a shared camp is the entire purpose of a zone file. Elevation alone is no
    better — *"South Twin Sister summit bivies"* (6,932 ft) correctly serves four lower Sisters
    because it IS the range high point.
  - **What separates them is DISTANCE AND MAGNITUDE TOGETHER**: South Twin is 288 ft above North
    Twin and adjacent; Ruth Mountain is 2,100 ft above Mamie Peak and 7.2 km away. Camps carry no
    coordinates (4 of 5,083), but a camp that NAMES a peak inherits that peak's coordinate from
    the catalog's own `areas` table — so the distance is measurable without inventing anything.
  - **Precision was measured BEFORE promotion**, the standard `audit:area-parents` set by shipping
    41 findings of which 12 were real. Of **5,070** (route, camp) pairs, **315** name a different
    distinctive peak, and **6** clear both dials. The script prints the whole distance × elevation
    grid so the thresholds can be judged rather than trusted — fitting one to the case that
    prompted the detector proves nothing.
  - **Each finding carries its OWN corroboration, from a third record: the route's prose.** If a
    route names the peak its camp names, parties really do stage there. **5 of the 6 never mention
    it** — and not for want of prose: Mount Stickney has 3,969 characters and never says Spire
    Mountain. The camp entry itself is excluded, since it is the thing under suspicion.
  - A peak name is only usable when it is **distinctive and unique in the catalog** — "Middle
    Peak", "North Peak" and "The Tower" exist many times over, so matching them says nothing about
    which is meant. 431 of 447 peaks qualify.
  - **It must never become a sweep**, and the one corroborated finding is also the demonstration:
    `wa_ellation`'s own prose places it in the Ruth Creek valley, so Ruth-AREA camps are defensible
    even on a crag route — Ruth's **summit** camp was not. Repaired by removing **one** entry of
    six, leaving the four other Ruth/Icy/Nooksack camps (Ruth Arm 5,900, the Ruth-Icy notch 6,600,
    the Price Lake shoulder 5,900, Nooksack Cirque 3,000) untouched. The repair is a judgement per
    row, and the script's declared-state contract enforces that: it names the entry, the elevation
    AND the count it expects, so a re-run REFUSES rather than widening.
  - **IT UNDER-REPORTS ITS OWN CLASS, and the wider version was measured and REJECTED.** Reading
    the repair context showed the problem is bigger than the 6: **Mount Pilchuck (5,324 ft) carries
    eight camps and SEVEN belong to other mountains** — Three Fingers (the Lookout, Tin Can Gap,
    Goat Flats, Saddle Lake), Whitehorse (×2) and Big Four; only *"Bathtub Lakes basin, east of
    Mount Pilchuck"* is its own. This audit caught **one** of the seven, because it requires the
    camp to name a distinctive UNIQUE peak and "Tin Can Gap"/"Goat Flats"/"Saddle Lake" name none.
    - The obvious widening — flag any camp whose name the route's prose never mentions — was built
      (`measure-foreign-camp-lists.mjs`) and is **not shipped**. Across 765 routes the ratio is
      smooth across every bucket with a median near **40-50%**, so a route not mentioning most of
      its camps is NORMAL: ≥75% is not an outlier, it is **130 routes**, and the worst hit had 603
      characters of prose — thin, not defective.
    - **The prose test is corroboration ON TOP OF a geometric signal, not a detector on its own.**
      That is why it is folded in per-finding rather than used to select findings.
    - **A partial repair would be worse than none here**: removing only the flagged Three Fingers
      Lookout from Pilchuck leaves three equally-foreign Three Fingers camps behind.
      **THE CLOSING SENTENCE HERE USED TO SAY THE CATALOG DOES NOT RECORD WHICH TRAILHEAD A CAMP
      SERVES. IT DOES** — `approach_logistics.trailhead` — and reading that as a worklist rather
      than a caveat is what closed this corridor; see the Mountain Loop entry below. The signal is
      real per route and is still NOT a detector: ranking by it flags a repaired group.

  - **FOUR SIGNALS NOW, AND THE FOURTH FAILED WITH ITS OWN FAILURE ALREADY WRITTEN DOWN**
    (`probe-witness-list-subsets.mjs`). The one heuristic that survived the first three is manual —
    *find the route that does NOT carry the shared list; that author was not the propagation* — and
    this tried to mechanise it. In the Mountain Loop corridor the witness carried **four** camps and
    all four were the shared list's Three Fingers entries: a **SLICE**, one peak's share of a union.
    - **9 slices catalog-wide, 0 real.** Terror Basin camp is the Picket peaks' camp; Colchuck Lake
      is Colchuck Peak's; *Camp Muir / Ingraham Flats* are exactly Ingraham Direct's; *Glacier
      Meadows / Snow Dome / Elk Lake* are the Blue Glacier route's; *Wing Lake / Lewis Lake* are
      Black Peak's.
    - **The reason is that a slice is ALSO what GOOD data looks like**: a route with a shorter,
      more specific camp list than the zone it sits in. Being more specific than the zone list is
      an improvement, not a defect. The signature was true of Mountain Loop and is not diagnostic
      of it — a distinction no amount of reading the code exposes, only running it against a peak
      whose answer you already know.
    - **The caveat was in the script BEFORE the run and it was still worth running.** Predicting a
      signal's failure is not the same as measuring it: without the run there is no count, and *9
      hits, 0 real* is what stops the next session rebuilding it on the strength of the Mountain
      Loop precedent.
    - **So the class is NOT mechanically detectable with what the catalog holds.** `audit:camp-route-fit`
      — does a camp name a peak that is not this route's? — remains the only working test, and its
      under-reporting is **a cost to accept rather than a bug to fix**.
  - **THE CLASS IS 65 SHARED LISTS AND IT CANNOT BE RANKED — three signals tried, all three flag
    known-correct data** (`measure-propagated-camp-lists.mjs`). 800 routes carry a bivy list across
    149 distinct lists; **65 of those lists appear on more than one area**, 55 across three or more.
    That is the fingerprint both repairs had, so the measurement is real — and it is **NOT a
    backlog**, because most of it is genuine zone data: the Picket group shares ONE 15-area list off
    **two** trailheads (all Goodell Creek), Boston Basin serves Forbidden / Torment / Sharkfin /
    Boston / Sahale, the Enchantments share Colchuck Lake, the Holden peaks share Holden Village.
    - **THE CONTROLS ARE WHAT KILLED EACH SIGNAL, not reading the code**, and the two repairs are
      what supplied them: a split corridor is *correct* afterwards, so a detector ranking it high is
      wrong by construction.
    - **1. Distinct trailheads per group** — wrong measure. Trailheads are per-ROUTE, so ONE
      mountain with many approaches scores highest: **Mount Rainier / Liberty Cap topped it at 2.50**.
    - **2. Trailhead DISJOINTNESS between areas** — the signal that actually settled the Mountain
      Loop repair, and it puts the **repaired Goat Rocks group** (Gilbert / Ives / Old Snowy, three
      peaks **4.4 km** apart correctly sharing one basin) at **100%, inside the top ten**. Trailhead
      wording varies per route even where peaks genuinely share a basin. **Without the control this
      would have shipped as a worklist with known-good data near the top.**
    - **3. Union-of-per-peak-camps** — *"does the list name the group's own peaks?"*, which is what
      both repairs actually were. Defeated by **namesake features**: *"Boston Basin"* matches Boston
      Peak, *"Burgundy Col"* matches Burgundy Spire, *"Agnes Creek"* matches Agnes Mountain. A basin,
      a col and a creek sharing a proper noun with the peak beside them — the
      [[a-name-is-not-an-identity]] failure this file already records as *Whatcom Pass is not
      Whatcom Camp*, one level up.
    - **What DOES work is manual**: look for the route on one of these areas that does **not** carry
      the shared list. That author was not the propagation, so their list is an independent witness.
      The tell for Mountain Loop was two camps appearing on Three Fingers **x3** while the rest
      appeared **x2**.
  - **THE CLASS IS CLOSED FOR THIS CORRIDOR: one 8-camp list on 7 routes across FOUR peaks, split
    back** (`fix-mountain-loop-camp-split.mjs`). Mount Pilchuck, Three Fingers, Big Four Mountain
    and Whitehorse Mountain each carried a byte-identical list in identical order — so *"Bathtub
    Lakes basin, **east of Mount Pilchuck**"* was on three other mountains and *"Big Four
    north-side staging"* was on Pilchuck. The audit could see **one** entry of the eight.
    - **THE GOAT ROCKS METHOD DOES NOT TRANSFER, AND THAT IS THE POINT.** There the ranges were
      59-69 km apart and the two-way separation (8x to 25x) decided it alone. These four peaks are
      **14.9 to 20.5 km apart**, so **distance decides nothing** and a repair reasoned from it
      would have been a coin flip. What decided it were four records sharing no input.
    - **AN INDEPENDENT WITNESS IS THE STRONGEST OF THEM, and it is found by asking which route does
      NOT carry the shared list.** `wa_three_fingers_south_peak_lookout` holds its OWN 4-camp list
      — Saddle Lake, Goat Flats, Tin Can Gap, Three Fingers Lookout — and nothing else, naming them
      in **shorter, differently-phrased** form than the shared list does, so it is another AUTHOR
      rather than another copy. `wa_whitehorse_mountain_nw_shoulder` likewise carries 3 camps, all
      Whitehorse places, none foreign. **Neither witness reaches for a neighbouring peak.**
      The tell that pointed at them: two camps appeared on Three Fingers **x3** while the rest
      appeared **x2**.
    - **FOUR SEPARATE TRAILHEADS** — Mount Pilchuck / Pinnacle Lake, Tupso Pass / Goat Flats, Ice
      Caves, Niederprum. **A camp serves a TRAILHEAD, not a map region**, so a camp on the Three
      Fingers trail cannot serve a Big Four climb starting at the Ice Caves. That is the signal
      this entry's own earlier note said the catalog does not record — it does, in
      `approach_logistics.trailhead`.
    - **PROSE SILENCE, and only the base rate makes it evidence**: 51.4% of (route, camp) pairs in
      this catalog ARE named by their own route, and **none of the nine routes on these four peaks
      mentions a neighbouring peak anywhere in its prose**.
    - **NAME-MATCHING CATALOG AREAS INSIDE CAMP NAMES WAS TRIED FIRST AND IS UNUSABLE.** It put
      *"Whitehorse Community Park **campground**, Darrington"* on a crag literally named
      **"Campground"** 2,015 km away, and *"Bathtub **Lakes basin**, east of Mount Pilchuck"* on a
      **"Lakes Basin"** region 469 km away — a camp whose own name says it belongs here. A generic
      word is a FEATURE TYPE, not a proper noun; the same lesson `solve-camps.mjs` records from the
      other direction. Ask the CATALOG which peaks carry a camp instead of asking the name.
    - Every one of the 8 survives on its home peak — a split, not a deletion — under the same
      declared-state contract the Goat Rocks fix uses: the exact 8 names and each row's resulting
      count are declared, and the run **refuses** if any row has moved. Confirmed on screen,
      **29 assertions across 4 routes, both directions**.
    - **THE ON-SCREEN PROBE WAS SLICING THE PANEL WITH THE WRONG ANCHOR, and Goat Rocks had the
      same bug latently.** The panel's own intro prose ends *"...is also a pin under ROUTE
      TRACK."*, so a **stripped-text** end anchor terminates the slice INSIDE the panel — 667
      chars, before a single camp renders. It only fires on a route that HAS a campsite waypoint,
      which is why Goat Rocks passed. Match the heading in **raw html** as `>ROUTE TRACK<`; this is
      `check:track-caveat`'s recorded two-surfaces trap arriving from the other side.
  - **THE DIAGNOSIS ABOVE IS HALF WRONG, AND THE CORRECTION MATTERS MORE THAN THE ORIGINAL.** The
    entry blames the peak-NAME requirement. Measured per camp on Pilchuck, that is not what
    dominates: **six of the seven foreign camps are at or BELOW Pilchuck's own summit**, so the
    **elevation dial** — *the camp is >500 ft above the route's high point* — is what excludes them.
    Tin Can Gap geocodes fine and sits 14.1 km away; it is passed over at **+276 ft**. Give the
    audit perfect coordinates for all seven and it still reports one. *A stated cause that has never
    been measured is a hypothesis*, and this one sent a session widening the wrong gate.
  - **A COORDINATE-BASED DETECTOR WAS BUILT, MEASURED AND NOT SHIPPED**, and the negative result is
    the useful part. Geocoding the camp NAME removes the peak requirement entirely: **419 of 646
    distinct names resolve, covering 3,180 of 5,060 pairs (63%)** against this audit's **314 (6.2%)**
    — a ten-fold widening of reach that produced **no new confirmed defect the reading did not**.
    Four gates make a geocode usable: the name resolves; **exactly one** feature of it exists in WA
    (the box the elevation solver uses is the wrong instrument here, since a genuinely foreign camp
    lies outside it and would simply not be found — uniqueness is what replaces it); not a linear
    feature; and **the DEM under the coordinate agrees with the elevation the row already stores**,
    which is an independent record neither the name nor the gazetteer produced. Agreement is
    striking where it holds — Three Fingers Lookout 6,854 ft stored against 6,850.8 measured, Bedal
    Campground 1,246 against 1,246.2.
    - **THE PER-ROUTE VERSION IS BIASED AND MUST NOT BE REBUILT.** Asking *"is this route's whole
      camp list centred somewhere else?"* looks strictly better than asking about one pair, and it
      is unusable: **the geocodable subset is not a random sample of the list.** The names that fail
      to resolve are the descriptive, multi-place, zone-y ones — *"Snowgrass Flat area backcountry
      camps"*, *"Conrad Meadows and Surprise Lake"* — which are exactly what a zone file
      contributes. Mount St. Helens resolved 3 of 7 camps, and they were its two CORRECT ones plus
      one foreign, so its median read a healthy **7.1 km while five of its seven camps were 60 km
      away**. Every per-route aggregate over that subset errs toward *looking fine*, which is the
      false-pass direction. Raising the coverage requirement does not fix it — it selects for
      well-named lists, which are the least likely to be zone files.
    - **The `Number(null) === 0` trap cost 83% of the first run**, and it is the one
      `audit:map-pins` records from a 12,215 km finding. `isFinite(Number(null))` is **true**, so a
      route whose `high_point_ft` is NULL reads as a 0 ft summit and every camp on earth is "above"
      it: 23 findings became **4** once null was tested for separately, and three of the top five
      were `wa_mount_index_northeast_buttress` on a fabricated +1000/+880/+2420 ft.
    - **Prose corroboration is real here, and only the BASE RATE proves it.** All 30 spread-rule
      candidates came back prose-silent, which is the shape of a vacuous test — but measured across
      every pair on a route with ≥600 characters of prose, **51.4% of camps ARE named by their own
      route** (4,938 pairs). So silence is not the norm and 30/30 is a signal. *A pattern among
      findings is not evidence until it is compared against the rows that pass.*
    - Traverses are excluded **structurally**: a traverse is a line and its area carries one
      coordinate, so every camp along it reads as distant. 3 of 33 candidates were this.
  - **ONE DEFECT WAS FOUND AND REPAIRED, BY READING RATHER THAN BY ANY RULE
    (`fix-goat-rocks-st-helens-camp-split.mjs`).** An identical 7-entry list sat on **seven routes
    across four areas** — Mount St. Helens, and the Goat Rocks peaks Old Snowy, Ives and Gilbert.
    Five entries are Goat Rocks places and two are St. Helens places, so the contamination ran
    **both ways**: St. Helens was told to camp 59-66 km east over the Cascade crest, and the three
    Goat Rocks peaks were told to camp at the two St. Helens climbers' trailheads 69 km west.
    - **Decidable because it is two-way.** Every assignment was measured against BOTH anchors, so
      neither range is privileged: the separation is **8x to 25x** and nothing is near the line.
      Independent confirmation arrived from the catalog itself — Ives Peak's route is named
      *"Northeast Slopes / Goat Rocks crest"*.
    - **`"Dana Yelverton Shelter site"` was deliberately NOT moved.** It is in no gazetteer under
      any spelling tried, so it cannot be placed, and **a repair may remove what is proven foreign
      and nothing else** — assigning it from the balance of the list is the zone-file reasoning the
      repair exists to undo. It stays on all seven routes and the script says so.
    - Neither range is left empty: St. Helens keeps 3, each Goat Rocks peak keeps 5.
- **`audit:camp-elevations`** asks whether the camp elevations **already on screen** are right.
  3,821 bivy sites carry one, almost all written by enrichment, and nothing had ever checked them.
  `audit:waypoint-elevations` asks this of the waypoint store; the bivy store is 11x larger, feeds
  the same panel, and had never been asked. **A blank says "unknown" honestly; a wrong number says
  something false on a screen a climber plans a night out from.** Read-only, report-only, anon key
  — **not** a build gate (it reads the DB and the gazetteer).
  - **THE RESULT IS A NEGATIVE ONE AND THAT IS THE POINT: 168 of 170 agree within 400 ft (99%).**
    The enrichment's camp elevations are sound. Of the two that did not, **one was the audit's own
    wrong-feature match** and one was real.
  - **The real one is a recognisable failure: the TRAILHEAD's height written into the camp's
    field.** "Hardscrabble Horse Camp, Middle Fork Snoqualmie" stored **1,400 ft on 21 rows**; the
    DEM at its OSM coordinate reads **2,828**, and a published description of the walk gives the
    trailhead at 1,400 then ~1,400 ft of gain to the camp. Two methods agreeing to ~28 ft, and
    1,400 is exactly the number the second one names as the START. Fixed by
    `fix-hardscrabble-camp-elevation.mjs`, which declares the expected current value and refuses
    if the row no longer holds it.
  - **A ONE-WORD QUERY IS NOT AN IDENTITY, and that produced the false one.** Stripping `basin`
    from *"Bedal Basin, below the north side of Bedal Peak"* left **"Bedal"**, which matched a
    **hamlet** on the Mountain Loop Highway — 3,796 ft below the basin, and reported as the worst
    finding in the run. Settlements are named after the landforms beside them. The leading-noun
    path already required two words; the tail-strip path did not.
  - **Section 1 needs no gazetteer, so it covers ALL 3,821 sites — and its number is a READING
    LIST, not a defect count.** 19 camps sit above their route's own high point, and reading them
    with the area name attached shows **most are correct**: a traverse camp on a neighbouring
    higher summit ("South Twin Sister summit bivies" serves four lower Sisters), or an over-broad
    zone assignment (`wa_ellation`, 5,000 ft, carried Ruth Mountain's 7,100 ft summit camp from
    7 km away — since removed, though its four other Ruth-area camps correctly remain). Neither is
    a wrong elevation. The script says so in its own output, because
    *when an audit reports a number, ask what it is the number OF.*
  - **The name-matching gates are IMPORTED from `scripts/lib/camp-names.mjs`**, the same module
    `solve-camp-elevations.mjs` writes through. A solver and an audit that disagree about "the
    same place" would either bless the solver's mistakes or report correct work as broken — the
    four-grade-parsers shape, and the three-waypoint-audits-with-different-tolerances shape.
  - **A STRUCTURE NOUN THE MATCHED FEATURE LACKS MEANS A DIFFERENT PLACE STANDING NEAR IT.**
    *"Blue Lake trailhead roadside parking"* is the pullout on SR-20 at ~5,200 ft; the gazetteer
    matches **Blue Lake**, up the trail at 6,264 ft. Two of the first three findings were this.
    The rule already existed in this repo — the saddle solver records *"test the OBJECT"* — and
    had simply never been carried across. `trailhead`, `parking`, `junction`, `crossing`, `ford`
    and the rest now sit in `SUBFEATURE` beside `saddle` and `moraine`.
  - Fails **closed** four ways: a failed read, zero routes, zero names attempted, and a gazetteer
    that places nothing are each reported as a broken scan rather than a clean catalog.
  - **The controls are the same four `probe-camp-elev-control.mjs` runs**, re-run after every
    change to the matching logic, because the expected output here — a plausible elevation — is
    exactly what a broken pipeline emits.

  - **THE GATE IS `campingGate()`, AND THE RULE IS "TRAD IS ALPINE WHEN IT CLIMBS A PEAK"** — a
    user decision, taken after the defect was measured rather than guessed at.
    `wa_mount_fury_east_direct_east_ridge` — 8,322 ft in the Picket Range, **9,500 ft of gain**,
    with Access Creek Basin and Luna Col recorded — is filed `trad`, which `catOf()` folds into the
    crag family, so its camping rendered **nowhere**: the `descent_text` shape, populated and on
    screen for nobody. It is **not** a slipped label — the same peak's 20-pitch North Buttress is
    `trad` too, so big alpine rock routes carry that discipline by convention here. **Discipline
    says what KIND of climbing; it does not say whether a party can be benighted**, which is the
    question this panel asks.
    - `campingGate(route)` = the five gated disciplines **OR** `climbsAPeak(route)`, which reads
      `areaType` — the same field name on the seed `MOUNTAINS` tree and on a DB route's `_dbArea`.
    - **`areaType` is the ONLY signal, deliberately.** A gain or pitch-count threshold is a
      heuristic that one more adjective defeats, and this file already records `area_type` being
      unreliable in **one** direction (Tiffany Mountain is typed a `crag` and its routes are a
      6-pitch 5.8, a 5-pitch arete and an ice couloir). That direction is the SAFE one: such a
      route keeps today's behaviour instead of gaining a panel it should not have.
    - **Measured before shipping, both ways**: it admits exactly the one route, and across a
      1,000-route crag-discipline sample **0%** sit on a peak-typed area — so it cannot leak
      camping onto roadside crags. Widening it is also inert where there is no data, since
      `CampingPanel` returns null with no sites.
    - **WIRING IT TURNED THREE EXISTING ASSERTIONS RED, AND THEY WERE RIGHT TO GO RED.** The
      fixture stamped `areaType:"peak"` on **every** probe route — harmless while the gate read
      only the discipline, and instantly vacuous once peak-ness mattered, because every "crag
      routes must not show camping" assertion was being made against a route the catalog calls a
      peak. The area type is a fixture **parameter** now. *A fixture that cannot express the
      distinction cannot test it* — the same shape as `check:token-boxes`' tick-list list id.
    - Section 11 pins the rule in **both** directions, because a rule that only ever ADMITS is
      indistinguishable from having no rule: trad on a peak renders, trad on a crag does not.
      Injection cases 9 and 10 are the pair (revert the gate; make `climbsAPeak` always true).
