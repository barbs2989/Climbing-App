# Crag parking pins vs Mountain Project's Getting There (2026-11-25)

Owner note: "Parking is wrong for many of the Crags, i.e. Existential Wall and Red Rocks, Nevada. Use Mountain
Project's directions as a reference to where to park and audit for all routes ... it says on my app that you have
to park at [Calico I] pull out, but that's on the other side of the mountain."

Why the pins were wrong: the 0255 parking pass (`scripts/oneoff/crag-parking-match.mjs`) took an OpenStreetMap
lot when its name shared a word with the crag OR WITH A PARENT AREA within 1 km, then spread lots to siblings.
"Calico I" (a Scenic Drive pullout) shares "Calico" with Calico Basin, so Calico Basin crags reached from the
Red Spring lot / Assisi Canyon Dr were pinned across the hill. Several researched pins were also spread over a
whole park (one Lynn Woods lot on ~57 sub-areas, boulders 3.5 km away included).

Pipeline (scratch dir paths are hard-coded; this is the record of the run, not a reusable guard):
1. Every area with a parking pin (9,597) matched to its MP area by name within 3 km (9,121 matched).
2. `crawl.mjs` — MP parent-area pages (2,938) under the owner's licence via paced-fetch; leaf-wall text came
   from the existing `~/dev/mp-data/_mp/_text` dump. MP text is NOT committed.
3. `build.mjs` — each pin with MP parking sentences (own Getting There, parent sentences, "approach as for X")
   grouped by pin + text: 8,776 groups. No name-match shortcut (a shared word with a parent is the bug).
4. Judges (Sonnet, `JUDGE.md` / `AGENT.md` / `mk.py`): keep / move (to a candidate lot) / wrong / unsure.
5. `lookup3.mjs` — OSM parking/trailheads within 4 km of each WRONG group; resolvers (`RESOLVE.md`) pick the lot
   MP names, keep the spot with a corrected name, or clear the pin, and write a one-line parking note in our
   own words where the area had none (`assemble.mjs` refuses 8+ words shared with MP, source names, caps).
6. `../apply-crag-parking-mp-audit.mjs` — writes guarded on the old pin, paced, rollback JSON first, reconciled.

Decisions applied: `../data/crag-parking/mp-audit-*.json`.
