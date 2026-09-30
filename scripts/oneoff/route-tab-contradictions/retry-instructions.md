This is a RETRY. Follow `scripts/oneoff/route-tab-contradictions/research-instructions.md` in full (read it first,
and the tab map it names, with <AUDIT_DIR> = audits/route-tab-contradictions), with these additions:

- Every contradiction in your file was left **unresolved** by a first research pass: `prior_evidence` says what it
  found and `sources_already_tried` lists the pages it used. Your job is to try AGAIN with sources it did not use —
  other route pages, land-manager pages, trail databases, topo/elevation data, trip reports from other years,
  the USGS elevation service for a named point (`curl -s "https://epqs.nationalmap.gov/v1/json?x=<LNG>&y=<LAT>&units=Feet&wkid=4326"`
  gives the ground height at a coordinate; that counts as one topo source for an elevation).
- `route` is the LIVE row as of now; many rows were corrected since the first pass. If the contradiction no longer
  exists in `route`, answer `verdict: "not_a_contradiction"` with evidence "already consistent" and no patches.
- `fact` and `prior_evidence` describe the dispute; the `claims` text may not be present — re-read `route` to find
  every field involved.
- Held-back rules learned in the other half (the apply step refuses or reviewers reject these):
  - Never set `timing.summitTimeHrs` to null unless the row publishes an approach or descent leg that
    `summitTimeHrs` double-counts.
  - Never edit `access._raw` (it is not rendered).
  - Never compute a figure: no gain/loss by adding pins or days, no day miles by subtraction, no `distMi` interpolated
    from a round trip, no one-way distance halved from a round trip unless a source states it. If only a computed
    value would resolve it, leave it `unresolved`.
  - `season` holds a short window; if it currently holds a sentence, leave it (another session owns that).
- Being unresolved again is a fine outcome. A wrong fix is worse than an open question.

Output format, patch format and text rules are exactly those of research-instructions.md. Write ONE output file per
input file, at `audits/route-tab-contradictions/research/out/<same name>.json` (e.g. `u007.json`), with
`"file": "u007"`.

## Save as you go
After finishing EACH route, rewrite your output file with every result so far (valid JSON each time), so work survives if you are cut off.
