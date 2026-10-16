# Roads, trailheads and access

Trailhead agreement, road status across a cluster, road coverage, misfiled access prose, expiring closures, and the trailhead repairs.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`wa_phantom_peak_south_route`'s chain matched neither trailhead record because it matched BOTH
  — FIXED.** `audit:trailhead-agreement` left this one unresolved, and reading the row settles it:
  the route's own approach text names **two real approaches** ("Option one, the Luna Creek
  approach: from Ross Lake Resort … to Luna Camp … Option two … Hannegan Trailhead → Ruth Creek
  Trail → Chilliwack River Trail … Whatcom Pass"), and its seven waypoints are a **mix of both** —
  Luna Camp and the Luna Creek bushwhack from one, the Crooked Thumb moraine camp and the
  southwest-buttress saddle from the other. That is correct data for a two-approach peak.
  - The defect is the **third** name. `approach_logistics.trailhead` said *"Nooksack Cirque
    Trailhead (Trail #750)"*, which appears **nowhere in the route's own prose** and sits up a
    different drainage — its nearest named areas are Shuksan Crag and Pan Dome Falls. The
    waypoint pin says *Hannegan Pass Trailhead*, named verbatim in the approach text.
  - Repaired by **declaring a winner and copying it** — the pin into the blob, no coordinate typed
    anywhere in the script, so a fix needing a third coordinate cannot be expressed at all.
  - **The resulting agreement is NOT evidence**, and that is worth knowing before someone quotes
    it: the two records now agree at 0 m by construction, which is one claim counted twice. This
    is not the trap [[do-not-create-a-trailhead-pin-from-the-logistics-copy]] describes, because
    it corrects an existing record shown wrong by an **independent third source** (the route's own
    prose) rather than manufacturing a second record from a copy — but the caveat on the *result*
    is identical.
- **`audit:trailhead-agreement`** asks whether a route's two copies of its own trailhead agree.
  Every route stores it **twice** — a `waypoints[]` entry of `type:"Trailhead"` with a name and
  coordinate, and `approach_logistics.trailhead`/`trailheadLat`/`trailheadLng` — written by
  different enrichment passes, neither reading the other, and nothing had ever compared them.
  **155 of 630 WA routes disagreed by more than 500 m**, p95 15 km, worst 216 km. No coverage
  check can see this: both columns are populated, both values are plausible coordinates.
  - **The cause is name collision**, the same root cause as the route-id note above, one level up:
    there are two "White River Trailhead"s in WA **130 km apart** and two "Lake Ann"s **79 km**
    apart, so Little Tahoma carried the Lake Wenatchee White River and Black Peak carried Mount
    Baker's Lake Ann. **A name is not an identity.**
  - **It WAS user-visible as a precedence split, and that half is CLOSED — do not re-derive it.**
    `TrailheadCard` read `approach_logistics` first while the map and both "Directions to…"
    buttons read the **pin** first, so the trailhead you were sent to depended on which screen you
    were looking at. #1215 converted two surfaces and **#1231 converted the third**; all three now
    resolve through `trailheadPoint()`. What stands unchanged is the reasoning: **the fix was
    CONSISTENCY, never swapping a priority** — which record is right varies per route, so a
    priority swap only moves the error. The repair is still the data.
    - **The consolidation left the PROSE behind, and that was a live defect for one commit.**
      #1231's `_nameFollows` rule takes the pin's NAME past a measured 1,000 m gap — exactly the
      four two-approach peaks — while the directions line underneath kept rendering
      `al.trailheadDirection`, which is the **logistics** record. So the card read *"Thirtymile
      Trailhead"* above *"From the Andrews Creek Trailhead…"*: one card, two starts 7.8 km apart.
      Measured on screen by `probe-trailheadcard-name-vs-directions.mjs` — **3 of the 4**; Mount
      Howard is already honest because its own prose says *"Two common trailheads on US-2 in
      Chelan County give access."* The prose is now **attributed, not suppressed** (*"Directions
      on file describe a different start — <name>:"*), because on these routes the second approach
      is real and dropping it would lose the only description of it. Deliberately NOT worded as
      *"this peak has two approaches"*: the rule fires on **distance**, and a disagreement says one
      record is wrong, not which.
      - Two false-positive classes were measured out of that probe first, both over-reporting.
        Scoping to the **tab** flagged all four on the strength of approach prose that legitimately
        names both starts (the `count inside the panel` rule `check:camping` records); scoping to
        the whole **card** then flagged Howard on `road.name` — *"Forest Road 657 (Merritt Lake…)"*
        — which is a `audit:trailhead-road` section 2 question, not this one. The claim has to be
        narrow: the card's TITLE against the card's own DIRECTIONS line.
  - **Distance to the peak names the guilty record; the pin-vs-blob comparison cannot.** Two
    coordinates disagreeing says only that one is wrong. `scripts/oneoff/probe-logistics-trailhead-vs-peak.mjs`
    anchors on the route's own peak from `areas` — a third, independent record — exactly as
    `trackOffItsPeak` does in `audit:waypoints`. That settled the 7 gross cases in #886.
    **Its MIRROR is empty**: at that scale the *pin* is never the far one, so the blob is the
    wrong record every time. That asymmetry does **not** generalise downward — below 25 km the
    pin is wrong at least as often, which is why the rest had to be read rather than measured.
  - **Distance alone never condemns a trailhead.** 236 WA routes sit >8 km from their peak and
    almost all are correct: Hozomeen, the Mox Peaks, Ragged Ridge and the Pasayten summits are
    genuinely 28-31 km from the road. Eight such routes were deliberately left alone.
  - **A shared `trailheadDirection` string is NOT a contamination fingerprint**, and the first
    draft said it was. Measured, those repeats are mostly legitimate — "From the Ross Dam
    Trailhead on SR-20" really is the access for **ten** routes across the Pickets and Ross Lake,
    the Stehekin ferry really does serve Flora/Trapper/Tupshin. **Remote peaks share one distant
    trailhead; that is what remote means.** Printed as context, never counted.
  - The repairs (#878, #886, #898, #900) took it to **42**, 93.3% agreeing, p95 701 m, and later work
    to **5** — 620 of 625 comparable routes agreeing, **99.2%**, p50 0 m, p90 123 m, p95 258 m.
  - **"What remains is sub-kilometre slop" was half wrong, and re-measuring 2026-08-20 settled it:
    THERE IS NO SLOP LEFT. All five survivors are peaks with two genuine approaches, and the
    disagreements are LARGE precisely because of it** — 15,180 m, 13,383 m, 7,829 m, 5,733 m. A
    disagreement of that size is the signature of two real trailheads, not of a rounding error, so
    reading the tail as slop points you at the wrong repair entirely. Each was read individually:
    - `wa_mount_howard_south_slope` settles itself — its own `trailheadDirection` says *"**Two
      common trailheads** on US-2 in Chelan County give access."*
    - `wa_remmel_mountain_nw_ridge` (Thirtymile vs Andrews Creek) and `wa_mount_carru_scramble`
      (Slate Peak vs Monument Creek) are the two this file already documents under
      `audit:map-pins` as legitimately two-trailhead peaks.
    - `wa_the_direct_north_ridge_w_gendarme` is Stuart's North Ridge, approached either over Longs
      Pass from Esmeralda Basin or from the Stuart Lake trailhead. Both are standard.
    - In every one, the row's own `trailheadDirection` agrees with the `approach_logistics` record,
      so the *pin* is the second approach rather than an error.
    **Do not sweep these.** `wa_lundin_peak_west_ridge` remains the clean example of the class.
  - **A SHADOWED row is not a defect and the count moves when coordinates are filled.** The audit
    also reports routes carrying a Trailhead pin with no coordinate while `approach_logistics` has
    one. `wa_spire_mountain_scramble` became one in #1128: its pin names a point *"~Mile 10"* on
    FR-63 that no source publishes, while the logistics record now holds the researched trailhead at
    the end of that road. Same road system, different points, and the row went from **zero**
    coordinates to one. Filling the pin would mean inventing the mile-10 coordinate.
    - **The audit’s own SHADOWED prose asserted a defect that had since been FIXED, and the wrong
      advice pointed straight at that fabrication.** It said RouteDetail *“picks the pin by type
      alone … and returns null”*, which was true when written and stopped being true at #1213/#1215
      — `wpPlaced()` now gates every branch of `trailheadPoint()`, so an uncoordinated pin falls
      through to the logistics copy, the Directions button drives there, and the map draws that
      point **dashed as derived**. Anyone acting on the stale sentence would have “repaired” a
      working button by writing the mile-10 coordinate the bullet above forbids.
      `scripts/oneoff/probe-shadowed-trailhead-button.mjs` settles it against the **live row** by
      lifting the real functions with `ANCHOR LOST`, rather than by reading the source — the same
      standard `check:field-renders` earned when an outage had it telling an author to delete
      correct bookkeeping. **Re-read an audit’s advice, not just its counts, after the code it
      describes has moved.**
    - The **NOT COMPARABLE** block had the mirror of it: 153 rows carry a pin coordinate and no
      logistics one, and the copy described them as able to be *“reconciled from itself”*. Copying
      either record onto the other manufactures a 0 m agreement — **this audit is only worth
      running while the two records are independent**, so a copy would move 153 rows into the
      agreeing column having checked nothing. Both directions now say so outright.
  - **The applier pattern is the transferable part.** `fix-trailhead-disagreements-batch4/5.mjs`
    declare a **winner, never a coordinate**: the script reads both records off the row and copies
    the winner into the loser. So nothing can be invented, no coordinate is retyped, and **a fix
    needing a THIRD coordinate cannot be expressed at all** — the exclusion is structural rather
    than a judgement made correctly 102 times. That is what made unreviewed subagent triage safe
    to ship, with `scripts/oneoff/verify-slice-ac-fixes-reference-the-row.mjs` measuring which
    recommendations actually referenced the row (26 of 34; the 8 that did not were one group, all
    off by exactly 454 m).
  - **A QUARTER OF THE HEADLINE AGREEMENT IS AGREEMENT BY CONSTRUCTION, and anything downstream
    that treats the second copy as corroboration is counting one claim twice.** Every repair in
    this family "declares a winner and copies it" — which is what makes inventing a coordinate
    impossible, and it also means the two records agree afterwards *because* a script made them.
    Measured 2026-09-09: **25 `fix-*trailhead*.mjs` scripts name 179 route ids**; of the **620**
    WA routes whose two trailhead records agree within 500 m, **160 (26%)** are named in one, and
    of the **334** that agree EXACTLY, **152 (46%)** are.
    - This entry already records the principle for a single fix (*"the resulting agreement is NOT
      evidence … one claim counted twice"*). The count is the part that was missing, and without
      it the caveat reads as a footnote about one route rather than as a property of a quarter of
      the population.
    - **It caught a wrong instrument mid-build.** `audit:waypoint-distances` reports routes whose
      stored mileages are impossible from their own trailhead pin, and the obvious way to say
      which half is wrong is to check the pin against `approach_logistics` — which "corroborated"
      19 of 27, **8 of them repaired rows**. `dist_km` is the record to use instead: no trailhead
      repair has ever touched it, and CLAUDE.md forbids bulk-normalising it.
    - **0 m is NOT the discriminator**, checked rather than assumed: several genuinely
      independent pairs also agree exactly, because both came from one enrichment pass. The only
      reliable test is whether the route id appears in a repair script.
  - Read-only and fails closed on an empty read. **Not a build gate** — a property of the DB, not
    the checkout, so no code change can cause or fix it; same reasoning as `check:counts`. It uses
    the service key only because the anon role's 3s `statement_timeout` cannot complete a read of
    two jsonb columns over 8k rows, and it issues no write. Retries are printed, not absorbed.
- **`audit:trailhead-road`** asks the question one level out from `audit:trailhead-agreement`:
  routes that share ONE trailhead must not disagree about whether the road to it is **open**. The
  unit of truth is the road, not the route — a road is either gated or it is not, and that fact
  cannot vary by which climb you picked at the end of it. So a cluster of routes on one trailhead is
  a set of independent recordings of one fact, and a disagreement means at least one is wrong.
  - **The case that produced it.** Four Mount Rainier routes share the Mowich Lake trailhead. ONE
    recorded that WSDOT permanently closed the SR-165 Fairfax Bridge in April 2025 — sole public
    access, no detour, no funding to replace it. The other three said "Seasonal, unpaved" with a
    `seasonalGate` of **"Typically opens ~July"**. The gate is the dangerous half: it does not merely
    omit the closure, it actively tells somebody to plan a July trip to a road with no public access.
  - **No existing check could see it.** `audit:trailhead-agreement` compares a route's two copies of
    its OWN trailhead and every Mowich row agreed with itself perfectly — the contradiction is
    *between* routes. Every coverage check asks whether `road.status` is populated, and all four
    were, in plausible well-written English. It renders on all four (`RouteDetail.jsx` ~2176 prints
    `road.status — road.seasonalGate`), so every screen looked finished.
  - **Clustering is by COORDINATE, not by name**, and that is load-bearing: the Mowich rows are
    variously "Mowich Lake" and "Mowich Lake Trailhead", so a name key would have split the very
    cluster this exists to find. Names are how this data disagrees; coordinates are how it identifies.
  - **Precision went 36% to 100% across six tightenings, and every one was a needle flagging correct
    work** — the direction that teaches people to ignore an audit. Recorded because each is a
    distinct way road prose defeats a keyword scan, not six versions of one mistake:
    1. **A blob cannot be judged.** Six fields were concatenated, so the text printed beside a
       verdict was often not the text that matched — two "closed" rows displayed *"passable to
       passenger cars"*. Matching is per-field now and the report prints the phrase **and its field**.
    2. **"washed out"** fires constantly and nearly always about a repaired or beyond-the-trailhead
       event. Dropped.
    3. **"closed to vehicles" / "closed beyond" were TRIED and reverted** — they took the run 11 → 20
       and every new finding was a seasonal gate (*"closed until the seasonal spring opening"*). A
       seasonal closure is the same fact a sibling states from the other end of the year.
    4. **A closure BEYOND the trailhead does not stop you reaching it.** Barlow Pass: eleven
       consistent rows saying *"paved TO Barlow Pass; permanently closed BEYOND"*. Suppressed only
       when the closure names the trailhead **itself** — so Sol Duc's *"closed beyond Madison Falls"*
       survives, because that row is describing a different road entirely.
    5. **The mirror is required, or the noise just moves.** *"Open to <somewhere short of the
       trailhead>"* **agrees** the trailhead is unreachable — Trinity sits at the end of the Chiwawa
       River Road, so *"Open to Atkinson Flat (~mile 16); closed beyond"* is not a rebuttal.
    6. **A negation and a past tense are not claims.** *"**Not** plowed in winter"* was read as an
       open road, and *"**Formerly** open to vehicles"* — the sentence *explaining* a closure — made a
       row assert both and silently drop out of the report. That one was a false **negative** on a
       real finding, which is the direction that matters.
  - **Report-only, and it must stay so.** It cannot say which row is right, only that they cannot
    both be. The repair needs the road's current status from outside the database — which is
    research, not a copy. `audit:rappel-claims` carries the same warning for the same reason.
  - Injection-tested 6/6 against a **synthetic catalog** (`--fixture`), because the faults live in
    the DATA: a checker cannot inject them by editing code and must not write to the live project.
    Two cases must fire and **four must stay silent** — the four are the tightenings above, so a
    needle re-widened in future fails rather than quietly returning noise.
  - **Section 2 asks a different question and is deliberately WEAKER: does a route's `road.name`
    even name this trailhead's road?** Section 1 is structurally blind to a row describing the
    **wrong road entirely**, because a correct statement about the wrong road contradicts nobody.
    `wa_mount_barnes_scramble` sat at the Sol Duc trailhead with `road.name` = *"Olympic Hot Springs
    Road (to Whiskey Bend Trailhead)"*, a `status` about a flood washout and a `driveNote` promising
    a 6.2-mile road walk — every sentence true, and every one about a road on the other side of the
    Olympics.
    - **This is a class the trailhead sweep CREATED**, so the detector is pointed at its author's
      own work first. Moving a trailhead to settle a disagreement between a route's two copies of it
      leaves the `road` block describing the road that was removed. Four were recorded as follow-up
      when #1081 shipped; this is what finds them mechanically instead of from memory.
    - **Comparative, not absolute**: a name is flagged only when the other routes at the same
      trailhead agree on a road name it shares nothing with. That keeps it quiet on legitimate
      variation (*"Sol Duc Road"* / *"Sol Duc Hot Springs Road"* overlap on `duc`) while catching a
      name drawn from another drainage. Clusters below three routes are skipped — there is no
      majority to measure against, the same reason section 1 needs a cluster at all.
    - **Its first draft shipped at ~25-30% precision, measured on a 20-row sample AFTER the fact,
      and the dominant false positive was section 1's disease all over again: A DRIVE HAS SEVERAL
      NAMED LEGS.** *"Ruth Creek Road (FSR 32)"* against a cluster keyed `hannegan` — Hannegan Pass
      Road **is** FR 32; *"I-90 / Snoqualmie Pass"* against `alpental`, which is at Snoqualmie Pass;
      *"Railroad Creek Road"* against `chelan, lucerne, holden`, the boat and the village you pass
      through to reach it. Every needle over road prose has to be told that it describes more than
      one road. **46 findings became 5.**
      - The fix uses evidence already in the cluster: if a **neighbour's** own `driveNote` or status
        mentions the road this row names, the two describe one journey and there is no finding.
      - **The echo must come from a row that AGREES with the cluster**, or two identically-wrong
        rows shield each other — `sitkum_glacier` and `frostbite_ridge` both named White Chuck Road
        at a North Fork Sauk trailhead, each corroborating the other, and an unrestricted echo test
        silently dropped **both**. A same-journey explanation is worth nothing from a row that has
        the road wrong itself.
      - **`driveNote` had to be added to that prose and was not there**: `roadFields()` covers
        status/seasonalGate/notes for section 1's needles, while driveNote is exactly where a route
        spells the drive out leg by leg. Found by an injection case, not by reading the code.
      - **Entry to the scan was gated on road PROSE, so a route naming its road and saying nothing
        else was invisible to section 2 entirely.** Also found by injection.
    - **It is still a HYPOTHESIS LIST and the output says so.** 2 left in WA, neither verified. A
      peak with two genuine approaches looks exactly like this whichever one it records. Do not
      sweep it. `audit:area-parents` records the same discipline — *measure a detector's precision
      before shipping it* — and this one is the counter-example that proves the rule: it was shipped
      unmeasured, and measuring it afterwards found three quarters of the output was noise.
    - **What a token test cannot catch: a `road.name` that lists SEVERAL roads.**
      `wa_mount_meany_standard` named Whiskey Bend Road *and* Graves Creek Road at a North Fork
      Quinault trailhead — three roads, none of them the right one — and passed, because one of them
      contained the word the cluster shared.
    - **Placeholder names are split out** (2 in WA — *"Forest/park access road (verify per
      trailhead)"*). They are not wrong roads, they are absent ones, and the repairs are opposite:
      one wants research, the other wants a copy from a neighbour.
  - Read-only, anon key, **fails closed** on an empty read: zero routes makes every cluster look
    consistent, which is the false-pass direction. Not a build gate — a property of the DB, not the
    checkout, so no code change can cause or fix it; same reasoning as `check:counts`.
  - **SECTION 3 CLUSTERS BY MILEPOST, BECAUSE SECTIONS 1 AND 2 CONTRADICT THIS AUDIT'S OWN HEADER.**
    That header says *"the unit of truth is the ROAD, not the route"* — and both sections cluster by
    **trailhead coordinate** within 500 m. A road serves many trailheads, so two routes describing
    ONE closure from different trailheads never meet. This audit reported **0 across all 205,543
    routes** while the catalog said both *"Closed as of Dec 2025 — Mountain Loop Highway landslide at
    MP 37.5 blocks access"* and *"Open (… reopened mid-May 2026 after a landslide closure near
    milepost 37.5)"*. 49 routes name that corridor across **17 trailheads**.
    - **A MILEPOST is the key that works**: an exact point on an exact road, naming one closure
      EVENT. The road NAME alone is far too broad — on that corridor it also covers the Monte Cristo
      Road, separately and legitimately vehicle-closed, and an ordinary winter gate. Forest ORDER
      NUMBERS were measured and rejected earlier as a detector for a class of zero; mileposts had
      not been tried.
    - **PRECISION WAS MEASURED BEFORE IT SHIPPED and the first run was 33%** — 3 disputed, 1 real,
      the same precision section 2 shipped at and was rightly criticised for. Four suppressions,
      each a distinct way road prose defeats this key, **all four found by READING the output rather
      than trusting the count**: **seasonal** (a gate that closes every winter and reopens every
      spring says both, truthfully — without it the four largest clusters were SR-20 winter
      mileposts, MP 134 across **62** routes; 271 of 514 mentions suppressed); **hypothetical**
      (*"…when fully open"* is a counterfactual, and it put two Suiattle routes in the lifted column
      while their own status said CLOSED); **a bare "Closed"** (the in-force needle demanded *"is
      closed"*/*"closes"*, so *"Closed to vehicles at the Glacier Creek bridge (~MP 3.0)"* matched
      NOTHING and the row counted only as lifted, on a HISTORICAL reopening narrated inside it);
      and **a route on both sides is NARRATING, not disputing** — judged per ROUTE, never per value.
    - `wa_kololo_peaks_standard` was the one finding and is **fixed**: three rows record the
      reopening against its one, and the reopening is the later claim, so the repair needed no
      research at all. `fix-kololo-stale-mountain-loop-closure.mjs` **re-asserts both witness rows
      at apply time** — if the catalog stops recording the reopening the script has no basis and
      refuses.
    - Injection-tested **5/5**, and the **four that must stay SILENT are the point**: a case proving
      only that it fires is satisfied by a detector that flags everything.
  - **SECTION 4 CLUSTERS BY ROAD, BECAUSE SECTION 3'S KEY CANNOT SEE A DISAGREEMENT ABOUT ITS OWN
    KEY.** Section 3 buckets by the MILEPOST and asks in-force vs lifted — so two routes describing
    one gate at two different mileposts land in two buckets and are **never compared**. It reported
    **0** across all 205,543 routes while seven Suiattle River Road routes put one flood gate at
    **MP 4** on four of them and **MP 4.5** on the other three. A party planning off the first walks
    half a mile it did not budget for; off the second, it drives to a gate that is not there. This is
    [[a-detectors-clustering-key-decides-what-it-can-see]] exactly, and it is a property of the key
    rather than of the needle — the same class as sections 1 and 2 clustering by trailhead when the
    unit of truth is the road.
    - **The identity is the road's own `road.name`, matched EXACTLY, never by token overlap.**
      Overlap **chains**: a Ptarmigan Traverse row whose name is *"Cascade River Road (north
      approach) or Suiattle River Road (south approach)"* shares a token with each, so an overlap
      test merges two unrelated roads and reports Cascade's MP 20 winter gate as a third position
      for Suiattle's flood gate. Measured: that draft reported **6** findings of which at least 2
      were this, and the exact-identity key reports **1**. A row naming two roads now keys to its
      own bucket and finds no partner, which is the right answer for a value that does not say
      which road the milepost belongs to.
    - Three further narrowings, each a real shape rather than a guess: only **in-force** mentions
      count (section 3's seasonal and hypothetical suppressions already do that work); a route
      naming **several** mileposts is describing several gates and cannot contradict anyone; and a
      route with **no `road.name`** is excluded, because section 3's prose fallback is a *guess* at
      which road a sentence is about and a guess cannot support a claim that two routes disagree.
    - **THE ONE LIVE FINDING IS NOT A DATA ERROR, AND THE RESEARCH IS RECORDED SO NOBODY REDOES
      IT.** Both numbers are true of different things: the MBS alert for order **06-05-26-03**
      (2 Apr 2026 – 1 Jan 2028) closes FR 26 **at milepost 4**, while **MP 4.5 is where the road is
      washed out**. The formal order does not name a milepost at all — it describes the closure from
      *"the intersection with Suiattle Mountain Road"* by legal land description — and the alert page
      itself carries both numbers. `wa_spire_point_southwest_face` names that same junction and calls
      it MP 4.5. So the catalog is reproducing an ambiguity that exists at the source, which is why
      **this was NOT swept**: picking 4 over 4.5 would manufacture a certainty the record does not
      carry. The repair, if anyone takes it, is to identify the gate by the **junction** rather than
      by a milepost — and that is prose research, so it belongs behind
      `fix-road-blocks-from-research.mjs`' weaker `researched` gate, never a bulk transform.
    - **POSITIONS ARE COMPARED NUMERICALLY, NEVER AS STRINGS, and the first version was not.**
      `"MP 3"` and `"MP 3.0"` are one position written two ways, and a `Set` of strings calls them a
      disagreement — it printed *"2 positions (spread 0.0 mi)"* for Glacier Creek Road, where four
      routes all say mile 3. **A spread of zero is the tell**, and the guard must never emit one.
      Latent rather than live on the day it shipped: no live pair differed only in formatting, so
      the count did not move when it was fixed. Injection case `samepoint` pins it and was proven
      non-vacuous — it reports 1 against the string version and 0 against the numeric one.
    - **A WIDER NEEDLE WAS BUILT, MEASURED AND REJECTED — do not re-derive it.** `MP_RE` requires
      the word *milepost* (or *MP*), and much of this catalog writes *"closed at mile 3"* instead,
      so the Dosewallips rows that gave one closure five positions were invisible to it. Widening
      to a bare *"mile N"* is far too loose (~40% on a real sample: it matches a surface change
      *"Paved to mile 10, then rough gravel"*, a junction *"turn right onto FR-5606 at about mile
      32.3"*, and a destination *"Andrews Creek Trailhead is at roughly mile 22"*). Two narrowings
      take it to ~92% — a **positional preposition** (at/beyond/past), since *"adds about 6.5
      miles"* is a DISTANCE and reading it as a position manufactures the very drive-vs-walk
      conflation it is meant to expose; and the gate word in the **same sentence**, since one
      status can say *"Paved to mile 10 … closed at mile 20"*.
      - **It still does not catch Dosewallips, which is why it was rejected.** Measured against a
        fixture of the pre-repair rows: only ONE of the three yields a position (*"beyond
        approximately mile 1"*), because the others say *"5.5-6.5 miles from Hwy 101"* and
        *"~8.5 mi"* — no preposition, no *"mile N"*. One position is not a disagreement, so the
        finding count stays 0.
      - On the live catalog it took section 4 from 1 finding to 2, and **the new one was the
        `MP 3`/`MP 3.0` artifact above** — noise, not a finding. So the widening's measured yield
        is **zero real findings** while adding two regexes and a sentence splitter. *A detector for
        a class of zero is the thing this repo keeps refusing to build.* What it did earn is the
        numeric-comparison fix, which it exposed.
    - Injection-tested **5/5** (1 fires, 4 silent), and `tworoads` is the one that matters. **ROW
      ORDER is load-bearing there and the case was VACUOUS without it**: chaining merges into
      whichever cluster it meets first, so with the two-road row LAST nothing merges and the case
      reported 0 against the chaining version too. With it FIRST: chaining **1**, exact identity
      **0**. *A case that passes against the implementation it exists to reject is not a case.*
- **`audit:road-coverage`** asks which routes describe a **walk** and say nothing about the **road**
  to it. It exists to **replace the number 1,371**, which this file used to carry as an open item —
  *"road-block coverage (1,371 WA routes with access apparatus but no road block) — genuine research,
  not re-homing"*. That number is **not work**, and the shape of the error is the one recorded three
  times already for `audit:terrain`, `audit:waypoint-order` and `audit:hazard-redundancy`: **ask what
  a count is a count OF.** Read-only, report-only; **not a build gate** — a property of the DB, not
  the checkout, same reasoning as `check:counts`.
  - Those 1,371 qualify as "carrying access apparatus" **through `access` alone**, and `access` is the
    **crag-level land-manager blob, not a per-route record**: **18 distinct blobs cover all 1,371
    rows, one of them covering 1,128**. 54.9% are bouldering, 13.4% sport; **1.1% carry any approach
    prose** and **0.3% a `dist_km`**, against 99.1% and 74.4% of the routes that *do* have a road
    block. Only **2 of 1,371 are mountaineering**, against 27.6% of the populated set. **A road block
    describes the DRIVE TO A WALK, and these routes describe no walk.**
  - Turned round — *of the routes that DO describe a walk, how many say nothing about the road?* —
    it is **19 of 1,065 (1.8%)**, now **4**. Same turn that collapsed *"research gear for 4,938
    routes"* into 13 routes of re-homing. **A route enters on approach prose, a trailhead pin, a
    `dist_km` or a `gain_ft`** — any one of those means the page already sends a climber somewhere on
    foot, and therefore already implies a drive it is silent about.
  - The needle is a **named road or a gate, never the bare word "road"** — *"walk the old road
    grade"* is not a statement about driving. That is the same precision `audit:trailhead-road` had
    to learn six separate times.
  - **A SIBLING BLOCK IS A DONOR, NOT AN ANSWER**, and the audit prints donor counts rather than
    conclusions for two reasons already on record: a peak can have **two genuine trailheads**
    (Lundin, Remmel, Carru, Howard), and a `road` block can **outlive the trailhead it described**
    (`audit:trailhead-road` section 2).
  - **THE BUCKET TEST WAS "DOES THE PROSE MENTION A ROAD?" AND IT OVER-PROMISED — this audit's own
    disease, committed by its own author, one release after it was written to cure it.** That test
    filed three routes as RE-HOMING, i.e. fillable by copy. **Not one was.** The buckets are now
    **COPY** (a same-area sibling block names *the road this route's own prose names*) and
    **RESEARCH**, and today that reads **0 / 14**. The three refusals are each a different way the
    old label was wrong, and all three are pinned as self-test cases:
    - `wa_little_annapurna_south_face` names **Highway 97 / Ingalls Creek Road**; its one sibling
      block is **Icicle Creek Road / FR 7601 to Stuart Lake**, the other side of the range. The row
      says so itself — its overview reads *"the seldom-used Ingalls Creek/Crystal Creek side rather
      than the Enchantments basin"*. The two-trailhead case, **stated outright by the row**, and a
      bare sibling copy would have sent a party to the wrong trailhead.
    - `wa_upper_castle_toprope_wall` names **US-2 in Tumwater Canyon at milepost 96.5**. **Zero road
      blocks in the entire catalog name Tumwater**, and all **125** US-2 blocks are Stevens Pass /
      Skykomish / Baring, 40-80 miles down the same highway. *"A drive has several named legs"* — a
      true statement about the wrong stretch is not a donor.
    - `wa_south_face_direct` had no donor **because it was filed on the wrong area** (below). The
      missing block was the symptom; the area was the defect.
  - **Roads are compared as IDENTIFIERS, never as sentences** — one road is spelled many ways
    (`SR-20` / `State Route 20` / `Highway 20` / `North Cascades Highway`), so a string compare
    reports agreement as disagreement. Numbered routes normalise to `#20`; proper-noun names
    normalise to their distinctive word, behind a `GENERIC` stop-list — admitting a token every road
    name shares (`road`, `creek`, `forest`) makes the match vacuous in the **wide** direction, the
    mirror of a too-narrow proxy.
  - **A ROUTE'S APPROACH PROSE NAMES A TRAILHEAD, NOT TARMAC — and matching roads alone left FIVE
    genuine copies sitting in RESEARCH.** *"From the PCT trailhead at Exit 52"*, *"Hike the trail
    toward Libby Lake"*, *"From the Lightning Creek trailhead on Ross Lake"*: not one names a road,
    and every one has a same-area sibling whose block is exactly that trailhead's drive. **The
    applier had already widened its own gate from a road name to a trailhead name** (for
    `wa_the_balanced_rock`, recorded below) — the widening was simply never carried back into the
    audit, so the audit and the thing it feeds disagreed about what counts as a donor. **When you
    widen a gate, widen the report that feeds it.**
  - **The place signal gets its OWN, WEAKER bucket (`COPY?`), and folding it into `COPY` would be
    the same over-promising one release after fixing it.** Measured on the 9 rows it reached: **5
    real, 3 refused on reading, 1 unrelated**. A place match says *where to look*; only reading the
    row says whether to copy. `PLACE_GENERIC` stop-lists colours and size words on top of the road
    list — *"White Chuck Glacier"* and *"White Chuck Road"* are a real pair, but **Silver Creek,
    Silver Lake and Silver Star are three unrelated places sharing a colour**. A road match
    outranks a place match, so the strong bucket cannot be diluted; both are pinned by self-test.
  - **The three `COPY?` refusals are recorded in the applier so they are not re-derived**, and each
    is a distinct trap: `wa_north_star_mountain_cloudy_peak_traverse` names **two** ways in and the
    only sibling block is the **closed** one (copying it answers "how do I get there?" with an
    indefinite closure while the row says an open alternative exists — worse than silence);
    `wa_mount_spickard_silver_glacier` has two real drives and the sibling covers one, the
    two-trailhead trap however explicitly the row cross-references it; and
    `wa_don_t_climb_that_she_said` place-matches *"White Chuck"* onto the **FR 23 White Chuck Road**
    block — a different, closed valley — while its own overview puts it on Glacier Peak's
    **south-side** North Fork Sauk approach. A true statement about the wrong leg of the wrong drive.
  - **Donors stay scoped to the SAME AREA, and that scoping is what makes a bare highway number
    admissible at all.** 283 WA routes carry a block naming `#20` and SR-20 runs 130 miles, so
    state-wide the match is meaningless; within one crag it is the same pullout. **Do not widen the
    scope without also strengthening the identifier test** — an injection case pins exactly that.
  - **The self-test runs before any verdict, because the expected answer is a small number and today
    it is ZERO — which is what a broken finder prints.** It drives the **real finder** over synthetic
    routes rather than poking the helper, and that distinction earned itself immediately: a first
    version compared two prose strings, declared the matcher broken because a Tumwater route and a
    Stevens Pass block share `#2`, and was testing something the pipeline never does. **Following it
    would have driven a "fix" that refused the one real copy this work made.** Injection-tested 5/5
    (`inject-road-coverage-selftest-cases.mjs`), each case proving its edit landed by checksum, each
    failing with a message naming its own defect; case 5 must **pass**.
- **`wa_south_face_direct` was a Vasiliki Tower trad route filed on a UNIVERSITY OF WASHINGTON campus
  crag — moved.** `wa_art_building` held four boulder problems (*East Enterance*, *North Problem*,
  *NW Entrance*, *Pillar Problem*) and this one 5.10 multi-pitch line whose own prose is Burgundy Col
  in the Wine Spires, ~190 km away. **"South Face Direct" exists in seven states** — the *a name is
  not an identity* root cause this file records for route ids, landing on `area_id`.
  - **Found by the road work, and that is not incidental**: it is one of the three routes above, and
    the reason no donor could be found for it is that its area had no Washington Pass routes to
    donate one. **A missing road block was the symptom; the area was the defect.** Once moved it
    filled by copy from its real sibling, so the two scripts must stay in that order.
  - **The discriminator is the NON-PROSE columns, and this is the general rule for the class.**
    `wa_true_grit` is the recorded case where the *prose* was the contaminated half, and five prose
    fields agreeing with each other is **one claim counted five times** — a contaminating write lands
    in several text columns at once. Here `discipline` is **trad** while all four area-siblings are
    bouldering, and `dist_km` is **4.8** while the row's own approach says *"roughly 3 miles to
    Burgundy Col"* (= 4.83 km). Both are written by a different part of the pipeline, both agree with
    the prose and disagree with the area, so **the area is the wrong half**.
  - A **move**, not a dedup: Vasiliki held no row of that name, so nothing was duplicated. The
    applier requires the destination to already hold the route this row calls itself a variation of
    (*"South Face"*), so the target area is a **fact about the catalog** rather than a name somebody
    typed — no coordinate, area name or path appears in the file.
  - `route_count` is trigger-maintained on a route move and both leaves moved correctly (5→4, 2→3);
    `check:counts` then confirmed **all 47,638 areas** agree with their subtree, so no ancestor
    drifted.
  - **THE CLASS IS CLOSED — measured, and NO detector was built, because it would be a detector for
    a class of one.** `probe-lone-discipline-outlier-routes.mjs` asks the cheap structural question
    that found this row (a route whose *kind* of climbing is unique on its area, where the area's
    other routes agree with each other) across all 8,365 WA routes on 1,835 areas: **58** such
    routes, **1** of them a roped route on a boulder area, and **0** carrying a real approach its
    siblings lack — the shape this one had. Sizing a class before writing a detector for it is the
    discipline `audit:area-parents` records after its first draft shipped 12 real findings out of 41.
    - The one hit, `wa_north_face_7` on **`wa_anderson_hall`** — another University of Washington
      building, same subtree — was read and **left alone**. It is a bare stub: grade 5.8, no prose
      of any kind, no approach, no `dist_km`. **Nothing says it is anywhere else**, and a campus
      building's north face at 5.8 is ordinary buildering. The Vasiliki row was condemned on prose
      naming a place 190 km away plus two non-prose columns agreeing with that prose; matching the
      area's *name* is not evidence, and acting on it here would be the pattern-match this file
      warns about throughout.
  - **Geometric inheritance is unavailable here and that was measured, not assumed.** The obvious
    fix — cluster the silent routes on their trailhead coordinate and inherit from neighbours, the
    way `audit:trailhead-road` clusters — reaches **1 of 1,371**, because *road-silent* is defined
    partly as having no `approach_logistics`, which is where the trailhead coordinate lives. The
    routes that need a road block are exactly the routes with no coordinate to cluster on.
- **FIFTEEN of the 19 are filled, and only TWO needed prose written** (19 → 4). Thirteen were
  copies — five on a road name, five more once the gate was asked about **trailhead** names, and
  three where research established only *which start the route uses* while the block itself was
  still copied verbatim. The remaining four are deliberate refusals, listed in the applier.
  - **The order matters and is the transferable part: EXHAUST THE COPY PATH BEFORE RESEARCHING.**
    The bucket said 14 routes needed external sources; 12 of those did not. Research was still what
    resolved three of them, but what it established was an **identity** (Cashmere's northeast ridge
    starts at Eightmile Lake; Jefferson Pass sits on the same FR-2419 corridor; East McMillan's
    2008 line is a Goodell Creek bushwhack), not a road fact — so the write stayed a verbatim copy
    and no road prose was typed. **Researching a trailhead is cheap and safe; researching a road is
    neither.**
  - **`researched` is a SEPARATE, WEAKER GATE inside the same applier**, printed loudly, and
    mutually exclusive with `evidence`: declaring both, or neither, is a malformed entry rather
    than a lenient one. `evidence` rests on the row itself and is re-asserted at apply time;
    `researched` rests on a judgement made outside the catalog.
  - **The two hand-written blocks live in their OWN script (`fix-road-blocks-from-research.mjs`),
    and the split is the point.** The sibling applier's safety is that a repair needing a fact the
    catalog lacks *cannot be expressed*; typing road prose destroys that, so the weaker path states
    a weaker property rather than blurring into the strong one by sharing a file. What replaces it:
    a recorded `finding` per entry, a refusal if a real donor exists, re-read verification, and a
    **structural refusal of any block containing a four-digit year** — a dated closure is true when
    written and a lie afterwards, and `road.status`/`seasonalGate` have no expiry. The catalog
    already carries several ("closed Dec 12, 2025-June 14, 2026"); this cannot add more.
  - **Its first draft refused Little Annapurna, and the reason is this whole sweep's lesson re-made
    one script later.** The guard was *"a same-area sibling already carries a block → this should be
    a copy"* — but Little Annapurna's only sibling describes Icicle Creek and Stuart Lake, the other
    side of the range, which is exactly *why* no copy was possible. **"A sibling carries a block" is
    not "a donor exists."** It now refuses only on a sibling block naming a road the route's own
    prose names, and prints the different-road case as the reason a researched write was needed.
- **AN ADMISSION THAT NOTHING IS KNOWN IS EVIDENCE; AN ADMISSION FOLLOWED BY SPECULATION IS A
  DEFECT — and the second one printed an affirmative safety claim.** `wa_don_t_climb_that_she_said`'s
  `approach` opened *"No route-specific trailhead or approach beta … turned up anywhere online"* and
  then carried on for another 636 characters inventing one, ending **"nothing resembling glacier
  travel, creek fording, or avalanche terrain given the minimal distance and zero gain."**
  - **The row contradicts itself.** Its own overview places the boulder *"beside the White Chuck
    Glacier basin, climbed almost in passing by parties on Glacier Peak's standard south-side
    approach"* — a multi-day glaciated walk with real avalanche exposure. The `dist_km` 0.97 the
    claim reasons from is the step **from a high camp**, not from a road. Same family as **#641**,
    where a missing approach and a zero approach became indistinguishable and the return tile went
    green: a number that means *"unknown"* read as *"none"*.
  - The repair is a **prefix truncation** and the script asserts the result is a prefix of the
    original, so it structurally cannot rewrite prose — the same constraint that made the
    `audit:approach-scope` batches safe, and for the same reason (trimming interior sentences
    strands the connectives around them).
  - **The class is ONE, measured before acting**: across 8,365 WA routes, **13** carry a documented
    negative — correct, and CLAUDE.md already records that writing over one is fabrication — and
    **2** go on to speculate. The second, `wa_the_pyramid_picket_east_ridge`, is deliberately left
    alone: *"parties would likely use the same general approach as the neighbouring route"* is a
    **stated uncertainty**, and deleting it would remove an honest hedge.
  - **The probe still flags 2 after the fix, and tightening it to print 0 would be fitting it to the
    answer.** The hedge word is identical in the honest and the invented case (*expect*, *likely*,
    *reads like*) — the retained admission itself contains *"reads like"*. The real discriminator is
    whether a sentence asserts **terrain the row has no source for**, which no regex can see. It
    stays a two-row reading list.
  **(A)** the route's **own prose** names the trailhead or road, and **(B)** a sibling on the same
  area carries a researched block for that same road. (A) is evidence about *this* route; (B)
  supplies the block. Neither alone is enough — (A) gives a road name and no status, (B) alone is a
  bare copy onto a row with no coordinate to corroborate it. The fifth (`wa_south_face_direct`)
  only became reachable once its **area** was fixed, and the applier is **idempotent** so the four
  earlier writes skip on a re-run rather than being re-applied.
  - **The gate was widened from a road NAME to a TRAILHEAD name, and that is the more general
    rule**: a route can describe its whole approach without ever naming the tarmac, and on a
    two-trailhead peak the **trailhead is the sharper evidence** because it is the thing that
    differs. Exactly **one** route in the catalog converted (`wa_the_balanced_rock`), and it
    converted on the strongest available form — its prose names the **donor routes**, not merely
    the trailhead: a V2 problem on Colchuck Balanced Rock's summit block, `dist_km` 16.74 and
    `gain_ft` 4,850, whose approach reads *"most commonly the West Face or Let It Burn, both
    approached via the Stuart Lake Trailhead"*. Both named routes carry blocks.
  - **The token comparison needs a stop-list or it goes vacuous in the WIDE direction**: the bare
    word *"Trailhead"* is in every trailhead name and every donor block, so without stripping it
    the gate matches everything. The mirror of the too-narrow proxy this file records elsewhere.
  - **(A) is not ceremony, and Lundin proves it.** CLAUDE.md names Lundin Peak as the clean example
    of a two-trailhead peak, and its siblings offer **both** — *"I-90 to Snoqualmie Pass, Exit 52"*
    (PCT-North / Commonwealth Basin) and *"Alpental Road"*. A bare sibling copy would have been a
    **coin flip**. The route's own approach says *"from the Snoqualmie Pass PCT-North trailhead
    (I-90 Exit 52)"*, which picks the donor with no judgement required. `wa_northwest_face` is the
    same shape from the other side: its approach says *"Same approach as the South Face"*, and
    `wa_south_face` **is** the donor.
  - **The applier declares a DONOR ROUTE ID and copies that row's `road` verbatim** — no road name,
    status, gate or mileage is typed anywhere in the file, so **a repair needing a fact the catalog
    does not already hold cannot be expressed**. Same structural safety as
    `fix-trailhead-disagreements-batch4`'s "declare a winner, never a coordinate". The `evidence`
    quote is **re-asserted against the live row at apply time**, so a target whose prose has since
    changed is refused rather than written.
  - **Only `road` is written, never `approach_logistics`.** That blob carries `trailheadLat/Lng`, and
    [[do-not-create-a-trailhead-pin-from-the-logistics-copy]] is explicit that manufacturing a second
    coordinate record from a copy yields two records agreeing **by construction** — one claim counted
    twice. The road is a shared fact; the pin is not.
  - `audit:trailhead-road` re-run after the writes: **0 contradictions, 0 wrong-road findings**, so
    the copies did not create a disagreement in a cluster.
  - **Confirmed ON SCREEN, not inferred from the column** — a populated column is not a rendered
    one. `probe-copied-road-block-reaches-the-screen.mjs` renders the real `RouteDetail` over the
    real rows through the real `dbRouteToCamel` and asserts the GETTING THERE heading **and** the
    copied `road.name` **and** `road.status`. Two steps could each have dropped it silently and
    only rendering exercises both: `dbRouteToCamel` carrying `road` at all (it does — and note
    `road` appears **nowhere** in a grep of `lib/db.js`, since the two textual hits are
    `broad`**cast**), and the panel being gated to the **Planner** tab.
  - Trap met while writing that probe: `RouteDetail` needs the **full prop set** `check:bare`
    passes, not just `route` — a short prop list throws `Cannot read properties of undefined`
    naming the route id, which reads like a bad row rather than a bad harness.
  - **Known and deliberately propagated:** the Vasiliki donor's `seasonalGate` names a specific
    2025-26 closure window, hedged with *"exact dates varying by year"* — the
    [[a-transient-closure-in-a-permanent-field-becomes-a-lie]] shape. It is pre-existing in the
    donor, and editing it would mean typing road prose the applier structurally forbids. It belongs
    to the transient-closure sweep, not to this one.
- **`audit:access-prose`** finds road-access and permit sentences filed in a column that renders
  somewhere else — the general form of the rule this file already states for `season`, `grade`
  and `rappels`. **No coverage check can see it**: the column is populated and the prose is
  accurate, so every existing guard reads it as healthy. Only asking what the sentence is ABOUT
  separates them.
  - It splits **DUPLICATE** (road/access already states the fact, so the display column is
    repeating it) from **MISFILED** (road/access says nothing, so moving it would lose nothing).
    Read both before changing either — a season sentence may legitimately use the road as its
    boundary, and deleting it would destroy real seasonal advice.
  - **`climate` and `timing` were in the first draft and came OUT after measuring**, which is why
    the column list is short. They are keyed BY SEASON, so
    `climate.bySeason.winter = "SR-20 closed over Washington Pass"` is not misfiled — it is the
    correct answer to that field's own question. Between them they produced **693 of 1,017**
    flags, nearly all of that shape. Measuring the detector's precision took it to **207 flags
    across 164 routes**. A guard that reports correct work teaches people to ignore it.
  - It walks a jsonb value's **string leaves**, never `JSON.stringify` output. The first draft
    split the stringified JSON into "sentences" and produced fragments like
    `road normally gated until May.","summer":"Warm and dry;` — half a value welded to the next
    key, which no one wrote and neither test was really measuring.
  - **The acted-on subset was `season` and only `season`**, because that column renders in the
    header strap and this file already mandates a window there. 17 values were trimmed
    ("Jun-Sep (subject to SR-20 seasonal road closure)" → "Jun-Sep"), each only after checking
    that `road.seasonalGate` already carried the dropped clause in fuller form. 7 were left for
    hand review because they are not a `<window> (<road note>)` shape — "Often in good condition
    by May, but the Mowich Lake road frequently doesn't open until early July" is not a window,
    and rewriting it is an editorial judgement rather than a mechanical trim.
  - One road has many spellings and they do not compare as strings: `wa_honeymoon_sweet` says
    "SR-20" in `season` and "State Route 20" in `road.name`, so a raw token test reported the
    fact as uncovered and skipped a route identical in shape to five it had just trimmed.
    Normalise both sides — but lift proper-noun road names from the **original** clause, since
    normalising lowercases and a lowercased clause matches no `[A-Z]` pattern, which silently
    emptied that half of the coverage test.
  - **The remaining 192 flags are NOT a worklist, and the MISFILED half in particular is
    mislabelled** — measured, so read this before working it. Reading the bucket, most of it is
    correctly filed: a `best_season` reading *"roughly late June through September, once Cascade
    River Road opens"* is a **season statement using the road as its boundary**, which is the
    right answer to that column's own question; approach narrative in `beta` naming the trailhead
    is approach narrative; a descent hazard in `watch_out` naming the trailhead is a hazard. The
    entry above already grants that defence to `season`, and it applies unchanged to
    `best_season`, `beta`, `overview` and `watch_out`. **The label promises "moving it would lose
    nothing" and that is false for most rows.**
  - The question actually worth asking is narrower, and it is the one the original Eldorado report
    was about: **is the fact REACHABLE from the section that should carry it?** A climber taps ROAD
    ACCESS or PERMITS; if that section is empty while the route's own prose knows the road is
    gated, the page withholds what it knows — regardless of whether the prose sentence is well
    filed. `scripts/oneoff/probe-access-prose-actionable.mjs` measures it: of **182** WA prose
    sentences carrying a road fact, **180 sit on a route whose `road` or `approach_logistics`
    block already speaks about the road**. Permits: **18 sentences, 0 unreachable.** So the
    reachability defect is **2 routes**, not 190.
  - **And those 2 were not worth fixing either, which is the transferable half.**
    `wa_colchuck_balanced_rock_col_east_lake_side_approch` and `wa_northwest_face` have an empty
    `road` block — but so do **1,371** WA routes that carry access apparatus
    (`probe-road-block-coverage.mjs`: `road` populated on 1,038 of 8,365; 1,371 of the 2,424
    routes carrying access/logistics/waypoints have neither `road` nor `approach_logistics`).
    Those two surfaced only because **their prose happened to name a road**, which is a property
    of the prose and not of the gap. Repairing them would be picking 2 arbitrary rows out of
    1,371. The real item is road-block **coverage**, which is research rather than re-homing and
    is outside "move this text somewhere else".
    - **BOTH HALVES OF THAT WERE WRONG, and `audit:road-coverage` is the correction — read it
      before quoting the paragraph above.** The 1,371 is not a backlog (18 shared `access` blobs,
      55% bouldering, 1.1% carrying any approach prose — routes that describe no walk), so the
      real denominator is **19 of the 1,065 routes that DO describe a walk**. And these two are
      **not arbitrary**: prose naming a road is precisely the evidence that makes a repair
      possible, so "a property of the prose and not of the gap" had it backwards. Both were fixed
      by copying a named sibling's block behind a two-source gate, along with a third. The
      conclusion that survives is only the narrow one — **the acted-on subset of `audit:access-prose`
      stays `season`** — because road coverage turned out to be a different audit's question, not
      because there was nothing there.
      - **Precision on "prose naming a road is what makes a repair possible": NECESSARY, NOT
        SUFFICIENT.** It was true of these two because a donor block existed for that same road.
        Measured later against every such route, **3 named a road and none could be repaired** —
        one names the road up the far side of the range, one names a highway no block in the
        catalog describes at that milepost, and one had no donor because its **area** was wrong.
        `audit:road-coverage`'s buckets were rewritten around that; see its entry.
  - So: the acted-on subset stays `season` and only `season`. The rest of this audit is context,
    and the summary should be read as *"here is where a road is mentioned"*, never as a defect
    count. Same shape as the off-track pin backlog (629 → 13, most of those correct) and the
    trailhead disagreements (12 → 6): **a headline count in this dataset has overstated the work
    every single time it was quoted without re-deriving the denominator.**
- **`audit:expiring-closures`** asks whether a route states a closure that has a **shelf life** — a
  fact the world will resolve, written into a field nothing ever re-reads. `road.status`,
  `road.seasonalGate`, `road.driveNote`, `access.closures` and `access.seasonal` all render on the
  route page and all hold free prose written once by an enrichment pass. So a closure written there
  is correct on the day and a **lie** afterwards, with no symptom at all: the column is populated,
  the section renders, every coverage check is green. **135 values on 102 WA routes** carry one.
  - The case that produced the rule: `wa_mount_hopper_standard` said *"Closed indefinitely since
    October 2025 … no confirmed 2026 reopening"*. FS-24 and the Staircase area reopened 8 July 2026,
    so a climber reading it a year on is told the road is shut when it is open — the direction that
    sends somebody to a different mountain, or to drive around a gate that is not there.
  - **The precision rule, and without it this audit is noise: A YEAR IS NOT A SHELF LIFE.** 619 of
    the 5,610 WA values carry a year and most name a durable **cause** — *"impassable at milepost
    3.1 due to 2021 flood damage"* stays true until somebody repairs it, and the year is what makes
    it informative rather than vague. What expires is a claim about the **current state** with no
    date the reader can judge it by. `--inject=yearonly` pins that: every value rewritten to carry a
    year naming a cause must report **0**.
  - **T0 `expired` ASKS THE QUESTION THE COMMAND BLOCK ALREADY PROMISED, and `SELF_LIMITING` was
    what hid it.** That exclusion waves a value through the moment it names an end date, on the
    reasoning that the reader can judge it — **a claim about those dates that nothing had ever
    tested**. `wa_glacier_peak_kennedy_glacier` reads *"Closed MP 3.7 to end per MBS National Forest
    order (Dec 2024 flood damage; in effect through at least Dec 31, 2025)"*: self-limiting, and
    today an assertion its own sentence has outlived. The one-line description in CLAUDE.md's
    command block has said *"does a route state a closure that has already expired?"* since the
    audit was written; until now the script asked whether one **would**.
  - **THE PRECISION RULE IS POSITIVE, AND THE MEASUREMENT IS WHY.** 16 values name a lapsed end
    date and **15 of them are correct** — past-tense event reports (*"a washout was reported in
    January 2026"*) and historical examples (*"as demonstrated by the ~17-month Dec 2024-May 2026
    closure"*), both of which stay true forever. The tempting rule is a deny-list of history markers
    — was / had / e.g. / since rescinded — and this repo records that a deny-list is beaten by one
    more adjective. Asking instead whether the value asserts the closure is **in force** needs no
    vocabulary of history at all: 16 → 2. `SELF_ANSWERED` takes the second, `wa_sitkum_spire_standard`,
    which names its own end date **and then says the order is still active per spring 2026 alerts** —
    not a history adjective, the value explicitly addressing its own expiry.
  - **Purely additive, proven by set diff rather than by the totals.** Before/after finding sets are
    identical but for the one newly surfaced row: nothing moved tier, nothing was lost. Worth doing
    that way — the headline count is unchanged at 135, so reading the totals alone would say the
    tier had done nothing.
  - Injection-tested 6/6, and **the two that must stay SILENT are the ones that matter**:
    `--inject=expired` is satisfied by any rule that fires on a past date, and that rule reports 15
    correct values here. `--inject=expiredanswered` and `--inject=pastreport` are what separate
    *names an old date* from *asserts something untrue*.
  - **The row is REPORTED, NOT REPAIRED, and the reason is a second defect inside it.** Its
    `road.name` is *White Chuck Road (FR 23)* and its `road.status` is about that road's MP 3.7
    closure — above a `driveNote` that drives the Mountain Loop Highway to **Sloan Creek Road (FR
    49)** and an `access.closures` about the FR 49 corridor. Its four Glacier Peak siblings all name
    FR 49, and two of them say in as many words that *"The White Chuck Road (FR 23) approach from
    the north is a different start"*. So the page names one road and gives directions up another,
    and which half is wrong is a judgement no column settles — the `audit:trailhead-road` section 2
    shape, inside a single row rather than across a cluster.
  - **SETTLED, AND THE FIRST READING OF IT WAS WRONG.** "Which half is wrong is a judgement no
    column settles" was itself the mistake: it was a judgement about the SIBLINGS, and the row had
    the answer. Counting what each of its own records votes for — `road.name` *White Chuck Road (FR
    23)*, `approach_logistics.trailhead` *White Chuck River Trailhead*, its Trailhead **waypoint**
    the same, and its `approach` opening *"from the White Chuck River Trailhead (FS-23, currently
    closed)"* — the row says White Chuck four ways, and only `road.driveNote` and `access.closures`
    say FR 49. **The `driveNote` shares its first FIFTY characters with three siblings'**: copied
    from a neighbour, the mechanism `audit:trailhead-road` section 2 exists for.
    - I had guessed the opposite — that `road.name` was the stray, because four of five siblings
      name FR 49. *Reasoning from the neighbours rather than from the row* is the same error as
      reading a subtree aggregate as evidence about a row, and it would have deleted the one field
      that was right.
    - **The repair is a DELETION, deliberately not a rewrite.** No White Chuck `driveNote` exists
      anywhere in the catalog to copy, so writing one would be research typed into a repair script —
      the thing `fix-road-blocks-from-a-named-sibling.mjs` is built to make impossible. Removing a
      false direction loses nothing: `road.name` and `road.status` still name the road and its
      closure, and the route's own approach prose describes the walk.
      `audit:trailhead-road` reports 0 contradictions in every section afterwards.
    - **TWO THINGS ARE STILL REPORTED RATHER THAN REPAIRED, and both are one sentence of research
      away rather than a judgement.** The `road.status` expiry (T0 above) — and note the catalog
      already holds the answer on a DIFFERENT route: `wa_sitkum_spire_standard` records the same FS
      Road 23 order, same MP 3.7, as *"originally through Dec 31, 2025, and still active per spring
      2026 NF alerts"*. And `access.closures` still says the FR 49 corridor runs *"to this
      trailhead"*, which is false here while its wilderness-wide first clause is true — clearing the
      whole value would lose a true statement, so it needs an edit rather than a deletion.
    - **BOTH ARE NOW REPAIRED, and neither needed research — the catalog held both answers.**
      `wa_sitkum_spire_standard` records the SAME order (`#06-05-25-02`, FS Road 23, *"from
      milepost 3.7 to its terminus at FS Road 27"*, MBS) as **"Still closed as of spring 2026 per
      Mt. Baker-Snoqualmie NF alerts"** — verified across every value in the catalog that mentions
      that road or milepost, rather than assumed from *"same road, same milepost"*, which is
      exactly the near-identity this file records being burned by. The expiry clause is replaced by
      the order number and that current status; the FR 49 clause is **excised** from
      `access.closures`, keeping its true wilderness-wide statement and the ranger contact.
      **T0 now reports 0 across the whole catalog**, and `audit:trailhead-road` stays clean in
      every section.
    - **Note what the first repair TRADES, because it is a real cost and not a dodge**: T0 (a
      statement that is false NOW) becomes T3 (`as-of-period`, a statement that will age). That is
      the right direction and it puts this row exactly where its donor already sits — but it is not
      a value that has stopped needing re-reading, and the audit will keep saying so.
    - **`wa_glacier_peak_sitkum_glacier` is the MIRROR and is deliberately left alone.** Its
      `road.name` and trailhead say FR 49 while its `approach` prose opens *"From the White Chuck
      River Trailhead (2,350 ft, end of White Chuck River Road/FR 23)"*. That is not the same defect
      inverted: the Sitkum Glacier route is historically approached from White Chuck and parties use
      North Fork Sauk now that FR 23 is shut, so the road block may be CURRENT and the prose
      HISTORICAL. Which is right is a question about the world, not about the catalog.
  - **TWO detectors were built for that and both were measured and REJECTED — recorded so nobody
    re-derives them.** *Forest order numbers* looked ideal, since an order number is an exact
    identifier needing none of the six tightenings `audit:trailhead-road` required: the catalog
    cites **5 distinct orders and 0 are disputed**, so it is a detector for a class of zero
    (`probe-forest-order-agreement.mjs`). And *`road.name` against the row's own `driveNote`*
    reports **57**, dominated by tokeniser failures rather than findings — `"Salmon La Sac Rd
    (WA-903)"` against a driveNote saying *"Hwy 903"* is one road, and the extractor missed both the
    `WA-` prefix and the proper noun because it only reads names followed by *Road*/*Highway*. It
    would need `audit:trailhead-road`'s whole *a drive has several named legs* apparatus rebuilt.
    `probe-road-name-vs-own-drivenote.mjs` is kept as the measurement, not wired.
  - Four tiers, ordered by severity and **mutually exclusive** so one value cannot be counted
    twice. **research-act** (10) — the copy dates itself to when the *researcher* looked (*"as of
    this research date"*), which is the least useful possible phrasing *and* the only freshness
    signal the value carries. **open-ended** (49) — *"indefinitely"*, *"no reopening estimate"*; the
    Hopper shape. **as-of-period** (76) — *"as of mid-2026"*, *"currently"*, dated to a period the
    reader cannot place.
  - Two exclusions, **printed rather than silently dropped**: 26 values name an explicit end date
    and 4 describe a permanent closure (a bridge with no funded replacement is exactly what these
    fields are *for*). `SELF_LIMITING` had to learn the shape a closure order actually uses to state
    its own expiry — a **date range** (`effective May 20-Dec 31, 2026`) as often as a `through`
    clause; a first draft matched only through/until/expires and reported four orders that name
    their own end date as though they named none.
  - **The exclusions apply to the two shelf-life tiers only, never to research-act.** Leaking the
    research act is a defect in the *copy* — it tells the reader when an author looked instead of
    what is true — and that is wrong whether or not the closure also names an end date.
  - **Report-only, and it must stay that way**; a bulk rewrite would do damage. **The road is not
    the approach**: Staircase's road reopened while the North Fork Skokomish trail out of it stayed
    closed, so clearing the road claim without reading the rest deletes a warning that still
    applies. The phrase carrying the expiry is usually the only freshness signal the value has, so
    **date it or drop the claim** — deleting the phrase alone leaves a bare assertion that ages
    worse. And do not replace one with a closure that is true *today*; that reproduces the defect,
    which is why the original sweep deliberately did **not** record a live fire closure it had just
    confirmed.
  - **`--json` EXISTS SO NOTHING RE-DERIVES THE TIERING, and it was added because something already
    had.** `group-stale-closures-by-event` is the consumer — it turns this backlog into a research
    worklist by closure EVENT rather than by route — and its first version wrote its own shelf-life
    needle. Being looser than these four tiers (which apply the `SELF_LIMITING` and `PERMANENT`
    exclusions), it swept **~20 routes in the Suiattle corridor where this audit flags exactly ONE**:
    the other 19 already cite closure order `#06-05-26-03` and its end date, which is the very form
    this audit treats as acceptable. **Anyone working that list would have been "fixing" nineteen
    correct rows.** The four-grade-parsers shape, arriving as a second classifier for a report rather
    than as a second implementation of a function.
    - The consumer's **event key** inflated it a second way, in the opposite direction to the one
      [[a-detectors-clustering-key-decides-what-it-can-see]] records: keying on order-number →
      road+milepost → first token of `road.name` **splits one closure across several groups**
      whenever rows spell the road differently or only some cite the order. FR 6200 appeared three
      times, Hozomeen three times — so *"4 of 57 events done"* credited four settled events with 20
      routes when they cover **36 of 98**. A key too narrow to see a class costs findings; a key too
      narrow to *unify* one makes finished work look unfinished.
    - The payload **refuses rather than emitting a short one** — a serialisation that quietly lost
      the tiering reads as a clean backlog, which is the false-pass direction.
    - The script ends on `process.exitCode`, never `process.exit()`. Do not "tidy" that: on a **pipe**
      an explicit exit truncates stdout mid-write, and the symptom is a script that appears to emit
      broken JSON at a different byte every run.
  - Read-only, anon key, fails closed on an empty read **and** on zero prose values. **Not a build
    gate** — a property of the DB, not the checkout, so no code change can cause or fix it; same
    reasoning as `check:counts` and `audit:trailhead-agreement`. Injection-tested, **6** cases at the
    bottom of the script; `--inject=clean` and `--inject=yearonly` must both **PASS** with zero, and
    `expiredanswered`/`pastreport` must report zero under `expired`. **Re-run all six after touching
    the output path** — `--json` routes every report line through `say()`, so a mistake there is
    silent on stdout and invisible in the exit code.
