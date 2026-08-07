# WA crag routes mis-tagged as alpine — 2026-08-07

All **103** WA alpine-scope routes whose area is a `crag` rather than a `peak` were reviewed.
These are explicitly out of scope for the ongoing `wa-alpine-audit` (PR #468), whose scope note
calls them *"short cragging routes, not mountaineering objectives"*. **100 of the 103 have
`source = null`** — uncurated OpenBeta imports that were never reviewed.

## Why it matters

`routes.discipline` drives `cragOnly` in `RouteDetail`. An alpine tag therefore gives a
single-pitch sport route the **Plan tab**, a **"Committing objective"** banner, a **float plan**
and the **avalanche/bailout** panels — and *denies* it the crag safety advice surfaced in #655
(stick-clip the first bolt, avoid back-clipping, knot the belayer's end before lowering), which
is exactly the advice that route needs.

## Evidence rule

Per the project's established signals: **gear decides**, **glacier means mountaineering**, and
discipline is the **hardest technique** on the route. A route is only reclassified when it has a
**known** pitch count of 1–2 **and** no ice-axe / crampon / picket / ice-screw / glacier /
crevasse / serac signal anywhere in `gear`, `rack`, `hazards`, `obj_haz`, `descent_text`
or `beta`.

## Deliberately NOT touched — 73 routes

| reason | count |
|---|---:|
| an alpine or ice technique signal is present — the tag is earned | 27 |
| `pitches >= 3` — multi-pitch alpine rock | 40 |
| pitch count is `null` or `0` | 6 |

The multi-pitch exclusion is the important one: downgrading a 10-pitch alpine rock route to
`trad` would **remove its Plan tab** (`cragOnly` hides the planner for trad/sport/bouldering),
and that is precisely the tab those routes need. The pitch-count exclusion matters because
**`pitches = 0` means *unknown*, not zero** — migration `0074` filters on
`coalesce(nullif(r.pitches, 0), …)` for exactly that reason.

## Flagged for a human — 2 routes, no change proposed

Short and non-alpine, but with no clear rock gear either, so there is no evidence to classify on:

| route | grade | area | id |
|---|---|---|---|
| Top Gun | 5.10a/b | | North Side | `wa_top_gun` |
| Direct Finish | 5.2 | | Steeple Rock | `wa_direct_finish` |

## → trad (21) — 1–2 pitches, rock rack, no alpine signal

| route | grade | pitches | area | id |
|---|---|---|---|---|
| Asymptotic | 5.10b | 1p | Half Moon Crag | `wa_asymptotic` |
| Traverse | 5.4 | 1p | Osprey Wall | `wa_traverse` |
| Woodland Critter Christmas | 5.8+ | 1p | Mamie Peak | `wa_woodland_critter_christmas` |
| Salish | 5.6 | 1p | Osprey Wall | `wa_salish` |
| You Moss Be Joking | 5.5 | 1p | Mossy Loaf | `wa_you_moss_be_joking` |
| Artic Rose | 5.6 | 1p | Half Moon Crag | `wa_artic_rose` |
| EZ Way | 5.6 | 1p | Shark Rock | `wa_ez_way` |
| Blood Orgy | 5.8 | 1p | Mamie Peak | `wa_blood_orgy` |
| Astroglide | 5.9 | 1p | Half Moon Crag | `wa_astroglide` |
| Unnamed  5 | 5.8+ | 1p | Spire Gully right - Alpenkuhl | `wa_unnamed_5` |
| Smears, Jugs, and Rock & Roll | 5.10a | 1p | Viviane Campsite | `wa_smears_jugs_and_rock_roll` |
| Astral Projection | 5.9- | 1p | Half Moon Crag | `wa_astral_projection` |
| North Face of The Mole | 5.7 | 2p | Hook Creek Drainage | `wa_north_face_of_the_mole` |
| East Ridge | Easy 5th | 1p | Steeple Rock | `wa_east_ridge` |
| Sidewinder | 5.9 | 1p | North Side | `wa_sidewinder_4` |
| Clast from the Past | 5.10b | 2p | North Side | `wa_clast_from_the_past` |
| Moss Out For Harambe | 5.7 | 1p | Mossy Loaf | `wa_moss_out_for_harambe` |
| North Ridge | Easy 5th | 1p | Steeple Rock | `wa_north_ridge` |
| Half Fast | 5.8+ | 1p | Half Moon Crag | `wa_half_fast` |
| Wings | 5.8 | 2p | Steeple Rock | `wa_wings` |
| Alice in Wonderland | 5.11b/c | 1p | Summertime Crag | `wa_alice_in_wonderland` |

## → sport (7) — 1–2 pitches, quickdraws/bolts only, no alpine signal

| route | grade | pitches | area | id |
|---|---|---|---|---|
| Hottentot | 5.12 | 2p | Summertime Crag | `wa_hottentot` |
| Lone Wolf | 5.10a | 2p | Obelisk, The | `wa_lone_wolf` |
| Django | 5.11d | 2p | Summertime Crag | `wa_django` |
| Caravan | 5.11b/c | 1p | Summertime Crag | `wa_caravan` |
| Hail Satan | 5.11- | 1p | Mamie Peak | `wa_hail_satan` |
| Chitlins Con Carne | 5.11a | 1p | Summertime Crag | `wa_chitlins_con_carne` |
| Ephemeral | 5.11d | 1p | Ice Box right side | `wa_ephemeral` |

## Verification

`npm run check:sql -- audits/sql/2026-08-07-crag-alpine-mistags.sql` → all 28 target ids exist,
no DELETE removes an only copy. Each statement is guarded on `discipline = 'alpine'`, so it is
idempotent and cannot clobber a concurrent edit. **After running, re-read the ids and reconcile
the counts — a 200 is not evidence the data changed.**
