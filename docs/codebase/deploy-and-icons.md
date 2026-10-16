# Deploy base path and app icons

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.

Pushing to `main` (or `master`) triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages at https://barbs2989.github.io/Climbing-App/. `vite.config.js` sets `base: "/Climbing-App/"` to match the repo name — this must stay in sync with the repo name or asset links break on Pages.

That base has a trap worth knowing before adding anything to `public/`. Vite substitutes
`%BASE_URL%` inside `index.html`, so icon and manifest `<link>`s written that way come out
correct. It does **not** rewrite the *contents* of files in `public/` — so the paths inside
`manifest.webmanifest` (`start_url`, `scope`, every icon `src`) are hardcoded with the
`/Climbing-App/` prefix and would silently 404 on Pages if written as bare `/`. Nothing
fails the build if they are wrong; the icons just never appear and the app becomes
non-installable, which is exactly the class of thing nobody notices. `public/favicon.svg` is
the single source for the mark — the PNGs beside it are generated from it by
`node scripts/oneoff/render-app-icons.mjs`, so change the SVG and re-run rather than editing
a PNG.

`favicon-maskable.svg` is a **separate** file on purpose, and #745 shipped the bug that
explains why: it tagged the ordinary rounded icon `purpose: "maskable"`. A maskable icon must
be **full bleed** (the launcher supplies the shape; a pre-rounded tile inside its mask reads
as a small badge floating on the launcher background) and its ink must stay inside the safe
zone, which is the central circle of 80% the width — **not** the inner 80% square, whose
corners sit at ~113% of that radius. The mark is a wide triangle, so its lower corners are
the binding constraint. The generator **measures the rendered pixels** and fails if any ink
lands outside that circle, because the arithmetic is easy to get wrong: the first corrected
scale still overshot at 82.9% and only the measurement caught it.
