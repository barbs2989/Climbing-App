# CORRECTION NOTICE — supersedes claims in the 2026-07-28 session reports

`SESSION_COMPLETE_FINAL_REPORT.md`, `SESSION_SUMMARY.md`, `WORK_COMPLETE_STATUS.md`,
`RESEARCH_COMPLETE_READY_TO_EXECUTE.md` and `FLAGGED_ITEMS_*.md` state that a number of
fixes were "applied ✅". Verification against the live DB on 2026-07-29 showed several of
them never ran. Supabase's SQL editor reports **success for an UPDATE/DELETE that matches
zero rows**, and those statements targeted route ids that do not exist.

## Did NOT apply (ids were composed from display names, not looked up)

| Claimed | Reality |
|---|---|
| Burgundy Spire high_point_ft = 8492 | targeted `wa_burgundy_spire_action_potential`; real id is `wa_action_potential`. **Since re-applied and verified (8492).** |
| Alpine Lookout discipline = 'trail' | targeted `wa_alpine_lookout_round_mountain`; real id ends `_trail`. **Deliberately NOT re-applied** — see below. |
| Mount Thomson loss_ft = 3600 | **no Mount Thomson route exists in this table at all** (only `ca_thomson_roof`). Nothing to fix. |
| Bonanza NE Buttress ice_grade = NULL | WHERE tested `ice_grade='WI5+'`; stored value is `AI2`. Left alone pending a real source. |
| Dragontail r4 alpine_grade = 'D' | row did not exist at the time. Now exists and is set to `D`. |

## Data loss and recovery

`wa_dragontail_peak_triple_couloirs` was DELETED on a duplicate flag that was wrong. Its
supposed twin `wa_dragontail_peak_r4` was not in the live DB, so triple_couloirs was the
**only** copy — the delete removed Triple Couloirs (Joiner/Nelson/Seman, May 1974), an
ultra-classic Dragontail north face line, entirely.

**Restored 2026-07-29** as `wa_dragontail_peak_r4` from `catalog/wa-alpine/routes.json`,
applied in 6 small chunks (a 9.6KB single paste silently truncated). Verified: all 40
catalog fields non-null, `alpine_grade` = `D` (French scale per migration 0006; the catalog
ships NCCS `IV`), and the pre-existing richer `hazards` enrichment preserved via `coalesce`
rather than overwritten with the catalog's shorter array.

## A flagged "fix" that was itself wrong

Alpine Lookout: the audit flagged `discipline = 'mountaineering'` as a misclassification and
proposed `'trail'`. Exact counts show `trail`, `walk-up` and `hiking` each appear **0 times**
in the table — it would have been an orphan value no filter or icon mapping handles. The
project's own convention (walk-up → mountaineering) makes the stored value correct. The flag
was wrong; the no-op accidentally prevented a bug.

## Still genuinely applied and verified

Agnes Mountain 8119 · Dark Peak 8507 · Burgundy Spire 8492 · all three id renames
(Big Kangaroo → west_face, Colonial Peak → west_ridge, Corteo Peak → southwest_ridge) ·
Blood Sport → sport · Cascade Peak renamed "East Ridge and NW Chimney" · Chianti Spire gaps
cleared · 4 of 5 deletes correct (Argonaut NE Ridge, Boston Peak SW Face, backbone stub,
cutthroat r1) · all 10 audit batches.

## New issue found during verification

Bonanza Peak has **two** rows both named "Northeast Buttress"
(`wa_bonanza_peak_northeast_buttress`, alpine/AI2 and
`wa_bonanza_peak_northeast_face_company_glacier`, trad/null) — a genuine duplicate-name
candidate that was not on the original flag list. Not investigated.

## Method note

This worktree can read the live DB directly with the anon key in `.env.local`. Verify by
reading rows back, never by the editor's "success". Exact counts need
`Prefer: count=exact` + `Range: 0-0`; a plain select silently caps at 1000 rows.
