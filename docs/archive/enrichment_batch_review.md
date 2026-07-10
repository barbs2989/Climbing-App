# WA Route Enrichment — Batch Review (Recovered)

Context: a large wave of background research agents was enriching WA catalog routes with 5 fields each — `crowds`, `partnerRequirements`, `seasonalGuidance`, `seasonalHazards`, `dataQuality` — plus an FA (first-ascent) audit (`faCorrections`) against outside sources (Mountain Project, AAC Publications, SummitPost, Mountaineers.org, guidebooks, trip reports). Several of these agents' results got stranded (their `SendMessage` back to the orchestrator failed) and were recovered from raw session transcripts. **Nothing below has been written to the database or any route file yet** — this is the full recovered research output, organized by peak, ready for review/approval before any write.

This is a separate batch from `hazard_batch_review.md` (which covers hazard-only findings for a different set of routes) — both are still pending.

## Read this first — FA corrections found (the actionable items)

Everything else below is descriptive color (crowds/partners/season/hazards) that's low-risk to apply as-is. These four are actual factual corrections worth a deliberate decision before writing:

1. **`wa_mount_adams_south_spur`** (Mount Adams, South Spur) — on-file `fa: "A.D. Wilson (1854)"` is wrong on two counts: the 1854 ascent was from the **north** side by **A.G. Aiken, Edward J. Allen, and Andrew J. Burge** (not Wilson, who doesn't appear in the record at all), and it's not even the FA of the south-side line this route follows. The south side (this route) was first climbed **August 1864** by a Hood River/The Dalles party guided by **"Indian Johnson" (Sapotiwell)**, who declined to summit for cultural reasons. Recommend correcting the field and noting the 1854 north-side FA separately if the schema supports an overall-peak vs. route-specific FA distinction.

2. **`wa_new_york_gully`** (Mount Snoqualmie, North Face) — on-file `fa: "Ruch and Cordery-Cotter, 1985"` is wrong. Primary source (AAC Publications/AAJ) plus the route's own on-file overview text both point to **Jim Ruche and Bob Cotter, February 1991**. "Cordery-Cotter"/1985 looks like a data-entry merge error. High confidence.

3. **`wa_east_ridge_direct`** (Forbidden Peak, East Ridge Direct) — on-file FA appears to have inherited the mountain's overall/West-Ridge FA (Beckey/Beckey/Crooks/Lind/Anderson, 1940) rather than this route's own. Multiple independent sources (Mountain Project, an Ed Cooper photo archive caption, guidebook-style summaries) place the actual East Ridge Direct FA at **May 1958, Fred Beckey/Ed Cooper/Joe Hieb/Don Claunch** ("Don Gordon" in one source — same person). Recommend updating, pending a final cross-check against Beckey's Cascade Alpine Guide if available.

4. **`wa_south_face_2001_variation`** (Lundin Peak) — on-file FA year (2001, matching the route's name) conflicts with the route's own catalog listing elsewhere ("South Face Left"), which gives **Mike Preiss & Don Preiss, 2004**. Same climbers, different year. Recommend flagging 2001 as likely wrong and using 2004, while leaving the display name "2001 Variation" alone (it functions as an established name, not a factual claim).

Two more are **leads, not corrections** (single-source, not cross-verified — flagged by the agents as "verify before writing"):
- `wa_south_face_5` (Inspiration Peak, South Face) — on-file FA is "unknown." One AAC Publications entry attributes it to **Bill Sumner and Mike Heath, June 18, 1970**, matching the route's own description. Single source only.
- `wa_boston_peak` area note: Boston Peak Northwest Ridge (`wa_northwest_ridge_2`) has an internal date inconsistency on file (one field says "July 2018," another says "Aug 2018" for the Boyce/Willis FRA) — the primary AAC source confirms **July 2018**. Minor internal-consistency fix, not an external contradiction.

Also worth a manual look (not an FA issue): **`wa_beckey_schmidtke`** (Mount Shuksan) — Mountain Project's map coordinates for this route actually point to **Nooksack Tower**, a different named summit in the Shuksan massif, not the main Shuksan massif. Could affect access/crowd assumptions if it's a mislabeled route in the catalog.

One **new hazard finding** worth considering as an addition (not currently on file): `wa_cascadian_couloir` (Mount Stuart) — a documented route-finding hazard where parties can mistakenly descend into the wrong couloir, surfaced independently in multiple trip reports.

---

## Peaks/routes covered in this recovered batch

Full crowds/partnerRequirements/seasonalGuidance/seasonalHazards/dataQuality detail exists for all of these (available on request per-route); summarized here by peak. "No faCorrections" means the agent checked and found the on-file FA corroborated or appropriately "unknown."

- **Argonaut Peak** — South Face, Northwest Arete. No faCorrections.
- **Bonanza Peak** — Soviet Route. No faCorrections. (High-quality FA: corroborated by a 1976 AAJ article + a 2012 third-ascent trip report.)
- **Boston Peak** — Northwest Ridge. Minor internal date inconsistency, see above.
- **Whatcom Peak** — North Ridge, South Spur. No faCorrections (an unsourced "Beckey 1940 FA" AI-summary claim was checked and rejected as unverifiable).
- **Inspiration Peak** — South Face (FA lead, see above), East Ridge (no correction).
- **Huckleberry Mountain** — West Face. No faCorrections (low data quality — thin sourcing).
- **Johannesburg Mountain** — Northeast Ridge (1963 Route). Confirmed as a genuinely distinct line, not a mislabeled Northeast Buttress. No faCorrections.
- **Witches Tower** (Enchantments) — E/SE Face. No faCorrections.
- **Mount Challenger** — Poltergeist Pinnacle, Challenger Glacier. No faCorrections. (Researched redundantly by 4 separate agent runs — results consistent across all four.)
- **Little Tahoma Peak** — Frying Pan-Whitman Glaciers. No faCorrections.
- **Mount Stone** — Lena Lake to Mt Stone Traverse. No faCorrections (FA genuinely unknown, uncontested).
- **Mount Thomson** — East Ridge. Optional gap-fill only (Joe Hazard & B. French, 1917) — doesn't contradict on-file data, not required.
- **Mount Deception** — Honeymoon Route. No faCorrections.
- **Mount Shuksan** — SW Couloir and Face, Beckey-Schmidtke (see Nooksack Tower caveat above), SE Ridge/SE Corner. No faCorrections.
- **Mount Snoqualmie** — New York Gully. **FA correction, see above.**
- **Sharkfin Tower** (Boston Basin) — Southeast Face. No faCorrections. (Distinct 1990 FA correctly not conflated with the 1947 Southeast Ridge FA.)
- **Silver Star Mountain** — East Ridge. No faCorrections.
- **Lundin Peak** — South Face 1941 (no correction), South Face 2001 Variation (**FA correction, see above**).
- **Ruth Mountain** — Ruth-Icy Traverse. No faCorrections.
- **Phantom Peak** — Luna Glacier. No faCorrections (confirmed 1940 Beckey brothers FA via Wikipedia).
- **Mount Olympus** — Blue Glacier (West Peak standard route). No faCorrections.
- **Dome Peak** — Dome Glacier. No faCorrections — FA genuinely unlinked to this specific route line in every source checked (peak-level 1936 ascents don't tie to this route).
- **Forbidden Peak** — Northwest Face (no correction), East Ridge Direct (**FA correction, see above**).
- **Liberty Bell Mountain** — 11 routes fully enriched (Girl Next Door, Rapple Grapple, Liberty Traverse, NW Face Var/Remsberg Variation, Freedom Rider, Liberty Crack Free, Freedom or Death, Live Free or Die, Liberty and Injustice for All, A Servant to Liberty, Dark Side of Liberty). No faCorrections on any.
- **Cutthroat Peak** — Complete South Buttress, North Ridge. No faCorrections.
- **Glacier Peak area** — "Don't Climb That She Said" boulder problem (V0+). No dedicated source found anywhere; low-confidence generic entry.
- **Mount Adams** — South Spur (**FA correction, see above**), Circumnavigation (no correction, FA appropriately unknown).
- **Mount Formidable** — NE Face Direct. No faCorrections.
- **South Early Winters Spire** — 8 routes fully enriched (Boving Roofs, NW Face Boving-Pollock, Free Mojo, South Arete, The Hitchhiker, Southern Man, Mojo Rising, Dolphin Chimney). No faCorrections on any.
- **Mount Stuart** — 8 routes fully enriched (Gorillas in the Mist, South Headwall, Direct North Ridge w/Gendarme, Gorillas Direct, King Kong-Gorillas Direct Direct, Cascadian Couloir, Upper North Ridge w/Great Gendarme, Sherpa Glacier). No faCorrections; confirmed a real July 2020 AAC-documented rockfall/rescue accident on the Direct North Ridge, and a real documented rockfall-strike incident on Cascadian Couloir.
- **Gunn Peak** — Lewis Creek Route. No faCorrections.

That's roughly **60 routes across 30 peaks** fully enriched in this recovered batch, on top of the separate `hazard_batch_review.md` batch (hazard-only, ~30 more routes across Mount Stuart/Prusik-Cathedral cluster/Deception-Formidable-Olympus cluster + a much larger unstarted crag-level pass).

## Data quality distribution (rough)

Most routes landed MEDIUM to MEDIUM-HIGH. A few stand out:
- **HIGH**: Little Tahoma (Frying Pan-Whitman), Mount Adams South Spur, South Arete and The Hitchhiker (SEWS), Direct North Ridge w/Gendarme (Mount Stuart — confirmed accident record), several Liberty Bell testpieces.
- **LOW / LOW-MEDIUM**: the boulder problem, Huckleberry Mountain, Johannesburg 1963 Route, South Headwall and Gorillas Direct (Mount Stuart), Dolphin Chimney (SEWS), Gunn Peak Lewis Creek Route, A Servant to Liberty / Dark Side of Liberty (zero confirmed repeat ascents found for either).

## Next step

Nothing here is written yet. Options:
1. Apply the 4 FA corrections + 2 leads (with the leads flagged as unverified) and all descriptive fields as a batch write.
2. Apply descriptive fields now, hold the FA corrections for a separate explicit approval pass.
3. Spot-check a sample before any write.

Let me know how you'd like to proceed.
