# Closed-road distance research: brief for one road group

The owner's note (2026-10-29) concerned Three Fingers South Peak via Lookout: "Description said road was washed out so it adds extra miles but that isn't reflected in the technical stats distance... Audit this stat for all routes. Also for the distance is the number that is the most common approach."

The app's Distance tile reads `lib/outing.js` `effDistKm`. If the route's `itinerary.days` state miles, the tile uses their sum, halved unless `outing_shape` is loop or point. Otherwise it uses `dist_km`, which has no single meaning: on some rows it is one way, on others the round trip. Read the row's own text to tell which. `gain_ft` is the route's total ascent.

Your job covers one road group: a closed road and the routes whose text says it is closed. Do it in this order.

1. **Research the road now (2026), online.** Use WebSearch mode "extended" and WebFetch. Answer:
   - Is it closed to vehicles in the climbing season?
   - Where is it closed?
   - How many extra miles one way, and how much extra ascent, does it add to reach the trailhead each route uses?
   - Is a reopening date published?

   Prefer official sources: USFS alerts, NPS road-status pages, WSDOT, BC government pages. Then WTA, the Mountaineers, and recent trip reports. Confirm with at least two independent sources where they exist, and record any disagreement. If the road has REOPENED, add nothing; instead give the corrected road status text.

2. **Read each route** with `node scripts/oneoff/peek-closure-routes.mjs <id> [<id> ...]`. This is read-only. It prints the tile's one-way miles, the itinerary days, the road block, the approach text, and the approach variants. For each route decide:
   - Does the closed road lie on the route's MOST-USED approach? The primary variant is the one marked `primary=true`, or else the first. If the road is only on an alternate approach, the plan gives that variant its own `distMi` (one way, including the road) and no route-level change. Use `variantPatches`.
   - Does the stored distance ALREADY start at the closure? Compare it with published trailhead-to-objective figures and with what the row's own day notes say. Add the road only when the stored figure plainly measures from the old trailhead.
   - Also check the gain the same way.

3. **Write the outputs.**
   - The plan goes in `audits/closure-distance/<file>.json`: an array of
     `{id, walkMi, walkGainFt?, dayNotePrefix?, distKmNew?, roadPatch?, variantPatches?, timingAdd?, why}`.
   - `walkMi` is one-way miles on the closed road. `walkGainFt` is the ascent the road adds to the outing.
   - With itinerary day miles, the applier adds `walkMi` to the first and last days, and `walkGainFt` to the first day's `gainFt` and to `gain_ft`/`loss_ft`. Give a `dayNotePrefix`, one short sentence in our own words that says the day now starts with the road. Example: "Walk or bike the 8 closed miles of FR 41 from the Canyon Creek bridge to Tupso Pass first."
   - Without itinerary day miles you MUST give `distKmNew`: the whole new `dist_km`, in the SAME convention the row already uses (one way or round trip), with your reasoning in `why`.
   - `roadPatch` may replace `status` with a current, dated sentence in our own words.
   - `timingAdd` adds hours, e.g. `{"approachTimeHrs":2,"totalHrs":4}`, only when the timing clearly starts at the old trailhead.
   - `why` names the sources (URL and date) and the comparison you made. It stays in the file and never reaches the app.
   - Every route in your group needs a verdict, even "no change". Put the verdicts in `audits/closure-distance/<file>.verdicts.json` as `[{id, verdict: "PLAN"|"NO_CHANGE"|"ALREADY_INCLUDED"|"REOPENED"|"NO_ACCESS"|"ALTERNATE_ONLY", why}]`.
   - Then dry-run the plan: `node scripts/oneoff/apply-closure-distance.mjs audits/closure-distance/<file>.json --dry`.

**Rules:**
- Do NOT write to the database (no run without `--dry`).
- Do NOT edit any other file.
- Never put a source name or URL into a field that renders (status, notes, prefix). Put sources in `why` only.
- Write every sentence that renders in your own words, never copied from a source.
- Never guess a number: if the sources do not give the extra miles, give the route NO_CHANGE and say why.

**Reply** in under 300 words: the road's status, with sources; one line per route giving its verdict and the numbers; and the dry-run output.
