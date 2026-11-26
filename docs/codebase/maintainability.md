# Maintainability audit — where the code is hard to work on, and what was done

Owner note, 2026-11-25: *"Audit maintenance of the app where we have confusing and code that is too long and
difficult to maintain when things go wrong."* This file is the audit's measurement, its decisions, and the
runbook it produced. Re-measure before trusting a number here: main moves every few minutes.

## When something breaks: where to look first

| Symptom | First move |
|---|---|
| A climber saw "This screen hit a bug", or anything threw on a phone | `npm run errors:read` — every error filed to `app_errors` in the last 7 days, grouped, each minified frame mapped back to `file:line:column in function` with the code at that column (hidden source maps, kept 90 days as the deploy artifact `sourcemaps-<entry script>`). A stack copied from anywhere else: `npm run errors:read -- --stack "<stack>" --build index-XXXX.js` |
| The live site does not show what was merged | `npm run check:drift` |
| A screen shows nothing, or "you have none" | it is usually a failed read shown as empty: `docs/guards/outage-and-read-failures.md` |
| One section of a page is blank but the rest works | `lib/SectionErrorBoundary.jsx` caught it — the error is in `app_errors` too |
| A guard went red and you do not know why it exists | `grep -rn "check:NAME" docs/guards/` — every guard has an entry saying why, and what it cannot see |
| Where does feature X live? | `CURRENT_STATE.md` → `docs/features/<area>.md` (files, tables, symbols — kept true by `check:feature-docs`) |
| Which file holds a component that used to be in ClimbMatchCore? | `src/components/<Name>.tsx`, registered in `MOVED` in `scripts/lib/guard-sources.mjs` |

## Measurement (2026-11-25, main at d31cc2e31)

App code, excluding `scripts/`: 645 files, 8.1 MB.

| File | Size | Lines | Longest line | Lines over 1,000 chars |
|---|---|---|---|---|
| `ClimbMatch.jsx` | 697 KB | 1,836 | 40,329 | 114 |
| `ClimbMatchCore.jsx` | 514 KB | 2,951 | 9,446 | 62 |
| `lib/db.js` | 454 KB | 8,080 | 1,135 | 2 |
| `src/components/SuggestFix.tsx` | 156 KB | 843 | 12,612 | 11 |
| `RouteDetail.jsx` | 119 KB | 649 | 7,557 | 23 |
| `lib/PartnerSearch.jsx` | 113 KB | 335 | 15,783 | 21 |
| `lib/CrewCard.jsx` | 102 KB | 347 | 6,505 | 24 |

`scripts/`: 2,060 script files, 14.5 MB; `scripts/oneoff/` alone held 3,151 files.

## Findings, and what was done about each

1. **A crash report named nothing anyone could open.** `app_errors` stored the minified stack
   (`index-x.js:1:482113`) and no source maps existed, so the position mapped to nothing — and the source it
   would map to has 40,000-character lines, so even a line number is not enough without the column.
   **Fixed (#3987):** hidden source maps, kept off the site and uploaded per build; `npm run errors:read`
   prints file, line, column, function and the code at the column.

2. **Dead one-off scripts drowned every search.** Of 3,151 files in `scripts/oneoff/`, 1,743 were named by no
   live file (repo, memory notes, session reports), including transitively (named only by other dead files).
   Every `grep` for a column, table or function returned these finished runs first.
   **Removed (PR "Remove 733 dead one-off files"): 715 files (2.7 MB) from `scripts/oneoff/` and 18 from `enrichment-wip/`**, under rules
   chosen to keep anything that could still be needed:
   - not named — by basename — in any tracked file, any memory note, or any note-session report;
   - not touched in the last 7 days (a parallel session may be mid-run);
   - not a backup, rollback, "before" snapshot or undo file (history of production writes stays readable in place);
   - not in a subdirectory whose name a live file mentions (a script reading `dir/` by `readdirSync` names the
     directory, not each file);
   - not matching a directory scan a guard runs (`inject-*`, `apply-trip-plans-*`, `link-multi-approach-batch*.plan.json`).
   Every one stays in git history: `git log --all --oneline -- scripts/oneoff/<name>` finds it,
   `git show <sha>^:scripts/oneoff/<name>` restores it.
   The other ~1,000 dead `oneoff` files are backups or inside directories a live file names; they were left.
   **Decided:** no new rule or guard forbids new one-offs. They are how production data work is recorded, and
   `scripts/oneoff/` is already excluded from the guards that would make them expensive.

3. **`lib/db.js` is one 8,080-line file** holding every read and write the app makes, 416 exports, across ~30
   unrelated domains (routes, crews, groups, messages, review desk, data-rights…), separated only by comment
   banners. See *Next* below.

4. **`ClimbMatch.jsx` / `ClimbMatchCore.jsx` lines up to 40,000 characters.** The dense one-line-per-declaration
   style is a recorded convention (CLAUDE.md) and ~135 build guards match the source TEXT with regexes keyed to
   it; reformatting would blind or break them wholesale. **Decided: not reformatted.** What made long lines
   *dangerous* — a crash you cannot locate in them — is fixed by finding 1 (the column, and the code at it).
   The component extraction (docs/refactor-progress.md) already moved 273 components out; App's remaining
   bulk is 298 `useState` hooks and their handlers.

5. **Already in place, verified still working, no change:** `AppErrorBoundary` + per-section
   `SectionErrorBoundary`, so a bug blanks one section, not the app; `lib/errorReport.js` filing to
   `app_errors`; `check:types` (strict TS over `src/`) and `lint` at zero findings with no baseline; a notes
   entry for every guard in `docs/guards/`; feature docs held true by `check:feature-docs`.

## Next

- **Split `lib/db.js` by domain** into `lib/db/<domain>.js`, with `lib/db.js` kept as the one import path
  (re-exports), so no app import changes. The 35 guards that read `lib/db.js` as text read it through one
  helper that concatenates the domain files, measured with `measure:guard-reach` before and after.
