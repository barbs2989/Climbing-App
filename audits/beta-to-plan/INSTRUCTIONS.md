# Beta → Plan section audit (ClimbMatch route pages)

The owner asked: "Audit the beta section and see where things might overlap the plan section, and move to
the plan section where you recommend, per route."

On a route page the **BETA** section is prose about *how the climb goes*. The **Plan** body (the Plan tab on
peak routes; lower on Overview for crag routes) has dedicated sections:

| target | section on the page | what belongs there |
|---|---|---|
| `approach` | APPROACH | getting from the car / trailhead / camp to the START of the route (trail, parking, minutes of walking, which gully leads to the base, how to find the base) |
| `descent` | DESCENT | getting OFF after the top: rappel the route, walk off, lower off, descent gully, raps to the ground |
| `rack` | RACK | what to bring: cams, nuts, sizes, doubles, draws, slings, number of ropes / rope length, pitons, ice screws, crampons/axe on the approach |
| `bolts` | GEAR & SAFETY "Bolts" | an explicit bolt count for the whole route ("six bolts") — integer |
| `anchor` | GEAR & SAFETY "Anchor" | the anchor at the top, short (≤ 80 chars): "Two-bolt anchor with chains", "Tree" |
| `location` | LOCATION (crag) | where the climb is on the wall, purely for finding it: "40 ft right of X, below the roof" (≤ 160 chars) |
| `bivy` | CAMPING & BIVY | a named camp / bivy site useful for this route that is NOT in the list already |

Each packet in your input file gives: the route, its `beta`, the CURRENT value of every target (`current`),
and `allowed_targets` — the only targets this route's page draws. Never move into a target that is not allowed.

## What you decide, per route

Read the beta sentence by sentence. For each sentence (or a clean clause of one) whose JOB is one of the targets:

1. **Already said in the target** (same fact, maybe other words) → remove it from beta; record `{"to":T,"action":"covered","from":"<the beta text removed>"}`.
2. **Not in the target, and does not contradict it** → move it: remove from beta and record
   `{"to":T,"action":"add","from":"<beta text removed>","value":...}`.
   - for `approach` / `descent`: `value` is a standalone sentence or two in our own plain words, ready to append to the
     current text (do not repeat what the current text already says; keep every fact from `from`).
   - for `rack`: `value` is `{"rows":[{"item":"Cams","sizes":"to 3 in"},{"item":"Nuts"},{"item":"TCUs","sizes":"small","qty":2}],"text":"Nuts, cams to 3 in and two small TCUs."}` — rows are COUNTED items (qty only when the beta states a number), `text` is the same as one sentence.
   - for `bolts`: an integer. for `anchor` / `location`: a short value string (no full sentence needed, no trailing period).
   - for `bivy`: `{"name":"...","notes":"one or two sentences","type":"camp"|"bivy"}`.
3. **Contradicts the target** (beta says rap the route, descent says walk off; beta says 9 bolts, current says 7) →
   research it online (Mountain Project route pages read with `curl -sL -A "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36" URL`; guidebook pages; at least two sources). If settled, record
   `{"to":T,"action":"conflict-resolved","from":...,"value":<the correct value to append/replace>,"replace":true|false,"evidence":"urls + one line"}`
   (replace=true only when the CURRENT target text is wrong and should be replaced by value). If not settled, LEAVE the
   beta sentence where it is and record `{"to":T,"action":"conflict-held","from":...,"evidence":...}`.

**KEEP in beta** (do not move): how the moves go, the crux, rests, route-finding ON the climb (including a traverse,
downclimb or "descend leftward to a ledge" that is PART of the route), protection QUALITY tied to moves ("runout above the
third bolt", "protects well with small cams" when it describes where/how pro goes — but a plain list of what to bring is
rack), history/first ascents, grade notes, conditions, a "start on the flake" that leads straight into the climbing.
A sentence that mixes a plan fact with climbing ("Climb past six bolts to a roof crux") stays whole in beta; you may still
record the plan fact as an add (e.g. bolts 6) with `"action":"copy"` (fact added to the target, beta unchanged).
Mentions of a camp as a STARTING POINT ("From Wing Lake camp, climb snow...") are routing beta — keep them.
Time figures (hours, car-to-car) stay in beta: do not move them.

When unsure, keep it in beta. A thin move is worse than none. Do not move half a sentence so the rest reads broken.

## Writing rules (owner's standing rules)
- Our own words. No sources or citations in any value ("per a trip report", "according to MP", "the guidebook says", URLs, names of websites or guidebooks, people credited as sources) — strip them.
- No ALL CAPS shouting, no emoji, no first person, no "auto-generated"/pipeline talk.
- `beta_new` = the beta with the moved text removed and nothing else changed except minimal joining (a dangling "Then"/"Also" fixed, spacing). Keep paragraph breaks (blank lines). It may become "" if everything moved.

## Output
Write `out-NNN.json` (same NNN as the input) next to the input file: a JSON array with ONE object per input route, in order:
`{"id":..., "beta_new":"...", "moves":[...], "note":"short, optional"}`. A route with nothing to move: `beta_new` equal to the
original beta exactly and `moves: []`. Validate the file parses (`node -e 'JSON.parse(require("fs").readFileSync(F))'`).
Reply with just: the file written, counts (routes, routes changed, moves by target and action), and any conflicts.

## Two refinements (after the pilot)
- `bolts` is ALWAYS `"action":"copy"`: record the count, never remove the beta sentence (it says WHERE the bolts are).
- A RACK move carries only what to bring. If the gear sentence also gives a reason or a place on the climb
  ("double ropes guard against rope damage if a fall swings you round the corner", "small cams for the lower chimney"),
  keep the sentence in beta and record the rack fact as `"action":"copy"` instead of moving it.
