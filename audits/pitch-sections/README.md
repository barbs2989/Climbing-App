# Pitch and rappel sections audit (2026-11-25)

Owner note: "Audit that routes that have more than one pitch show pitch by pitch detail sections and
repel sections. What do we do when there's no information on number of pitches?"

## 1. Routes that store more than one pitch

Already true before this pass (owner, 2026-10-15, Castleton's Kor-Ingalls): on every roped route with
`pitches >= 2`, ROUTE BREAKDOWN shows either the pitch table or a headed "No pitch-by-pitch breakdown"
section with a pencil (`gapPitches`). RAPPELS shows either its table, its note, or a headed "No rappel
information" section. It is hidden only where the route states a walk-off (`rappelsAreNone`) or is a
Class 1-3 route with no glacier (`isNoRopeClass`). `scripts/oneoff/audit-multipitch-sections.mjs` checks
this by server-rendering every live `pitches >= 2` row through the real route page.

Fixed in this pass: `gapPitches` invited a pitch table on a **scramble** or walk-up that stores a count.
A scramble is never roped (owner, 2026-10-25), so it no longer does.

## 2. No pitch count on file: the decision

**What competitors do.** Mountain Project's route-finder export prints a count on every route. In our crawl,
287,059 of 309,743 routes read 1 and none are blank, because 1 is MP's default when a submitter gives no count.
OpenStreetMap's `climbing:pitches` tag also defaults to 1. A multi-pitch pitch is typically 30-40 m
(Wikipedia, "Pitch (climbing)"). So "no count" is read as one pitch everywhere, and the length is the
only other signal.

**What we do:**
1. **Fill from the source where it states one.** In our catalog, 0 and null both mean "unknown" (0 is
   OpenBeta's "never recorded", migration 0074). Where Mountain Project states a count above 1 for the same
   route (the importer's exact MP-id map), we store it: `scripts/pipeline/fill-pitches-from-mp.mjs`. Only a
   count above 1 is information, because MP's 1 is its default.
2. **Otherwise read the length.** A rope does not reach 100 m (330 ft, the planner's `MAX_PITCH_FT`). So a
   roped climb longer than that, with no count or a placeholder 1, is multi-pitch. The route page shows both
   ROUTE BREAKDOWN and RAPPELS as "help fill this in" sections. The breakdown says "No pitch count is on file,
   but at 600 ft this climb is longer than one rope reaches, so it takes more than one pitch (about 5 at 35 m
   each)" (`multiPitchByLength`, `estPitchesByLength`, lib/pitchCount.js). The estimate is never stored.
   This goes further than MP, which shows a long route with a 1 as a single pitch.
3. **Short or no length: one pitch.** Same as MP and OpenStreetMap: neither section shows on a crag climb.
   An alpine, ice or mixed route with no count keeps its "Nothing records how many pitches" section, as before.

## 3. Census (plan, 2026-11-25; `fill-pitches-from-mp.mjs`, plan only)

- 278,248 routes mapped to an MP id; 277,344 read; 102,939 skipped (boulders and scrambles).
- **FILL 13,007**: 13,000 store 0 and 7 store null, and MP states a count above 1. By discipline: trad 9,627,
  sport 1,677, alpine 1,528, aid 65, ice 59, toprope 26, mixed 25. MP's counts: 2 → 5,885, 3 → 2,719,
  4 → 1,565, 5 → 912, 6 → 578, 7 → 336, 8 → 292, 9 → 157, 10 or more → 563.
- **MP says 1: 98,589.** Left blank. The app reads them as one pitch unless the length says otherwise.
- **DIFFERS 358**: we already store a count and MP states another. Listed in `differs-and-conflicts.json`, not
  written. The stored count may be a researched one, and a fingerprint does not authorise a bulk fix.
- **CONFLICT 19**: two MP ids for one route disagree. Not written.
- No MP count: 354.

The plan, rollbacks and apply logs are kept beside the MP crawl in `~/dev/mp-data/_mp/_pitches/`.

## 4. Apply log

(see below; each batch re-reads every row through `fillBlanks`, area asserted)
- 2026-11-26: **nothing written yet.** The DB slot was granted twice, but `dbslot.mjs check` read 2.1-4.2 s
  each time, so the job backed off without writing. A 20-row pilot started once after a failed check. The
  session stopped it before any write: no rollback file was created.

### How to resume
1. Symlink `.env`, `.env.local` and `supabase/.temp` from the main checkout. Then `node ~/dev/db-throttle/dbslot.mjs acquire <id>`,
   and only continue once `node ~/dev/db-throttle/dbslot.mjs check` exits 0.
2. Pilot: `MP_DIR=~/dev/mp-data/_mp node scripts/pipeline/fill-pitches-from-mp.mjs --apply --limit 20`.
   It writes from the saved `~/dev/mp-data/_mp/_pitches/plan.json` (no catalog re-read). Then re-read those 20 ids.
3. Batches: `--apply --offset K --limit 2000` (K = 20, 2020, 4020 ... up to 13,007). Run `dbslot check` between
   batches. The script stops by itself when the gate says slow, and prints the offset to resume from. Each write
   goes through `fillBlanks` (area asserted, the value must still be blank or 0, re-read reconciled), and the
   rollback is written before the first write.
4. Afterwards: `node scripts/oneoff/audit-multipitch-sections.mjs` (renders every `pitches >= 2` route, plus
   the new length cases). Pass `--ids=FILE` if the paged scan times out.
