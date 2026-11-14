# Out-of-state brief (2026-10-29): thin descent and approach on the marquee peaks

Read `audits/thin-descent-approach/BRIEF.md` first. Every rule in it applies here, and so does the output shape. Where
it says Washington, read the state of your peak; its WA-specific source list is replaced by the one below.
For reading SummitPost in the real browser and saving page text for the copy check, follow
`audits/thin-descent-approach/retry/RETRY-BRIEF.md` (the "Copy check for browser-read pages" section).

Your context file is `audits/thin-descent-approach/oos/ctx-<area_id>.json`. Write `oos/batch-<area_id>.json`.

## Why these peaks go faster
Most of these rows are Mountain Project imports of well-known peaks. On a big peak, the routes that reach the summit share
ONE standard descent: the Grand Teton's Owen-Spalding rappel to the Upper Saddle, then down to the Lower Saddle and
Garnet Canyon; the Diamond's North Face/Cables or Kieners descent, or rappels down the face; the Hulk's standard descent
gully. Routes on one face usually share ONE approach. So:

1. First research the peak's standard descent(s) and the approach to each face, with two agreeing sources.
2. Then, per route, find the route's own page (usually `mountainproject.com/route/<id>/<slug>`; WebSearch
   `site:mountainproject.com "<route name>" <peak>`) and read its Location/Descent text. It tells you which face the route is
   on, where it tops out, and whether parties rappel the route or walk off.
3. Write the descent only when a source says where THIS route ends (summit, a named ledge or shoulder, or "rappel the
   route"). Then attach the standard descent from that point. Write the approach when a source says which face or feature
   the route starts from. The approach to that face is shared.

Rows on these peaks also include some ice/mixed lines and obscure first-ascent-only routes. Skip any row you cannot place.

## Sources
mountainproject.com (WebFetch, or the browser), summitpost.org (browser only), nps.gov (Grand Teton, Rocky Mountain,
Sequoia/Inyo trail and permit pages), fs.usda.gov, americanalpineclub.org (AAJ), peakbagger.com, supertopo.com,
and climbing-guide sites (Exum, Colorado Mountain School, Sierra Mountain Guides) for standard descents. Do NOT curl
with a faked user agent. Two agreeing sources per fact where they exist. List every URL in `review.sources`.

## Specific traps
- **Grade must match the line.** Many imports share a name across faces. Check the MP page's grade against the row's.
- **No guide-company voice or marketing**, and no "per MP" or "guidebook says". Facts only, in our own words.
- **Permits and closures:** you may mention a required overnight permit or a seasonal closure (raptor closures in RMNP)
  in the approach, in general terms, only if a current official source states it. Leave out exact dates that change yearly.
- Keep each entry's `area` exactly as given.

Dry-run: `node scripts/enrich-approach-rappel-bivy.mjs --dry --from audits/thin-descent-approach/oos/batch-<area_id>.json` from
the worktree root. Fix every REFUSING line. A "could not read source" warning is acceptable only for a page you saved in
`source_texts` (it then must not appear) or for a page that genuinely failed. In that case, prefer a second, readable source.
