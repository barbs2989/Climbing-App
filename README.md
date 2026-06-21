# ClimbMatch — deploy to GitHub Pages

Your app is a React component. A browser can't run a raw .jsx file, so these
files wrap it in a tiny Vite project that GitHub builds and publishes for you.
No terminal needed — GitHub does the build in the cloud every time you push.

Live URL when finished:  https://barbs2989.github.io/Climbing-App/

## What goes in the repo

Climbing-App/
├─ ClimbMatch.jsx          (your app — keep it in the root)
├─ main.jsx                (starts the app)
├─ index.html             (the page React loads into)
├─ package.json           (lists React + Vite)
├─ vite.config.js         (base = "/Climbing-App/")
└─ .github/
   └─ workflows/
      └─ deploy.yml        (builds & deploys on every push)

## Steps (all in GitHub Desktop — no command line)

1. Unzip this kit. Drag ALL of its files/folders into your local
   Climbing-App folder (the one GitHub Desktop tracks). When it asks to
   replace ClimbMatch.jsx, that's fine — it's the same file.
   Make sure the ".github" folder comes along with it.

2. Open GitHub Desktop. You'll see the new files listed as changes.
   Type a summary like "Add Vite build + Pages deploy" and click
   "Commit to main", then "Push origin".

3. In your browser, go to the repo > Settings > Pages.
   Under "Build and deployment" > Source, choose "GitHub Actions".
   (You do NOT pick a branch — just "GitHub Actions".)

4. Go to the repo's "Actions" tab. You'll see a run called
   "Deploy to GitHub Pages" working. Wait for the green check (~1-2 min).

5. Visit  https://barbs2989.github.io/Climbing-App/
   That's your live app. From now on, every push auto-rebuilds it.

## If the page is blank
- Give it 2-3 minutes after the green check (Pages can lag the first time).
- Confirm Settings > Pages > Source is "GitHub Actions" (not a branch).
- Confirm vite.config.js still says base: "/Climbing-App/" (with both slashes).
