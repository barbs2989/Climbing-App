# Trailhead facts research brief

You are researching three facts about each trailhead in one input batch file, for a climbing app's
TRAILHEAD card. Accuracy is everything: a blank is fine, a wrong or guessed value is not.

Input: `batches/bNN.in.json` — an array of trailheads: `key`, `state`, `names` (the names our routes
use for it), `lat`/`lng` (may be null), `routeCount`, `landManager`, `storedPass` (what our ACCESS
section already says about passes — UNVERIFIED, some are hedged guesses), `drive` (our driving
directions, which tell you which trailhead is meant).

Output: write `batches/bNN.out.json`, an array with ONE object per input trailhead, same order:

```json
{ "key": "t000",
  "pass": "Northwest Forest Pass",
  "parking": "Large paved lot at the road end; fills early on summer weekends.",
  "facilities": "Vault toilet; no drinking water.",
  "evidence": [ {"url": "https://www.fs.usda.gov/...", "supports": ["pass","facilities"]} ],
  "note": "anything the owner should know (disagreements, closures), or null" }
```

## The three fields

- **pass** — what a vehicle must display (or pay) to PARK at this trailhead. A short VALUE, at most
  60 characters, e.g. `Northwest Forest Pass`, `Discover Pass`, `None`, `Park entrance fee`,
  `Sno-Park permit in winter`, `$5 day fee or Northwest Forest Pass`. Interagency/America the
  Beautiful equivalents need not be listed. Climbing/wilderness permits are NOT parking passes —
  leave them out. `None` only when a page says no fee/pass is required here.
- **parking** — one sentence, at most 140 characters: the kind of parking (paved lot, gravel lot,
  roadside pullout, shoulder parking), size if a page states it (about N cars/vehicles), and
  "fills early on summer weekends" only if a page says it fills or parking is limited. Overnight
  rules if a page states them.
- **facilities** — at most 80 characters: toilet and water at the trailhead itself, e.g.
  `Vault toilet; no drinking water.`, `No toilet or water.`, `Pit toilet.` Say "no toilet" ONLY when
  a page says there are no facilities / no restroom.

Any field you cannot confirm: `null`. Do not fill a field from our own `storedPass`/`drive` text.

## Evidence rules (non-negotiable)

1. FETCH the pages; do not answer from memory or search snippets. Every non-null field must be
   supported by a page you fetched, listed in `evidence` with which fields it supports.
2. Prefer official pages: the Forest Service trailhead page (fs.usda.gov/r06/<forest>/recreation/
   <name>-trailhead — these list Fees, Parking, Facilities and Elevation), NPS, state parks/DNR/WDFW,
   county parks. A field supported only by a non-official page (WTA, hiking blogs, AllTrails) needs
   TWO independent pages that agree.
3. Make sure the page is about THIS trailhead (same name AND same road/location as `drive`); a
   trailhead with a similar name elsewhere is a different place. A page matched by name alone is
   rejected.
4. Write every value in your OWN words. Never copy a sentence; never name a source, website,
   agency page or "according to" in a value. No links in values. No ALL CAPS. No hedging words
   like "likely", "probably", "assume" — if you are not sure, use null.
5. Roadside pullouts by a highway (e.g. "SR 155 roadside pullouts") usually have no developed
   facilities and no fee; set those only if a page confirms (e.g. a WSDOT or land-manager page, or
   two climbing pages saying "park on the shoulder"). `parking` may describe a roadside pullout
   when the route's own name plainly is one and a page confirms it.
6. Work through ALL items; do not stop early. Budget roughly 2-4 fetches per trailhead.

When done, reply with a short summary: how many trailheads got each field, and any notes.
