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
