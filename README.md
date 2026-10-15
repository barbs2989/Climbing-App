# ClimbMatch

A mobile-first social app for finding climbing partners, planning objectives, and sharing
route conditions. Live at **https://barbs2989.github.io/Climbing-App/**.

## Quick start

```bash
npm install
npm run dev       # local dev server with HMR
```

See **CLAUDE.md** for the full architecture rundown — that's the source of truth for how
the app is put together. The short version:

- **Three app files, not one.** `ClimbMatchCore.jsx` holds the constants, seed data, pure
  helpers and presentational components; `ClimbMatch.jsx` holds the `App` component and every
  screen; `RouteDetail.jsx` is the route page. `ClimbMatch.jsx` alone is **23% of the app**, so
  anything that walks "the source" must name all three — a guard that named only the entry
  files once read a quarter of the codebase for a week (#547).
- **A national catalog behind a `USE_DB` flag.** Supabase holds **205,543 routes across 52
  states**; the deep *enrichment* (approach, descent, gear, waypoints) is Washington-alpine
  focused, which is why coverage is quoted as a WA-alpine percentage and never catalog-wide.
- **`npm run build` is the test suite.** There is no unit test, linter or type checker: ~94
  `check:` scripts stand in for one, and most of them run inside the build. They target the
  failure this app actually ships — not a build error, but a screen that renders wrong.

## Repository layout

| Path | What it is |
|---|---|
| `index.html`, `main.jsx`, `ClimbMatch.jsx`, `ClimbMatchCore.jsx`, `RouteDetail.jsx`, `EnrichmentPanels.jsx`, `AppErrorBoundary.jsx` | The app. Three dense files hold nearly all of it — `CLAUDE.md` → Architecture for the files and screens, `ARCHITECTURE.md` for where state lives. |
| `lib/` | The DB, auth, search and map modules (`db.js`, `supabase.js`, `auth.js`, …) and the screens moved out of core to load lazily. |
| `scripts/` | The guards (`check-*.mjs`), audits (`audit-*.mjs`) and pipeline tools `package.json` names; `scripts/lib/` shared helpers; `scripts/oneoff/` one-shot probes, imports and repairs, kept because the guard notes cite them as evidence. |
| `docs/` | `guards/` per-guard design notes (indexed by `docs/guards/README.md`); `codebase/` the working rules CLAUDE.md summarises; `archive/` superseded material, including the July-2026 root reports. |
| `supabase/` | Migrations (replayed by the Supabase GitHub integration — numbering rules in `supabase/migrations/README-numbering.md`) and edge functions. |
| `public/` | Icons, manifest, service worker. Vite copies it verbatim; read `docs/codebase/deploy-and-icons.md` before touching it. |
| `audits/`, `research-data/`, `research/`, `enrichment-wip/`, `gear-research/` | Dated audit reports, triage dumps, dedup notes and SQL, enrichment batches in progress, gear research — the working papers behind the catalog. Not read by the app or the build. |
| `catalog/` | Regenerable catalog exports (gitignored; the data lives in Supabase). |
| `.github/workflows/` | CI: the build check on every PR, the Pages deploy on `main`, and the scheduled drift and snapshot guards. |

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes
`dist/` to GitHub Pages automatically. No manual build/upload step — just push.

- `vite.config.js` sets `base: "/Climbing-App/"` to match the repo name; this must stay in
  sync with the repo name or asset links break on Pages.
- Check the repo's **Actions** tab for build status after pushing.

## If the page is blank after a deploy
- Give it 2-3 minutes — Pages can lag right after a run finishes.
- Confirm Settings → Pages → Source is "GitHub Actions" (not a branch).
- Confirm `vite.config.js` still has the correct `base` path.
