# Waypoints and tracks

Pins and lines: placement, dedupe, styles, track caveats and GPX files, and the waypoint audits (synthetic pins, cross-route pins, pin elevations, summit splits, order, on-track, map pins, coordinate origin).

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:waypoint-placement`** asserts that a waypoint the map cannot draw **says so** rather than
  offering a dead tap, and that **exactly one predicate** decides which waypoints those are. Static
  plus one `renderToStaticMarkup` pass, so it sits in `npm run build`.
  - **The behaviour already shipped and was described only in a COMMENT** — an unplaced row renders
    *"No coordinate on file — this point is not on the map above"* and is deliberately **not** given
    a tap handler, because a row that looks tappable and pans to nothing is worse than one that
    explains itself. Nothing rendered it, so nothing would have noticed it disappearing. **The
    comment had ALREADY gone stale**, claiming *"44 pins across 17 WA alpine routes"* against a
    measured **39 across 16** — the [[semantic-invariants-need-a-script]] shape, caught in the act.
    (**38 across 16** since the sweep below; quote the probe, never this line.)
  - **"Is this waypoint on the map?" was answered NINE ways.** `GPXMap` tested `w.lat != null` in
    **eight** places — none checking `lng`, none checking finiteness — while `WaypointList` tested
    both coordinates for a finite `Number`. All nine now call **`wpPlaced()`**.
  - **This fixed no visible bug and that is stated rather than glossed**: measured across all
    **4,230** live WA waypoints the two tests **agree**. It closes a split only a *contributed* value
    can open, and contributed rows store lat/lng as **strings** — one numeric string is already in
    the catalog. **The empty string is the case that bites**: `"" == null` is false so the map draws
    the pin, and `Number("")` is `0` which **is** finite so the list calls it placed — the pin lands
    at latitude 0 in the Gulf of Guinea. Same `Number(null) === 0` trap `audit:map-pins` records
    from a 12,215 km "disagreement".
  - **`0,0` is deliberately ACCEPTED as placed.** This predicate answers *does a coordinate exist*,
    not *is it plausible*; rejecting it here would hide a bad pin from the audits whose job is to
    find it.
  - **A TENTH PREDICATE APPEARED ONE PR AFTER THE SWEEP, WAS FLAGGED IN REVIEW, AND MERGED ANYWAY.**
    Section 1 is scoped to `GPXMap`'s body for a good reason — `peakCoord.lat!=null` is a legitimate
    test of a PEAK coordinate and flagging it would tell an author to break correct code. The cost is
    that a placement test written **anywhere else** is invisible by construction, and #1215's
    `trailheadPoint()` duly wrote one: `w.lat!=null&&w.lng!=null` for the pin, and `w.lat!=null`
    alone — **no lng at all** — for the name-matched fallback. *A review comment is not a guard.*
    - **The empty-string case is the bad one, and it defeats the very fix #1215 shipped.** `"" !=
      null` is true, so the pin branch returned `{lat:"",lng:""}` and, because it returns **early**,
      **shadowed the `approach_logistics` coordinate the function exists to reach** — the fallback
      skipped in exactly the case it was added for, with `derived:false` so no marker is drawn
      either. A lat with no lng gave the Directions button `destination=47.5,undefined`.
    - **Section 1b is structural and scoped BY THE DATA SOURCE, not by the variable name**: a
      coordinate comparison inside a callback that is **iterating waypoints** is a placement test
      whatever the parameter is called, and a test on a peak, a user position or an area cannot
      reach it. The receiver is resolved through **Babel scope**, so `const wps=route.waypoints||[]`
      counts — matching on the name alone would have missed the shape that actually got through.
      Only a **comparison** counts; a plain read (`.map(w=>[w.lat,w.lng])`) is a correct consumer of
      a placed pin and flagging it would condemn every one of them.
    - **It found THREE MORE on its first run, all in `RouteDetail`**, which is the argument for the
      widening rather than a second hand-fix. One is an **eleventh predicate — `wpPlaced` re-inlined
      character for character** inside `pickForecastWaypoints`; behaviour-identical today (`+x` and
      `Number(x)` agree), so a drift risk rather than a live defect, and exactly what the sweep
      existed to remove. The other two gate **whether GETTING THERE renders** and **whether the
      Download GPX button is offered** on a coordinate the map cannot draw — so the app would build
      a GPX file from a `wpt` with a missing or empty `lng`.
    - **Behaviour-neutral, and measured rather than asserted.**
      `verify-trailhead-point-equivalence.mjs` runs the pre-change expression and the shipped
      function over every route carrying waypoints: **1,016 compared, 942 resolving, 0 differ.** The
      reference is a verbatim copy of the old expression (correct — the original is gone, so a copy
      is the only second opinion available) while the function under test is **extracted from source
      with `ANCHOR LOST`**, because a copy of *that* would agree with itself whatever the app did.
      The four synthetic cases carry the point: the shapes the catalog does not hold **yet**.
    - The `approach_logistics` branch goes through `wpPlaced({lat,lng})` too. It is the same question
      about a different store, and `trailheadLat:""` fails identically.
    - Injection-tested **11/11**. Case 8 is the real historical defect, `trailheadPoint()` exactly as
      #1215 merged it. **Cases 10 and 11 must stay SILENT** and are what make the rule worth having —
      a peak coordinate and a plain read of a placed pin are both correct code.
  - **A TWELFTH RESOLVER, AND THIS ONE WAS LIVE ON 290 ROUTES.** #1222's own closing note said its
    rule is scoped to array-method callbacks and a placement test written as a plain expression
    would still slip past. Reading that as a **worklist** rather than a caveat found
    `TrailheadCard`, the Plan tab's directions control, resolving
    `approach_logistics.trailheadLat` **first** and the pin second — the exact **opposite**
    precedence to `trailheadPoint()`, which the map and both "Directions to…" buttons use. So the
    map drew a pin in one place while the card's Directions link, its copy-to-clipboard value and
    its "To the peak" bearing all pointed somewhere else. CLAUDE.md has recorded that split as
    user-visible since the trailhead sweep; #1215 converted two of the three surfaces.
    - **290 of the 942 routes that resolve a trailhead (31%)**, and the fix is CONSISTENCY, not a
      verdict on which record is true. This file is explicit that swapping a priority to settle the
      *data* disagreement would only move the error — that stays `audit:trailhead-agreement`'s
      subject. A page must simply not offer two destinations for one trailhead.
    - **THE NAME DOES NOT SIMPLY FOLLOW THE COORDINATE, and measuring is what settled it.** Taking
      the pin's name wholesale changed **530** cards and nearly all were **downgrades** — *"Killen
      Creek Trailhead (Trail #113, FR-2329)"* losing its road and trail number to a bare *"Killen
      Creek Trailhead"*. `approach_logistics.trailhead` is the curated field.
    - **The boundary is measured, not chosen.** The split runs **continuously to 457 m** (p50 46,
      p90 290 — one trailhead recorded twice, imprecisely) and then jumps straight to **5,733 m**,
      with nothing in between. So the name follows the coordinate only past 1 km, which lands in a
      genuine void rather than on a fitted threshold: **exactly 4 cards change name**, and all four
      are the peaks with two GENUINE approaches this file already names (Carru, Stuart's North
      Ridge, Remmel, Howard), where the logistics name really is describing the other one.
    - **The elevation is the PIN's, so it may only be shown beside the PIN's coordinate.** Two
      cards lose their elevation tile and both are correct: one pin is unplaced with no logistics
      coordinate either, and the other is `wa_spire_mountain_scramble`, which this file already
      records as pin and logistics being **different points on the same road** — its 1,156 ft
      belongs to the *"~Mile 10"* pin, not to the researched trailhead at the road's end.
    - **`trailheadPoint()` now carries `alt`** — the other record's point, when one exists and was
      not chosen — so that **nothing else has to read `trailheadLat` at all**. A second reader is
      how the split happened; section 1c enforces that there is never one again.
    - **Section 1c is parsed with Babel, deliberately.** Three comments in these two files NAME
      `trailheadLat` while explaining this very rule, and a textual scan would fail on its own
      documentation — while the blanker other guards use is unsafe here for the reason
      `check:overlay-discovery` records. It also fails **closed**: if core stops reading the column
      at all, `trailheadPoint()` has lost its fallback and that is reported rather than passing.
    - Verified by `verify-trailheadcard-consolidated.mjs`, which **extracts the shipped card's
      resolution lines from `RouteDetail.jsx` with `ANCHOR LOST`** rather than re-typing them:
      **card-vs-map split 0**, 290 coordinates moved, 4 names changed, 0 cards lost, 0 coordinates
      lost.
    - Injection-tested **14/14**. The fail-closed case is the one worth knowing about: a first
      version renamed only the first of four reads on the same line, so the counter still saw reads
      and the case reported MISS — **the edit landed by checksum without creating the defect it
      names.** Checksum movement proves an edit happened, not that it was the right one.
  - Scoped to **GPXMap's body**, not the file: `peakCoord.lat!=null` is a legitimate test of a peak
    coordinate and flagging it would tell an author to break correct code.
  - **THE 39 UNPLACED PINS ARE 1 FINDABLE AND 38 REFUSALS, and the refusals are the result.**
    `solve-unplaced-waypoints.mjs` swept every waypoint with no coordinate at all — a different set
    from the *fabricated* pins, which have one. Coverage went 39 → 38.
    - **The corroboration this repo normally uses is structurally unavailable here, and that is not
      bad luck.** `verify-researched-pin-coords.mjs` writes a researched pin only when it lands on
      the route's own gpx track — the bar that took Cutthroat Pass from 2,464 m to 36 m and
      **refused** Longs Pass. Measured: **0 of the 16 routes carrying an unplaced pin has a track.**
      A route whose pins were placed by an enrichment pass got its track from the same pass, so the
      routes missing one are exactly the routes missing the other.
    - So the gate is rebuilt from three records sharing no input: **GNIS** supplies the coordinate,
      the **USGS DEM** supplies the ground under it, and **the row itself** states the waypoint's
      elevation. Control first, from the catalog rather than from memory: four peaks whose
      coordinates this repo already stores come back within ~20 ft of their known heights, and
      *Headlee Pass* resolves to a DEM reading **42 ft** from the elevation the row independently
      states. A fourth check then asks `audit:waypoint-geometry`'s question — the pin sits 21% off
      the direct trailhead→summit line, which is what a pass on an approach is, and slots into the
      route's own elevations at 2,400 → **4,720** → 5,700 → 5,800 → 6,214.
    - **ARCGIS `LIKE` IS CASE-SENSITIVE, AND THAT NEARLY SHIPPED A UNIFORM, PLAUSIBLE, WRONG
      FINDING.** The solver normalises search terms to lowercase; GNIS matched **nothing** for 25 of
      the 39, and the run reported every one of them as *"a climbers' name, not a federal one"* —
      a conclusion this catalog's own history makes entirely believable. It was caught **only**
      because the control had already found Headlee Pass by hand, so a refusal for that pin was a
      contradiction rather than a datum. `UPPER()` on both sides; 25 unresolved became 11. *When a
      sweep's refusals all share one reason, suspect the sweep.*
    - The refusal taxonomy is worth keeping, because each is a distinct way a name fails to be an
      identity: **11** have no GNIS feature of that name near the peak (genuinely climbers' names —
      *Porkbelly Ridge crest gain*, *Class 5 Step*); **8** name a **structure** the feature does not
      — a camp, a junction, a crossing, a headwaters — so borrowing its coordinate is wrong by
      however far the two stand apart; **13** match only a shared word (*Custer-Spickard Saddle* →
      *Custer Ridge*; *Needle Pass* → *The Needles*; *Hidden Lake* → *Hidden Lake Peaks*); **4**
      carry no distinctive proper noun at all (*North Peak Summit*); and **2** are refused by the
      DEM. Those last two are the gate working: *"~5,300-ft saddle below Mt. Watson"* matched
      **Mount Watson itself** at 6,181 ft, and a saddle below a summit is not the summit.
    - **23 of the 39 are LINEAR or AREAL** — cliff bands, traverses, drainages, ridge crests — and a
      label point cannot locate an edge. Those have no coordinate to find, not a coordinate nobody
      has looked for.
  - **IT COST 37s AND NOW COSTS 20s, and the profile is recorded because the obvious suspect was
    wrong.** A build-chain guard is paid by every author and every CI run. The suspects were the
    esbuild bundle and the SSR render; measured, the bundle is **0.4s** and both renders together
    are **0.5s**. The cost was **parsing 1.5 MB of JSX twice** — sections 1b and 1c each parsed and
    traversed both files independently (14.6s + 7.5s) — and Babel **scope resolution**, which ran on
    every array-method receiver whether or not the receiver text had already answered the question.
    One parse and one traverse per file with both visitors, and `getBinding` only when the name has
    not already matched. Same ASTs by construction, so nothing asserted changed.
    - **Quote 37s, not the 2m29s this was first measured at.** That reading was taken while the box
      was running injection suites and CI for several sessions at once — the
      [[chrome-ext-has-no-site-permissions]] lesson, which is about load rather than Chrome. A
      timing taken on a loaded box is not a profile.
    - **The probe process rendered in 0.5s and then sat for another 2.4s** waiting for the event
      loop to drain, and that linger is **unbounded**: one long-lived timer or retrying fetch added
      to the app and this build gate HANGS rather than fails, which is the worst way for a guard to
      break. It writes its markup to a FILE and calls `process.exit(0)` — a file, not stdout,
      because this repo already records that `process.exit()` truncates a **pipe**, and
      `writeFileSync` completes before exit by construction so the two fixes do not fight.
    - The payload carries **no newline**; the two markers delimit it. A `\n` inside the generated
      probe collapsed into a real newline and broke the string literal — sidestepping the escape
      beats adding another backslash to it.
    - **Re-run the 14 injection cases after any change here, and judge on those rather than on the
      clock.** An optimisation that makes an assertion VACUOUS still prints `ok` and still runs
      faster. 14/14 after the change, including the four that must stay silent.
  - Two traps the probe hit, both already recorded here: the esbuild bundle **must be written inside
    the project** (node resolves `react` from the nearest `node_modules`, and a bundle in the OS temp
    dir throws `ERR_MODULE_NOT_FOUND`), and `--define:import.meta.env={}` is required because
    `lib/supabase.js` reads it at module scope.
  - **A THIRD, and it does not announce itself: `--jsx=automatic` is REQUIRED.** esbuild defaults to
    the CLASSIC runtime, which emits `React.createElement` and needs `React` in the bundle's module
    scope — it is not there, so the render dies with `React is not defined`. On a loaded box it
    exhausts the heap on the way and dies with **`Ineffective mark-compacts near heap limit`**
    instead, which reads as a memory problem and invites `--max-old-space-size`. `check:bare` passes
    the flag (`jsx: "automatic"`, `loader: {".jsx": "jsx"}`); copy that invocation rather than
    writing a fresh one.
  - Injection-tested **7/7**, each case proving its edit landed by checksum and the harness asserting
    both sources are byte-identical afterwards. Case 6 initially reported **EDIT NEVER LANDED** — the
    pattern, not the guard, was wrong.
- **`check:waypoint-dedupe`** asserts that `dedupeWaypoints` merges a **SINGLETON** type — two
  "Summit" pins are the same summit whatever they are called — and that **`trailhead` is not one**.
  It was: the rule read `/^(summit|topout|trailhead)$/i` and merged two trailhead pins on **TYPE
  ALONE**, ignoring both their names and their coordinates. Static, no browser, no DB — it executes
  the real exported function over constructed pins, so it costs a module import.
  - **THE MERGE IS WORSE THAN A DROP, because `mergePair` keeps the FIRST pin's coordinate and the
    LONGER name.** `wa_remmel_mountain_southeast_slope` stores *Thirtymile Trailhead*
    (48.8228,-120.0197) and *Andrews Creek Trailhead* (48.7837,-120.1086), **7,829 m apart**, and
    rendered as **"Andrews Creek Trailhead" AT THIRTYMILE** — one start's label on the other's
    position. Not cosmetic: that pin drives the Directions button through `trailheadPoint()`, and
    `gpxDownload` writes waypoints into the file a climber carries into the field.
  - **CLAUDE.md ALREADY NAMED THE PEAK, TWICE.** `audit:trailhead-agreement` records Remmel among
    the four WA peaks with two GENUINE approaches (with Carru, Howard and Stuart's North Ridge) and
    says outright **"do not sweep these"** — while the render path was sweeping one of them on every
    page load. *A rule written for summits was applied to trailheads without asking whether the
    reasoning transferred.*
  - **Nothing could see it, and the reason is the shape of the merge.** Every coverage guard asks
    whether a column reaches a screen, and this one did — with the wrong number of pins.
    `audit:waypoint-order` reported it as a "duplicate", which is what it looks like from a count.
    The pin that survives looks like an ordinary correct pin.
  - **Removing `trailhead` costs nothing a trailhead needs, measured rather than argued.** Two pins
    for ONE start still merge on `sameSpot()` (~30 m) or on `nameKey()`, the way every non-singleton
    type is handled. Behaviour-diffed through `tidyWaypoints` across all **1,011 WA routes carrying
    waypoints: exactly ONE renders a different list, and NONE renders fewer pins** — the reference
    being the pre-change file **extracted from git**, never a retyped copy. Confirmed on screen
    afterwards; both trailheads render, in stored order.
  - **A GATE FOR A CLASS OF ONE, on the two grounds `check:bottom-panels` records.** *Anti-revert*:
    the fix removes one word from a regex alternation, so it changes **no identifier** and
    `audit:silent-reverts` is blind to a stale-base squash putting it back — that audit says so in
    its own closing caveat. Nothing else in the repo gates `lib/waypoints.js`; its two importers are
    report-only DB audits outside the build. *Class growth*: the class is one route today only
    because one route stores two trailhead pins, and the next one to record a second start is eaten
    in silence.
  - **ORDER IS LOAD-BEARING AND THE INJECTION SUITE IS WHAT PROVED IT.** The fail-closed floor was
    written first and exited first, so gutting `SINGLETON` reported *"this run proved nothing"*
    rather than naming the summit rule that broke. The named assertions report first now; the floor
    only has a job on a clean run. Same mistake `check:clickable` and `check:field-renders` record.
  - **A SECOND WAY THE SAME FUNCTION ATE A GENUINE PIN, found by asking the neighbouring rule the
    same question.** `nameKey()` strips words that "carry no distinguishing information", and
    **eight of the sixteen were POSITIONAL** — `upper|lower|west|east|north|south|true|main`. A
    positional word is usually the *whole* distinction: `wa_bedal_peak_standard` stores **"Upper
    Boulder Field"** and **"Lower Boulder Field"** as two Hazard pins **435 m apart**, and they
    collapsed to one key and one pin; `wa_davis_peak_nc_southwest` the same with **"Upper cliff
    band"** / **"Lower cliff band"**, 184 m apart. Both are **hazards**, so a climber saw one marker
    where the route records two.
  - **The defect the STOP list exists for is not handled by the STOP list at all**, which is what
    makes the removal safe: *"Forbidden Peak summit"* vs *"Summit"* is a **SINGLETON**, merged on
    TYPE before any name is compared. So the generic nouns still earn their place and the positional
    adjectives do not. Behaviour-diffed across all 1,011 WA routes carrying waypoints: **exactly TWO
    render a different list, both gaining the eaten pin, and NONE renders fewer.**
  - **Both directions are asserted**, because a guard that only ever demands MORE pins is satisfied
    by gutting `STOP` entirely: two spellings of one junction (an article, a case difference, a
    generic noun) must still merge. `no-name-merge` is that case.
  - Injection-tested **9/9** (`scripts/oneoff/inject-waypoint-dedupe-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring `lib/waypoints.js` byte-identically. Cases 1 and 5 are the two
    real historical rules. **TWO cases must stay SILENT** — either list with its members reordered is
    not a change. **A case reported `WRONG FAILURE` while the guard was innocent**: it
    matched `"FAIL - " + expect`, and the guard prefixes each line with the assertion's own label,
    so a guard firing on exactly the right rule read as a miss. Match on a FAIL **line**, not from
    its start.
- **`check:wp-styles`** asks whether the app can *draw* every kind of waypoint it *recognises*.
  Two maps in `ClimbMatchCore.jsx` describe waypoint types and were maintained separately:
  `WP_TYPE_MAP` turns ~30 raw spellings into a canonical type (`"lake"` → `Water`), and
  `WP_STYLE` turns a canonical type into `{color, glyph}`. Nothing tied them together and they
  drifted: `WP_TYPE_MAP` emitted five canonical types — **`Base`, `Crag`, `Pass`, `Approach`,
  `Landmark`** — that `WP_STYLE` had an entry for **none** of, so all five fell through
  `wpGlyph`'s `||"📍"` fallback and rendered as one identical grey emoji pin. **141 waypoints on
  130 WA routes**, with a route's Base indistinguishable from its Landmark. Static apart from
  one `renderToStaticMarkup` pass, so it sits in `npm run build`.
  - **Invisible to every gate that already existed**, which is the argument for this one: both
    maps are valid JS, every identifier is bound, the screen renders, and a pin appears — it is
    just the wrong pin. `check:refs`, `check:dead-props` and `check:field-renders` are all
    structurally blind to it (the column is populated *and* rendered; only the glyph is wrong).
  - It also caught a **second** defect of the same family: the two Leaflet marker call sites did
    `wc[wp.type]`, indexing the colour map with the **RAW** string and bypassing the normaliser
    the rest of the app goes through. `WP_TYPE_MAP` is keyed lowercase, so `"Lake"`, `"camp"`,
    `"Base/bivy"`, `"Trailhead/pass"` all missed and drew grey — **20 more waypoints whose
    colour this app already knew**. A raw lookup is a *silent* miss: it yields `undefined`,
    falls to the default, and throws nothing. Section 3 forbids the shape outright.
  - **Parsed with Babel, deliberately not with the comment/string blanker the sibling guards
    use.** A raw regex would match the explanatory comments (which quote `wc[wp.type]` as the
    defect) and report phantoms; but the blanker is unsafe *here in the other direction* — it
    treats every straight quote as a string delimiter and JSX body text is full of them, so it
    can desynchronise and wipe a **real** `wc[w.type]`. That is a false pass, the one outcome a
    guard must never produce. An AST has neither failure mode. Note the split from section 1,
    which reads **raw** source because every value there *is* a string literal and blanking
    would report two empty maps as two agreeing maps.
  - **A glyph must be a text-presentation character**, tested with `\p{Emoji_Presentation}`. A
    codepoint with emoji presentation is painted by the font's colour glyph and **ignores the
    CSS `color` beside it** — which is exactly what 📍 did. A hand-rolled codepoint range was
    tried first and called the existing, working `⚑` and `⚠` defects (both are `Emoji=Yes` but
    `Emoji_Presentation=No`); widening it by name would have hidden the next real one. `U+FE0F`
    is checked separately, so `"⚠️"` fails where bare `"⚠"` passes.
  - **THE MAP DREW COLOUR-ONLY DOTS WHILE THE LEGEND PROMISED AN ICON, and that had been true
    since the glyphs were added.** `WP_STYLE` carries a colour *and* a glyph, and the glyph exists
    because colour alone fails for red-green deficiency on exactly the Trailhead/Summit/Hazard trio
    and fails for everyone on a sunlit phone. That reasoning was applied to the legend and to the
    waypoint list and **never to the renderer it was written for**: every marker `GPXMap` and
    `WaypointMapPicker` drew was an `L.circleMarker` with a `fillColor` and nothing inside it. The
    legend said `◈ Trailhead`; the map showed a green dot.
    - Worst for the five descriptive types, which shared one colour and were separated by glyph
      **alone** — so on the map they were completely indistinguishable from each other, which is
      the very defect adding the glyphs was meant to fix.
    - `wpDivIcon(L,type,size,ring)` is the single builder both maps use, so they cannot drift the
      way the three copies of `WP_STYLE` did. The fill is solid rather than the legend's 13% tint
      because a tint is illegible over terrain tiles; **colour and glyph — the two things that
      identify a type — are the same in both places.**
    - Track endpoints follow the legend **when they name a legend type**: an alpine route's
      `endpointLabels` is literally `{startLabel:"Trailhead", finishLabel:"Summit"}`. A non-alpine
      route labels them `Start`/`Finish`, which are positions on a GPS track rather than waypoint
      types, so those keep a plain dot — giving them a Trailhead glyph would assert a type nobody
      recorded.
  - **The five descriptive types now have their own colours, and the old argument for sharing grey
    was OVERTAKEN rather than overruled.** It ran: the palette's nine chromatic hues are spent on
    the eight navigational types, minting near-duplicates would damage them, and **reusing** a hue
    would be worse than grey — a Crag drawn in Campsite purple is not ambiguous, it is a wrong
    navigational claim. Every step of that is still true, and all of it assumed **colour alone** had
    to carry the distinction. Once the map draws the glyph, a near-duplicate hue is no longer a
    wrong claim but a second signal agreeing with the first. Five new tokens (`lime`, `cyan`,
    `indigo`, `magenta`, `brown`) sit in the gaps the eight leave; the glyph still carries the
    primary distinction. `probe-map-icons-match-the-legend.mjs` pins 13 unique colours, 13 unique
    glyphs, and that every marker embeds both — lifting `WP_STYLE` and `wpDivIcon` from source with
    `ANCHOR LOST` rather than copying them.
  - **`Approach` is the dashed `⇢`, not `→`** — the plain arrow appears **104 times** in this app
    as ordinary copy (`See all →`), so as a pin glyph it reads as punctuation, *and* no render
    assertion could tell the pin from a link. A glyph used elsewhere as prose is not a glyph.
  - Section 4 renders the real `RouteDetail` over waypoints carrying **raw** spellings
    (`"Climbing area"`, `"col"`, `"Lake"`) and requires the glyph the *normaliser* should reach,
    exercising `WP_TYPE_MAP → wpType → WP_STYLE` end to end. It demands **two** occurrences of
    each, not one: every type renders on two surfaces (the list row and the map legend) and an
    "at least once" test is satisfied by **either** — measured, after blanking the list's glyph
    left the assertion green on the legend alone. Same vacuous-pass shape as `check:bare`
    matching the Safety tab's "Fire & smoke" link.
  - The legend now lists only the types **the route actually uses**. It printed all of `WP_STYLE`
    unconditionally, which already described types the map did not draw; at 13 styled types that
    becomes a wall of pills mostly about other routes.
  - `WP_TYPES` (what the editor offers) is deliberately **not** widened — the reverse direction is
    fine and precedented, since `Bailout` has always been styled without being offered. The guard
    only forbids offering a type that cannot be drawn.
  - Injection-tested, 8 cases at the bottom of the script, all caught. **Two were harness bugs
    first, and both are the `injection logged, counter didn't move` shape:** the glyphs were
    written as perl `\x{22A5}` escapes and perl without `-CSD` works on **bytes**, so three cases
    reported "not caught" while the file was never modified; and case 7 aimed at `wpGlyph(_wty)`
    when the surface rendering on Overview is `wpGlyph(_wt)` — `RouteDetail` has **three**
    waypoint glyph surfaces, not one. Every case now proves the edit landed *by checksum* before
    it judges the guard.
- **`check:track-caveat`** asserts that a line drawn between a route's own waypoints does not pose
  as a recorded GPS track. **201 of the 580 WA routes carrying a `gpx` store a polyline whose every
  vertex IS one of that route's own waypoints** — median **four** points, 162 of them spanning more
  than 2 km. The route page renders those under a ROUTE TRACK heading, draws them on the map, and
  offers **Download GPX**, so a climber can take away five straight segments across 22 km of the
  North Cascades (`wa_amphitheater_mountain_north_ridge`) as though somebody had walked it. The
  waypoints are real and worth keeping; calling the line between them a track is the untrue part, so
  the fix is a **caption**, the same shape as the RACK caption and the fire panel's point-of-origin
  caveat. Static SSR, so it sits in `npm run build`. See `lib/track.js`.
  - **The provenance chip does not already cover this, and the measurement says so in the worst
    way.** `auto_generated` is true on **45%** of the synthetic tracks and on **78%** of the routes
    whose track is genuine — it points the **wrong way**, so a climber reading the chip cannot tell
    which kind of line is on screen. That is the rule `check:provenance` already records: a
    per-section signal must beat the route-level flag.
  - **No waypoint audit can see this class, by construction.** All three ask *"is each pin on this
    route's own track?"* and on these routes the answer is **yes because the track is a copy of the
    pins** — two records agreeing is one claim counted twice, the shape
    [[prose-can-be-the-contaminated-half-ask-the-track]] records. The tiny-stub placeholder gate
    those audits carry is about **extent** and cannot reach it either: these have large extent and
    unremarkable point counts. It also means an off-track finding on such a route is not evidence.
  - The predicate requires **every** vertex to be a waypoint, not most: a genuine track passes
    through its own waypoints too, so a threshold would caption correct data. What distinguishes
    the synthetic ones is that there is nothing in the line *except* the pins.
  - **The ANCHOR is `>ROUTE TRACK<` in the RAW html, never the stripped words**, and that was found
    by injection rather than by reading it. **Two surfaces render that text**: CAMPING & BIVY's prose
    says *"Anything marked on the track is also a pin under ROUTE TRACK."* whenever a campsite
    waypoint is on the track. A stripped-text anchor matched that sentence, so renaming the heading
    left the check **green**. The same two-surfaces trap this file records for `rappels`.
  - **A LINE THAT GOES NOWHERE IS A THIRD CLASS, and the READER was the only layer that did not
    know.** `trackCoverage` returns null below **500 m** of extent because measuring pins against a
    dot manufactures huge distances out of nothing, and the waypoint audits carry the same gate —
    but the route page drew those lines under ROUTE TRACK with **Download GPX** beneath them and
    said nothing. **Five routes**, spanning **7, 18, 55, 69 and 451 m** end to end;
    `wa_sky_mountain_s_route` is NINE points across SEVEN METRES, so a climber tapping that button
    gets a seven-metre file. `trackStubCaveat` says so and quotes the span.
    - **500 m is the existing gate, not a new number**, and it lands in a real void — the next line
      up is well clear of it.
    - **EXCLUSIVE BY CONSTRUCTION rather than by the caller remembering**: ten of the fifteen
      sub-500 m lines already caption as waypoint joins, and two sentences on one section read as
      two problems when it is one problem twice. Proven on live rows: 5 gained, **0 carrying two
      captions**.
    - **The span needs a SHORT formatter.** `_gapDist` rounds to 0.1 km, which renders seven metres
      as *"0 km"* and reads as a bug rather than as the point; `_shortDist` gives metres or feet.
      `uImp()` is the real boolean there too — `uDistMi` is a FORMATTER and always truthy, the #641
      trap. A guard case pins that the span does not round away.
  - **AND A SECOND BRANCH FOR A LINE WITH TOO FEW POINTS TO BE A RECORDING OF ANYTHING — a
    CATEGORICAL claim rather than a threshold.** Fifteen routes store a "track" of exactly **TWO**
    points; `wa_mount_rainier_edmunds_headwall` is a single straight segment across **16.4 km** of
    Mount Rainier, drawn under ROUTE TRACK with Download GPX and no caption. N points make N-1
    straight segments; at two that is one chord, and no reading makes a chord a recording of a walk.
    **16 routes** (15 two-point, 1 three-point).
    - **FOUR IS THIS FILE'S OWN FLOOR, not a new number**: `trackCoverage` already returns null
      below it for the same reason. And the data has a void either side — among the lines the app
      says nothing about, vertex counts run 2, 3, 4, 6, 7, 8, 10, 11 and then **jump to 20**.
    - **DELIBERATELY NOT WIDER, and the guard pins the floor as hard as the finding.** An
      eight-point line across 18 km is equally implausible, and saying so needs an argument about
      how coarse a SIMPLIFIED track may be — which the continuous spacing distribution does not
      support. `floor-widened-to-eight` must fail.
    - **The vertex-count axis has a void where SPACING does not**, which is why it was worth asking
      after concluding spacing could not separate. Two different axes; one measurement does not
      settle the other.
    - Injection-tested **5/5** (`scripts/oneoff/inject-not-a-track-cases.mjs`). **The STUB fixture
      was two points and had to be widened to four**: a two-point stub also satisfies the
      too-few-points branch, so killing the placeholder branch left it captioned anyway and the case
      came back WRONG FAILURE — the same wrong-half mistake the two-point cases already record,
      caught only because each case is judged on its own failure text.
  - **THE DIFFERENT-APPROACH TEST WAS UNREACHABLE IN HALF THE CASES IT EXISTS FOR.** It asks
    whether the line passes ANY of the route's own pins, and it sat **below** `if (!missingApproach
    && !missingSummit) return null` — so it could only ever speak about a line that was ALSO short
    at one end. Those are independent questions: a line can cover both ends and still pass none of
    the places the pins name. Moved above the early return; **GAINED 1, LOST 0, CHANGED 0** across
    the catalog. Same ordering defect `check:outage-copy` records for `DbGuideApply`: *a guard
    placed after the branch that returns is unreachable in the case it exists for.*
  - **A SPACING-BASED CAPTION WAS RE-MEASURED AND REJECTED AGAIN, AND THE OLD REASON HAD EXPIRED.**
    The recorded rejection was that 62 of 66 such lines were already reachable by the one-vertex
    slack — true then, and stale once the slack widened. The new reason is stronger and is a
    property of the data: among the **354** uncaptioned lines the median vertex spacing is
    **continuous** — 92, 93, 100, 106, 124, 145, 153, 189, 205, 262, 267, 291, 328, 446, 521, 538,
    594 … with **123 lines between 48 m and 499 m** — so any cut is fitted rather than derived, and
    a coarse or simplified recording is not separable from a drawn line by spacing.
    `measure-drawn-lines-posing-as-tracks.mjs` is that measurement.
    - **Its FIRST version was the instructive part**: pointed at gpx vertices,
      `coordinateIsComputed` reported **976 of 976 points** on `wa_old_snowy_mountain_r1`. That is
      not a fabricated track — it is a real recording whose coordinates went through a numeric
      transform, which leaves a full float tail on EVERY point. **The decimal rule was calibrated
      against a HAND-TYPED waypoint and does not transfer to a machine-written vertex**; what made
      the #1572 vertices fabricated was a MINORITY carrying one, on the chord between hand-placed
      neighbours.
  - **SECTION 5 — A HEADING MUST NOT NAME A KIND ITS LIST CANNOT CONTAIN, and the Help FAQ pointing
    at it made the stronger version of the same claim.** Sections 1-4 are about the LINE on the map;
    the list one block below it merges `route.communityTracks` with the route's TRIP REPORTS, and
    was headed **"Recent recorded tracks"** while every report row reads *"Trip report — no recorded
    track."* `communityTracks` is **seed-only** — two seed ROUTES carry it, `routes` has no track
    column under any spelling, and `dbRouteToCamel`'s spread therefore cannot deliver one (that
    spread is why a zero grep in `lib/db.js` proves nothing by itself). Production sets
    `VITE_USE_DB=true`, so on **every route a real climber opens** the list is trip reports and
    nothing else, under a heading asserting all of them are recorded tracks.
    - **The FAQ was worse, and is why the class earned a gate.** It asked *"Can I see other people's
      recorded GPX tracks?"* and answered **"Yes."**, naming the section by its old heading — a flat
      promise production cannot keep. It now opens *"Rarely — almost no route carries one yet"* and
      describes what the rows actually are.
    - **The heading is DERIVED from `RouteDetail.jsx`, never restated in the guard**, so a rename has
      to update the FAQ rather than this file — a restated vocabulary is how this codebase got four
      grade parsers. The FAQ assertion is what catches the two drifting apart, and the injection case
      that renames the heading and leaves the FAQ behind is what proves the derivation works.
    - **ANCHOR ON THE CAPTION, NOT THE HEADING**, and the injection suite is what forced it: the
      first version anchored on the heading itself, so **every** edit to it reported `ANCHOR LOST`
      and the specific assertions never ran — three cases came back `wrong failure` against a guard
      that was firing correctly. *"The anchor moved, re-point the guard"* and *"you changed the
      heading, change it back"* want opposite repairs, which this file already records from
      `check:match-percent`.
    - **BOTH DIRECTIONS**, because a rule that only forbids the old wording is satisfied by deleting
      the section, and one demanding *"trip reports"* alone would be false on a seed route, which
      really does carry a recorded line. The heading must still name **tracks** as well.
    - **Measured rather than reasoned** by `scripts/oneoff/measure-recorded-tracks-heading.mjs`,
      which renders both shapes with a seed CONTROL — without it a null result would just mean the
      section never rendered. **Its own first fixture was wrong**: it put the reports on
      `route.activity`, which is the SEED shape, manufacturing a state a DB route cannot reach — the
      trap this file records for the CI fixture. Corrected to reports arriving as a **prop** with no
      `activity` key on the route at all; the verdict was unchanged.
    - **A previous session had already fixed the ROW** (it claimed *"Recorded line — followed the
      standard route"*) and another fixed this section reading the raw `route.activity` instead of
      the page's merged list. Both probes are still green; the heading above them was what was left.
      **Read `scripts/oneoff/` before re-deriving a finding here** — grepping the two existing probes
      is what turned a heading rename into a measured defect and stopped a third rediscovery.
  - Injection-tested, 5 cases named at the bottom of the script; deleting either caveat, forcing
    either predicate true (which must fail the *genuine*-track assertions — a false warning on good
    data is the direction that teaches people to ignore it), and renaming the heading.
  - **It also guards the SECOND thing a drawn line can be lying about: how much of the route it
    covers.** A partial track is a *genuine* recording, so `trackIsJustTheWaypoints` is blind to it
    by construction — and the page drew it with a **Download GPX** button underneath and said
    nothing. `trackCoverage()` reports which end is missing and by how far; **68 WA routes** now
    carry the sentence (62 missing the walk-in, 5 stopping short of the summit, 1 both).
    - **The two ends are DIFFERENT facts and are asserted separately.** A missing approach means
      the line begins up the mountain. A missing summit means somebody following it **runs out of
      line while still climbing** — the dangerous half — so a check that fires on "is partial"
      could not tell you which one broke.
    - **The threshold is 2 km at both ends, and it is precedent rather than a fitted number** —
      the same 2 km `audit:waypoints`' *"TRACK NEVER COMES WITHIN 2 km OF THE PEAK"* uses. It is
      chosen against the measured distribution, not to produce a wanted answer: trailhead→track is
      **bimodal**, p50 **41 m** (the line starts at the trailhead, as expected) against p90 **6.7
      km**. Tightening the summit end to 1 km would flag 19 rather than 6, and those extra 13 are
      **not attributable** — a line ending 1.2 km from the summit *pin* is equally consistent with
      the pin being wrong, which is its own known defect class.
    - The caveat **states the measured gap**, and the guard fails if it renders without one:
      *"this track is incomplete"* is nothing a climber can plan around, and a sentence quietly
      losing its number is how this degrades.
    - It returns **null rather than guessing** on a stub, on a synthetic line (which already
      carries the stronger caveat — two captions contradicting each other is worse than one), and
      on a route with no Trailhead or Summit pin to judge against. All three are asserted.
    - **Verified against the shape the reader actually gets, not the raw column**
      (`probe-track-coverage-fires-live.mjs`). The app renders through
      `dbRouteToCamel → normalizeWaypoints`, which coerces `lat`/`lng` — **contributed rows store
      them as STRINGS** — and rewrites `type`. `pointOf` demands a real number and the pin lookup
      matches on `type`, so either step could have made the caveat fire on **nothing** while the
      column stayed populated. The probe **exits 1 on a zero count** for that reason.
    - Independent corroboration that it measures the right thing: the summit-shortfall list is
      Himmelhorn, West Twin Needle and Fuhrer Finger — routes `audit:waypoints` already reports
      under `trackOffItsPeak`, reached by a different method. Each was checked with
      `probe-whose-track-is-it.mjs` and **none is a foreign track**: every one starts at the
      right trailhead and ends in the right massif, so *short* is the correct diagnosis.
    - **A THIRD state exists because the first version got two routes wrong, and it is the most
      useful thing in this entry.** On some routes the line and the pins are two **complete**
      records of **different ways up the same peak**, and calling the line partial blames the
      wrong half. `wa_mount_barnes_scramble` is the case: its own approach text names two
      approaches — west via Sol Duc over the Bailey Range, east via the Elwha River Trail from
      Whiskey Bend — and all **eight** of its waypoints are on the Sol Duc one while its
      **438-point** gpx is the Elwha one. It rendered *"starts 18.9 km from the trailhead and
      stops 6.4 km short of the summit"*, every number true and the accusation misdirected. The
      same misattribution `audit:map-pins` warns about for two-trailhead routes, and the reason
      that audit reports candidates rather than defects.
      - **The discriminator is whether ANY of the route's own pins lie on the line**, with
        per-type tolerances. A genuinely climb-only track still carries its **upper** pins — the
        summit, the high camp, the col — because the recording does cover that stretch; only the
        approach pins are off it. A track of a different approach carries **none**, because it
        never passes any of the places the pins name. Measured: **66 partial, 2
        different-approach** (Barnes and `wa_goode_mountain_northeast_face`).
      - **Two placed pins are required.** With one, "no pin is on the line" is a coincidence away
        from a wrong story, and the safe failure is the ordinary partial wording. Asserted.
      - The sentence **does not pick a winner** — on a peak with two genuine approaches both
        records are right, and nothing available here separates that from a line filed against
        the wrong route. It says the two disagree and stops.
      - **The live probe had the same bug one level up**: its ternary let a `differentApproach`
        row fall through into the "stops short of summit" bucket, so it reported the two routes
        it exists to separate as the very thing it had just stopped calling them. Order the
        branches with the new state first. *A probe that misreports its own fix is the shape this
        file keeps recording.*
- **`check:gpx-caveats`** asserts that **the caveat survives the download**. Static (one esbuild
  bundle, no browser, no DB), so it sits in `npm run build`.
  - **EVERY HONESTY CAPTION THIS REPO HAS BUILT FOR A ROUTE'S LINE LIVED ON A WEB PAGE.** The screen
    says a line is straight segments between waypoints, or a placeholder, or short at one end — and
    then offers **Download GPX**. `gpxDownload` wrote `<wpt>` entries and a `<trk><name>` with **no
    `<desc>` anywhere**, so the file loaded into Gaia or CalTopo as a track named after the route
    with nothing attached. **The disclaimer stopped at the browser, and the file is the one place
    the reader cannot go back and re-read the page.**
  - **393 of 581 drawn lines now export a description** — 208 waypoint joins, 55 partial-coverage,
    16 too-few-points, 5 placeholders, 3 different-approach, plus 198 carrying a manufactured-pin
    note at file level. **0 files carry two contradictory track sentences**
    (`measure-gpx-files-gaining-a-caveat.mjs`, which exits 1 if any does).
  - **`buildGpx` was SPLIT OUT of `gpxDownload` so the file can be asserted on.** The download half
    calls `Blob` and `document` inside a `try/catch`, so anything calling it in node had the
    exception swallowed and could never see what was written. *A writer whose output nothing can
    read is a writer nothing can guard.*
  - **ONLY THE ROUTE'S OWN LINE CARRIES THESE.** With `overridePts` the export is a climber's
    recorded track, whose provenance is different and about which none of these sentences is true.
    Injection case `community-track-inherits` pins it.
  - **GPX 1.1 IS A SEQUENCE** — metadata before wpt before trk, and inside a trk, name before desc
    before trkseg. Out of order is an invalid file that some readers reject outright, and the order
    is asserted rather than assumed.
  - **THE ESCAPING ASSERTION WAS VACUOUS AND ONLY THE INJECTION SAID SO.** A description is a
    SENTENCE, so `& < >` are escaped rather than deleted the way a route title safely can be — but
    nothing reaching `<desc>` contains one today: every caveat is plain English and the names are
    stripped upstream. The first version built a route called *"A & B"* with a waypoint *"Camp <1>
    & 2"*, asserted no bare ampersand, and **passed against escaping that had been deleted**. It
    pins the escape **as source** now and says plainly that it does not observe the result.
  - Fails **closed**: a bundle that does not build, `buildGpx` missing, a file under 200 characters
    (against which every *must contain* passes), or a file carrying no track points at all.
  - Injection-tested **7/7** (`scripts/oneoff/inject-gpx-caveat-cases.mjs`). **`reordered-composition`
    must stay SILENT** — the notes are composed in `lib/track.js` and the file only carries them, so
    reordering changes nothing a reader sees, and a guard firing on it would pin an implementation
    detail rather than the promise.
- **`audit:synthetic-waypoints` found 63 routes and 199 was the truth**, and the reason is a shape
  worth recognising elsewhere: it asked its question **about the route as a whole**. Every
  intermediate pin on the first→last line, AND ≥5 pins, AND ≥1,500 ft of relief — three gates
  ANDed, so a route that is *partly* fabricated satisfies none of them and reads as clean.
  - **Partial fabrication is the COMMON case, not an edge one.** A real trailhead and a real summit
    with the middle filled in; or a run of pins interpolated between two *interior* pins.
    `wa_mount_thomson_west_ridge` holds pins 2-7 on one bearing to six figures while pin 1 is
    genuine — the whole-route test needs pin 1 on the line too, so it saw nothing. **136 of the 188
    partial routes were invisible to the original test.**
  - **One-axis interpolation defeats every geometric test.** The Dorado Needle rows interpolated
    LONGITUDE alone: latitudes are clean 5-decimal values, longitudes run to 17. Nothing is
    collinear in the plane. A first draft of the new detector asked whether a pin's latitude- and
    longitude-fractions agree between the endpoints, reported 87 routes, and called those rows
    clean while a diagnosis agent had proved them synthetic. **Both were right about different
    things** — which is the tell that a detector is narrow rather than that a claim is wrong.
  - So the strongest test needs **no geometry at all**: a surveyed coordinate is written to 4-6
    decimals, and `-121.16888095238095` is 17 — that tail is 5/21, the floating-point residue of
    dividing a span into equal parts. It is per-PIN, so it survives partial fabrication, and it is
    not arguable. **481 pins of 4,195 (11.5%).**
  - **The run test is only usable because the two agree.** 127 routes carry both tells, measured
    independently. A run of exactly 3 with no second tell is luck as often as fabrication (19 WA
    routes sit there), so 3-pin runs need corroboration and 4+ stand alone.
  - **A RUN'S ENDPOINTS ARE ITS ANCHORS, and expanding `run x-y` into "pins x..y are fabricated"
    sends a repair pass after pins that are already right.** Interpolation is drawn BETWEEN two
    points somebody actually knew, and on these routes those two are overwhelmingly the trailhead
    and the summit — the pair a research pass was most likely to have. Measured against an
    independent record per pin (the route's `areas` row for a summit, its own `approach_logistics`
    for a trailhead): of 72 endpoints flagged by the run test **and by nothing else**, 50 were
    judgeable and **all 50 agreed, 49 of them to the metre. None disagreed.** The fabricated pins
    are the run's INTERIOR. The script says so in its own output now, because the report was read
    the wrong way once and the resulting worklist chased 97 correct pins across three passes.
    - This is not a defect in the audit: it prints the run as a **range** and names the
      decimal-computed pins **individually**, so the two claims were always distinguishable
      (`wa_guye_peak_r1 · run 0-4 · computed pins 1,2,3,4` — pin 0 is the anchor). The over-claim was
      in the consumer. *A range is not a list of findings.*
    - **Corroborated independently by the GAZETTEER, which is worth more than the original
      measurement.** `solve-gazetteer.mjs` asked GNIS for every remaining named pin: of 15 hits, the
      **6 point-like ones were all run-test-only flags sitting 0–110 m from the real named feature**
      (a Gap at 0 m, a Summit at 20 m, two Lakes at 110 m). An interpolation does not land 20 m from
      a named summit by chance. 5 were new, so the provably-correct set is **55**, and the first
      measurement (the route's own second record) and this one (a federal gazetteer) share no input.
  - **THE GAZETTEER CANNOT FINISH THIS, and the negative result is recorded so nobody re-runs it.**
    15 name hits across 728 candidate pins, **0 applicable**. Two separate reasons, and only the
    second is about the data:
    - The earlier probe's "not in GNIS" verdict came from a **crash**. It read `f.geometry.y` on
      every layer, but **layer 5 (Landforms) returns `{points:[[x,y]]}` where layer 7 returns
      `{x,y}`** — so every landform hit was `undefined` and it died on the first one (*Spider
      Meadow*) after printing three "(not in GNIS)" lines. Layer 5 is where passes, basins, ridges
      and summits live. Same family as the group layer and the unescaped Overpass body: **the
      endpoint answered and the reader could not hear it.** Handle both shapes.
    - Asked properly, **8 of the 15 are LINEAR or AREAL** — and *a label point cannot locate an
      edge*. GNIS publishes one coordinate per feature; for a Summit/Gap/Lake/Falls that coordinate
      IS the place, for a Stream/Ridge/Basin/Flat it is a cartographic label and the pin is somewhere
      along the length or around the rim. **Layer 6 is named "Streams (Mouth)"** — it returns where a
      creek ENDS, the one point on it a route never crosses. Every pin flagged by the **decimal**
      test, i.e. genuinely arithmetic, landed in this bucket. **Triage by feature class before
      distance**; sorting by how far a hit moves puts the useless ones on top.
  - **OSM CANNOT FINISH THE COLS EITHER, and the reason is a rule worth having: A NAME MATCH IS NOT
    AN IDENTITY MATCH.** GNIS misses *"Eye Col"*, *"Y Notch"*, *"Ottohorn-Himmelhorn Col"* because
    they are **climbers' names** — guidebook and OSM, not federal (spot-checked: of ten such names
    only two are in GNIS, a namesake 70 km off and an offset). OSM really does hold them; the control
    corridor returns **Cache Col**, `natural=saddle`, no GNIS id. `solve-saddles.mjs` swept it: **46
    candidates, 4 matches, 0 applicable** — every one denoted something *at* or *near* the pass.
    `Red Pass contour (~4,200 ft)` against a pass at **5,389 ft**; `Boundary Trail bend toward Apex
    Pass`; `Boulder Creek crossing / Boulder Pass Trail junction` **5.24 km and 2,697 ft** away.
    - **Chasing prepositions catches ONE of the four. Test the OBJECT.** If the pin name carries a
      structure noun the matched feature's name does not — *crossing*, *junction*, *contour*, *bend*,
      *trail* — the pin is a different kind of thing standing near that feature.
    - **Scope it to BORROWING a coordinate, never to COMPUTING one.** `solve-junctions.mjs` locates
      *"X Trail / Y Trail junction"* by intersecting the two trails, which **is** the junction.
      Checked against all 427 applied pins: **0 would be refused**, so the rule is new without being
      retroactive — which is the check to run before adopting any tightened gate.
  - **The repaired pins agree with the GROUND, which no solver consulted.**
    `measure-confirmed-pin-elevations.mjs` reads the DEM under all 427 repaired coordinates:
    **411 (96.3%) within 400 ft, 12 off by 400–1000, 1 by more.** Coordinates from four independent
    authorities landing on ground that matches an elevation written by a different pass corroborates
    the pass as a whole. It also sizes what every solver deliberately left behind — the elevation
    defect is **13 pins, not a class**. `audit:waypoint-elevations` keeps `TOL = 2000` because a
    tighter bound over pins whose *coordinates* are fabricated measures the wrong place; that
    objection does not apply once the coordinate is sourced, which is why this can be stated at 400.
    - **`--ground` answers that objection without tightening anything**, and is the reason the flat
      number no longer has to be the only option: it bounds each pin's uncertainty (rounding box +
      the measured ~183 m placement slop) and asks the DEM what heights that box actually contains,
      so the tolerance *widens by itself* exactly where the coordinate is least trustworthy. On
      gentle ground it is far stricter than 2,000 and on a headwall far looser. **249 pins on 166
      routes, 151 of them invisible to the flat test.** A 208-pin sample had estimated ~133 and
      ~114 — **quote the run, never the extrapolation**, the rule this file states for
      `fab-pins.json` two bullets down. Its top finding is Camp Schurman, the case the flat
      threshold's own comment names, so where the two overlap they agree.
    - **It also killed the hypothesis that prompted it.** A rounded coordinate (≤2 dp, ~1.1 km of
      slop, **100 of 4,196 WA pins**) looked like a third fabrication fingerprint beside the long
      decimal tail and the collinear run. It is not: coarse pins fail this at **4.1%** against
      precise pins' **2.7%**. And the first version of the measurement said 23 rather than 7 —
      because its box was the *rounding* box alone, which for a precise pin is ±5 m and ignores the
      placement slop entirely, so the two populations were judged by different standards and the
      "control" compared nothing. **Reading this audit's own header is what caught a 3× overcount**;
      the new instrument was internally consistent and wrong throughout.
  - **Quote the audit's own count, not a snapshot's.** `fab-pins.json` expands run ranges into every
    pin, so "728 remaining" overstates it; and repairing one pin can break a run's collinearity and
    clear its neighbours too — 5 of the 6 gazetteer-confirmed routes are **no longer reported at
    all**. The audit's line is the number: **computed coordinates 346 of 4,196 (8.2%), down from 481
    (11.5%)**. [[when-an-audit-reports-zero-ask-its-denominator]] applies to non-zero counts as well.
  - `--selftest` proves both detectors on constructed pin sets and **needs no database**. Its
    negative cases are the ones that matter — a detector that also fires on a winding approach turns
    188 findings into 188 arguments. Trap met while writing it: the obvious "real winding approach"
    fixture is a handful of pins lifted from a live row, and the live rows to hand are ones this
    audit *flags*, so the case proved the opposite of its own label until it was hand-built.
  - **Read the jump from 63 to 199 as coverage that was missing, never as data that got worse.**
    Nothing changed in the catalog. The same lesson as `trackIsJustTheWaypoints` correcting a
    denominator rather than a finding: *overstated coverage is the false-pass direction.*
- **`audit:cross-route-pins`** asks whether **two routes place the same named point in two different
  places**. It is a FIFTH waypoint audit and that needs justifying, because this file already records
  that of the four existing ones **two ask the same question with different tolerances**. This one is
  their **complement** rather than another take: every one of them is scoped to a **single route** —
  a pin against its own track (`audit:waypoints`, `audit:waypoint-track`), pins against each other on
  one route (`audit:waypoint-geometry`), a route's two copies of its own trailhead
  (`audit:trailhead-agreement`), a pin against its own area (`audit:coord-origin`). *"Two routes
  disagree about where a named place is"* is invisible to all five **by construction**. Its unit is a
  **NAME**, not a route, which is why it could not be folded into `audit:waypoint-geometry` without
  changing what that audit's rows mean. Read-only, report-only; **not** a build gate — a property of
  the DB rather than the checkout, the reasoning that keeps `check:counts` out.
  - **The signal is trustworthy because agreement is the NORM, and that is measured on every run
    rather than quoted.** Of 537 waypoint names carried by more than one WA route, **424 (79%) agree
    within 500 m**. So a multi-kilometre gap is ~20x the ordinary spread, not ordinary noise. Eleven
    routes placed *Hannegan Pass* together and one placed it **5.3 km** away.
  - **TRIAGE BY FEATURE CLASS BEFORE DISTANCE** — the rule this repo already paid for in the GNIS
    work, where 8 of 15 hits were linear or areal. A ford, a wilderness boundary, a ridge crest has
    **extent**, so two routes meeting it at different points are **both right**; only a point —
    trailhead, camp, pass, col, lake, falls — has one location to be wrong about. Without this the
    detector reports correct data: *"Olympic National Park Boundary"* spans **31.7 km** because the
    boundary does, and *"Chiwawa River ford"* spans **15.9 km** because the river does.
  - **A NAMESAKE IS NOT A DEFECT and is printed separately rather than suppressed.** Washington
    genuinely holds two *Cathedral Passes* **173 km** apart, two *Snow Lakes*, two *Myrtle Lakes*,
    several *High Camps*. Both rows are correct, and an audit reporting them is one people learn to
    ignore — but hiding the judgement would stop a reader checking it.
  - **IT DELIBERATELY DOES NOT PICK A WINNER, and measuring is what forced that.** A majority is
    **not independent evidence**: ten routes sharing an approach chain may have inherited one
    enrichment pass's coordinate, so ten agreeing records can be **one claim counted ten times**.
    Adjudicating needs a source descending from none of them — the USGS 3DEP ground — and on the
    first 8 findings that check **REFUSED HALF**. For *Lake Constance* the ground fits the
    **OUTLIER** better than the majority (4,667-4,776 ft against 4,378-4,577), so the vote alone
    would have "repaired" toward the weaker record. For *High Camp* the ground refuses **both**.
  - **Four were repaired** (`scripts/oneoff/fix-outlying-pins-against-the-majority.mjs`), each with
    three independent lines agreeing — the majority, a matching stated elevation, and the ground
    refusing the outlier: *Royal Lake* on `wa_honeymoon_route` sat **7.5 km** away on ground **2,500
    ft below** the height it claimed; *Hannegan Pass* on `wa_icy_peak_southwest_route` **1,600 ft
    above**; *Lake Serene* on `wa_philadelphia_mountain_scramble` **1,678 ft above**; *Fred's Lake*
    on `wa_mount_carru_scramble`. Candidates went **25 -> 21**, agreement **79% -> 80%**.
  - **It is not cosmetic**: `gpxDownload` writes waypoints into the GPX file a climber carries into
    the field, so a displaced pin is exported as well as drawn and panned to.
  - **The repair copies ONE NAMED DONOR ROW, never a centroid or a mode.** Averaging would mint a
    coordinate no row holds — precisely the fabrication this catalog already carries **346** examples
    of, committed by the repair rather than by an enrichment pass. A **mode** does not work either,
    and measuring showed why: the agreeing routes store **the same point at different precisions**
    (48.8829219, 48.883737, 48.8837, 48.88374 ...), all within ~100 m, so no two are byte-equal and
    an exact-match mode **refuses a unanimous cluster**.
  - **SECTION 2 IS THE MIRROR, and it lives here rather than in a SIXTH waypoint audit.** Section 1
    asks whether two routes disagree about **where** a named point is; section 2 asks whether they
    disagree about **how high** it is while storing the **identical** coordinate. Same question over
    the same pairs, so folding it in costs one read instead of another script. The coordinate being
    byte-identical is what makes it the mirror: the position is agreed, so **only the number can be
    wrong**. **32 findings, 23 of them TRAILHEADS.**
    - **`audit:waypoint-elevations` cannot see it.** That audit flags a pin the TERRAIN refuses, so a
      disagreement between two rows at one coordinate is invisible whenever both values sit inside
      the terrain box. **#1320 repaired exactly one instance of this class and it was found BY HAND.**
    - **Keyed on the coordinate rounded to 4 dp (~11 m), which is required rather than sloppy**: rows
      store one point at different precisions (48.8837373 vs 48.8837), so an exact match finds almost
      nothing — the lesson the modal-coordinate attempt already paid for.
    - **THE MINORITY IS SOMETIMES THE CORRECT ROW**, which is the whole argument for adjudicating
      against the ground rather than the vote. At the *SR-20 Wine Spires pullout* **four** routes said
      2,200 or 3,450 ft and **one** said 4,300; the ground reads 4,198-4,579 and admits **only the
      lone dissenter**. A majority rule would have taken the correct row and repaired it into
      agreement with four wrong ones.
    - **DEMAND A SEPARATION, NEVER A VERDICT AT THE BOUNDARY.** Two threshold artefacts would each
      have produced a confident wrong write: *Upper Dungeness Trailhead*, where the ground refuses
      2,970 ft by **17 feet** and the route's own prose independently says 2,960; and *Lake of the
      Woods*, where the surviving value is admitted only by **13 feet** while the ground box refuses
      it outright. So the rule is that the surviving value must sit inside the ground box (or within
      50 ft) and every replaced value at least **300 ft** outside — a 6x gap.
    - **9 repaired** (`scripts/oneoff/fix-same-coordinate-elevation-disagreements.mjs`), 32 -> 26.
      **26 are deliberately left**: 23 where the ground admits EVERY stated value, so the spread is
      inside the terrain's own noise; 1 where it refuses every value (that is section 1's question,
      not this one); and the two artefacts above.
    - **It caught an incomplete repair made HOURS EARLIER by the same session.**
      `fix-trailhead-elevations-from-a-corroborated-sibling` moved three *Stuart Lake Trailhead* rows
      to 3,400 ft and left `wa_boving_christensen` at 2,930, because that sweep only examined pins
      the TERRAIN refuses and 2,930 sat inside the flat tolerance. *An instance fixed by hand is not
      a class closed* — including when you are the one who fixed it.
  - Fails **closed** four ways — zero routes, zero placed pins, no shared name, or a state filter
    matching nothing are each a broken scan, never a clean catalog.
- **`audit:pin-elev-vs-own-prose`** asks whether a **trailhead pin's stored elevation agrees with the
  elevation stated in its OWN prose**. The route page renders both **inches apart** — the elevation
  chip on the waypoint row, and the *"Getting here —"* line directly beneath it, which is
  `wp.directions` — so a disagreement is not a fact about a table: it is **one screen stating a
  height twice and giving two answers**. Read-only, anon key, report-only; **not** a build gate — a
  property of the DB rather than the checkout, the reasoning that keeps `check:counts` out.
  - **FOUND BY READING A CI `ui-screens` CAPTURE**, which is the sixth defect that technique has
    produced. `route:Plan` rendered *"Stuart Lake Trailhead · 0 mi · **3,200 ft**"* directly above
    *"follow it to its end, around **3,540 feet**, where the Stuart Lake Trailhead … begin"*. Nothing
    could have flagged it: the column is populated, the prose is well written, and both numbers are
    numbers.
  - **THREE SIBLING AUDITS ARE EACH BLIND TO IT BY CONSTRUCTION, and the near misses are the
    argument.** `audit:waypoint-elevations` asks whether the **TERRAIN** admits a pin's height — one
    record, not two. `audit:summit-splits` asks whether two **ROUTES** place one point apart — across
    routes, where this is inside a single pin. `audit:trailhead-agreement` compares a route's two
    trailhead **COORDINATES** and never looks at a height. A number written into the pin's own
    sentence is outside all three.
  - **AN ELEVATION IS NOT A GAIN, AND A BARE `N ft` CANNOT TELL THEM APART — this is the whole
    precision story, measured rather than reasoned about.** This prose is full of amounts, so the
    unrestricted form reported **466 findings** against a true **11**, and the readable ones were
    nearly all *"gaining about 450 ft"*, *"a ~150-ft rappel"*, *"losing around 1,900 ft"*. **A count
    is only as good as its tokeniser**, and four narrowings were each a distinct way this prose
    defeats a needle:
    - **POSITIONAL, never a deny-list of amount verbs** — an elevation is somewhere you ARE. A verb
      list is beaten by one more verb, which this file records four times over for `check:outage`'s
      rule 2 alone.
    - **`to` is NOT positional.** *"walls to 120 ft"* is a **wall**, and admitting it reported nine
      identical Dikes routes in a row.
    - **A RATE wears a positional preposition.** *"at roughly 1,200 ft per mile"* matched `at` and is
      a gradient; excluded on the trailing unit.
    - **`around` serves BOTH**, which is the one no single rule settles: *"to its end, around 3,540
      feet"* is a place and *"gaining around 4,500 ft"* is an amount. Admitting it bare re-imports
      the gains and refusing it **loses the founding case**, so it counts only as an **APPOSITIVE**,
      after a comma — structural rather than a verb list.
  - **AND THE HEIGHT MUST BE STATED IN A SENTENCE THAT NAMES THE PIN.** Without that the prose's
    other heights read as claims about the trailhead: *"hike the 3.7 miles of switchbacks to Cascade
    Pass at 5,392 ft"* is about the **pass**, and firing on it accuses correct data. Name tokens are
    filtered by a **GENERIC** stop-list first — a token every trailhead name shares (`trailhead`,
    `trail`, `creek`, `lake`) makes the test vacuous in the **wide** direction, the mirror of a
    too-narrow proxy.
  - **SCOPED TO TRAILHEADS, MEASURED RATHER THAN CHOSEN.** Across **every** pin type the same rule
    reports **50** and precision collapses, because an en-route pin's prose is a **NARRATIVE of the
    leg** — *"breaks treeline near 4,600 ft, joins the Monitor Ridge route near 7,000 ft, then
    follows the crater rim"* — so the heights belong to points along the way and naming the pin
    proves nothing about them. A trailhead's `directions` is a *"Getting here"* line whose **subject
    IS the trailhead**, and the drive ends there.
  - **`--ground` IS THE ADJUDICATOR, AND IT IS WHAT MAKES REPORT-ONLY HONEST RATHER THAN TIMID.**
    Both records are the pin's own, so neither is privileged; the USGS DEM derives from neither. On
    the live catalog it settles **7 of 11** — `wa_cashmere_mountain_west_ridge`'s pin **stored 4,650
    ft** where the ground reads **3,303** and its own sentence says **3,300** — a 3 ft match against a
    1,347 ft error, since repaired.
  - **DEMAND A SEPARATION, NEVER A VERDICT AT THE BOUNDARY** — the rule
    `fix-same-coordinate-elevation-disagreements.mjs` already records. A flat bar reads the
    instrument's own noise: at ±250 ft the DEM *"admits both"* on **six of eight** of these while
    separating every one of them **by ratio**. The surviving value must sit within 50 ft and the
    other at least **3x** further out.
  - **IT STILL DOES NOT LICENSE A SWEEP, and the ground is what shows why.** Three findings are a
    sentence legitimately naming a **SECOND feature with its own height** — Cascade Pass at 5,392,
    Slate Pass at 6,900, Longs Pass at 6,200 — where the ground correctly says *"the pin is right"*
    and the repair is **nothing at all**. Only reading the sentence separates those from
    `wa_prusik_peak_solid_gold`, whose sentence names the trailhead and states a height the ground
    refuses.
  - **THE FINDINGS CORROBORATE EACH OTHER, which is the strongest evidence available that this is
    real drift rather than a reading error.** **Blue Lake Trailhead APPEARED twice with the numbers
    SWAPPED** — `wa_north_face_3` stores 5,400 with prose saying 5,200, and `wa_the_west_face` stores
    5,200 with prose saying 5,400 — and the ground reads **5,380** for both, so one route is wrong in
    its pin and the other in its sentence. Stuart Lake Trailhead does the same at 3,200/3,540 and
    3,400/3,600 against a ground of ~3,390.
  - Fails **closed** four ways, each of which otherwise prints the same reassuring small number as a
    clean catalog: zero routes read, no pin typed `Trailhead`, no trailhead pin carrying prose, and
    **no trailhead pin whose own naming sentence states a height** — with which the scan cannot fire
    at all.
  - **FIVE OF THE ELEVEN ARE REPAIRED, and the sentences above are written against the PRE-REPAIR
    catalog deliberately — they are the measurement that justified the batch, not a description of
    today's rows.** `scripts/oneoff/fix-trailhead-pin-vs-its-own-prose.mjs` is a **reviewed batch**:
    every entry declares its own find→replace with a written reason, the ground is **re-measured at
    apply time** rather than quoted, and each row must still say what the entry was written against.
    The audit reads **6** afterwards.
    - **NOTHING IS TYPED.** A pin repair copies the figure that pin's OWN sentence states; a prose
      repair copies that pin's OWN stored elevation. So a fix needing a height the row does not hold
      **cannot be expressed** — the declare-a-donor contract the trailhead-disagreement appliers use,
      which is what makes a batch in this family safe to run at all.
    - **TWO PIN REPAIRS AND THREE PROSE ONES, which is the unusual half**: on three routes the
      SENTENCE is the wrong record, so the repair edits English. That is why each declares an exact
      `find` and refuses unless it matches the live value **exactly once**.
    - **THE NEIGHBOURING FIELD WAS CHECKED BEFORE ANYTHING WAS WRITTEN.** Lowering a trailhead
      **raises** the trailhead-to-summit rise and can arm `gainBelowOwnPins` — the caveat that tells a
      climber their route's stored gain is impossible — so a repair here is one step from minting a
      finding in a sibling guard. Measured on both pin repairs: Cashmere's implied rise goes **3,864
      → 5,214** against a stored `gain_ft` of **5,300**, so the caveat stays silent and the gain
      becomes MORE consistent; Blue Lake's goes 2,560 → 2,360 against 2,400 with 689 ft of climbing
      credited, also silent. [[changing-which-record-wins-leaves-the-neighbouring-field-behind]].
    - **AND THAT CHECK PRODUCED A FOURTH INDEPENDENT RECORD FOR CASHMERE, which is worth more than
      the repair.** Its `gain_ft` of 5,300 against a summit pin of 8,514 implies a start at **3,214
      ft** — within 86 ft of the ground's 3,303 and the sentence's 3,300, and **1,436 ft** from the
      stored 4,650. Written by a different enrichment pass from either, so it shares no input with
      the two records already agreeing. *A side-effect check is also a measurement.*
    - **FIVE ARE DELIBERATELY LEFT AND THE SCRIPT'S HEADER NAMES EACH**, because a reviewed batch is
      only a batch if the refusals are written down: **four** are a sentence correctly naming a
      SECOND feature (Cascade Pass 5,392, Slate Pass 6,900, Longs Pass 6,200, a switchback ~5,600),
      where the repair is nothing at all. A fifth, `wa_mount_stuart_north_ridge`, is left because the
      terrain across that pin's own uncertainty runs **3,342-3,770 ft** and admits 3,400 and 3,540
      alike — genuinely undecidable from the ground rather than merely below a bar.
    - **`wa_mount_baker_easton_glacier` WAS a sixth and IS NOW REPAIRED, and the objection that
      deferred it was right.** It read *"the prose is 23 ft out and the pin 137 ft out, which is not
      the separation this batch demands. **A threshold widened to admit the case it is judging proves
      nothing**"* — and nothing was widened. What changed is the instrument; see the entry below.
  - **`--ground` ASSERTED A CONCLUSION THE GROUND CANNOT REACH, AND ITS SEPARATION BAR WAS FLAT
    WHERE THE GROUND'S RESOLVING POWER IS NOT.** It compared ONE DEM reading against
    `dS <= 50 && dP >= 3 * Math.max(dS, 50)` — a floor of 150 ft however the terrain behaves — and
    over the six live findings it was **wrong twice, in opposite directions**. Neither was visible
    from the code: a flat bar looks like conservatism, and this one was documented as exactly that.
    - **The rule was also written TWICE**, in this audit's verdict and in
      `scripts/oneoff/fix-trailhead-pin-vs-its-own-prose.mjs`'s apply-time gate — which is why
      correcting one without the other would have left the repair still refusing.
    - **TOO STRICT ON GENTLE GROUND.** `wa_mount_baker_easton_glacier`'s Park Butte trailhead: the
      terrain across the pin's **whole uncertainty** spans **3,292-3,485 ft**, so the stored **3,200
      is 92 ft below anything the ground holds there** while the sentence's 3,360 sits inside it.
      The flat bar refused a verdict by **nine feet** (141 against a floor of 150) and the row sat on
      the deferral list. **Repaired — the first time this audit has ever reached a verdict at all.**
    - **TOO LOOSE ON STEEP GROUND, WHICH IS THE DANGEROUS HALF.** `wa_osceola_peak_scramble`'s box
      spans **486 ft** and admits 7,170 and 6,900 alike, and the flat bar announced *"the PIN is
      right — the sentence is the wrong half"* about a sentence reading *"Slate Pass, at about 6,900
      feet, is at the second [switchback]"*. **This audit's own header and its repair batch's
      refusal list BOTH record that sentence as correct**, and the verdict line contradicted them.
      `wa_magic_mountain_northwest_ridge` is the same shape about Cascade Pass.
    - **SO THE TWO VERDICTS ARE NOT SYMMETRIC, and that is the structural point rather than a
      threshold nicety.** The ground can refuse the **PIN** — a pin IS the coordinate, so *"nothing
      near this height exists here"* is a statement about the pin and nothing else. It cannot rule on
      a refused **SENTENCE**, because a sentence legitimately names a second feature with its own
      height, and **four of the six do**. The line now says so and asks the reader to read it.
      **The one verdict the ground can actually support had never once fired; the one it cannot
      support fired twice.**
    - **Ask the terrain instead of a constant.** `scripts/lib/ground-box.mjs` samples the ground
      across the pin's own **rounding box plus placement slop** and asks whether a claimed height is
      something that box could innocently produce — the instrument `audit:waypoint-elevations
      --ground` already uses, whose own comment says *"a flat bar reads its own noise"*. Measured
      relief across the six findings: **193 ft** at Park Butte against **616 ft** under Magic
      Mountain. A bar that cannot tell those apart is wrong in both directions at once.
    - **EXTRACTED, NEVER COPIED.** `boxGrid` lived inside `scripts/audit-waypoint-elevations.mjs`
      behind a comment apologising for not exporting it (*"an import to reach one pure function
      would run the whole audit — an attractive nuisance"*). That is a reason to move it OUT, and
      the new module has no top-level await, no database and no network of its own. **The repair is
      to COLLAPSE, never to make two bodies match.** Proven behaviour-neutral by
      `scripts/oneoff/verify-box-grid-extraction.mjs` — **42 assertions, 0 failed** — which lifts
      the pre-change implementation **out of git** rather than retyping it, because a retyped
      reference agrees with itself whatever the original did.
    - **THE MARGIN IS DERIVED FROM THE CLAIM, NOT CHOSEN**, which is what answers the deferral's own
      objection. A value written to the nearest hundred is consistent with any ground within 50 ft
      of it; one written to the foot is consistent with almost nothing. `roundingSlack` reads the
      step off the number itself, so **no threshold is fitted to the cases being judged** — and
      3,200 is still refused at Park Butte with its full 50 ft of slack.
    - **THE VERDICT HAD NO INJECTION CASE AT ALL.** The suite's nine cases prove the audit FINDS a
      disagreement; none ran `--ground`, so the line telling a reader WHICH HALF is wrong was
      unexercised for its whole life. Five cases added, offline via a `--ground-fixture` seam
      carrying the real 3DEP readings. **A/B against the reinstated flat rule: four of the five
      flip**, and two of them reproduce the live wrong verdicts by name — `forbid` is the
      load-bearing half, since a case that only checks the right string appears is satisfied by a
      line printing every verdict at once. The fifth (fail-closed on too few readings) passes under
      both, which is honest rather than a catch.
    - **The `readFileSync` the seam needed was missing and the suite caught it on the first run** —
      all five cases died on a `ReferenceError` rather than on a verdict. A guard's own test seam is
      code like any other.
    - **A FIFTH, WEAK RECORD AGREES WITH THE REPAIR, and it is stated as weak.** Park Butte's route
      stores `gain_ft` 7,600 against a summit pin of 10,781 — so the old trailhead left **19 ft** of
      re-gain across a glacier route with the Railroad Grade in it, and the repaired one leaves
      **179**. Written by a different pass from either record. Corroboration, not proof.
    - **The neighbouring field was checked BEFORE the write**, as this batch's own header demands:
      raising a trailhead LOWERS the trailhead-to-summit rise, so `gainBelowOwnPins` moves further
      from firing rather than closer. Silent before and after.
  - **A MEASURED NON-FINDING BESIDE IT, recorded so nobody builds the detector: a pin NAME that
    embeds a height is a THIRD record inside the same object, and it never disagrees.** 73 WA pins
    name one (`Point 4555'`, `Steep Heather/Meadow Ridge Below Point 6066`), **68 agree with their
    own `elev` and the other 5 are all correct work** — a preposition (*"Below Point 6066"* stores
    5,800; *"Saddle west of Point 7657"* stores 7,500), a RANGE whose stored value is the midpoint
    (*"4,500-5,200 ft"* stores 4,900), or a distance ON ROUTE rather than a height (*"Lunch Ledge
    belay (~300 ft on route)"* stores 3,900). **Zero findings**, and the reason generalises: a
    name-embedded number is qualified by its own preposition, so separating them needs English read
    rather than matched. *A detector for a class of zero is the thing this repo keeps refusing to
    build.*
  - Injection-tested **14/14** (`scripts/oneoff/inject-pin-elev-prose-cases.mjs`), driven by
    `--fixture` so the whole harness runs **offline** and nothing writes to the live project — the
    mechanism `audit:trailhead-road` sets, because these faults live in the DATA and a case cannot
    inject one by editing code. **SIX must stay SILENT** and they are the load-bearing half: a case
    proving only that it fires is satisfied by a detector that flags everything, and each silent case
    pins one of the narrowings above.
    - **EVERY FIXTURE CARRIES A CONTROL — a trailhead pin that is comparable and AGREES — and
      without it five cases reported MISSED against an audit behaving perfectly.** A one-pin fixture
      whose pin is correctly excluded **IS** a scan that cannot fire, so the run died on the audit's
      own fail-closed floor. With the control the floor is met and the silence is attributable to the
      case's own pin rather than to the harness. The fail-closed case is deliberately the one
      WITHOUT it, since the control would satisfy the very floor that case exists to trip.
- **`audit:summit-splits`** asks whether a peak's OWN routes agree where its summit is. Each route
  carries a summit waypoint, so those pins are independent recordings of ONE point and a
  disagreement means at least one is wrong. **28 WA peaks carry two or more, 60 m or further
  apart**, and nothing could see them: `audit:cross-route-pins`' `MIN_KM` is **2**, and
  `audit:summit-pins`' `DIST_TOL` is **300 m** — and that one compares each pin against the AREA
  ROW rather than against the peak's other pins, so it can never notice a peak has two summits,
  only that one pin is far from the area. Verified rather than argued: both print **zero**
  mentions of North Early Winters Spire, the worst instance. Read-only, anon key, report-only;
  **not** a build gate (a property of the DB, plus one network call per coordinate).
  - **DISTANCE CANNOT SAY WHETHER A SPLIT MATTERS, WHICH IS WHY NEITHER SIBLING SCOPE IS WRONG.**
    110 m across Mount Baker's summit dome is a rounding worth nothing; 128 m on a spire is
    **613 ft of ground between the two pins**, one of them standing on the flank. So the
    instrument is the **ground** — the USGS 3DEP reading under each coordinate, which neither pin
    derives from — and the finding is a cluster standing materially lower than its sibling.
  - **It does NOT pick a winner**, the same restraint `audit:cross-route-pins` records for the same
    reason: a majority can be one enrichment pass counted many times. It says the two cannot both
    be right and prints what the terrain holds under each, plus the distance to the area row as a
    third record, so a reader settles it in a minute instead of re-deriving the geometry.
  - **THE PRECISION RULE IS THE PIN'S OWN CLAIM AND IT IS DELIBERATELY NOT A DENY-LIST.** A peak
    legitimately has named sub-summits — Liberty Cap on Rainier, Poltergeist Pinnacle, Hozomeen's
    South Peak, Bonanza's Southwest Peak — and a pin naming one is correct data that
    `audit:summit-pins` already classifies as NOT a finding. Keeping a vocabulary of sub-summit
    words is the shape one more adjective defeats, so two pins count as ONE CLAIM when they share
    a **name** or a **stated elevation**. **Both are needed and neither is enough**, measured:
    name alone misses **Mount Baker**, where six routes say *"Mount Baker Summit"* against
    *"Mt. Baker summit (Grant Peak)"* — one summit spelled two ways, 369 ft apart on the ground;
    elevation alone misses **Burgundy Spire**, whose two pins are both *"Burgundy Spire Summit"*
    and state 8,483 against 8,400.
  - **PAIRWISE, NOT PER-PEAK, and the first version got that wrong in a way that HID a real
    finding.** Asking whether ALL of a peak's clusters share a name lets one correctly-named
    sub-summit decide the verdict for the others — Tepeh Towers sitting beside three Eldorado
    summit pins — and it drives the reported drop from a cluster that is part of no disagreement.
    Every pair is considered and the finding is the same-claim pair furthest apart. Reclassifying
    that way moved Mount Baker and Gilbert Peak out of the context bucket, where a reader would
    have had to spot them by eye.
  - **A cluster is grouped by COORDINATE ALONE, so compare its names and elevations as SETS.**
    Routes really do disagree inside one: Guye Peak has three routes on `47.442,-121.411`, two
    calling it *"Guye Peak"* at 5,168 ft and one *"Blood Sport crag"* at 3,400. Reading the first
    pin of each cluster made the verdict depend on row order and **hid that finding entirely** —
    the worst of the six, at 939 ft. The printout lists every distinct name/elevation for the same
    reason: with only the first shown, the row read as a mismatch the reader could not see.
  - **FOUR OF THE SIX ARE REPAIRED, AND THE AUDIT CONFIRMS IT: 6 -> 2.**
    `scripts/oneoff/fix-summit-pins-on-the-flank.mjs` moved **13 summit pins on 4 peaks** — North
    Early Winters Spire (4 routes), Mount Baker (6), Gilbert Peak (1), Guye Peak (2) — each gated
    on three records that share no input: the donor's ground within 200 ft of the peak's stated
    elevation, a 250 ft+ drop to the coordinate being replaced, that coordinate NOT a local maximum
    on the ground, and the GNIS feature closer to the donor. Only the coordinate moves; every
    stated elevation is left alone. What remains is exactly what the script declined: **Mount
    Stuart** (six coordinates, no single wrong cluster) and **Burgundy Spire** (a climbers' name
    the gazetteer does not hold, so the third record does not exist).
    - **MOUNT STUART IS DIAGNOSED BUT NOT REPAIRED, and the diagnosis is worth reading before
      anyone tries.** `scripts/oneoff/probe-mount-stuart-summit-split.mjs` measures all four of
      its summit coordinates against the ground and the gazetteer:
      **9,416 ft and a LOCAL MAXIMUM** at `wa_mount_stuart_girth_pillar`'s pin (17 m from GNIS,
      matching its own stated 9,416 to a foot); 9,333 and a local maximum on two more routes;
      **9,208 and NOT a maximum — 2 of 8 neighbours higher by up to 182 ft — where the peak's own
      `areas` row and EIGHT routes sit**; and 8,870 with 5 of 8 higher on Cascadian Couloir, North
      Ridge and West Ridge, the three most-climbed lines on the peak.
      - **`audit:peak-coords` has a recorded decision on this exact peak**: its `TOL` comment says
        the DEM maximum is "70 m away matching the stored elevation" and that snapping was
        REJECTED because it would DERIVE a coordinate rather than copy a record. The new fact is
        that **a stored route pin sits on a local maximum 58 m from the area row**, matching its
        own stated elevation to a foot — near enough that it is very likely the same high point
        that grid search found, though the two were sampled differently and this does not claim
        they are identical. So COPYING is available where deriving was not — which changes the calculus that decision rested on. That makes it a
        decision to RE-TAKE, not one to overturn quietly.
      - **Every repair path trips a gate in `fix-summit-pins-on-the-flank.mjs`**, which is the
        gates saying Stuart is unsettled: the dominant cluster is 207 ft from the stated elevation
        (over the 200 ft donor bar) and girth_pillar's pin is 58 m from the area row (over the
        25 m bar). Moving the three outliers onto the dominant cluster would put them on a point
        that is not the summit either.
    - **`audit:summit-pins` SECTION 1 IS DOWN TO ONE, and the other of its two was correctly
      refused.** That section reports a route whose summit pin and its peak's own `areas` row
      disagree while stating the same elevation, and neither peak has a second route to donate a
      coordinate — so the two records ARE the pin and the area row.
      `probe-summit-pin-contradictions.mjs` takes both to the ground.
      - **The Pyramid (Southern Pickets) is decided and repaired.** The records are 479 m apart,
        both state 7,920 ft, and the ground separates them by **1,275 ft**: the area row stands on
        **7,984 ft and is a LOCAL MAXIMUM** (64 ft from the stated elevation) while the pin stands
        on **6,709 ft with 4 of 8 ring neighbours higher**. The pin is also the only
        three-decimal coordinate on a route whose other six carry five or six — the coarse
        fingerprint recorded for "the eight 3-decimal Picket summits".
        `fix-the-pyramid-summit-pin.mjs` copies the area row onto the pin and carries the line
        with it (that route's 20-point track turned out to be a real recording with 0 vertices on
        any pin, so nothing moved — checked before writing, which #1660 did not do).
      - **Reynolds Peak is REFUSED and that is the result.** Its two records are 340 m apart and
        **both are local maxima**, 194 ft apart on the ground — under the 250 ft bar, which is
        `audit:waypoint-elevations`' own `FLOOR_FT` for *inside the 3DEP grid's noise*. Its pin is
        named *"Reynolds Peak (true/south summit)"*, which is what a genuine two-summit peak looks
        like. A verdict there would be the instrument reading its own noise.
    - **A PIN REPAIR HAS TO CARRY ITS SKETCHED LINE, and this one did not — checked afterwards
      rather than assumed.** 203 of 578 WA routes with a track store a line drawn THROUGH their
      own waypoints, so moving a pin leaves a vertex at the position it used to hold. Measured on
      the 13 moved pins: 6 of the 10 routes carrying a track had their summit pin end up **110 m
      from their own line**. `fix-stranded-track-vertices.mjs` carried 4 of them (adrift vertices
      **28 -> 24**, routes **21 -> 18**); the other 3 fall outside `audit:stranded-track-vertices`'
      candidate shape and are left, because their line is short enough that one adrift vertex is
      not a minority.
      - **No route lost its caveat, and that was verified rather than hoped.** All six still say
        their line is not a recorded track — the three the fixer could not reach simply swapped
        one honest caption for another (*"straight lines between this route's waypoints"* becomes
        *"two straight segments drawn across 4,128 m"*), because `trackIsJustTheWaypoints` went
        false and the segment caveat took over.
      - **AND A `NaN` I THOUGHT I HAD FOUND WAS MY OWN PROBE.** `trackCoverageCaveat(route)`
        returns *"stops NaN km short of the summit"* — because the app calls it as
        `trackCoverageCaveat(_cov, _gapDist)` and guards on `_cov`, and my probe passed a route
        object. Checked before reporting it; nothing reaches a screen.
    - **GUYE'S MECHANISM IS VISIBLE.** `wa_blood_sport` carries a correctly-typed Topout,
      *"Blood Sport crag"* at 3,400 ft, at exactly `47.442,-121.411` — and two other routes put
      their *"Guye Peak"* SUMMIT pin on that same coordinate. Two routes' summit is the crag's
      topout, copied. The repair moves pins **by name**, so the crag pin is untouched.
    - **THREE APPLY ATTEMPTS REFUSED AND WROTE NOTHING, on different peaks each time**, and the
      cause was measured with curl rather than guessed: `epqs.nationalmap.gov` was returning HTTP
      500s and connection failures — 2 of 5, then 0 of 6. That is the fail-closed path working
      (`terrain.mjs` returns null, never 0), not a finding about the catalog. `summitProbe` gained
      a `tries` budget for it (default 4 unchanged; the repair passes 12) — a **more patient
      measurement, not a looser gate**. With ~40 readings needed and each failing independently,
      the odds of a clean pass collapse, which is why three runs in a row refused.
  - **The result on WA before that repair: 28 splits -> 6 findings, 7 context, 15 under the
    ground threshold.**
    That tail moves run to run — a later run on a loaded box read **14 quiet and 1 NOT MEASURED**
    (Glacier Peak, 0 of 2 coordinates read) because 3DEP timed out. That is the fail-closed path
    working, not a change in the catalog: the findings and the context bucket were identical.
    Guye Peak 939 ft (two routes putting the 5,168 ft summit on ground of 4,227), North Early
    Winters Spire 613 ft, Mount Stuart 546 ft (SIX distinct coordinates for one summit), Mount
    Baker 369 ft on six routes, Burgundy Spire 315 ft, Gilbert Peak 259 ft.
  - **Both thresholds are borrowed rather than fitted.** 60 m is roughly the placement slop
    `audit:waypoint-elevations` already allows a pin; 250 ft is that audit's own `FLOOR_FT`, where
    it means *inside the 3DEP grid's noise*. Neither was chosen against these findings.
  - **AND `audit:peak-coords` HAS ALREADY MEASURED WHY 250 CANNOT GO MUCH LOWER**, which is worth
    reading before anyone tightens it hoping for more. Its `TOL` comment records that at 150 ft
    the WA tail is 21 peaks and **17 are Stuart, Shuksan, Forbidden, Goode, Little Tahoma and
    friends** — sharp summits whose coordinate sits 35-100 m off the top on very steep ground and
    therefore reads a couple of hundred feet low while being *essentially right*. One phenomenon,
    not 17 defects, and precisely what a lower threshold here would re-report as summit splits.
    It also disposes of a tempting hypothesis this work produced: Mount Stuart's `areas` row
    stands on 9,208 ft against a stated 9,415, which looks like a wrong peak coordinate and is
    **not** — that audit found the DEM maximum 70 m away matching the stored elevation, and
    rejected snapping to it because it would DERIVE a coordinate rather than copy a record.
  - **SCOPE ON THE AREA, NEVER ON THE ROUTE ID.** `id like wa_*` is the reflex filter and it drops
    the four legacy route ids this catalog still carries (`rainier_*`, `adams_*`) — **both legacy
    Rainier routes carry a summit pin on `wa_mount_rainier`**. On a COMPARATIVE audit that is not
    a lost row, it is a lost *witness*: the siblings are then judged against less evidence, which
    is the false-pass direction `audit:trailhead-road-agreement` already records. Filtering AREAS
    that way is safe and was measured rather than assumed — every one of the 2,525 areas under
    `washington` is `wa_`-prefixed except the state row itself. Corrected before shipping: 1,012
    routes and 830 pins became **1,016 and 832**.
  - **SECTION 3 — ONE PLACE, MANY NAMES: the gap BETWEEN sections 1 and 2, and the commonest
    shape of all.** Section 1 keys on the NAME and only reports past `MIN_KM`, so pins metres apart
    are invisible to it; section 2 keys on `name|lat4|lng4`, so it needs the name AND the coordinate
    to match. A point stored under SEVERAL names at SLIGHTLY different coordinates falls between
    them. **"Stuart Lake Trailhead" is stored 52 times under SIX names at about five coordinates**,
    with elevations 1,300 / 2,930 / 3,200 / 3,400 (x37) / 3,500 / 3,540 — so two climbers reading
    two routes off one trailhead get answers 2,100 ft apart. Keyed on the **coordinate cluster**
    (200 m) alone: **41 findings across 295 clusters** of 3+ pins.
    - **A FULL-NAME KEY CANNOT SEE IT EITHER, and that was measured rather than assumed.** Keyed on
      the normalised name, the six variants each get their own tiny majority and NO outlier is
      detectable — the census reported **4** findings and silently omitted the very case that
      prompted it. *A detector's clustering key decides what it can see*, and one that misses its
      own founding case is worth nothing. Both earlier keys were tried and both failed that test.
    - **IT REPORTS THAT TWO ROWS DISAGREE AND NEVER PICKS.** The majority is not the truth: at
      *"The Mole (Edward Peak) North Face topout"* three pins say 1,300 ft and one says 6,800, and
      it is the **lone** pin that looks right for a topout. Section 2's own header already records
      the SR-20 case where the ground admitted only the dissenter. Adjudicate against the terrain.
    - The top hits are unarguable: **Cascade Pass Trailhead** has 21/25 at 3,600 ft and one at
      **8,380**; a **Hwy 20 pullout** has one pin at **7,900 ft** on a highway that tops out at
      5,477. Thresholds are borrowed rather than fitted — 250 ft is this file's own `FLOOR_FT`
      for *inside the 3DEP grid's noise*, and a cluster with no clear majority is skipped because
      there is nothing to call an outlier against.
    - **A VACUOUS PASS, CAUGHT ONLY BY AN INDEPENDENT COUNT.** Wired in, the section first reported
      **0 clusters examined** — because this file's `km()` takes **arrays** `[lat,lng]` and it was
      handed objects, so every distance was `NaN`, every proximity test false, and no cluster ever
      formed. A standalone measurement had already said 40, which is the only reason the zero was
      not read as a clean catalog.
  - Fails **closed** four ways — zero areas, zero routes, zero placed summit pins, and a split
    whose ground could not be read is reported as **NOT MEASURED** rather than as agreement. That
    last one is the reason `terrain.mjs` returns `null` and never `0`.
- **`audit:waypoint-order`** asks the two LIST questions — is the order sensible, is the same
  place listed twice — as distinct from the three pin-POSITION audits. The duplicate half is small
  and real (**10 WA routes, 11 pins**, none with two summits). The ordering half was reporting
  **0 by construction**, and that is the entry worth reading.
  - `orderWaypoints` sorts by `distMi` **only if every pin has a finite one**, else it returns the
    list untouched. So a route missing a single distance renders in **stored order however wrong**,
    and the audit compared that order against itself and found no difference. **483 of 1,015 routes
    carrying waypoints are orderable; 532 are not** — the "0" covered half the catalog. The verdict
    was true and its scope unstated; it now prints the denominator with it, and separately the
    **434** of those that carry 2+ pins, since a lone pin has no order to be wrong about. Quote the
    run, not this line: every count here has moved with the repairs.
  - **THAT GAP IS MEASURED ON EVERY RUN NOW, and the figure this bullet used to carry was a
    hand-count that had gone wrong by more than 2x.** It read *"64 of the unsortable routes list an
    approach marker AFTER the summit"*, against a live 39 — a number nothing re-derived, sitting in
    a comment, inviting a re-sweep of work that had since been done. A semantic invariant in a
    comment rots; the audit now prints it, with its denominator, beside the refusals.
  - **THE ROUTE'S OWN DESCENT PROSE IS THE SECOND RECORD THAT SEPARATES A RETURN LEG FROM A
    MISORDERING**, and without it this class reports correct data. Four Dragontail-area routes list
    Aasgard Pass after the summit and every one of their descent paragraphs says outright that
    Aasgard is the way down — *"the standard descent is southeast to a saddle, then east across a
    long snow slope to Aasgard Pass"*. #1644 established that for `wa_dragontail_peak_r3` by hand;
    the audit now refuses **23 of the 46 after-summit pins** on that evidence. The match is
    deliberately hard to satisfy (a token of 5+ characters, not a generic feature word, not taken
    from the route's own name) because refusing wrongly DROPS a finding while keeping a correct
    route merely adds a line — *"North Side wall (GPS pin)"* must not match any paragraph
    containing the word "wall", and *"Slippery Slab Tower NE Face"* must not match its own prose.
  - **A SMALLER, UNARGUABLE TIER SITS UNDERNEATH IT: the row contradicts ITSELF.** A route the app
    cannot sort may still carry SOME distances, and on **5** of them those run backwards in the
    stored order — `wa_true_grit_2` lists its *Route start* at 0.3 mi LAST, behind a topout at 4 mi.
    `orderWaypoints` sorts ascending, so ascending is the app's own model: the order on screen is
    one the app itself would reject the moment the gap were filled. No prose and no research.
  - **"Cannot sort" is tested BEHAVIOURALLY, not by copying `orderWaypoints`' gate**: that function
    returns the SAME ARRAY REFERENCE when it declines and a fresh one when it sorts, so `ord === dd`
    asks the function rather than restating its rule, and cannot fossilise when the rule changes.
  - **A summit that is not last is NOT automatically wrong**, and both exclusions are measured:
    a **descent** route legitimately starts at the top (`wa_forbidden_peak_east_ledges` is
    Forbidden's standard way down, so summit-first is the correct reading order — judged on what
    the pins AFTER the summit are called, since a descent line is rarely named one), and a **loop**
    legitimately ends back at the trailhead.
  - **"REPORTED, NEVER REORDERED" WAS TRUE WHEN WRITTEN AND IS NOW FALSE — the class was SWEPT.**
    All 81 routes of that shape were read individually across six batches (#1588, #1590, #1594,
    #1599, #1600, #1602): **62 reordered, 19 left with a recorded reason.** So the count this audit
    prints is an **adjudicated residue, not a backlog**, and the audit says so in its own output.
    `scripts/oneoff/measure-summit-before-approach-shape.mjs` holds the adjudication and proves a
    bulk transform unsafe — 83% of the class shares one fingerprint, and BOTH known descent routes
    sit inside it, so nothing in the shape separates correct from wrong. The five keeps are: a
    descent leg correctly after the summit; the same place pinned either side of it; a mistyped
    `Topout` naming the base of a wall; a distance-less pin whose slot would be a guess; and one
    declared partial.
  - **The reasoning that survives is about the REPAIR, not the report**: an order must not be
    invented where `distMi` is absent, which is why `reorder-waypoints-by-distance.mjs` refuses a
    tie, refuses to promote anything above the stored first pin, and skips
    `wa_smears_jugs_and_rock_roll` outright as *"two approaches spliced together"* rather than a
    scrambled sequence. **Before working any count from this audit, check whether the route is
    already named in that script's skip list.**
  - **This is the THIRD vacuous-zero found in one day**, after the terrain classifier's blind
    columns and `audit:approach-scope`'s stale advice. **When an audit reports zero, ask what its
    denominator is before believing it.**
- **`audit:waypoints`** asks whether each waypoint actually sits on the route's own gpx track —
  a geometry question no column-coverage check can reach, since every field is populated and
  every value is a plausible coordinate. Read-only, anon key, fails closed on an empty read.
  `audit:waypoint-order` is its **sibling, not a duplicate**: that one asks whether the *list* is
  sensible (ordering, duplicate pins) and needs no gpx at all. Run both.
  - **THERE ARE THREE WAYPOINT AUDITS, AND TWO OF THEM ASK THE SAME QUESTION.**
    `audit:waypoint-track` measures the *same* thing this does — is each pin on the route's own
    line — with its own thresholds, and **neither script mentioned the other**. Against WA they
    flag **218 and 240 routes with only 178 in common**. Read the two together or you are reading
    one arbitrary half; do not quote either count as "the" number of waypoint problems.
    - The divergence is mostly **tolerance, not disagreement about facts**: this one uses a flat
      500 m for any non-trailhead/summit pin, `waypoint-track` uses **120 m by default with
      per-type exemptions** (Bailout 2000, Hazard 600, Water 400, Campsite 500) — because a
      Bailout pin is *supposed* to be off the line. So 53 routes visible to it and not to this
      one are pins 120–500 m out, which is a judgement call rather than a miss.
    - It is **ahead** of this script in two ways worth copying rather than duplicating: those
      per-type tolerances, and a **blame column** (TRACK / PARTIAL / PIN) that separates "the
      line is wrong" and "the track only covers the climb, so approach pins are legitimately
      off it — NOT a defect" from the pins actually worth fixing. Its PARTIAL bucket is 38
      routes this script reports as defects.
    - It was **behind** in one, and it was the same defect twice: it had **no placeholder gate**,
      so it measured pins against 2-point stubs and dots. `wa_sky_mountain_s_route` stores nine
      points spanning **four metres** and it reported a pin "2,237 m off"; `wa_mount_terror_
      stoddard_buttress` is 55 m of extent and reported 9,966 m. That is exactly what #834 fixed
      in this file and nobody carried across — **the four-grade-parsers shape, one level up**.
      Fixed: 240 → 231, and its lone "WRONG TRACK" was itself a 17 m placeholder.
    - A point-count gate cannot see this (**nine points is not a suspicious number**) — the test
      has to be **extent**. Skipped routes are now named and counted, not dropped.
    - **AND THE EXTENT TEST WAS NOT ENOUGH EITHER — a second unmeasurable class went uncounted in
      both scripts until #977.** 201 of the 580 WA routes carrying a gpx store a line that IS the
      route's own waypoint list joined up (median **four** points), so *"is the pin on its track?"*
      is answered **yes by construction** — the track is a copy of the pins, not a second opinion.
      162 of them span more than 2 km, so they clear the extent gate comfortably.
      - **The correction was to the DENOMINATOR, not the findings**, which is why nobody noticed:
        `audit:waypoint-track` still reports **254** routes disagreeing, and `audit:waypoints`
        still **597** actionable. What changed is that the first went from claiming **455** routes
        measured to **350**, and the second from 563 unmeasurable to **668**. So the track audit
        was reporting 455 measured against 254 disagreeing — reading as **201 verified clean**,
        of which **105 were never tested**. More than half its clean verdicts were vacuous.
        **Overstated coverage is the false-pass direction.**
      - The predicate lives in `lib/track.js`, shared with the route page's caveat and
        `check:track-caveat` rather than copied a third time — these two scripts have already
        drifted once on exactly this kind of gate, one bullet up.
      - **The counts quoted two bullets above (218 and 240) predate all of this.** Re-measure
        before quoting either; a headline count here has been wrong every single time it was
        carried forward rather than re-run.
  - **It has twice reported far more problems than exist, and both times the fix was to the
    audit rather than to the data.** #834 took 878 → 753 (a backwards summit predicate flagging
    every out-and-back, a point-count placeholder test, a whole class of positionless waypoints
    it could not see). This pass took it to 646 the same way, so **treat a headline count here as
    a hypothesis until it has been deduplicated** — see [[waypoint-audit-overcounted-by-126]].
  - **The categories must be disjoint, and two were not.** `waypointOffLine` walks every pin, so
    a trailhead or summit already judged by its own category was reported a second time — 100
    pins double-counted, Curtis Ridge producing six findings from three waypoints. Worse,
    `summitOffLine` and `trackNotEndingAtSummit` both fired on the same pin, which is not merely
    a double count: it put 20 routes whose summit pin is *correct* and whose gpx simply stops
    short into a category titled "SUMMIT IS NOT ON THE TRACK". Those need the **opposite** repair,
    which is the distinction note (3) already draws for trailheads. They are now exclusive.
  - **A dedupe that loses a finding is worse than the double count it replaces**, so it is
    verified by comparing distinct `(route, waypoint)` pairs across dumps rather than totals:
    `verify-waypoint-dedupe-lost-nothing.mjs`, 449 before and 449 after, nothing lost, 100 pins
    moved to the more specific category.
  - **`trackOffItsPeak` is the one test not measured against the route's own track**, which is
    why it is worth having: every other category asks "is this pin on this line?" and therefore
    cannot say which of the two is wrong. When the *track* is the misplaced thing, the route's
    correct pins are all faithfully reported as broken and the gpx is never suspected.
    `wa_mount_rainier_curtis_ridge` carried five points beside **Rattlesnake Lake, ~65 km from
    Rainier and 734 m from a bouldering crag**, and all six of its findings blamed the waypoints.
    Anchoring on the area's own coordinate settles it with no pins, prose or judgement.
  - **Its title says "never comes within 2 km", not "is not this peak's track", and the
    difference is measured.** Of 8 WA hits only **one** is a foreign track; the other seven
    start at the **correct trailhead** and merely stop short (Himmelhorn and West Twin Needle
    from Goodell Creek, Fuhrer Finger from Paradise, Barnes up the Elwha). Naming it for the
    stronger claim would have been false of seven of eight. It is **informational** for the same
    reason — 6 of its 8 are already counted elsewhere, so counting it would re-inflate the total
    this pass deflated. Confirm each with `probe-whose-track-is-it.mjs`, which names the peak a
    stray track actually reaches; the threshold comes from the measured distribution (closest
    approach is **13 m at the median, 1,038 m at p95**), not from a guess.
  - The placeholder-coordinate guard (`COORD_DP`) **excludes zero WA routes today** and says so
    in the script: both peaks it would protect are already filtered as `unrouted`. It is kept
    for the eight 3-decimal Picket summits, not because live data has exercised it.
  - The opening read pays a **warm-up request** because the first call of a run costs ~3.7s of
    connection setup against 0.3–0.7s warm, and anon carries a 3s `statement_timeout` — so it
    intermittently died with `57014` before fetching anything. Shrinking the page does **not**
    fix that: measured, 1,000 areas *with* lat/lng takes 725 ms warm while 400 still failed cold.
  - Injection-tested, three cases: neutering the dedupe guard restores 100 duplicates, re-merging
    the summit categories restores 20, and disabling `COORD_DP` changes nothing — which is how
    that guard was found to be inert and got documented as such rather than presumed working.
- **`audit:map-pins`** asks what the route MAP actually draws — how many trailhead pins it will
  paint, and which pins it will silently drop — rather than the geometry question the three
  waypoint audits ask. It overlaps `audit:waypoints` on two of its three sections and exists
  for the UI consequence, not the detection; see the honesty note at the end of this entry.
  - **Two trailhead pins. Candidates, never defects**, and that is measured: of the two routes
    that have tripped it, **one was a defect and one was correct data**.
    `wa_mount_ballard_south` carried "Harts Pass" beside "Canyon Creek Trailhead" 18.3 km apart
    while its approach text names only Canyon Creek and never mentions Harts Pass — wrong, and
    repaired by **retyping rather than deleting** (`Trailhead/pass` normalises to `Trailhead` in
    `WP_TYPE_MAP`, which is how a real pass got drawn as a start). But
    `wa_remmel_mountain_southeast_slope` carries "Thirtymile" and "Andrews Creek" and its own
    approach describes both in full — *"Via Thirtymile: … Via Andrews Creek: …"* — which is a
    peak with two genuine approaches, the case the `audit:trailhead-agreement` entry already
    says not to sweep to zero. **Read the route's prose before touching either pin.**
  - **Scope it by waypoints, NOT by discipline.** The first version filtered to alpine-family
    disciplines and reported **zero** two-trailhead routes while `audit:waypoints` reported one:
    Remmel is a walk-up filed as **`trad`**. A discipline label is not a reliable filter for a
    question about the map, and none of these three questions is discipline-specific anyway.
  - **Pins the map silently drops.** `GPXMap` skips `wp.lat == null` without a word, so such a
    waypoint is listed under the map and absent from it — **40 pins across 16 WA routes** after
    the repairs below, one of which (`wa_emerald_peak_west_route`) had a *single* waypoint, so
    its map drew nothing at all.
    - **`audit:waypoints` already had this category** ("WAYPOINT HAS NO COORDINATE — missing
      from the map"), and the first draft of this entry claimed no existing audit could see it.
      That was wrong. What nothing had noticed is the **UI** consequence: the row rendered as
      ordinary text, so on the page it was indistinguishable from a placed one and tapping it
      did nothing. The detection existed; the reader-side honesty did not. Check whether a
      sibling audit already answers your question before claiming novelty for it.
  - **`Number(null)` is 0, not NaN**, and the first run manufactured a finding because of it —
    `wa_jack_mountain_northeast_glacier` reported a trailhead disagreement of **12,215 km**,
    which is the distance from a real pin to (0, 0) in the Gulf of Guinea. A missing blob
    coordinate had passed a `Number.isFinite` test. Null-check before coercing, and distrust a
    distance finding that is absurdly large before believing the data is that bad.
  - `--state all` is not a nicety: `id like 'wa_%'` misses the legacy `rainier_*`/`adams_*` ids,
    4 of the 1,016 routes carrying waypoints, and they are Rainier and Adams.
  - **The trailhead PIN and the `approach_logistics` blob disagreeing is mostly NOT a defect,
    and the ratio is measured: of 12, six were repaired and six are correct data.** The route
    page USED to read the two in opposite orders (TrailheadCard took the blob, the map drew the
    pin), so a disagreement sent you to two different places; #1215/#1231 consolidated all three
    surfaces onto `trailheadPoint()` and that split is gone. The data question is untouched: on a
    peak with two genuine approaches, *both* records are right and sweeping them to zero is
    the damage. `wa_lundin_peak_west_ridge` is the case `audit:trailhead-agreement` already
    names; Carru, Howard, Remmel and Stuart's North Ridge are four more whose own prose
    describes both starts in full.
  - **The chord-vs-trail test settles the ones that ARE defects, with no research and no
    judgement** (`scripts/oneoff/probe-trailhead-by-chain-geometry.mjs`). A waypoint's
    straight-line distance from the trailhead can never exceed the trail mileage recorded on
    it — the trail is the walked path, the straight line is the chord. So the route's own
    waypoint chain is a **third record** that adjudicates between the two that merely
    disagree, exactly as `trackOffItsPeak` anchors on the peak coordinate instead of trying
    to referee a pin against a line. On `wa_chikamin_peak_southeast_slopes`, "Kendall
    Katwalk" is recorded at 6.6 trail miles — 10.62 km — and sits **11.30 km** straight-line
    from the Mineral Creek pin, against 3.7 km from the PCT North blob. The chain is the PCT
    approach; the pin was the route's *other*, genuine approach placed as though it were the
    start.
    - **Tolerance must be mean, and this is where the method nearly failed.** At 15% slack it
      rated that 11.30-across-10.62 as fine and returned "both fit" — a false pass on the one
      test that can settle these. Even at 3% it survived, because a 0.4 km floor covered the
      gap **by 20 metres**. Slack covers a mileage rounded to one decimal and a hand-placed
      pin, and nothing else.
    - **Do not let a fitted ratio vote.** Drafts added a median and then a near-the-start mean
      of chord/trail, and every margin tried was one chosen because it produced the answer
      already believed about Chikamin. Those numbers are printed as context and excluded from
      the verdict; only the physical invariant decides. A threshold fitted to the case it is
      meant to judge proves nothing — the same failure as a fixture that sets only the
      property its author already believed in.
    - It answers **"neither"** as readily as it picks a winner, and that matters:
      `wa_phantom_peak_south_route`'s chain is the Big Beaver/Luna Creek approach while its
      two records name Hannegan Pass and Nooksack Cirque. A test that always chooses one of
      the two offered answers would have picked a wrong one.
  - **A small distance is not a small error.** Two disagreements looked like 642 m and 541 m
    of rounding, and both were the same defect: the pin held the coordinate of the **named
    feature** rather than of a trailhead — 46.93872,-121.86149 is Wikipedia's coordinate for
    Mowich *Lake*, and 48.7317,-121.0672 is Ross *Dam*, which sits at the bottom of a mile of
    trail off SR-20. The page hangs driving directions off that pin.
  - Report-only, read-only, fails closed on an empty read.
- **The OFF-TRACK PIN backlog is mostly correct pins, and the headline count overstates it by a
  lot.** `audit:waypoint-track` reports hundreds of routes with pins off the line, and the
  instinct is to read that as a defect list. Measured, it is not.
  `scripts/oneoff/probe-offtrack-triage.mjs` narrows it and each narrowing is a different
  reason:
  - **629 off-track pins → 464 worth looking at.** 64 routes carry a CLIMB-ONLY track (the gpx
    never comes near the trailhead), so every approach pin on them is off the line **by
    design** — 143 pins excused. A further 6 routes have a track that never reaches their own
    summit pin, which is `audit:waypoints`' "TRACK NEVER COMES WITHIN 2 km OF THE PEAK": there
    the **track** is the suspect record and researching the pins researches the wrong half, so
    those 22 pins are set aside as one decision per route rather than a source per pin.
  - **Then severity, not count.** Of the 464, only **13** are more than 20x their own pin
    type's tolerance. A Junction 392 m off the line is a saddle marked at the ridge crest
    rather than where the trail crosses it — not a different place.
  - **And of those 13, the ones checked against a published coordinate were mostly ALREADY
    RIGHT.** `wa_argonaut_peak_east_ridge`'s "Colchuck Lake" is stored at
    `47.4919578,-120.8335801`, which is exactly the USGS coordinate; "PCT Junction near Lemah
    Meadows" is stored at `47.4623,-121.2810` on two routes, exactly the published Lemah
    Meadow coordinate. Those pins name a feature on a **different approach to the same peak**,
    or a feature that is an area rather than a point. Of three researched, **one** was wrong.
  - **The bar for writing a researched coordinate is that it lands on the route's own track**
    (`verify-researched-pin-coords.mjs`). Cutthroat Pass on
    `wa_tower_mountain_southwest_route` went 2,464 m off → **36 m** on substituting the USGS
    value, which is agreement with a record nobody consulted while publishing it. The same
    check **refused** Longs Pass on `wa_argonaut_peak_east_ridge`, where the USGS coordinate is
    *further* from that route's track than the stored one — research alone would have written
    a wrong fix there.
  - **Do NOT "repair" a junction by interpolating along the track at its `distMi`.** It is
    computable and it is fabrication — the same class as the 199 routes whose pins were
    manufactured on a straight line, and the synthetic-waypoint audit would rightly flag it
    later. A pin with no source stays where it is.
- **`audit:coord-origin`** asks whether every coordinate a route stores is actually **near the
  route**, anchored on its own `areas.lat/lng`. Read-only, report-only; **not** a build gate — a
  property of the DB rather than of the checkout, the reasoning that keeps `check:counts` out.
  - **THE GAP IS STRUCTURAL, AND IT IS WHY FOUR AUDITS WERE ALL SILENT.** Every existing geometric
    audit compares a route's records against **one another** — `audit:waypoints` (pins vs its own
    track), `audit:waypoint-track` (same question, other tolerances), `audit:waypoint-geometry`
    (pins vs each other), `audit:trailhead-agreement` (the two trailhead copies). When a **whole
    blob is foreign** those records agree with each other perfectly, and *two records agreeing is
    one claim counted twice*. A wholesale contamination is invisible to all of them by
    construction. The AREA coordinate is a third record none of them derives from.
  - **`audit:identity` is the near miss and its own section 2 says why it cannot help**: it looks
    for prose **naming a foreign peak**. The founding blob names no peak at all — only *"Pacific
    Crest Trailhead at Rainy Pass"* and *"South-southwest via open timber basin"*. The
    contamination was in the COORDINATES, which are the most identifying thing in the row and were
    the one thing nothing compared.
  - **THE FOUNDING CASE: two out-of-state routes carrying Washington's Cutthroat Peak wholesale.**
    `ar_cutthroat` (an **Arkansas** 5.11d sport route) and `az_cutthroat_trout` (an **Arizona**
    5.9+ trad route) each stored a peak coordinate **10 m from `wa_cutthroat_peak`**, plus its
    trailhead name, trailhead coordinate and trailhead direction — every field. The only thing
    either shares with that peak is the word *Cutthroat* in its **route name**. `a name is not an
    identity`, landing on coordinates this time rather than on an id or on prose. It was
    user-visible: `TrailheadCard` would send an Arkansas sport climber to SR-20 and state a
    bearing and distance to a summit 2,698 km away.
  - **It also found the RESIDUE OF A REPAIR THIS FILE RECORDS AS DONE.** The `wa_true_grit` entry
    above says the row was fixed — overview, beta and approach cleared, the genuinely-Coulee
    hazards correctly kept. Both **waypoints** were missed and still sat 160 km away on Vesper
    Peak. *An instance fixed by hand is not a class closed*, and the audit that would have caught
    the remainder did not exist.
  - **50 km is deliberately LOOSE, and the looseness is the point.** Three other audits already ask
    whether a pin is precise; this one asks only whether the coordinate is in the right part of the
    continent. A remote Pasayten summit really is ~30 km from its road and this file records 236 WA
    routes legitimately over 8 km from their peak — a tight bound would rediscover those and bury
    the thing this exists for.
  - Fails **closed** four ways: zero routes, zero areas (every route would be unanchored and the
    run would report a clean catalog), zero coordinates examined, and routes whose area carries no
    coordinate are **counted and reported as not a clean verdict** rather than dropped.
  - Injection-tested. `--inject=clean` is the case that matters: every coordinate moved onto its
    own area must report **0**, which is what proves the audit measures distance rather than
    always firing. `--inject=foreign` moves one pin to Everest and must report it.
  - **TWO OTHER HYPOTHESES WERE MEASURED FIRST AND BOTH CAME BACK EMPTY**, recorded so nobody
    re-derives them. *A read that never STARTED reading as one still in flight* — React Query v5
    leaves a disabled query `isPending` forever, and `lib/db.js` gates 64 queries on things like
    `enabled: !!id` — is a real mechanism and the app does not do it: **0** of the 21 lines that
    render arriving-soon copy are gated on `isPending`, and the `!ready` ones are map-tile
    readiness rather than a query. And *`check:read-failures` scans only `lib/db.js` while five
    files do reads* is a genuine scope gap (186 of 248 exported functions) with **nothing in it**:
    applying the guard's own lifted predicate to `lib/auth.js`, `lib/offline.js`, `lib/fire.js` and
    `lib/mapKit.jsx` finds zero sites, and the single hit in `lib/db.js` is the one already
    declared. *Measure the class before building the detector* — the discipline `audit:area-parents`
    records after its first draft shipped 12 real findings out of 41.
  - **Four findings, THREE different repairs** (`fix-foreign-coordinates.mjs`), because they are
    three different defects: a wholesale foreign blob is **cleared**; a route whose every other
    column also describes the far place is **misfiled and moves**; a stray pin among correct ones
    would be a pin to fix. No coordinate is typed anywhere in that script — every operation is a
    clear or a move to a declared area id, and the move is gated on **the row's own pins being
    within 10 km of the destination**, so a wrong destination cannot be expressed.
    `wa_up_in_arms` moved to `wa_concord_tower` on that gate: all eight siblings on `wa_upper_wall`
    are 0-pitch crag routes and it is 6 pitches — the same non-prose discriminator that settled
    `wa_south_face_direct`. `check:counts` confirms all 47,638 areas still agree afterwards.
