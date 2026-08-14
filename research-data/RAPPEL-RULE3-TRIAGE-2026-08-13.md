# The 22 rule-3 rappel candidates, triaged: 8 real, 13 false alarms

`check:rappel-lengths` rule 3 is report-only, and this is the read that justifies keeping it that
way. Of 22 routes flagged, **13 are correct work** — tables that store a genuine two-rope sequence
whose stations legitimately exceed half a single rope. Had rule 3 been a hard failure, it would have
demanded "fixes" to those 13, which is how a guard teaches people to ignore it.

The rule still earns its place: the 8 it did find are real, and one of them
(`wa_mount_torment_south_ridge`) should have been caught by rule 4 instead — see the guard note at
the bottom.

## The 8 real defects

Every one is the same shape: **a rope's capacity written into a station's distance**. A rope doubled
through an anchor reaches HALF its length, so a 60 m rope gives 30 m rappels.

| route | station(s) | stored | correct | the row's own words |
|---|---|---|---|---|
| `wa_east_ridge_4` (Inspiration E Ridge) | 14 | 60 | `null` | "used every bit of a 70 m rope" — a 70 doubled is 35 m, so this is a bound, not a measurement |
| `wa_east_ridge_9` (Ingalls E Ridge) | 2 | 60 | `null` | calls itself "a 'full-rope-length' rappel on a single 60m rope" = 30 m of descent |
| `wa_ingalls_peak_south_ridge` | 2 | 55 | `null` | "a 60 m comes up about 5 m short … a 70 m only just makes it" ⇒ 34.5–35 m |
| `wa_liberty_bell_nw_face` | 2, 3 | 55, 30 | `null`, `null` | st2 says "a 60m rope reaches" (⇒ ≤30 m) while storing 55; st3 calls itself double-rope while storing 30. **Transposed.** |
| `wa_mount_rainier_kautz_glacier` | 1, 2 | 45, 45 | `null` | the note says the table is "for a party on a single 60m rope" — which cannot reach 45 m |
| `wa_mount_torment_south_ridge` | all 6 | 55 | `null` | the note ADMITS it: "estimated near-max for a 60m rope used double". 6 × 55 = 330 m |
| `wa_pernod_spire_standard` | 1 | 65 | `null` | "a single 70m rope reaches, a 60m leaves you short" ⇒ 30–35 m; 65 is the rope |
| `wa_sharkfin_tower_southeast_ridge` | 3, 4, 5 | 35 | `null` | the row says "a single 60 m rope is generally enough for any station" (⇒ ≤30 m). Stored total 145 m on a route of `length_m` 61 |

Plus one single-station error inside an otherwise-correct row:

- `wa_south_face_5` (Inspiration) — stations 1–6 are a genuine 7-rappel double-rope sequence and
  stand. **Station 7 stores 60 m while its own text says "short — about 100 ft in one account"** →
  `30`. This is the rare case where a *number* is right to write, because a source published one.

### Why `null` and not a halved figure

Three of these could be "fixed" by halving, and that would be wrong. A rappel with no published
distance may be 35 m or 15 m; halving replaces one fabricated number with another. `null` is the
correct value, and `RappelTable` already renders it as `—` and excludes it from the total.

`wa_ingalls_peak_south_ridge` is the closest call and is worth recording. Two published statements
bracket it tightly at 34.5–35 m, and 35 is arguably supportable. It is still going in as `null`,
because deriving 35 from "a 70 m only just makes it" is *literally* the rope-capacity arithmetic
(70 ÷ 2) this whole sweep exists to remove — bounded from below or not, the number would be
computed from a rope rather than measured. The bracket goes in the count note instead, where it is
information rather than a false measurement.

## The 13 false alarms — why rule 3 stays report-only

These store a real two-rope sequence and are correct as they stand:
`wa_action_potential`, `wa_burgundy_spire_north_face`, `wa_ultramega_ok`, `wa_east_face_2`,
`wa_inspiration_peak_west_ridge`, `wa_liberty_bell_east_face`, `wa_mix_up_peak_east_face`,
`wa_northwest_mox_peak_standard`, `wa_one_piece_at_a_time`, `wa_sherpa_peak_east_ridge`,
`wa_southeast_mox_peak_se_rib`, `wa_chair_peak_northeast_buttress`, `wa_south_face_5` (at rule 3).

The pattern that clears them is a count note that states which sequence the table is: *"The five
stations on file are the DOUBLE-ROPE count"*. Several are exemplary — `wa_one_piece_at_a_time`
spells out the arithmetic the guard is built on: *"60m rappels mean two ropes, since one 60m rope
doubled reaches only 30m."*

Two carry wording problems rather than data errors:

- `wa_chair_peak_northeast_buttress` station 2 says "(two ropes, **or a single 60m**)". A doubled 60
  reaches 30 m; only the single-strand rig described in `descent_text` gets 60 m. Reword.
- `wa_east_face_2` station 2's 35 m is self-declared as "estimated similar to the first rappel" —
  honest, but `null` would be more honest.

## Five rows where the halves describe DIFFERENT DESCENTS

This is a distinct defect class from a wrong number, and it is not something a length guard can see.

1. **`wa_east_face` (Middle Gunsight) — the strongest case, and it is NOT being auto-corrected.**
   The stored table is 4 × 55 m down a "south-face rappel anchor" to the Chickamin Glacier — a
   descent the row's **own count note says "is not supported by any source for this route"**. The
   sourced descent is 2 double-rope rappels to the Middle/South Gunsight notch. 4 × 55 = 220 m
   against `length_m` 183 and a sourced ≈100 m.
   Rebuilding this table means authoring new station prose, which is enrichment, not a correction —
   so it is left for a human read. Nulling the four lengths would be worse than leaving it: it would
   launder a disputed descent into a clean-looking table.
2. `wa_pernod_spire_standard` — `descent_text` describes 4–5 raps down the east side into the Silver
   Star Glacier basin off *natural* anchors; the note and table describe 3 raps starting from a
   *bolted* summit anchor down Chablis Spire's east face.
3. `wa_east_ridge_9` — the count note names the two-rope sequence; the stored stations describe the
   single-rope one.
4. `wa_liberty_bell_nw_face` vs `wa_liberty_bell_east_face` — one notch rappel, stored as 30 m on one
   row and 55 m on the other.
5. `wa_mount_rainier_kautz_glacier` — `rappels` names the **Wilson Gully** descent while the table
   and `descent_text` are the Kautz ice chute.

## Guard change this produced

`ADMITS` (rule 4) missed `wa_mount_torment_south_ridge`'s "estimated near-max for a 60m rope used
double" — the exact admission rule 4 exists to catch, in words it did not match, so it fell through
to report-only. Widened to `near[- ]?max[^.]{0,40}\brope`, scoped to a rope mention so "near-max"
about an angle or a grade does not match. Tested both directions, including the three notes this
rule previously flagged **wrongly** (they stay clear), with the old regex as a control to prove the
test is not vacuous.
