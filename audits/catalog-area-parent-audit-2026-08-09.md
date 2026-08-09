# Catalog-wide area-parent audit — 2026-08-09

First run of `npm run audit:area-parents -- --all` against the whole catalog (47,567 areas).
Every prior run was scoped to Washington. Result:

| | WA subtree (2,526 areas) | whole catalog (47,567 areas) |
|---|---|---|
| D1 stray peaks | 15 across 7 groups | 15 across 7 groups |
| D2 hollow stubs | 1 | **46** |
| D3 path breaks | 0 | 1 (benign — see below) |

**Of the 46 D2 findings, exactly one is actionable, and it is the Washington one.** That is
not because the other 45 are wrong sightings — the rows really do exist, really do hold zero
routes, and really do sit metres from a populated area of nearly the same name. It is because
outside Washington that fingerprint mostly describes **legitimate structure**, for reasons WA's
data does not exhibit.

Fixed here: `0112_chewiliken_hollow_duplicate.sql`.

## Why `--all` is dominated by false positives

### 1. Parallel discipline trees (~19 of 46) — the big one

The non-WA catalog carries **separate top-level trees per discipline**, and the same physical
crag appears in more than one. The ice/bouldering node legitimately holds zero routes because
only the rock routes were loaded. Deleting it would erase that tree's structure, not a stub.

The tell is in the path itself — an `Ice & Mixed`, `Bouldering` or `Sport` ancestor:

```
STUB "Hurricane Crag"   0 rt   Adirondacks > * Adirondack Ice & Mixed > D: Keene Valley...
REAL "Hurricane Crag"  11 rt   New York > Adirondacks > C: Keene Region
```

Six Adirondack cases come from `* Adirondack Ice & Mixed` alone (Honey Pot, King Wall, Barton
High Cliff, Emperor Slabs, Hurricane Crag, Underwood Canyon). The same shape produces
`* NH Ice and Mixed` (G Spot, Newfound Lake), `CO Ice & Mixed` (Lover's Leap, Little Black
Cliff, Lone Eagle Peak, "On the Rocks" Mixed Wall), `Cape Ann Ice and Mixed` (Airation
Alcove), `Sandstone Ice Park` (Main Flow Area), Valdez ice vs `Valdez Area Rock` (19 Mile
Wall), `*Joshua Tree Bouldering*` (Group Camp Short Wall), `CT Bouldering` (Will Warren's
Den), `Arkansas Valley Bouldering` (Split Rock), and Crystal Castle's `Sport` vs `Bouldering`
(Nine Circles).

**Washington has none of these**, which is why one WA run gave no hint this class existed.

### 2. Different faces or sides of one formation (5)

Both rows are real; the empty one simply has no routes catalogued yet. Deleting it would
delete a face.

```
STUB "King (North Face)"  0 rt  |  REAL "King (South Face)" 3 rt, "King (West Face)" 9 rt
STUB "Big Hunk (Northeast Face)" 0 rt  |  REAL (Southwest Face) 5 rt, (West Face) 1 rt
```

Also `Pyramid (South Face)`, `Lost and Found Crag (South Face)`, and Goose Cove Reservoir
Boulders `(Eastern Side)` vs `(Western Side)`.

### 3. Unrelated formations sharing a generic name (2)

Exactly the trap this audit's own header warns about.

- `co_west_side_3` is on **Center Stage Tower**; `co_west_side_2` is on **De-Spectactulus
  Tower**. Two towers in one area, each with a west side.
- `va_right_sector` is on **Hog Fence Main Crag**; `va_right_sector_2` is on **Dripping Rock
  Main Crag**.

### 4. Genuinely hollow duplicates (7) — the only actionable bucket

The stub is a childless, routeless node carrying its **own twin's name**, usually as a direct
child of that twin:

| stub | real | note |
|---|---|---|
| `wa_chewiliken_creek_crags` | `wa_chewiliken_creek_crags_tonasket` (21 rt) | **fixed in 0112** |
| `ca_potter_s_rock_2` | `ca_potter_s_rock` (2 rt) | stub is a child of its twin |
| `ca_swallow_rock_2` | `ca_swallow_rock` (15 rt) | stub is a child of its twin |
| `ma_cairn_cave_2` | `ma_cairn_cave` (5 rt) | stub is a child of its twin |
| `ca_incognito_boulder_the` | `ca_incognito_boulders_the` (18 rt) | singular vs plural |
| `sd_trash_can_boulder_the` | `sd_trash_can_boulders_the` (12 rt) | singular vs plural |
| `ri_talus_boulder_the` | `ri_talus_boulder` (1 rt) | same parent, "The" variant |

Only the Washington row is fixed. The other six are **out of scope**, not disputed: the
product's scope is Washington alpine, out-of-state work is parked, and a migration touching
CA/MA/SD/RI crag rows would be expansion nobody asked for. They are listed here so the next
person can act on them deliberately rather than rediscover them.

### 5. Needs a guidebook, deliberately unresolved (5)

`md_fin_the_2` (Prettyboy Reservoir vs Big Gunpowder Falls), `wy_sphinx_the_2` (Dinwoody
Glacier vs Titcomb Basin — adjacent Wind River basins), `az_turtle_cove`, `ca_whitney_cave_2`,
and `ny_stateline` — a New York stub whose populated twin `ct_stateline` is in Connecticut, at
a crag that straddles the state line.

## D3: the one "path break" is benign

```
ORPHAN  usa — parent_id "null" is not a row
```

`usa` is the catalog root and correctly has no parent. The check reports any row whose
`parent_id` does not resolve, and the root is the one row for which that is right. Not worth
special-casing — a root that stopped being reported would also hide a genuinely detached
subtree — but worth knowing so it is not chased again.

## The rule this run establishes

**D2's precision is a function of how many parallel discipline trees the region has.** In
Washington it was 1-for-1. Catalog-wide it is roughly 7 real out of 46. So:

- Never bulk-delete D2 output. Read the **path** of both rows first; an `Ice & Mixed`,
  `Bouldering` or `Sport` ancestor on either side almost always means "not a duplicate".
- A name differing by a compass qualifier — `(South Face)`, `(Eastern Side)` — is a
  **different feature**, never a duplicate, however close the coordinates.
- The safe signature is: stub is childless, routeless, and carries its twin's own name,
  ideally as a direct child of that twin.
