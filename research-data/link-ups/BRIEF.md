# Link-up research brief (shared by every research batch)

Goal: for a REGION, find the multi-objective LINK-UPS climbers commonly do: two or more peaks or
routes climbed in one push (one day or one trip), where the plan differs from doing each alone:
a ridge or col connects the summits, the descent changes, a camp serves both, a car shuttle is
needed. Only mountaineering, scrambling and alpine objectives (never sport/trad crags/boulders).

INCLUDE only link-ups that are COMMONLY done: described in a guidebook or on at least two
independent sites (Mountain Project, SummitPost, Peakbagger trip reports, CascadeClimbers,
NWHikers, 14ers.com, Fastest Known Time, guide service pages, land agency pages...). Classic
enchainments, ridge traverses between named summits, "two peaks from one camp" outings, and
famous multi-day traverses all count. A traverse that is itself one long named route still
counts when it strings together several summits climbers also do alone.

For each link-up return:
- id: slug, `<state2>_lu_<short_name>` lowercase, e.g. `wa_lu_tooth_chair`
- name: what climbers call it ("Sawtooth Ridge Traverse", "Tooth and Chair Peak")
- state: full state name
- region: range/area
- legs: ordered list, one per objective, in the usual direction:
  { "peak": "<summit name>", "route": "<route used on it, as named in guidebooks>", "connect": "<how you get from the previous leg to this one, in our own words; empty for the first leg>" }
- duration: short value, e.g. "1 long day", "2 days", "3–5 days"
- how: 2–5 sentences IN YOUR OWN WORDS: the usual order and why, the connecting terrain and its
  difficulty (class / grade / glacier), what extra gear or skill the link adds over the single climbs.
- descent: 1–3 sentences: how you get down at the end, and how it differs from the single-peak descent.
- logistics: 1–3 sentences: camps, permits/quotas, car shuttle, water, season window, turnaround.
- sources: at least 2 URLs you actually read (these go in our research log ONLY, never the app).
- confidence: high | medium (drop anything you would call low)
- notes: optional, for disagreements between sources or anything a reviewer should know.

RULES (hard):
- Every sentence in your own words. Never copy a run of 8+ words from a source.
- Never name a source, website, guidebook or person in how/descent/logistics/connect.
- No ALL CAPS words. No emoji. En dash ok.
- Facts (grades, classes, distances, gain) must come from the sources; if two disagree, keep the
  HIGHER grade and say nothing about the disagreement in the text (put it in `notes`).
- Don't invent numbers. If you don't have a reliable number, leave it out of the prose.
- Max 600 characters per how/descent/logistics field; max 300 per connect.

VERIFY AS YOU GO (learned on the WA batches, where a first pass from search snippets got route
names, trailheads and even which peaks a traverse crosses wrong):
- Every fact must come from two independent pages you actually READ in full (WebFetch), not from
  search-result summaries. When a site returns 403, find another page (Peakbagger trip reports,
  personal trip-report blogs, CascadeClimbers/NWHikers/14ers.com threads, land-agency pages, AAJ).
- Never fill a route name, trailhead, permit rule or number from memory. If you cannot confirm it,
  leave it out of the text; if the entry is no longer good enough for a climber to plan on, set
  "drop": true and say why in `notes`.
- Legs are real summits in order. When a long traverse's summits are optional side trips, say so in
  the leg's route or connect text.
- Two climbs joined only by a drive are not a link-up.
- Check every string for ALL-CAPS words and length limits before you write the file.

Write the result as a JSON array (valid JSON, UTF-8) to the file path you are given. Aim for every
commonly done link-up in the region (typically 8-25 per region), quality over count.
