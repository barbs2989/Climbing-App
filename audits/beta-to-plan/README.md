# Beta → Plan section (2026-11-26)

Owner note: *"Audit the beta section and see where things might overlap to the plan section and move to the
plan section where you recommend per route due for research."* ("plant" read as **plan**: the Plan tab on a
peak route, and the Plan body lower on Overview on a crag route.)

## Census (nightly static snapshot, 2026-11-26 04:05 UTC, no DB slot)
- 316,978 routes; **3,928 store `beta`** (trad 1,846 · sport 742 · alpine 494 · mountaineering 238 · bouldering 224 ·
  scrambling 205 · toprope 142 · aid 17 · ice 17 · mixed 3). Median 170 chars.
- `classify.js` flagged **2,010** whose beta has a sentence about approach, descent, rack, bolts/anchor, camping,
  access or time (keyword fingerprint: a candidate list, not a decision — see the standing rule that a fingerprint
  does not authorise a bulk fix).
- `packets.js` built 51 batches (`batches/in-NNN.json`): the beta, the CURRENT text of every Plan target, and the
  targets this route's page actually draws (`allowed_targets`: no DESCENT on a single-pitch crag line that stores
  none, owner 2026-11-11/18; no bivy on a crag; bolts/anchor/location per lib/fieldScope.js).

## Decisions
Every route was read by a Sonnet agent under `INSTRUCTIONS.md`: per sentence, *covered* (already said in the
target: delete from beta), *add* (move into the target), *copy* (add the fact, keep the beta sentence — every bolt
count, and gear sentences that give a reason or a place on the climb), *conflict* (research online, two sources).
Then:
- an independent verifier agent read every decision (`flags.json`, 13 routes reverted or edited);
- `applyflags.js` reverted every route where a *covered* sentence held a NUMBER the target does not state (26
  more, `reverts.json`; conservative — a few are unit restatements);
- hand fixes: anchor "Chains" where the beta said "anchors"; the Rainier bivy name; two crag routes whose reason
  clause was moved (kept in beta); Anaconda's descent clause (no DESCENT section on that page) kept in beta.
- one pipeline sentence removed from Mount Sefrit's beta ("routeFt here (3,691 ft) is a computed total…").

Conflicts researched:
- **Argonaut Peak East Ridge** — beta said the Colchuck Col side is "the better way" and the Ingalls side "a long,
  strenuous bushwhack". Both ways are used; nothing ranks them; the Beverly/Ingalls trails are easy and only the
  off-trail climb above the creek is a tough bushwhack. Beta sentence removed; APPROACH gains a neutral line on the
  Colchuck-col alternative. (Mountaineers South Route + NW Arete pages, Mountain Project area 114795615, WTA trip
  report 2024-09-23.)
- **Tenpeak Mountain Southeast** — beta: "A fixed pin exists for rappel descent assistance"; DESCENT: no fixed
  anchors on the gully or chimney. A fixed pin ~50 ft below the summit on the north corner is reported for the
  descent (Wenatchee Outdoors 2016; CascadeClimbers topic 3330 citing Beckey). Moved into DESCENT with its place.

Kept in beta on purpose: single-pitch crag "lower off / rappel" lines (no DESCENT section there), time figures
(the Planner computes its own; a stored number would drive its Total), a camp named as a starting point, any
sentence that mixes the plan fact with the climbing.

## Apply
`scripts/oneoff/apply-beta-to-plan.mjs [--apply] audits/beta-to-plan/batches/out-*.json` re-reads each live row,
skips it if beta changed since the snapshot or a climber's beta contribution is on file, refuses a new beta that
adds words, lints every value (no sources, no shouting), writes one row a second through `patchRow`, re-reads,
and saves a rollback (`scripts/rollback-beta-to-plan-<ts>.json`). Results: `apply-report-*.json` here.
