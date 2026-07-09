# ClimbMatch

A mobile-first social app for finding climbing partners, planning objectives, and sharing
route conditions. Live at **https://barbs2989.github.io/Climbing-App/**.

## Quick start

```bash
npm install
npm run dev       # local dev server with HMR
```

See **CLAUDE.md** for the full architecture rundown (single-file `ClimbMatch.jsx`, the
Supabase-backed WA catalog, `USE_DB` flag, etc.) — that's the source of truth for how the
app is put together.

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
