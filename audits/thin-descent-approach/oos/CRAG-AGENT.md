# Sport-crag tier: the agent method (2026-10-30)

Read `audits/thin-descent-approach/BRIEF.md`, `oos/OOS-BRIEF.md`, `oos/TRAD-BRIEF.md` (its twelve rules are binding) and `oos/CLIFF-BRIEF.md` first.
This file adds what lead review cut in the aid and cliff tiers.

## Output
- For each context `oos/ctx-crag-<st>-<n>.json`, write `oos/batch-crag-<st>-<n>.json`.
- Every target gets a `set` or a `skip_reason`.
- Copy ids and `area` exactly from the context, by script.
- Set only the fields the target needs (`need_approach` / `need_descent`).

## Method
Research every row; the lead rejects skips that were not researched.
1. Work crag by crag. Research the crag's approach once, from its Mountain Project area page: parking, trail, which wall is which. That page is a valid source for the approach of every thin row at that crag.
   - Helper scripts in `oos/scratch/` (`cliffca-dump.mjs`, `cliffca-tool.mjs`, `full.mjs`) use Mountain Project's search with plain fetch.
   - Check every hit's state and area: same-name routes elsewhere came up four times.
2. For each route, add where on the wall it starts, from its own page.
3. Write the descent only where this route's page, or its own crag or wall page, states how parties get down: lower from the anchors, rappel the route, or walk off.
   - A descent stated only on a neighbouring route's page is not allowed.
   - If nothing states it, set only the approach. Never guess "lower off" or "rappel the route".
4. Use medium confidence when you have one source.
5. List every page you read and used in `review.sources`.

## What review cut (don't write these)
- **Single-source numbers:** pitches, rappels, distances (write "a short way right of X", not "about 100 feet right of X"), times, gain, rope lengths, grades in prose, and "the first three pitches of X".
- **Hedges and superlatives:** "probably", "best line", "best descent", "recommended", "classic".
- **Testimony:** "a party", "parties report", "often".
- **Sources:** source names, and any reference to a page, photo, topo or overlay.
- **Unstated access:** a generic access line that no source states. Leave it out.
- **Current state:** conditions, closures, seasonal dates. If a crag is marked closed, skip its rows.

## Skip when
- After searching, neither the crag page nor the route page exists.
- Its identity is in doubt:
  - Mountain Project files it under a different wall from our parent;
  - its own page says the exact line is uncertain;
  - or the page is a list of routes.
- It is already covered: grep `oos/batch-*.json` for the id and name that batch.

Say what you searched in the `skip_reason`.

## Finish
- `node scripts/oneoff/thin-da-offline-check.mjs <batch>` must print no COPY or CAPS lines.
- Don't run the applier, and don't touch git.
- Keep any helpers in `oos/scratch/`, with a filename prefix unique to your batch group, since other agents work in parallel.
- Reply with:
  - a table per batch: approach only, both, skipped;
  - skips grouped by reason;
  - misfiled, duplicate or grade/pitch findings.
