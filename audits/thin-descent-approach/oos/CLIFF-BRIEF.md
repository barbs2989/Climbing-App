# Aid, trad on cliffs, sport and top-rope (2026-10-30)

The owner put these rows in scope on 2026-10-30, after they had first been left out. Read `audits/thin-descent-approach/BRIEF.md`, `oos/OOS-BRIEF.md`
and `oos/TRAD-BRIEF.md` first. **All twelve TRAD-BRIEF rules apply unchanged.** This brief changes only the scope and what to write.

## Scope

Your context is `oos/ctx-<tier>-<st>-<n>.json`; write `oos/batch-<tier>-<st>-<n>.json`. The tier is `aid`, `cliff` (trad not on a peak) or `crag` (sport and top-rope).
- Every target gets an entry: a `set`, or a `skip_reason`.
- Copy `area` and the batch key (the id) exactly from the context. Never retype an id: a mistyped key is silently skipped at write time.
- Set only the field the target needs (`need_descent` / `need_approach` in the context). Never overwrite a field that is already 150 characters or longer.

## What to write

- **approach** (from parking to the base of the route):
  - Give the trail, which wall or buttress, and how to find this route on it (landmarks, the route to its left or right).
  - The crag's access is shared by its routes. You may research it once per crag and use it on every thin row at that crag, as long as each row
    still says where on the wall this route starts, when a source says so.
- **descent_text** (how parties get down from this route):
  - Multi-pitch and aid: a walk-off (which way, which gully), the rappel line (two sources for any count), or a fixed-line descent.
  - One-pitch: write how parties get down (lower off, rappel or walk-off) only when a source says so for this route or for this wall's anchors.
    If nothing says, write no descent. Never guess "lower off".
  - Aid walls: the descent off the top of the formation, named.

## Skip reasons

Use these spellings so the counts add up:
- "no source describes this route"
- "identity in doubt: <why>"
- "already covered by <batch>"
- "approach already rich; no descent source"

## Checks

`node scripts/oneoff/thin-da-offline-check.mjs <your batch>` must print no COPY or CAPS lines.
- Don't run the applier, and don't touch git.
- Keep any helper scripts in `oos/scratch/`.
- NEVER fetch with a faked browser user agent.

Reply with:
- how many written;
- how many skipped, grouped by reason;
- any duplicate or misfiled findings.
