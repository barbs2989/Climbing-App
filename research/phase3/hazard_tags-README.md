# `routes.hazard_tags` — forensic dump before dropping

`hazard_tags-dump-2026-07-29.json` is every row that had a non-empty `routes.hazard_tags`
at the time migration `0060` dropped the column: 420 routes, with `id`, `discipline`, and
the tag array.

Kept only for forensics. **Do not load it back.** The column was never read by the app, and
its contents are largely wrong.

## What's wrong with it

Of the 420 routes, **314 outside Washington carry glacier hazards** — `crevasse`, `serac`,
`icefall`, `bergschrund`, `hanging-glacier`. By discipline those 314 break down as:

| discipline | routes |
|---|---|
| trad | 130 |
| bouldering | 75 |
| sport | 60 |
| aid | 29 |
| alpine | 12 |
| rock | 7 |
| ice | 1 |

So 294 of them are not alpine at all. Concrete examples: `az_anvil_spire_north_face` (trad)
tagged `bergschrund` / `cornice-collapse` / `crevasse` / `icefall`; `ak_ken_adams`
(bouldering) tagged `crevasse` / `icefall` / `serac`; `al_cashmere` (Alabama trad) tagged
`cornices` / `crevasse-winter` / `icefall` / `serac`.

The state spread — co 66, az 64, wa 56, ca 52, ut 33, nm 13, wi 10, tn 9, wy 9, ny 8, sd 8,
nh 7 — is the signature of `WHERE id LIKE '%...%'` patterns matching far more than intended,
the same failure mode that corrupted eight routes across five states in PR #324.

## Why it wasn't migrated into `routes.hazards`

`routes.hazards` is what the app displays. Copying these tags across would have published
glacier hazards onto desert sport climbs and boulder problems — a safety-relevant lie that
is currently invisible only because nothing reads the column.

Real coverage never depended on it: `routes.hazards` is populated on 4,211 of 8,392 WA
routes, with WA alpine at 447/453.

If any of this is worth recovering, recover it per-route against the source research, not in
bulk.
