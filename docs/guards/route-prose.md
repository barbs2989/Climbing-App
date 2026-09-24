# Route prose and catalog structure

What enrichment wrote and where it landed: approach scope, the climbing_route sweep, terrain suppression, hazard redundancy, pipeline voice and citations, area parents, aspect vs name, contaminated rows.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`audit:aspect-name`** asks whether a route's **name** points the same way as its `aspect`
  column. Both describe the same piece of mountain, so a disagreement means one is wrong —
  and which one is **not** decidable from the columns, which is why this is **report-only** and
  must stay so.
  - **`wa_little_annapurna_south_slopes` is the case that shaped it, and the first reported repair
    was BACKWARDS.** That report said "the aspect is wrong, set it to S". The aspect (N/NW) was
    correct, `face` agreed with it, the row's own "base of south slopes" waypoint sat **north** of
    the summit, and the peak's genuine south side is a different route out of a different valley.
    The **name** was the wrong half. Aspect drives the sun/shade readout, so applying that report
    would have turned a correctly-shady north slog into a sunny one. The output says so in as many
    words rather than implying a fix.
  - **The precision rule is the ridge/face split, and without it this audit is noise.** A **ridge**,
    arete, buttress or spur *separates two faces* — the North Ridge has an east side and a west
    side, so either is a legitimate aspect and a 90° disagreement there is **correct data**. Only an
    **opposed** ridge (180°) says something contradictory. A **face**, wall, slab, couloir or gully
    is a single plane, so 90° already *is* the contradiction. `FACE` is tested before `RIDGE`,
    because a name carrying both words ("Northeast Face Direct off the North Ridge") is describing a
    face reached from a ridge far more often than the reverse.
  - Two defects in the first draft, both found by the logic test and **neither visible by reading
    it**. The comparison was `d > limit`, which excludes *exactly* 90° — so a North Face with an
    east aspect, the commonest way this defect appears, fell through as clean; it is `>=` now, with
    the face limit at 90 and the ridge limit at 180. And direction matching was an unbounded
    substring test, so **"Weston Wall" matched "west"** — a report-only audit that manufactures
    findings is one people learn to ignore.
  - **The first real run reported 20 findings and SIX were the parser's fault** — 30%, and the
    precision was only measurable against live data. An apostrophe is a word boundary, so `\bs\b`
    matched the possessive in *Ford's Theatre*, *Marvin's Ear* and *Lover's Lane*, three names
    carrying no direction at all; the abbreviation branch is **case-sensitive against the original
    name** now, because a real route writes `NE Ridge` and a lone lowercase `s` never means south.
    And the word scan returned the first match in **list** order rather than the earliest by
    **position**, so *"South Ridge (North Peak)"* read as NORTH — route names routinely carry two
    directions and **lead with their own**. All six are pinned as regression cases.
    - Fixing the second one made `wa_chimney_rock_west_face` go from 90° to **180°**, i.e. more
      severe and correctly so: its name leads with *West Face* and its aspect is `E`. That is
      independent corroboration, by a different method, of the separate finding that this row is an
      **Idaho** route (Selkirk Crest) filed on a Washington peak.
      - **THAT SECOND FINDING WAS WRONG, and it is corrected here because acting on it would have
        destroyed a correct route.** The row's own approach names the Pete Lake Trailhead off FR
        4616, Pete Lake Trail #1323, the PCT, Chimney Creek, Sunrise Knob and the **Chimney
        Glacier** — Washington's Chimney Rock in the Alpine Lakes Wilderness. Idaho's Selkirk
        Chimney Rock has no glacier and no Pete Lake, and the catalog already holds a separate
        `id_chimney_rock` tree (16 routes), so nothing needed moving either. The recommended
        repair was a **deletion**. The real defect was the aspect, now fixed **E -> W**: name,
        approach and `climbing_route` all say west, and only `aspect` said east — the peak's two
        other routes are East Face lines, the likeliest source of the stray value. *"Corroborated
        by a second method" is worth nothing when both methods inherited the same unchecked
        premise*, and this one sat in three files for a week.
    - Measured after the fix: **14 findings against 502 comparable WA routes (2.8%)**, 11 of them
      faces. Judge a detector's precision on a real run before trusting a count — a first run here
      was 30% noise.
  - **THE ROW'S OWN PINS ARE A THIRD RECORD, and the audit now prints what they say.** Name vs
    aspect alone genuinely cannot be decided — that is why this is report-only — but a route's
    waypoints derive from neither, and they are exactly what settled
    `wa_little_annapurna_south_slopes`: its *"base of south slopes"* pin sat **north** of the
    summit. `face` is deliberately NOT used as evidence, because it and `aspect` come from the same
    enrichment and their agreeing is one claim counted twice.
    - **DISTANCE DECIDES WHETHER THE GEOMETRY MAY SPEAK AT ALL.** A pin at the base of the climb
      says which way the face points; a trailhead 11 km out says which way you WALK IN, and a party
      routinely approaches from one side and climbs another. Reading an approach bearing as an
      aspect would manufacture findings with total confidence — the exact failure this audit's
      first run already produced from a different cause. Only pins within a kilometre are quoted;
      the rest are counted and **explicitly refused**.
    - **THIS REPAIR WAS WRONG, AND BOTH HALVES OF ITS EVIDENCE FAILED DIFFERENTLY. READ THIS
      BEFORE TRUSTING ANY VOTE-COUNT ARGUMENT IN THIS FILE.** `wa_spire_point_southwest_face`
      stored `aspect: "E"`; it was changed to SW on **four claimed-independent records** — the
      route's own **name**; its **beta**; its **descent_text** (*"Descend the same southwest face
      line"*); and the **geometry**, where the *"Class 4 summit chimney"* pin bears **240°** from
      the Summit pin at 92 m, with Spire Col at 231 m and every approach pin WSW. Neither the
      count nor the geometry survives inspection.
      - **The geometry is not independent — it is the APPROACH BEARING.** Measured 2026-08-27:
        **four** pins bear *exactly* 240° from the summit — Downey Creek Trailhead (13,033 m),
        Itswoot Ridge camp (1,844 m), Spire Col (231 m) and the chimney (92 m). They lie on **one
        straight line** through the summit. Spire Col sits at exactly `0.921052631579` of the way
        from Itswoot camp to the chimney — its own mileage fraction, 13.75 between 12 and 13.9 —
        matching to 7e-15 of a degree; the chimney lies on the trailhead→summit line **0.09 m**
        off; and the 14-15 decimal tails on those pins have reduced denominators 7, 56 and 140,
        exactly those of 12/14, 13.75/14 and 13.9/14. The pins are **interpolated along the
        approach chord**, so their shared 240° is the bearing you walk in on. It says nothing
        about which way the face points.
      - **The beta was MISQUOTED.** It was cited as *"The south face is accessed from Spire Col at
        7,760 feet"* — which says **south**, not southwest — and the very next sentence of that
        same field reads *"traverses class 3 ledges on the **southeast** face"*. A field that
        contradicts the conclusion was counted as a vote for it.
      - **`pitch_detail` was never opened, and it says SOUTHEAST twice** (*"base of southeast face
        at 8,000 feet"*, *"Ledge traverse across southeast face"*). The honest tally inside the row
        is southwest 3 (name, descent_text, rope_note) against southeast 3 (beta once, pitch_detail
        twice), plus one bare "south" — **unsettled from the row alone**, which is precisely why
        the geometry got reached for.
      - Research (batch 59) finds the standard route climbs via the **Dana Glacier** — which this
        row's own `overview` places **east** — to the southeast ridge. So the stored `aspect: SW`
        and `face: "Southwest Face"` are reported **wrong**, and the row's `name` is wrong with
        them.
      - **The general rule: when a repair record enumerates N corroborating records, re-read every
        one.** A vote count is only as good as the reading behind it, and the field nobody opened
        is where the contradiction usually sits.
    - **The overview's "east" is about the DANA GLACIER, not the route**, which is the kind of
      thing a keyword scan over prose would have counted as a vote. Directions in prose have to be
      read for what they modify.
    - **`face` is corrected in the same write.** Fixing only the aspect would leave FACE / WHERE ON
      THE PEAK rendering *"East Face"* beside a southwest sun readout — one screen, two answers.
      Both replacement values come from the row itself; nothing is researched.
    - The applier **re-measures the geometry leg** rather than quoting it, and refuses if the
      chimney does not bear into the S/W half. **That safeguard cannot fire**, and the entry above
      says why: the chimney is interpolated onto the trailhead→summit line by construction, and the
      trailhead is south-west of the summit, so the test asks a question whose answer it computed
      itself. *A guard whose input is derived from the thing it checks is not a guard.*
      The original intent — that the argument still hold at apply time and not merely when it was
      written — is sound and needs a leg that is not computed from the pins. It reported 4 findings
      → 3, and the two the geometry refuses to speak on are untouched.
    - Measured on the four live findings, it refuses on **two of four** — closest pins 6.0 km and
      1.8 km out — and speaks on the other two. `wa_spire_point_southwest_face` becomes decidable:
      its name says SW, its aspect says E, and *Spire Col* sits **138 m WSW** of the summit pin. It
      is still not repaired here, because report-only is the rule and aspect drives the sun/shade
      readout; what changed is that the reader no longer has to go and derive the geometry
      themselves.
  - The DB half runs only when the file is **executed**, so `scripts/oneoff/verify-aspect-vs-name-logic.mjs`
    can import the real `judge`/`dirInName`/`landform` and pin them **without a database** — which is
    how both defects above were caught during an outage. It imports the functions rather than
    copying them; a mirrored copy would agree with the audit whatever the audit did.
  - Fails closed on an empty read: zero routes for a state is a broken scan, never a clean catalog.
**A climber's agreed correction must out-vote the enrichment — broken TWICE for real, and
claimed a third time by three separate sessions who were all wrong.** `_rapEdited` (rappels,
#787/#791) and `_rackEdited` (rack, #907) say the same sentence about a different column, and
each was found separately because *the failure never looks like a bug*: the column is
populated, the section renders, and a plausible value is on screen. Only the climber who made
the correction knows the screen is wrong, and they have no way to report it.
  - **`descentText` is NOT a third instance, and the story of how it kept looking like one is
    the most useful thing here.** `M` maps `descentText`→`descent`, so it reads as a textbook
    rename rivalry. But **after both merge paths** the writer runs fix-ups, and one of them is
    `if(o.descent!=null)o.descentText=o.descent;` — its own comment says *"Write both
    spellings; equal strings make the comparison moot."* So a real contribution leaves
    `route.descent === route.descentText` and `descentBeta` returns the correction whichever
    side it reads, **including under the plain length comparison that predates every change to
    it**. #897 made it prefer `descentText` and called that a fix; #915 made it prefer
    `descent` and called #897 "strictly worse"; `check:correction-readers` then shipped #915's
    direction as a *rule*. Three claims, two of them contradicting each other, **all derived
    from the `var M` line without reading the fix-ups below it**, and each validated by a
    fixture that set only one of the two properties — so each confirmed what its author
    already believed. **Read the whole writer before gating a reader**: look the form key up in
    `M` *and* check the fix-ups that run after both merges (`gainM`→`gainFt`, `lossM`→`lossFt`,
    `descent`→`descentText`, `rappels`→`_rappelsFromContrib`, `gReq`→`gearTiers.required`).
  - The two real ones failed **differently**, which is why finding one did not find the next.
    `rappelDetail` displayed **nothing**; `rack` was not discarded at all — the
    contribute form's `rack` key merges into **`gearTiers.required`**, which `routeRackFor` does
    not read, so the correction rendered in the GearTiers panel while the RACK box **kept
    showing the value it replaced**. One Overview tab asserting two different racks for one
    route, with nothing saying which is current, and the form still offering the superseded
    text as "current" to the next climber.
  - **The gate is load-bearing, not defensive**, and the rack case is the clearest example:
    `gearTiers.required` is populated by seed data and enrichment on routes nobody has touched,
    so preferring it unconditionally inverts the rule for the whole catalog. Proven rather than
    argued — dropping `_rackEdited` fails two controls in
    `scripts/oneoff/probe-rack-correction-reaches-the-rack-box.mjs`.
  - **Only rendering can settle these.** Every identifier is bound, every column is populated,
    and grep cannot tell "the correction reaches a screen" from "the correction reaches *the*
    screen it was made on". The rack probe finds the hosting sub-tab rather than assuming it,
    then slices the markup around the RACK heading — because the correction *was* on the tab,
    just not in the box, and a tab-wide match reports that as fixed. Same vacuous-pass shape as
    `check:bare` matching the Safety tab's "Fire & smoke" link.
  - **`check:correction-readers` now enforces the general rule**, in the build. It used to be
    `check:rappel-readers` and guarded only the first; `rack` was covered solely by a
    `scripts/oneoff/` probe that **nothing runs**, so a third instance would have shipped
    silently. See its own entry below.
- **`wa_true_grit` carried another route's prose entirely — FIXED, and the row was a MIX.** The row
  is filed at **Postal Wall, Frenchman Coulee** (a Vantage basalt sport crag, 47.025,-119.975) and
  stores `sport 5.10c, 0 pitches`; five of its text fields described *"a 5.8 trad rock line … on
  **Vesper Peak's north face**"*, 150 km away in the Cascades. **29 rows in the catalog are named
  "True Grit"** — the *a name is not an identity* root cause this file records for route ids,
  reaching a prose column instead of an id.
  - **The target row was identified rather than guessed**: `wa_true_grit_2` (Vesper Peak, alpine
    5.8, 5 pitches, beside Ragged Edge 5.7) is that climb, and already carried the same facts in
    far fuller form — a five-entry `pitch_detail`, its own rack, a 1,400-character approach. So
    this was a stray **duplicate to clear**, not prose to move.
  - **Its `hazards` is genuinely Frenchman Coulee** — *"Basalt columns fracture in dinner-plate
    style … rattlesnakes … raptor nesting closures"* — and was kept. **A contaminated row is not
    uniformly contaminated**; clear named fields, never blank the row.
  - **Two evidence gates, deliberately kept distinguishable.** Gate A: the field NAMES something
    only Vesper has (*Berdinka*, *Sunrise Mine*), and the Vesper row already says it, so clearing
    cannot destroy the only copy — that cleared `overview`, `beta`, `approach`. Gate A correctly
    **refused** `best_season` and `watch_out`, which describe alpine terrain but name no Vesper
    place. Gate B settled those from the **crag** rather than the row: of the **110 routes in the
    Frenchman Coulee subtree, `wa_true_grit` is the only one that records a season, the only one
    with an approach, and the only one whose text mentions alpine terrain**. Gate B is armed only
    once Gate A has already fired twice — *"unlike its siblings"* alone is far too weak, and would
    let a thinly-enriched crag condemn its one well-documented route.
  - **`season` = "Jun-Sep" is left UNRESOLVED and flagged**, not fixed. It is the only season in
    those 110 routes, so it is certainly anomalous — but Jun-Sep being wrong for a desert crag is
    knowledge about climbing rather than something the row proves, and replacing it would invent a
    value.
  - The sibling probe found its own vacuous zero on the way: `path=like.*` is invalid on an ltree
    column (**42883**), and the `cd.` version before it used a hand-typed path missing the
    intermediate `wa_frenchman_coulee_aka_vantage` segment — returning **200 with zero areas**,
    which reads as *"this crag has no siblings"* rather than *"the query is wrong"*. Derive a
    subtree path from a row that is in it, and fail closed on an empty result.
- **`audit:approach-scope`** finds routes whose `approach` keeps going past the base of the climb.
  Its summary line **used to give advice that would have made things worse**, and that is the part
  worth remembering: it said 254 findings "have NO pitch table, so that text has nowhere else to
  live today". True when written; the `climbing_route` backfill has since run, and the real figure
  is **15** — the other **239 already have it**. A 17x overstatement instructing whoever read it to
  re-home text that is already re-homed, producing a **third** copy. Same failure as
  `check:field-renders` telling an author to delete correct bookkeeping during an outage: an audit
  still asserting something it no longer has evidence for.
  - **The pass COPIED rather than MOVED.** CLAUDE.md specifies these batches as "re-home, never
    research", which means trimming the source — nothing ever checked, and mostly it did not.
    Two numbers, answering different questions, so do not quote one as the other: across all WA
    routes with both columns, **149 of 240 repeat an approach sentence inside `climbing_route`
    (303 sentences)**; among the routes this audit flags, **148 of 239**. Many are verbatim.
    - **An earlier run of this said 429 sentences and that number was wrong** — the probe's
      sentence splitter broke on abbreviations, counting *"a subsidiary rock knob (Pk. 8165)"* as
      two sentences. The audit's own splitter was always right, which is why both scopes agree at
      303. **A count is only as good as its tokeniser**; the same bug would have had a trim end an
      approach mid-sentence on an unclosed parenthesis, and it was caught by reading the batch
      rather than by any check.
  - **Confirmed ON SCREEN, not inferred from the columns.** `APPROACH` and `CLIMBING ROUTE` are
    both on the **Planner** tab, and the shared sentences print twice there — verified by rendering
    the real `RouteDetail` over three real rows. Two columns overlapping is a fact about a table;
    whether it is a defect is a question only rendering answers, which is the trap the rack
    correction and `descent_text` both record.
  - **Deliberately NOT swept, and do not bulk-trim `approach` against it.** Which copy is wrong is
    a per-sentence judgement: the pass also copied *genuine approach content* into `climbing_route`
    (`wa_mount_watson_scramble`), so for some rows the `climbing_route` copy is the wrong one. And
    at least one paraphrase **dropped an antecedent** — `wa_bryant_peak_southeast_slopes` reads
    "Ascend **the gully** favoring its far climber's-right side" in the approach against "Ascend
    favoring its far climber's-right side" in `climbing_route`. Same shape as
    `audit:trailhead-agreement`, but with **no third record** to settle it, so it needs reading in
    reviewed batches rather than a transform.
  - **The TAIL queue is exhausted (batches 1-2, PRs #1040 and this one): 14 routes trimmed, 142
    of 240 still duplicating.** The acceptance rule that emerged is checkable rather than a taste
    call — **accept a trim only when the cut sentence corresponds to a NAMED `climbing_route`
    section**. 14 of 62 candidates passed it. The rejections group into avalanche warnings,
    crevasse hazards, gear advice, summit-identification facts, and approach content wrongly
    copied INTO `climbing_route` — `wa_mix_up_peak_east_face`'s cut is explicitly about *"the
    upper APPROACH gullies"*, so a sweep would have deleted the correct record there.
  - **What remains cannot be done by that applier, structurally.** The 118 interior cases need a
    sentence excised from mid-paragraph, which strands the connectives around it — repairing one
    means **rewriting prose**, not deleting it. Truncation-only (`approach :=
    approach.slice(0, cut)`, asserted to be a prefix of the original) is what made the batches
    safe to run; it does not extend. Do not point the applier at the remainder.
  - Per-row output is now the **action** rather than a fact (`TRIM the approach` / `MOVE` / `read
    before touching`). Injection cases are a **pair** on purpose: `--inject=dup` copies a sentence
    in and the count must rise, `--inject=nodup` replaces `climbing_route` with unrelated prose and
    it must fall to zero — `dup` alone would be passed by a detector that called everything a
    duplicate. The two pre-existing cases (`clean`, `dirty`) still behave.
- **A MEASURED NON-FINDING BESIDE IT, AND IT OVERTURNED THE IMPRESSION THAT PROMPTED IT: the
  `approach` prose does NOT restate the `approach_variants` panel.** Both render on the Plan tab
  one under the other, and this audit measures `approach` against `climbing_route`, so that pair
  had never been asked about. Reading a CI `ui-screens` capture of `wa_mount_stuart_north_ridge`,
  the two sections plainly cover the same walk-in at length and it was reported as duplication
  worth editing.
  - **`scripts/oneoff/measure-approach-vs-variants-overlap.mjs` says otherwise.** Across the **794**
    WA routes carrying both, the median overlap is **3%**, **649 sit below 20%**, and only **4**
    exceed 80%. The route the impression came from measures **2% — rank 461 of 797, with ZERO
    verbatim sentences.**
  - **What reads as duplication is the same FACTS in different words for different purposes** — the
    trailhead, the creek, the hours, the gain — because the variants panel is a per-option breakdown
    carrying its own hazards and base-finding while `approach` is a continuous narrative. They share
    almost no text. **An impression from one screen is not a measurement**, which is the same lesson
    this file records for every headline count that overstated its work.
  - **The tail is not a defect list either.** The four above 80% are a SHORT `approach` (100-203
    characters) fully contained in a long panel — which is a summary as readily as a redundancy, and
    which it is cannot be read off a number. 31 routes repeat a sentence verbatim, and the examples
    are utility lines (*"Allow 1-2 hours car-to-base."*, *"No Northwest Forest Pass is required on
    the highway shoulder."*) that are reasonable to state in both places.
  - Report only, and the number is deliberately **not** written down here beyond this paragraph:
    re-run the script rather than quoting it, the rule this file states wherever a count has gone
    stale under its own reading.
- **AND A ROUTE CAN DESCRIBE ONE APPROACH TWICE AND NAME A DIFFERENT PASS EACH TIME.**
  `audit:approach-scope` asks whether the `approach` text runs PAST the base of the climb; it
  cannot see the `approach_variants` panel contradicting that same text. `wa_mount_stuart_north_ridge`
  — the route `check:ui` pins as its sample — rendered both on one Plan tab: the variants panel
  said *"South side — Esmeralda TH over **Ingalls Pass** and Goat Pass"* while the `approach`
  prose a screen away said *"over **Longs Pass** and up Ingalls Creek to Goat Pass"*.
  - **THAT THEY ARE ONE APPROACH RATHER THAN TWO OPTIONS NEEDS NO CLIMBING KNOWLEDGE**, which is
    what makes this decidable at all: the variant states `distMi 9 / gainFt 4800 / hours 8` and the
    prose states *"~9 miles, ~4,800 ft gain, ~8 hours"*. **Two genuinely different ways in do not
    agree on all three figures.** Without that the page could simply be offering a choice, which is
    what a variants panel is FOR, and there would be nothing to repair.
  - **COUNT FIELDS, NOT MENTIONS.** Longs Pass appears in **five independent records** — a
    waypoint pin NAMED "Longs Pass" (6,300 ft, distMi 3.5, with Goat Pass next at 5.0 and **no pin
    anywhere for Ingalls Pass or Ingalls Lake**), the `approach` sentence, `descent_text` twice,
    the `itinerary` schedule, and `bivy[2].notes`. Ingalls Pass appears in **one**: the variant's
    own `name` and `notes`, which is one claim written twice.
  - A sixth record agrees and it is **arithmetic rather than prose**: the variant's own hazard list
    says *"~2,000 ft of descent on the way in"*, and a line from its Longs Pass pin (6,300) to its
    Goat Pass pin (7,600) only GAINS. A 2,000 ft drop only makes sense falling off Longs Pass to
    Ingalls Creek and climbing back — which is what the `approach` sentence describes, and what the
    Ingalls Pass line (past Ingalls Lake at ~6,460, then contouring) does not.
  - **A CLASS OF ONE, MEASURED BEFORE THE REPAIR.** Across the **872** routes carrying
    `approach_variants`, **293** variants name a pass and **3** name one the row contradicts.
    Reading them leaves one: `wa_cascade_peak_east_ridge` names Cache Col while pinning Cascade
    Pass — two real places on one route; and `wa_mount_ann_scramble` names Maple Pass inside
    *"NOTE ON THE NAME: this is the Lake Ann below Artist Point on SR-542, **not** the Lake Ann near
    Maple Pass"* — **correct work**, flagged because *a negation is not a claim*, the trap this file
    already records for road prose. **A detector for a class of one is the thing this repo keeps
    refusing to build.**
  - **THE FIRST RUN OF THAT MEASUREMENT REPORTED 13 AND TWELVE WERE MY OWN TOKENISER.** A greedy
    two-word capture reads *"From Cascade Pass"* as a different place from the pinned *"Cascade
    Pass"*. Stripping a leading preposition or article took it 13 → 3. **A count is only as good as
    its tokeniser**, for the third time in this file.
  - Repaired by `scripts/oneoff/fix-stuart-southern-approach-names-the-wrong-pass.mjs`. **Nothing is
    typed**: the replacement phrase is lifted verbatim from the row's own `approach` field and the
    pass name from its own waypoint, and the Ingalls-specific clause is REMOVED rather than
    rewritten — the rest of the paragraph is common to either way in and is kept byte-for-byte. The
    gate re-asserts all of the evidence at apply time, **including that the three figures still
    agree**, so a row that has since been re-researched into two genuinely different approaches is
    refused rather than written over.
- **`audit:hazard-redundancy` reports a WORKING FEATURE, and its old wording read as a defect
  list.** It printed *"routes repeating at least one hazard: 661"* and *"repeated lines removed:
  1,281"*, which invites a sweep. There is nothing to sweep: `mergeHazards` runs at **render**
  time — `RouteDetail` calls `mergeHazards(route.hazards, _objHaz, route.watchOut)` — and drops
  any line whose token set is a subset of one already kept. **Every line it counts is one the
  merge already removes, and none of it reaches a climber twice.** Verified end to end
  2026-08-20 rather than assumed: all three columns really are passed, and the KNOWN HAZARDS box
  really is the caller. The summary now says the numbers are deduped at render, not defects.
  - Only **101 of the 1,281** are character-for-character; the rest are token-subset near
    duplicates, which is what makes the merge worth having rather than a plain `Set`.
  - **This is the THIRD audit here whose number reads like a backlog and is not**, after
    `audit:terrain` (which measures suppression the app performs) and `audit:waypoint-order`
    (whose "0" was true only of the routes it could order). *When an audit reports a number, ask
    what it is the number OF before treating it as work.*
- **`audit:terrain`** measures the app's own **suppression** — how many routes `lib/terrain.js`
  withholds glacier/avalanche advice from because they do not cross that terrain. Read the number
  as a working feature, not a backlog: driving it to zero means handing every dry rock climb a
  crevasse kit again. The question it does **not** ask is whether a suppression is *correct*, and
  the two directions are not symmetric — the file's own header says wrongly dropping a crevasse
  warning is dangerous while wrongly keeping one is merely noise.
  - **The only way to suppress wrongly is evidence in a column `corpus()` does not read**, since a
    glacier line is dropped only when `GLACIER_RE` finds nothing in it. That made the blind-column
    set the whole attack surface, and it was two long: **`climbing_route`** (migration `0122`,
    created to re-home climbing prose OUT of `approach` — which corpus() *does* read) and
    **`approach_variants`**. So every route the enrichment touched moved its snow and glacier
    sentences into a column the classifier could not see. **9 WA routes were live**, suppressing
    advice while their own screens said *"Residual avalanche snow at the base"* and *"Colchuck
    Glacier moraine"*. Nothing reported it and nothing could — populated column, rendered screen,
    every coverage check green. Fixed; 10 verdicts moved, **all** toward keeping advice, none the
    other way, and the restored line was proven **on screen** rather than in the verdict.
  - **The obvious general fix is measurably WRONG and must not be re-derived.** Inverting corpus()
    to read everything except a deny-list would make **112 of 296** WA alpine routes gain a new
    signal — worst offender **`seasonal_hazards`, the column holding the "avalanche: N/A"
    declaration itself**. Reading it as prose makes every row declaring avalanche *absent* read as
    *present*, disabling the mechanism it belongs to. The allow-list stays.
  - `approach_variants` is read **by key** (`name`, `notes`, `hazards`, `baseFinding`), never
    flattened, because it carries a `season` key — flattening re-imports the Highway 20 mistake
    under a new name. `CORPUS_COLUMNS` is exported as the single source of truth and the camelCase
    spelling is **derived**, so a column added to it cannot be half-wired.
  - **The blind-column scan is what stops the third instance**, because a comment saying "add new
    prose columns to CORPUS_COLUMNS" would rot exactly as the last one did. It samples full rows,
    finds every column outside the classifier carrying glacier/snow prose, and demands a reason in
    `NOT_TERRAIN_EVIDENCE`. The declaration is demanded **late** — only once a column is both
    populated *and* carrying a terrain word, i.e. exactly when it could change a verdict — so the
    list stays at the 23 that matter rather than all 94 on the table. A **stale** entry fails too.
    Injection-tested 4/4, each proving its edit landed by checksum; case 3 removes `approach` from
    `CORPUS_COLUMNS` and requires it to surface, so the scan is shown to see the general defect
    rather than only this one.
  - Read-only; **not a build gate** (it reads the DB), same reasoning as `check:counts`.
- **The `climbing_route` sweep** is a pipeline, not a single script, and the three parts are
  separate on purpose. `audit:approach-scope` REPORTS (for a human to read);
  `enrich:next-batch` emits a WORKLIST (for a batch to consume); `enrich:apply` WRITES. Keeping
  them apart stops the audit growing flags only a pipeline cares about.
  - The problem it exists for: `approach` is meant to describe the walk in, but a route with no
    pitch table had nowhere else to put a description of the climbing, so that description went
    into the approach and the prose runs past the base and keeps going to the summit. 360 WA
    routes carry it; 254 had no pitch table. Migration 0122's `climbing_route` is where it goes.
  - Batches are produced by **re-homing, never researching** — every fact must already be in
    that route's own `approach`. That instruction is worth nothing unless something checks it,
    so **`check:enrichment-traceable`** verifies that every number and every load-bearing
    feature/direction word in a segment also appears in the source. Prose may be rewritten
    freely; specifics may not be invented. Run it on a batch BEFORE `enrich:apply`.
  - It took two rounds to make that guard right, and both are the same lesson. It first flagged
    "Traverse to the summit gully" as untraceable where the source said "travers**ing** higher"
    — a guard that flags correct work teaches people to ignore it. The fix (stem both sides)
    still failed because the stemmer never stripped a trailing `e`, so "traverse" and
    "traversing" never met. Over-stemming is safe here: the same function runs on both sides.
  - Injection-tested: adding *"Rappel 45 m from a bolted anchor on the cornice above the
    chimney"* to a Buckner segment is caught on the number, "cornice" and "chimney" — and
    correctly does NOT flag "rappel", which that route's approach really does mention.
  - **An empty result is a real result.** Eldorado's Northwest Couloir gets zero segments
    because its approach stops at the couloir base; Mount Anderson gets two despite `pitches:7`
    because the text stops at Flypaper Pass. Those routes stay on the candidate list. They are a
    gap in the data, and leaving the gap visible beats filling it from imagination.
  - `enrich:apply` is the single write path and must stay so: it asserts each route's `area_id`
    before writing (only ~9% of route ids are peak-scoped, so a name-shaped id proves nothing),
    writes through `patchRow`, then **re-reads and reconciles**. Its verification builds the
    check list from what was actually written — an earlier version omitted `climbing_route`, so
    a route setting only that column satisfied every remaining clause vacuously and printed
    "verified" having confirmed nothing.
  - A populated column is not a rendered one. `CLIMBING ROUTE` and `ROUTE BREAKDOWN` are mutually
    exclusive through `isPitched()`; both halves have been confirmed on screen, and the bivy
    section was found **defined and mounted nowhere** after a merge kept main's copy of the
    dense line its mount lived on.
- **`audit:area-parents`** asks whether each area is filed under the place it belongs to —
  the question `check:counts` cannot reach. `route_count` is verified against the subtree an
  area *has*, so it is exactly correct about a **wrong tree**; the ltree paths were
  self-consistent too. The Liberty Bell Group is one ridge of five towers and three of them
  (Lexington Tower, North Early Winters Spire, South Early Winters Spire — 23 routes) were
  parented as the group's **siblings**, so it advertised 27 routes against a true 50 and the
  best-known lines at Washington Pass rendered outside the formation every guidebook files
  them under. Kangaroo Ridge (`route_count` 0, holding two empty stubs while all five
  populated formations sat outside) and "Silver Star and Wine spires" (containing neither
  Silver Star nor three of the four Wine Spires) had the identical defect. `0106` repaired
  all three.
  - **The mechanism will recur on any import.** Two loads that were never joined: an
    OpenBeta-derived crag tree supplied the grouping rows plus hollow `crag` stubs, and a
    separate alpine peak list attached every real summit **flat** to the region above. The
    fingerprint is a 0-route stub sitting metres from a populated peak of the same name —
    `wa_north_early_winter_spire` was **8 m** from `wa_north_early_winters_spire`.
  - **Report-only, like `audit:identity`** — not a pass/fail gate, and the exit code says
    "things to look at", never "these are bugs". Earned: D1's first draft flagged 41
    candidates of which 12 were real. Coordinates cannot decide parentage in crag terrain
    (at the Icicle boulders every formation is within 500 m of every other) and generic
    tokens like "dome"/"face"/"buttress" match across unrelated crags. **Confirm each hit
    against the group's own name before moving anything.**
  - Read-only, anon key, fails closed on an empty read — zero areas makes every tree look
    perfect, so the realistic failure mode is a false pass.
  - Injection-tested, and **three separate defects each made all four injections report a
    clean tree** — none visible by reading the detector. The index was built before
    injection (so a "moved" peak stayed in its frozen child list); victims were drawn from
    the whole 47k-row catalog (so `--inject=path` perturbed an *Alaska* row while the scope
    is WA); and scope from a single source hid one fault each way — by `parent_id` an orphan
    has already left the walk, by `path` a rewritten path no longer says `washington`, so
    scope is now the **union of both**. The tell every time: the injection logged, the
    counter did not move.
  - **Six detectors now, and they are not the same kind of claim** — the summary says so per
    detector rather than labelling everything a candidate. D1/D2/D4 are hypotheses; D3/D6 are
    exact defects; D5 is exact about a *declaration*, not about the tree.
  - **D4 — a container whose ONLY child carries the identical name**, i.e. a level that says
    nothing: the browser shows "Last Unicorn, The", then "Last Unicorn, The", then two boulder
    problems. Exact, no route counts involved — 12 hits catalog-wide, 1 in WA, all 12 a
    `region` whose lone child is a same-named `crag`. Matched on the **raw** name, so a
    singular child inside a plural parent ("Aries Boulder" in "Aries Boulders" — one boulder in
    a named cluster) is correctly ignored; `--inject=twinplural` pins that.
    - **Reported, never repaired, and the repair is genuinely awkward rather than merely
      risky:** `routes_require_leaf` refuses to move the routes up while the child still
      exists, and the FK refuses to drop the child while routes point at it. It needs a
      deferred constraint or two transactions.
    - **D4's FIRST version, shipped in #820, was vacuous, and the reason generalises.** It
      looked for a same-named parent/child pair where *both* held routes and reported 3 WA hits
      that all looked real. Every one was false and the test could never have found a true one:
      `route_count` is a **subtree aggregate**, so the parent's count came entirely from the
      child (all 3 WA parents, and all 58 catalog-wide, held **zero** direct routes); and
      `trg_areas_leaf_xor` means **0 of 47,590** areas hold child areas and direct routes at
      once, so "both halves populated" cannot exist. A same-named container/leaf pair is the
      *correct* way to say "this crag has its own problems and also contains other boulders" —
      `wa_fuzz_wall` holds Span Man and Haunted Shack beside `wa_fuzz_wall_2`. **Ask what a
      detector cannot report, not only what it does**, and never read a subtree aggregate as
      evidence about a row.
  - **D5 — region-level children against `scripts/wa-region-shape.json`**, the only detector
    that consults anything outside the DB, and the only one that can see the `0118` class: MP
    groups a scatter of small crags under a container, our import drops them flat, and
    Olympics ended up with **18 direct children against MP's 10**. No stub, no duplicate,
    nothing co-located — every geometric detector is structurally blind to it.
    - It is an **allow-list keyed on our own names**, not a snapshot equality test. Each
      region-level child must be declared either as corresponding to an MP area (`mp`) or as a
      deliberate divergence **with a reason** (`extra`). So a legitimate restructure is
      recorded in the same commit, instead of fighting a diff that fires on every change —
      which is how a snapshot baseline ends up regenerated blindly until it asserts nothing.
    - It fails on a **stale** entry too: a declared name that is no longer a child means the
      file describes a tree that has moved on. Same rule as `check:field-renders`' `KNOWN` map.
    - Route counts are deliberately **not** recorded — they move whenever anyone adds a climb
      on either side, so pinning them would guarantee a stale file. Names are the durable claim.
    - WA only, and it **says it skipped** for any other scope rather than passing silently.
      `--inject=shapeblind` covers the fail-closed case: if no declaration matches any live
      child, it reports that the reference is not describing this tree.
  - **Three further detectors were written, measured, and deliberately not shipped** — the
    reasons are recorded at the bottom of the script so nobody re-derives them. Sibling name
    containment (the `0119` shape) gave 8 WA hits and **0 real**: "Central Olympic Mountains"
    vs "North-Central Olympic Mountains", "Chelan" vs "Sawtooth / Lake Chelan" and "West Face"
    vs "North West Face" are all correct, so legitimate sibling naming is not separable from
    the defect by name alone. Flat-leaves-beside-containers (the Olympics shape) gave 29 and
    **0 real** — North Cascades Core, Washington Pass and Snoqualmie Pass Area are all
    deliberate, which is exactly why D5 has to consult an external reference. Identical
    sibling names gave **0 catalog-wide**, i.e. dead code. *Measure a detector's precision
    before shipping it, not after.*
- **PROSE WRITTEN FOR THE PIPELINE IS A DIFFERENT CLASS FROM A CITATION, and every
  publisher-keyed needle misses it.** `audit:prose-citations` finds a sentence NAMING a third
  party. It cannot see a sentence about **our own record** that names nobody —
  `measure-pipeline-voice-in-route-prose.mjs` asks that question of the same columns, and
  `audit:note-voice` already asks it of waypoint NOTES while nothing asked it of route prose.
  **13 values on 12 routes**, now 1.
  - **The worst was an editor talking to the next editor, shipped to a climber**:
    *"the claim that these bolts were 'replaced in 2001' is not supported by any source specific to
    this Washington peak and should not be presented as fact"*. A climber learns nothing from it and
    is told the app does not trust itself. The claim it argues with **is not in the app at all**.
  - **THE REPAIR RULE IS "KEEP THE FACT AND KEEP THE UNCERTAINTY, DROP ONLY THE SOURCING."** A hedge
    is CONTENT — *"the lengths are estimated"* warns a party not to rig to them — so *"Trip reports
    vary 3-5 rappels"* becomes **"Expect 3-5 rappels"**, never *"4 rappels"*. Deleting the hedge
    would make the record read as MORE certain than it is, which is worse than the leak.
  - **THE OBJECT DECIDES, NOT THE PHRASE.** *"should not be treated as a casual scramble"* and
    *"should not be treated as guaranteed snow-free"* are advice about the MOUNTAIN and are correct;
    only an object naming the record (*as fact*, *as verified*, *as a repeated line*) is pipeline
    voice. Requiring the object took that needle from **1 real of 3** to 2 of 2.
  - **THE FIRST NEEDLE MANUFACTURED 27 FINDINGS ON CORRECT PROSE.** `(this|the) (record|entry|…)`
    matches **"the entry gully"** and **"the entry hourglass"** — ordinary climbing terms. 42 → 13
    once `entry` came out. The report now prints the **matched substring**, because a needle that
    cannot show its own match is one nobody can audit.
  - **THE EXACTLY-ONCE CONTRACT CAUGHT A PARALLEL SESSION MID-FLIGHT.** `wa_remmel_mountain_nw_ridge`
    `pro_needs` was in the batch; another session landed the same repair while this was being
    written, `find` matched **0 times**, and the run REFUSED rather than clobbering it. That is the
    contract earning its place, not a near miss.
  - **One value is deliberately left**: `wa_nooksack_tower_south_face` carries this defect AND a
    named guidebook, which is what the open guidebook-citation batch is sweeping. *Two sessions
    rewriting one value is how a merge silently drops half of it.*
  - **`rope_note` AND THE RACK COLUMNS ARE A PARALLEL SESSION'S** (#1431,
    `revoice-pipeline-notes-in-rope-note.mjs`), so the two sweeps are complementary rather than
    rival: this one covers the other eight columns. Their needle and this one also miss different
    shapes — *"No indexed route-specific gear list found online"* matches nothing here, because
    `gear list` is not `source|record|reference`. **Neither sweep closes the class**; between them
    they close what each could see.
  - Confirmed on screen, **14 assertions across 4 routes, both directions** — and the KEEPS are the
    load-bearing half here, since a rewrite that quietly dropped a hedge satisfies every removal
    assertion.
- **`audit:prose-citations`** asks whether the prose that renders on a route page still names a
  third party as the **source** of a claim. The standing rule is no sources anywhere in the app;
  `check:no-rendered-sources` enforces it for app *fields* and is structurally blind to this,
  because these citations are free prose inside jsonb columns — every identifier is bound, the
  column is populated, the section renders. Only reading the value finds them.
  - The class had been measured once for `waypoints[].note` and **nobody had ever looked at
    `road.*` / `access.*`** — the same defect in different columns, which is the shape this repo
    keeps repeating (four grade parsers, two `climb_logs` hydrations, three waypoint audits). That
    sweep found **33 values on 32 WA routes**, all repaired — the ROAD/ACCESS section reports **3**
    today, and those three are hedges (*"not documented in any source found"*), not attributions.
    - **DO NOT READ THAT AS "THE AUDIT REPORTS 0".** It never has for the catalog as a whole: it
      reported **611 values on 396 routes** on 2026-08-26 and **476** after the sweeps below,
      nearly all in `rappel_count_note`, `rappel_detail` and `beta`. The road/access sweep closed
      road/access; the ROUTE PROSE section is a standing reading list and always was. A per-section
      count is not the audit's verdict, and neither is a stale headline — **re-run it rather than
      quoting this line**, which has already been wrong once in a message to the user.
  - **IT COVERED TWO OF THE SIX RACK COLUMNS, AND THE OTHER FOUR ALL RENDER.** `PROSE_COLS` held
    `gear` and `what_to_bring` and stopped there, so **`sling_rack`, `detailed_rack`, `pro_needs`
    and `rope_note`** had never been opened — every one of them feeding the RACK box on the route
    page. Catalog-wide they carry **132 hits**, and `rope_note` alone has **63**, more than any
    column already on the list. Adding them took the WA ROUTE PROSE section from **365 values on
    272 routes to 481 on 352** — a third more than the audit could previously see.
    - **RENDERING is the bar, and it was proven rather than argued.** All four are in
      `check:field-renders`' `FIELDS` with **no `KNOWN` exemption**, and that guard fails a column
      reaching no screen. That is the same test `data_quality` fails in the other direction, which
      is why it stays out: it holds far more citations and renders nowhere, so it cannot break the
      rule and would bury the real findings.
    - **Found from the `sling_rack` end, and the recorded blocker there was WRONG.** CLAUDE.md said
      that column holds *"three incompatible stored shapes"*; measured, it is **two** — 221 objects
      and 21 arrays-of-object — and **0 of 242 render nothing**. The real blocker is narrower and
      still stands: `fmtSlingRack` returns `null` for a plain **string**, so a *contributed* text
      value would be invisible. That is a claim about the reader, not the data.
    - **The bigger finding on that column is what DOES render.** 84% of values are labelled
      **"Slings —"** while carrying cams, nuts, pickets and pitons — 162 objects have a `cams` key
      — and the bullet runs to **p50 85, p90 172, max 454** characters, e.g. *"Slings — cams: note:
      single rack, primary sizes, size: purple C3 to #3 BD, count: 1; …"*. A wrong label over a
      paragraph in a bullet: the `check:token-boxes` question one element over.
      **THE LABEL HALF IS FIXED AND THIS BULLET SAID OTHERWISE FOR LONGER THAN IT WAS TRUE** — it
      read *"NOT fixed here"* while `rackLines()` in `RouteDetail.jsx` had already replaced the one
      *"Slings —"* heading with a label per key, keeping "Slings" only for the ARRAY shape where it
      is genuinely a sling list. A stated gap that has since closed reads as work; that is the same
      staleness this file records against `audit:waypoint-order`'s own comment. **The LENGTH half
      was a separate question, and it is answered below** — splitting by key shortens each bullet,
      and the question was whether a single key's value can still be a paragraph.
      `scripts/oneoff/measure-sling-rack-shapes.mjs` and `…-onscreen-quality.mjs` measure both,
      lifting from source with `ANCHOR LOST` rather than copying — the second lifts `rackLines`,
      and the entry below is what that correction cost.
      - **RE-MEASURED 2026-09-09, AND THE INSTRUMENT WAS THE STALE HALF — it lifted a function the
        app no longer calls for the 84% majority, so it reported a FIXED defect as live.**
        `rackLines()` is the renderer and it calls `fmtSlingRack` **only for the ARRAY shape**,
        sending the object shape down the label-per-key branch; the script called `fmtSlingRack`
        directly on every value, so it kept printing a `"Slings —"` heading the app had stopped
        emitting, at a length it had stopped producing:

              lifting fmtSlingRack   p50 83   p90 171   max 396   over-120 23.1%   "Slings" 84.3%
              lifting rackLines      p50 26   p90  79   max 252   over-120  2.2%   "Slings" 74/590

        **So the LENGTH half was largely closed by the label fix and nothing had noticed** — 13
        bullets of 590 exceed 120 characters. The script lifts `rackLines` now, measures the
        BULLET rather than a string no screen shows, and self-tests the lift.
      - **Its "84.3% mislabelled" was the same fossil one level down, and my own first rewrite
        reproduced it at 48.** Two different things produce a `Slings` label: an **array**, where
        the heading covers the whole value, and an object with a `slings` **key**, where it covers
        that key alone with the cams in their own bullet beside it — correct, and the entire point
        of the split. Measured: **21 from the array shape** (matching the 21 arrays-of-object
        recorded above, which is independent corroboration the lift is right) and **53 from a key**.
        The old `NOT_SLINGS` list was **deleted rather than left unused**: with one bullet per key
        there is no heading covering foreign gear for it to test, so it could only ever return 0,
        and *a counter that cannot fire reads as coverage*.
      - **The 13 long bullets were not one class**, so there was nothing to sweep: 8 genuine long
        gear prose, 2 reading a nested object out loud (`Crevasse rescue kit — pulley: 1,
        prusiks: 2, purpose: …`), and **3 commentary rather than gear** — which is where the real
        finding was. `wa_rapple_grapple` **rendered** *"fresh **MP source** broadens this to 'pro
        to 4 inches' — retain the #1-3 structured list as primary, add one #4 as optional"* into a
        climber's RACK box: an editor instructing the next editor, over a citation
        `audit:prose-citations` could not see. See that audit's `MP` entry.
        - **PAST TENSE BECAUSE IT IS FIXED, and this bullet read as live work for as long as it
          was not.** #1680 replaced that value with *"Optionally one #4 to cover pro to 4 inches;
          no pitons needed"* — verified against the live row, not inferred from the PR title — and
          the citations entry records it. **13 → 12 there, and → 11 once the synonym widening
          below shortened `wa_washington_ellinor_traverse_ridge`'s 123-character webbing bullet.**
          A count quoted in prose is a hand-copy of a measurement: re-run
          `measure-sling-rack-onscreen-quality.mjs` rather than trusting the number here, which
          has now been stale twice in one day.
        - **AND "2 reading a nested object out loud" WAS ITSELF ONE, NOW ZERO — the nested-object
          question is CLOSED as a NON-FINDING, so do not re-derive it.** Measured across the whole
          column rather than off the long-bullet triage: **27 of 242 values hold a nested object
          and 26 of them render correctly**, because `fmtSlingVal` already knows the two
          conventions the enrichment writes — `{size,count}` becomes *"2× #0 C3 to 0.75 in; #1 to
          #3"* and `{length,purpose,quantity}` becomes *"4× 60cm (anchor building on ledges, tree
          slings)"*. **A RENDERER FIX WAS THEREFORE REFUSED**: the class is one, and widening
          `fmtSlingVal` to guess at arbitrary key sets would put 26 correct bullets at risk to
          repair a single row.
        - **The twenty-seventh was a DATA defect and is repaired**
          (`scripts/oneoff/fix-crevasse-kit-rack-shape.mjs`). `wa_mount_tom_scramble` stored a KIT
          of five components — `{pulley, prusiks, purpose, cordelette, locking_carabiners}` — which
          matches neither convention, so the generic branch recited its keys with a sentence wedged
          into the middle of a gear list. This file's own standing rule decides which half is
          wrong: *before writing a researched string into an existing column, look at where that
          column renders.* Reshaped to the string the other 26 use, **every token asserted present
          in the stored value** so nothing could be invented, under the declared-state contract —
          proven by re-running it, which now REFUSES with *"the row has moved since this was
          written"* rather than overwriting.
        - **`bullets reading out a raw key` is 1 → 0 across the column; the LENGTH is unchanged at
          11**, and conflating those two was a mistake this repair made in its own output. The
          bullet went **146 → 134** characters and is still over 120 — it simply joins the 8
          genuine-long-prose rows legitimately, reading as a gear list rather than a recital.
          Deliberately NOT shortened further: trimming *"crevasse rescue/"* would fit the 120 bar
          by deleting words the label already carries, which is fitting the data to the
          measurement's threshold.
        - **THE REPAIR'S OWN FIRST OUTPUT UNDER-REPORTED BY 22 CHARACTERS**, and it is the lesson
          this column already taught once. It printed **124 → 112** because it stringified `l.text`
          alone, dropping the `Crevasse rescue kit — ` label the climber reads; the measurement
          script composes `b.label + " — " + b.text` and is the standard to match. Two instruments
          disagreeing about one bullet is how a fixed defect reads as live, or a live one as fixed.
      - **THE SAME SCRIPT PRINTED `bullets reading out a raw key: 15` AND THE ENTRY ABOVE
        ACCOUNTED FOR 2, because it triaged the LONG bullets and these are SHORT.** *"Webbing —
        length: 60cm, purpose: tree-rap sling backup at the base, quantity: 2"* is 88 characters,
        so it clears every length threshold while reading out the pipeline's own key names — with
        the quantity **last**, when it is the first thing somebody packing wants. A number the
        instrument printed and nobody worked, which is [[a-stated-limitation-is-a-worklist]] one
        line down from where the reading stopped.
      - **IT IS THE SAME SHAPE UNDER A SECOND SPELLING, and the earlier fix's own allow-list is
        what hid it.** `fmtSlingVal` already had a branch for this, added when *"16 of 242 stored
        values"* read out `size: … count: …` — and it recognises **size/count/note**, while these
        15 store the identical fact as **length/quantity/purpose**. A deny-list beaten by one more
        spelling, the failure this file records for `check:outage`'s rule 2 four times over,
        arriving inside the fix for the very same class. The vocabulary is a list of synonyms now
        rather than four literal comparisons.
      - **A QUANTITY WITH NO SIZE was 5 of the 15 and could not fire at all**, because the branch
        opened `if(v.size!=null)`. Correct while the only known shape carried a size, and exactly
        what left *"Cordelette — purpose: …, quantity: 1"* on screen. With no size the count is the
        head — the label beside it supplies the noun, so *"Prusik cord — 2"* reads as two of them —
        and the existing rule that **a count of 1 adds nothing** had to be carried across, or those
        rows would have gained a bare `1`.
      - **Behaviour-diffed across every stored value rather than asserted**
        (`scripts/oneoff/verify-sling-rack-synonym-widening.mjs`): **590 bullets before and after,
        0 lost, 15 machine-shaped → 1**, with the old renderer loaded **from `origin/main` via
        `git show`** rather than retyped — a retyped reference agrees with itself whatever the app
        does, which is the whole question. Both lifts are self-tested against the array branch this
        change does not touch, so a broken lift cannot read as a clean diff.
      - **SECTION 2 EXISTS BECAUSE `fmtSlingVal` IS NOT THE RACK BOX'S — it is the app's generic
        leaf flattener**, and `objStr` sends arbitrary jsonb through it for the contribute form's
        CURRENT-VALUE line. Measured rather than assumed: **10 objects across `access`,
        `emergency` and `partner_requirements`** match the widened shape, every one a lone
        `{notes:…}` or `{length:…}`, and all 10 change in the same direction — losing a
        meaningless key prefix. The assertion is **content preservation** (every string the old
        rendering showed must still appear in the new one), not an eyeball, because that is what
        separates *dropped the `notes:` prefix* from *dropped the notes*.
      - **THE LAST ONE IS DELIBERATELY LEFT, AND SIZING ITS CLASS TOOK TWO GOES.**
        `wa_mount_tom_scramble`'s *"Crevasse rescue kit — pulley: 1, prusiks: 2, purpose: …,
        cordelette: 1, locking carabiners: 4"* is a different shape: **sub-items with counts**,
        where `pulley: 1` is legible and only `purpose:` sits oddly among them.
        - **A scan for "an explanation key beside foreign keys" reported 24 in `sling_rack` and
          that number is a DEPTH MISTAKE, not a backlog.** 23 of the 24 are the **top-level**
          value, and `rackLines` splits a top-level object into one labelled bullet per key — so
          `{cams, note, nuts}` renders as *"Cams — …"* / *"Note — three independent trip reports
          converge: …"* / *"Nuts — …"*, which is correct and is the entire point of the label
          split. **Only a NESTED object reaches the generic pair dump**, and there is one.
          Verified by measurement rather than by reading: widening the counter to include
          `note`/`notes` moves it **15 → 15 and 1 → 1**.
        - So lifting a `purpose` out of the generic pair dump is **a rule for a class of one**, on
          the branch every other column's current-value line shares — the thing this repo keeps
          refusing to build. Inverting the pairs to *"1 pulley"* is worse still: the generic branch
          is column-blind, so it would render *"60cm length"* elsewhere.
      - **AND THE RENDERER IS NOT THE SCREEN**, so `probe-rack-quantity-reads-as-prose.mjs` renders
        the real `RouteDetail` over the ten changed rows and matches every bullet `rackLines`
        produces — **14 bullets across 10 RACK boxes** — mimicking `dbRouteToCamel` (`slingRack`,
        never the column name). Two traps this file already records were met head-on writing it:
        - **`indexOf("RACK")` MATCHES THE `RACK` INSIDE `ROUTE TRACK`.** The first version sliced
          its panel from there, so all ten routes "rendered a RACK box" whose contents were the
          GPS-track panel — and every *is-absent* assertion passed on text that was never the rack.
          The landmark is `/\bRACK\b/`, which is the substring rule `check:ui` states for exactly
          this word.
        - **A NEGATIVE-ONLY PROBE IS SATISFIED BY A BOX THAT RENDERED NOTHING.** *"No key name in
          the panel"* was green before the positive assertion existed. Each row must now show the
          text the renderer actually produces for it, and the run fails closed on zero bullets
          checked.
        - **WHICH TAB the box sits on is discipline-dependent** — `cragOnly` puts it on Overview
          for a crag and on **Planner** for these alpine and scrambling rows — so the probe finds
          it rather than asserting a tab. Asserting Overview reported 10 of 10 as missing.
      - **A MEASURED NON-FINDING, so it is not re-derived**: every panel in that probe prints
        *"Standard rack for this discipline — nobody has recorded what this route itself takes"*
        above the route's own webbing, which reads as a caption contradicting its own list.
        `rackGeneric` is `!routeRackFor(route)` and **routeRackFor never reads `slingRack`** — so
        it is real in the fixture and unreachable in production: `measure-sling-rack-only-routes.mjs`
        reports **0 of 242** sling_rack routes with nothing else feeding it. Do not "fix" it.
  - **A CITATION IS FIVE DIFFERENT DEFECTS WEARING ONE PATTERN, AND ONLY ONE OF THEM IS A
    DELETION.** This is why ~4% of the backlog was ever mechanical, and why a bulk transform over
    it would do damage. Sorting a value into one of these decides the repair before you write it:
    1. **The fact is separable** — the publisher is a trailing tag (*"…higher up per Mountain
       Project"*). Lift it off; the sentence is unchanged. The large majority.
    2. **The METRIC is the source** — *"the most-documented line (more trip reports/route votes
       than the alternatives)"*. Trip-report counts and page traffic are a publisher's figures
       about its own website, not facts about the rock. Cut the metric; the qualitative claim
       (*"the most commonly climbed line"*) survives on its own and is the part a climber wanted.
    3. **The attribution IS the verb** — the publisher is the sentence's subject (*"Mountain
       Project's area notes mention a cornice hazard there"*) or it speaks a quotation
       (*"'could have fatal consequences' per Mountain Project"*). Re-make the clause around the
       fact. **A quotation cannot survive its speaker**: leaving the quote marks behind cites
       nobody and turns a report into scare quotes, which changes what the sentence means.
    4. **A disagreement BETWEEN sources** — *"Solid granitic rock per the guidebook, but frequently
       vegetated/mossy in practice"*. The contrast is the whole content. Keep the disagreement,
       drop who disagreed (*"solid granitic rock on paper, but…"*).
    5. **The source IS the only record** — *"essentially undocumented beyond a single AAJ note"*.
       The scarcity **is** the warning, so deleting the reference deletes the warning. Reword to
       the fact about the record (*"a single first-ascent note"*), never to nothing.
  - **The `per <publisher>` family was the largest single shape and is CLOSED: 61 edits on 53
    routes, 535 → 476** (`scripts/oneoff/redact-per-source-attributions.mjs`). Two traps in it:
    **`per` is not always a citation** — *"1-2 pickets **per rope team**"* is a rate, and a regex
    sweep would have eaten it; and a value can hold **two** flagged leaves in one column
    (`pro_tips[0]` and `pro_tips[1]`), so an applier must accumulate per `(route, column)` or the
    second edit rebuilds from the original and silently drops the first.
  - **`crowds` WAS ONE MECHANISM, NOT 77 CITATIONS, and half of it is a defect the no-sources
    rule would not have caught.** It was the largest remaining column, and the enrichment had
    estimated how busy a route is from web research and left the working out in the value. Two
    forms, 35 edits on 34 routes, **476 → 443**
    (`cut-web-analytics-from-crowds.mjs`, `cut-research-method-from-crowds.mjs`).
    - **PAGE VIEWS ARE NOT ASCENTS.** *"31,125 total Mountain Project page views / ~148 monthly"*,
      *"3,400+ AllTrails reviews"*, *"only 1,043 total page views since being posted"*. Strip the
      publisher and these **still** do not belong on screen: a figure that precise reads as a
      measurement of the mountain when it measures a **website**. Precision borrowed from the
      wrong subject — worth stating as its own defect rather than as a citation instance. The
      repair keeps the qualitative verdict (*"Extremely low"*, *"High"*) and cuts the analytics.
    - The second form is the **list of sites somebody searched** — *"(a few reports per year found
      across TrailCatJim, WTA, NWHikers, One Hike A Week)"*. The research act narrated to the
      climber, the tier `audit:expiring-closures` already flags.
    - **What survives is NOT also a citation, and cutting it would make the value worse.** *"based
      on a sparse trip-report record"* stays: *trip reports* is a category rather than a
      publisher, and it says the number is **inferred rather than counted** — the difference
      between an estimate and a measurement. Cut the hedge with the sites and a confident figure
      is left standing on nothing.
    - **A CLUB NAMED AS AN OPERATOR IS NOT A SOURCE.** *"the Mountaineers run it as an official
      Alpine Scramble"*, *"Mountaineers club scramble outings"* are facts about **who climbs the
      route**, the same distinction that keeps 589 land-manager references. Left alone, so they
      stay flagged — that is the deny-list being blunt, and it is why 34 values edited moved the
      report by 33.
  - **`map-remaining-citations.mjs` SAYS WHAT KIND OF READING LIST THIS IS**, which is the
    difference between *"500 values, budget fifteen batches"* and *"46% of it is one word"*.
    Over 360 matched leaves: **148 guidebook, 54 Mountain Project, 41 WTA, 37 SummitPost, 20
    Wikipedia, 19 guidebooks, 19 Peakbagger**, then a long tail. Re-derive it before a batch; the
    composition moves with every sweep.
    - **THE BIGGEST FAMILY IS NOT A CITATION FAMILY AT ALL, AND SWEEPING IT ON THE WORD ALONE
      DELETES SAFETY CONTENT.** A large share of the 167 `guidebook` hits do not attribute a claim
      **to** a guidebook — they warn that the guidebook is **wrong, vague, or absent**, which is
      the most useful thing you can tell a climber who owns that book. *"Guidebook route
      description is notoriously vague"*, *"reportedly mis-locates this route"*, *"parties
      consistently report needing more rappels than guidebook descriptions suggest"*, *"the
      guidebook's 'Class 3' rating undersells two short sections that are genuinely Class 4-5"*.
      `wa_mount_anderson_eel_glacier` shows the cost: **five** values say glacier recession has
      steepened the Flypaper Pass finger to **40-45°**, *"well beyond older guidebook
      descriptions"*. Cut the attribution and the reader loses the warning that **the book will
      tell them 30**.
    - **DO NOT TRUST A NUMBER FOR THAT SPLIT, AND THE REASON IS THE WARNING.** Three separate
      ad-hoc classifiers were written to size it and **all three were wrong**, each producing a
      plausible figure rather than an error: one missed the token that actually fired and blamed
      a neighbouring word, one was a cartesian join, and one put `\b` after an alternation of word
      **stems** so `mis-?locat` could never match *"mis-locates"* — silently filing disagreements
      as plain attributions. On a hand-read sample of 27, roughly two thirds were warnings about
      the book. **A distinction that defeated three regexes is a distinction a sweep will get
      wrong**, so this family is read, never transformed. A count here that invites a sweep makes
      that warning more necessary, not less.
  - **TWO WAYS A MEASUREMENT OF THIS BACKLOG LIED, and both produced numbers rather than errors.**
    Recorded because they came within one step of filing a fix to a guard that was correct.
    - **A SECOND CLASSIFIER DISAGREEING WITH A GUARD IS FAR MORE LIKELY TO BE THE SECOND
      CLASSIFIER.** A first version of that map wrote its own publisher regex, disagreed with the
      audit, and the disagreement read as an audit defect — *"10 values are the English word
      'mountaineers', not the club"*, which is exactly the `Source Lake` / *"water source"* trap
      this audit already records, one word over. **The audit does not flag any of them and never
      did**: the second regex was missing the token that actually fired (`guidebook`, `Wikipedia`,
      `Peakbagger`) and blamed the nearest word it recognised. `NAMED` is now lifted from the audit
      source under `ANCHOR LOST`. Same principle as the grade-parser consolidation.
    - **A CARTESIAN JOIN IS SILENT.** The same version collected the flagged routes and the
      flagged columns and then fetched **every column for every route** — so it scanned
      `wa_south_ridge.approach` because some *other* route had `approach` flagged. It turned a real
      class of **4** into a confident **62**. Every number it emitted looked like a number. Scope
      to the `(route, column)` pairs the audit actually named.
  - **PRINT THE RESULTING SENTENCE, never just the find/repl pair.** A deletion leaves a dangling
    connective or a doubled space that is invisible from the edit alone — an earlier batch stranded
    an *"and that"* clause exactly so. The applier's dry run diffs the column's string leaves and
    prints every one that changed, which is what caught the two orphaned quotations above.
  - **The precision rule, and without it this audit is destructive: A LIVE REFERENCE IS NOT A
    CITATION.** 589 values on 416 routes carry a land-manager alert page or a ranger-district phone
    number (`fs.usda.gov/…/alerts`, `nps.gov`, `(509) 854-2553`). Those are not claims about where
    our data came from — they are the live thing a climber is being told to go and check, and often
    the only actionable line in the value. Naming the **agency** that issues a permit or closes a
    road is operational too. A pattern that flags "names a third party" reports all 589, and
    whoever works that list down deletes 589 phone numbers.
  - **AND SO IS THE WORD "PEAKBAGGER", WHICH IS BOTH A WEBSITE AND AN ORDINARY ENGLISH WORD.**
    `Peakbagger` is a site; *"a known peakbagger objective"*, *"Bulger-list peakbaggers pairing it
    with the summit"*, *"occasional peakbagger visits mid-July through August"* are the common
    noun for a kind of climber and cite nobody. Measured 2026-09-02: **15 of 300 flagged leaves
    were reachable ONLY through it**, and a sweep on them would have deleted true prose about who
    climbs a peak. The site is **capitalised and singular** (`Peakbagger`, `Peakbagger's`), so
    every other form is blanked before matching; 385 → 370. Same shape as the `Source Lake`
    exclusion below, one word over, and **verified against the audit's own needle** rather than a
    re-implementation of it — a first attempt at this finding accused the word *"mountaineers"*,
    which the needle has never matched.
    - Injection-tested as a **PAIR**, and the pair is the point: `--inject=commonnoun` must report
      **0** and `--inject=thesite` must report **every** value. The precision case alone is
      satisfied by a needle that matches nothing.
  - **AND THE MIRROR OF IT: "MP" IS MOUNTAIN PROJECT AND IT IS ALSO MILEPOST.** `NAMED` knew only
    the spelled-out `Mountain ?Project`, so **24 WA values citing Mountain Project by its
    abbreviation were invisible to the audit whose entire subject they are** — *"Confirmed on MP:"*,
    *"Not explicit on MP"*, *"per MP route description"*, *"MP's route notes"*. The count went
    **34 → 67** on the widening.
    - **Peakbagger's problem is a common noun and this one is a UNIT OF ROAD DISTANCE**, which is
      worse: a bare `\bMP\b` would not MISS, it would fire on **256 milepost occurrences** in road
      prose (*"closed at MP 3.7"*, *"MP~4.5"*) — ten times more correct values than findings. The
      deny-list trap inverted.
    - **The discriminator is that a milepost is ALWAYS followed by a number and a publisher never
      is**, so the rule is `\bMP\b(?!\s*~?\s*\d)`. **Stated from the data rather than fitted to
      it**: all 24 candidates were read, and all 24 are Mountain Project — no false positive, and
      no milepost-shaped string appears anywhere in the widened output.
    - **THREE OF THE 24 ARE WORSE THAN A CITATION, AND THOSE THREE ARE REPAIRED — 67 → 64**
      (`scripts/oneoff/redact-mp-abbreviation-citations.mjs`). `wa_django`'s *"MP average ~3.3
      stars"* and `wa_kendall_peak_cliff_north_face`'s *"MP notes very low page views"* are the
      **analytics** class this file already records for `crowds` — *page views are not ascents*,
      precision borrowed from the wrong subject, so the qualitative verdict survives and the figure
      goes. `wa_rapple_grapple`'s *"retain the #1-3 structured list as primary, add one #4 as
      optional"* is **pipeline voice**, an editor instructing the next editor, rendered into a
      climber's RACK box; both climber-facing facts survive as *"Optionally one #4 to cover pro to
      4 inches; no pitons needed"*, which also takes that bullet under the 120-character line
      (13 → 12).
    - **THE REST WERE THEN CLOSED AS A REVIEWED BATCH, AND THE CLASS IS NOW EMPTY — 67 → 34, which
      is exactly the pre-widening baseline** (`scripts/oneoff/redact-mp-abbreviation-citations-2.mjs`,
      30 values; `scripts/oneoff/redact-mp-abbreviation-citations-3.mjs`, 1 more). So the widening
      added 33 findings and all 33 are repaired; **zero `MP` survives anywhere in the audit's
      output.**
      - **"Report, do not sweep" forbids a SWEEP, not a reviewed batch**, and the distinction is the
        whole method: all 30 were dumped in FULL and read one at a time, and each carries its own
        declared `find`→`repl` with a written reason. They were not one shape — **12 attribution as
        the VERB** (the publisher is the sentence's subject, so there is no trailing tag to lift),
        **7 a sourcing-act prefix** (*"Confirmed on MP:"*), **6 DOCUMENTED NEGATIVES**, **4 safety
        warnings**, and **3 analytics**.
      - **The documented negatives are the ones a sweep would have damaged.** *"Not explicit on MP;
        inferred standard…"*, *"MP does not publish a separate elevation figure"*, *"no
        route-specific beta found beyond MP grade listing"* — the admission IS the content, so every
        one keeps its hedge and loses only the publisher. Deleting it makes the record read **more**
        certain than it is, which is worse than the leak.
      - **A quotation cannot survive its speaker**, so quoted phrases are unquoted rather than
        orphaned — *"MP notes those bolts were 'in really bad shape'"* becomes *"those bolts were in
        really bad shape as of a 2024 report"*, keeping the date and the second-hand nature, since
        *a report* is a category this audit deliberately does not treat as a source.
      - **PRINTING THE RESULTING SENTENCE CAUGHT TWO DEFECTS THE find/repl PAIRS HID**, which is
        this family's own rule earning itself: one `find` began after a comma and left *"sub-area,
        ) — no separate…"* stranded, and one replacement capitalised after a semicolon. **A
        checksum-style match proves an edit landed, never that it reads.**
      - **AND THE BATCH'S OWN DUMP REPORTED A FALSE ZERO.** It carried a hand-written list of 29
        columns and printed *"TOTAL remaining MP leaves: 0"* while `wa_safety_dance.descent` still
        held one — the audit walks **32**, and the list had `descent_text` but not `descent`, two
        spellings this file already records as a mirrored pair. `-3.mjs` reads `PROSE_COLS` **out of
        the audit** and fails closed if it parses short. *A repair script's column list is a
        clustering key, and a restated vocabulary is how this codebase got four grade parsers.*
    - **The applier's post-condition is what makes a batch in this family safe, and here it is
      sharper than usual**: every rewritten leaf is re-run through the audit's OWN needle, lifted by
      anchor — and that needle now knows MP, so a rewrite that merely moved the abbreviation is
      refused. It also asserts the lifted needle **does** match MP-as-publisher and **does not**
      match a milepost, or the post-condition would be vacuous for exactly the class it exists for.
    - Injection-tested as a **PAIR** for the reason above: `--inject=mpmilepost` must report **0**
      and `--inject=mppublisher` must report **every** value. All ten pre-existing cases were
      re-run after the widening — the five precision ones still report 0.
    - **Found sideways, from a stale instrument.** Re-measuring the `sling_rack` bullet length sent
      me to a script lifting a function the app no longer calls; correcting it left 13 long
      bullets, and reading those found this. *When an instrument disagrees with a fixed defect,
      suspect the instrument — and then read what it was pointing at anyway.*
  - **A WARNING THAT A MAPPING APP IS WRONG IS NOT A CITATION, AND CUTTING IT DESTROYS NAVIGATION
    CONTENT.** *"Do not trust AllTrails/Gaia GPX tracks that keep the route on the ridge crest
    between the first and second gendarme — there's a real gap"*, *"Don't trust the road line on
    Gaia/CalTopo near Olney Creek Road"*, and `what_to_bring`'s *"Green Trails / CalTopo map and
    compass"*, which names a map the climber is told to **carry**. These name a TOOL IN THE
    CLIMBER'S HAND, and naming which app is wrong is the entire content — *"don't trust the road
    line"* is useless without it. Same family as the 589 kept land-manager references and the
    ranger district phone number in `wa_chianti_spire_lichen_bouquet`. They stay flagged, because
    `EXEMPT` covers only the road/access scan and not the prose reading list; that is the
    deny-list being blunt, not a defect.
  - **The word "source" on its own is useless here.** Waypoint notes say *"reliable water source"*
    and *"Source Lake"* — a real place in the Alpental valley — so a bare `/source/i` returns 45 WA
    notes of which **44** are water and place names. A citation is a **counted or qualified plural**
    (*"multiple sources"*) or **sources doing something** (*"sources describe"*). That distinction
    takes the waypoint-note count from 45 to 1.
  - **NARROWED 2026-09-02 BY THE USER: "per trip reports" NAMES NO THIRD PARTY, and the audit had
    been reporting its own convention back as a defect. 101 → 34.** The headline question is
    whether prose *"names a third party as the source of a claim"*, and by that test the phrase was
    a false positive — **67 of 101 findings** — while being the wording this sweep spent eighteen
    PRs deliberately converting **to**, on the stated reasoning that a category is not a source and
    that it tells a reader a number is INFERRED rather than counted.
    - **The split was measured, not assumed** (`classify-remaining-citation-findings.mjs`), and the
      three surviving shapes are not the same question: **2** name an actual publisher and are
      documented keeps (the guidebook in the reader's own hands; *"Green Trails / CalTopo map and
      compass"*, a gear line saying WHICH map to buy); **16** put the word *"source"* in front of a
      climber (*"sources differ"*, *"no source gives a season"*), which is the app-facing thing the
      no-sources rule is actually about; and **12** are other sourcing acts.
    - **DO NOT extend the narrowing to `sources? (differ|describe|…)` on the grounds that it names
      nobody either.** Considered and rejected: those say *"source"* on screen, which a bare
      category does not. The two look alike and are different questions.
    - **That last bucket of 12 is NOT noise, which is why it stays**: it holds the last real
      citations in the catalog — two *"Verified via SpokAlpine"* values naming a publisher `NAMED`
      has never known about. A tidier-looking narrowing would have buried them.
    - **The ambiguity was in the QUESTION, and the preview is what settled it.** The option offered
      to the user named both *"per trip reports"* and *"sources differ"* while its worked example
      showed 101 → ~34 — arithmetic that removes only the first. The number they compared is the
      contract; a strict reading of the label would have taken it to ~2 and deleted the SpokAlpine
      findings. **When an option's label and its preview disagree, the preview is what was chosen.**
    - Injection-tested as a **PAIR**, and the pair is the point: `--inject=tripcategory` must report
      **0** and `--inject=tripnamed` must report **every** value, on the same sentence differing
      only in whether the thing after *"per"* is a category or a masthead. Either case alone is
      satisfied by a needle that matches nothing, or everything.
  - **The count is a FLOOR, not a total, and this was proven rather than hedged.** It is a deny-list
    of publisher names, and one more phrasing beats it: the first sweep declared 33 and repaired 32,
    then widening the sourcing-act pattern immediately surfaced **five more on four routes**,
    including the one surviving waypoint note. The Lichtenberg fee prose also cited
    `WenatcheeOutdoors`, which no pattern matched — it was found by reading. Re-scan with a
    different pattern before calling the class closed.
  - One exemption, measured: `wa_wolframite_mountain_scramble` names three associations as the
    volunteers who **maintain** the Tungsten Mine site, which is content. A stale exemption
    **fails**. `wa_nooksack_tower_south_face` needed one until `NAMED` was tightened to require a
    guide word beside `Beckey` — "East Ridge/Beckey Route" is a route name — and is now excluded
    **by construction**, which is why no entry for it survives.
  - **Report-only; the repair is a REWRITE, not a deletion.** The citation is usually welded into a
    sentence that also carries the road, the mileage or the fact — dropping an attribution prefix
    from the Jack Mountain permit prose stranded its second `and that` clause with nothing to attach
    to, the lowercase-fragment trap the waypoint-note sweep already recorded. Both repair scripts
    (`scripts/oneoff/redact-road-access-citations.mjs` and `…-round2.mjs`) declare every edit as an
    exact **find → replace** pair and refuse to run unless `find` matches **exactly once** in the
    live value, so nothing can be invented and a stale table cannot half-apply.
  - Read-only, anon key, fails closed on an empty read and on zero prose values. **Not a build
    gate** — a property of the DB, not the checkout. Injection-tested, 2 cases; `--inject=liveonly`
    must report **0 citations and every value as live**, which is the destructive direction.
