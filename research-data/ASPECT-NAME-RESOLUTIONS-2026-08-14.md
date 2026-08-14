# The 12 name-vs-aspect disagreements, resolved against published sources

Companion to `ASPECT-VS-NAME-TRIAGE-2026-08-13.md`, which found them. This is the research that
settles them. **The rule throughout: which half is wrong is decided by a PUBLISHED source, never by
the catalog agreeing with itself** — the catalog is what is in doubt.

**Nothing here has been applied.** Renames are identity changes and two of these turn out to be
duplicates rather than renames, so each needs a human decision.

## The direction-of-repair warnings — read these first

Applying the wrong half is worse than leaving the disagreement, and it is a live risk on four rows:

- **Himmelhorn and Spire Point: the ASPECT IS CORRECT.** "Fixing" the aspect to match the name would
  put Himmelhorn's climb on a sunny south face it does not use, and relocate Spire Point's standard
  route to a side with no published route at all.
- **Luahna is the opposite: the NAME is the reliable half** and the aspect/face are wrong.
- **Mount Cameron: leave `aspect=N`.** The route is a ridge crest, and a ridge separates two faces —
  the audit's own precision rule says a 90° disagreement there is legitimate.

## Settled — the name is wrong and a published name exists

| route | stored name | published name | evidence |
|---|---|---|---|
| `wa_mount_formidable_north_ptarmigan` | "North Route via Ptarmigan Traverse" | **South Route** (Mountaineers) / **South Face** (SummitPost) | The Ptarmigan Traverse *arrives* from the north; all climbing is the south side. No source calls it a north route. **But see duplicates below.** |
| `wa_spire_point_southwest_face` | "Southwest Face" | **East Face** | SummitPost quotes Beckey CAG 2 verbatim. Spire Point has exactly two published routes, East Face (Class 4, standard) and South Face (5.6, 5 pitches). Neither is a "Southwest Face". |
| `wa_pinnacle_peak_tatoosh_r1` | "Pinnacle Saddle / North Gully" | **South Face** / **Southwest Scramble** | Wikipedia: normal route "Scrambling south face"; Mountaineers: "From Pinnacle Saddle, work around the south side". Nothing describes a north gully. **But see duplicates below.** |
| `wa_mount_christie_west` | "West Slopes (Standard)" | **Route 3 … via Christie Glacier** (Olympic Mountain Rescue) | The guidebook lists three routes and all three are via the Christie Glacier, in the **north** cirque. **No west route exists in print.** |
| `wa_plummer_peak_r1` | "Pinnacle Saddle / Southeast Slopes" | **Northeast Ridge** (single trip report) | Mountaineers: "a climber's path traverses the **north slope** of Plummer Peak". The saddle is northeast of the summit. |

## Settled that the name is wrong, but NO published name exists — do not invent one

- **`wa_himmelhorn_southeast_route`** — AAJ 2012 says the standard route and Wild Hair Crack are
  *"both on the **northwest aspect**"*; the 1962 first-ascent report describes a ledge *"leading onto
  the **north face**"*. The south face was unclimbed until 2015. Every source calls it "the standard
  route" descriptively. Beckey CAG 3 would be needed for a name.
- **`wa_tye_peak_e_route`** — published prose is consistently "the **south ridge** of Tye Peak", but
  Tye Peak is an unofficial name with no formal routes.
- **`wa_mount_cameron_standard`** — the only published route name is the guidebook's
  `Route 1 … via Lost Peak`, which describes a *different* (Dosewallips-side) line than this row.
  Minimal safe repair: drop the unsupported "(Southeast Slopes)", leaving "Standard Route".

## The DATA is wrong, not the name

- **`wa_luahna_peak_east_slopes`** — `face` describes a **different route**. The Pilz and Butterfly
  Glaciers are the Napeequa-side approach (a separate Mountaineers route); this row's own approach
  prose is the **Richardson Glacier → East Ridge** line. Fix `aspect: N → E` and replace the
  `face` value. The name is defensible.

## NOT renames — these are DUPLICATES, and renaming would create two rows for one climb

1. **`wa_mount_formidable_north_ptarmigan` vs `wa_mount_formidable_south_face`.** Both describe
   Cascade Pass → Cache Col → Kool-Aid Lake → Red Ledge → Middle Cascade Glacier → Spider-Formidable
   col → south face, including the same gully/ledge options. **Same published route.**
2. **`wa_pinnacle_peak_tatoosh_r1` vs `wa_southwest_scramble`.** Mountain Project lists exactly two
   routes on Pinnacle Peak, and the sibling row already holds the Southwest Scramble at aspect SW.

Both need a merge decision, not a name — and a delete here needs a human, per the Triple Couloirs
precedent.

## Downstream prose contamination — fixing only a name leaves these lying

- **`wa_himmelhorn_southeast_route`**: its `approach` says the route "continues … on Himmelhorn's
  **southeast flank**" and its lone `climbing_route` entry is "Southeast flank from the Himmel-Otto
  col". Both were written to justify the wrong name.
- **`wa_plummer_peak_r1`**: its `approach` says the path climbs "the open, rocky **southeast-facing**
  slopes", contradicting the published sources *and* this row's own aspect.
- **`wa_tye_peak_e_route`**: `face`'s "(west side)" is backwards, and the `approach` describes
  terrain below **Cowboy Mountain** — the wrong side of US 2 entirely.
- **`wa_mount_cameron_standard`**: `face` says "North ridge", but the ridge is gained at a pass **due
  west** of the summit and runs east to it. It is a west ridge.
- **`wa_spire_point_southwest_face`**: `grade` ("Grade II-III, 5.6") and `pitches` (5) belong to the
  **South Face**, which has no row. The East Face is Class 4.

## Measurements worth keeping

- **Cameron Pass is due WEST of Mount Cameron's summit**, confirmed by OpenStreetMap: pass at
  47.82572/−123.35825, summit at 47.82557/−123.32857 — a latitude difference of ~17 m over 2.22 km.
  A USGS NED10m profile along that line never drops below ~6,240 ft: a continuous ridge with real
  false summits, matching the published "many false summits" descriptions.
- **Where "Southeast Slopes" probably came from**: Wikipedia's boilerplate relief sentence for
  Cameron — *"the southeast aspect rises over 3,300 feet above the Dosewallips River"* — which is a
  statement about relief, not a route. Hypothesis, not evidence.
- **The travel-direction pattern now has three instances** (Little Annapurna, Ruth Mountain, Tye
  Peak) plus Formidable, where the name records where the *approach arrives from*. It explains only
  1 of the 4 North Cascades rows, so do not assume it.
- **Mount Christie is NOT that pattern**: the approach from Low Divide travels *south-southeast*, so
  "West" matches neither the climb nor the walk in. It appears simply fabricated.

## Contamination caught during this research

- **SummitPost's "Mount Cameron" page is COLORADO's** (the Decalibron 14er). There is no SummitPost
  page for the Olympic peak. The catalog has already been burned by exactly this class.
- All four North Cascades peaks were verified by coordinate against their published pages.

## Method note for whoever picks this up

`summitpost.org` and `mountaineers.org` return 403/Cloudflare to WebFetch and curl, and the Chrome
extension was timing out. **`web.archive.org` captures fetch fine via curl** — that is how the
decisive Beckey and Mountaineers text was obtained.
