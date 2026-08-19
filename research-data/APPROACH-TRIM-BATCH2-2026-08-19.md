# Approach-trim batch 2 — the acceptance rule, stated

2026-08-19. Second reviewed batch. Method and applier as in
`APPROACH-TRIM-BATCH1-2026-08-19.md`; what is new here is that reading 28 candidates in one
sitting made the acceptance rule explicit, and it is sharper than "the cut looks like climbing".

## The rule

**Accept a trim only when the cut sentence corresponds to a NAMED `climbing_route` section.**

That is the whole test, and it is checkable rather than a matter of taste — every accepted row
below has a section label that reads as a restatement of the sentence being removed. Where a
sentence has no section, the enrichment copied it *because it was adjacent*, not because it was
climbing description that ran past the base, and removing it from the approach is a judgement
about where hazard prose belongs rather than a de-duplication.

**8 of 28 candidates accepted.** The 20 rejections group cleanly, and the groups are the useful
output:

| rejected because the cut is… | routes |
|---|---|
| an **avalanche** warning | `wa_mount_st_helens_worm_flows`, `wa_red_mountain_snoqualmie_standard` |
| a **crevasse / glacier** hazard | `wa_olympus_blue_glacier_east_ramps`, `wa_three_fingers_r1` |
| a rockfall / loose-rock hazard note | `wa_esmeralda_peaks_scramble`, `wa_mix_up_peak_east_face`, `wa_painted_mountain_scramble`, `wa_mount_rainier_gibraltar_ledges`, `wa_three_queens_standard`, `wa_mount_shuksan_fisher_chimneys` |
| **gear** advice | `wa_three_fingers_r1`, `wa_mount_queets_south` |
| a **summit-identification** fact | `wa_mount_roosevelt_standard`, `wa_ruth_icy_traverse` |
| **approach** content, wrongly copied INTO `climbing_route` | `wa_mix_up_peak_east_face`, `wa_plummer_peak_r1` |
| weather / conditions timing | `wa_pinnacle_peak_tatoosh_r1` |
| a grade-and-time summary, not a section | `wa_mount_stone_lake_of_angels` |
| cuts map to sections **out of order**, so the trim does not fix the row | `wa_three_fingers_south_peak_lookout` |

Two of these deserve naming individually because they are the ones a careless sweep would have
taken. **`wa_mix_up_peak_east_face`**'s cut is explicitly about *"the upper **approach**
gullies"* — the wrong copy is the one in `climbing_route`, so a trim here would delete the
correct record. And **`wa_mount_roosevelt_standard`**'s cut is *"Be sure to top out on the
higher, more southerly summit; the lower north peak is a common false-summit stopping point"* —
a fact about not stopping early on the wrong summit, which is the last kind of sentence to move
on a marginal call.

Where the cut was a hazard, the text does survive in `climbing_route` and renders on the same
tab, so rejecting these loses nothing — it just declines to make a change whose justification
was weaker than the rule.

## The batch

Eight routes, one sentence each. Every cut is its section:

| route | corresponds to section |
|---|---|
| `wa_blackcap_mountain_scramble` | "Northeast ridge to the summit" |
| `wa_hurry_up_peak_south_ridge` | "South ridge crest and upper gully system" |
| `wa_lake_mountain_pasayten_scramble` | "Northwest ridge variation" |
| `wa_luahna_peak_east_slopes` | "Variation: south/southeast ridge (avoids the glacier)" |
| `wa_mount_bigelow_scramble` | "Variation: west slopes from Horsehead Pass" |
| `wa_mount_fernow_southeast_face` | "Upper choss to the summit block" |
| `wa_sky_mountain_s_route` | "False sub-summit to the true summit" |
| `wa_mount_pershing_standard` | "Ridge crest to the true (south) summit" |

Note how many are **variations**: three of the eight cuts are alternative lines that already
have their own named section. Those are the cleanest case in the whole queue — an alternative
route described twice is unambiguous duplication, with no question about which column it
belongs in.

Applied, re-read and reconciled: **8 applied, 8 verified.** Pre-write values snapshotted in
`research-data/approach-trim-batch2-before-2026-08-19.txt`.

## Read the unbiased measure, not the audit's

The audit reported 294 → 285 sentences, which is **9** against 8 trims. That extra one is an
artifact, not a fix: the audit counts duplicates only on routes it still *flags*, and one route
dropped out of the flagged set entirely, taking its remaining duplicate with it. The route's
prose did not change.

The probe covers all 240 routes with both columns and is the honest number:

| | routes | sentences |
|---|---|---|
| after batch 1 | 147 | 294 |
| after batch 2 | **142** | **286** |

Exactly 8 sentences, matching 8 trims, with 5 routes cleared entirely. **When two instruments
disagree by one, find out which is measuring a moving denominator** — the same lesson batch 1
paid for with the splitter, one level up.

## Remaining — 142 routes, 286 sentences, and the applier is done

**The tail queue is exhausted.** Every remaining candidate the applier could express has now
been read and either applied or rejected with a reason. What is left is 118 routes whose
duplicates are **interior** to the paragraph.

Those cannot be fixed by this applier, and that limit is structural rather than a matter of
effort: excising a sentence from mid-paragraph strands the connectives around it, so repairing
one means **rewriting prose**, not deleting it. The truncate-only property — `approach :=
approach.slice(0, cut)`, asserted to be a prefix of the original — is exactly what made batches
1 and 2 safe to run without a human reading every character of the result, and it does not
extend to the interior set.

So: do not point the applier at the remainder. A different tool, and a decision about whether
rewriting route prose is wanted at all, come first.
